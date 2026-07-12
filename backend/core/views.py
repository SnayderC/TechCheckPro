import traceback
from datetime import timedelta
from decimal import Decimal

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.models import (
    Factor,
    Evaluacion,
    SoftwareObjetivo,
    DetalleEvaluacionFactor,
    RespuestaEvaluacion,
)
from core.serializers import (
    FactorSerializer,
    EvaluacionSerializer,
    EvaluacionResumenSerializer,
    SoftwareSerializer,
    AuditLogSerializer,
)
from core.utils.guiosad_engine import MotorGUIOSAD
from core.utils.completitud import validar_completitud
from core.utils.audit import registrar_auditoria
from core.utils.pdf_report import generar_pdf_dictamen
from core.permissions import IsAdmin


def _get_evaluacion_usuario(request, eval_id):
    if not eval_id:
        return None, Response(
            {'error': 'evaluacion_id es requerido'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    evaluacion = Evaluacion.objects.filter(id=eval_id, usuario=request.user).first()
    if not evaluacion:
        return None, Response(
            {'error': 'Evaluación no encontrada o sin permiso de acceso'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return evaluacion, None


def _evaluacion_editable(evaluacion):
    return evaluacion.estado in ('En Progreso', 'Pausado')


class PerfilView(APIView):
    """RF-01: devuelve rol del usuario autenticado."""

    def get(self, request):
        u = request.user
        return Response({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'rol': u.rol,
            'first_name': u.first_name,
        })


class MisEvaluacionesView(APIView):
    """GET /api/evaluaciones/misfichas/ — historial con filtros RF-10."""

    def get(self, request):
        qs = Evaluacion.objects.filter(usuario=request.user).select_related('software')

        if request.user.rol == 'ADMIN':
            qs = Evaluacion.objects.all().select_related('software', 'usuario')

        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(software__nombre__icontains=q)
                | Q(usuario__username__icontains=q)
            )

        dictamen = request.query_params.get('dictamen', '').strip()
        if dictamen == 'A':
            qs = qs.filter(dictamen_final__startswith='A-CLASS')
        elif dictamen == 'B':
            qs = qs.filter(dictamen_final__startswith='B-CLASS')
        elif dictamen == 'C':
            qs = qs.filter(dictamen_final__startswith='C-CLASS')

        estado = request.query_params.get('estado', '').strip()
        if estado:
            qs = qs.filter(estado=estado)

        anio = request.query_params.get('anio', '').strip()
        if anio.isdigit():
            qs = qs.filter(fecha_inicio__year=int(anio))

        if not qs.exists() and (q or dictamen or estado or anio):
            return Response([], status=status.HTTP_200_OK)

        qs = qs.order_by('-fecha_ultima_modificacion')
        serializer = EvaluacionResumenSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AlertasProgresoView(APIView):
    """RF-11: proyectos inactivos más de 15 días."""

    def get(self, request):
        limite = timezone.now() - timedelta(days=15)
        alertas = Evaluacion.objects.filter(
            usuario=request.user,
            estado__in=('En Progreso', 'Pausado'),
            archivado=False,
            fecha_ultima_modificacion__lt=limite,
        ).select_related('software')

        data = [{
            'evaluacion_id': e.id,
            'software': e.software.nombre,
            'dias_inactivo': (timezone.now() - e.fecha_ultima_modificacion).days,
            'fecha_ultima_modificacion': e.fecha_ultima_modificacion,
        } for e in alertas]
        return Response(data)


class DashboardEjecutivoView(APIView):
    """RF-13: métricas globales para Alta Dirección (admin)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        evals = Evaluacion.objects.filter(estado__in=('Calculado', 'Bloqueado'))
        total = evals.count()
        aprobados = evals.filter(dictamen_final__startswith='A-CLASS').count()
        condicionados = evals.filter(dictamen_final__startswith='B-CLASS').count()
        rechazados = evals.filter(dictamen_final__startswith='C-CLASS').count()
        pct_aprobacion = round((aprobados / total * 100) if total else 0, 1)

        if total:
            dim_promedios = {
                'Tecnologica': round(sum(float(e.promedio_T) for e in evals) / total, 2),
                'Organizacional': round(sum(float(e.promedio_O) for e in evals) / total, 2),
                'Economica': round(sum(float(e.promedio_E) for e in evals) / total, 2),
            }
            dim_critica = min(dim_promedios, key=dim_promedios.get)
        else:
            dim_promedios = {'Tecnologica': 0, 'Organizacional': 0, 'Economica': 0}
            dim_critica = None

        return Response({
            'total_evaluados': total,
            'aprobados': aprobados,
            'condicionados': condicionados,
            'rechazados': rechazados,
            'porcentaje_aprobacion': pct_aprobacion,
            'promedios_dimensiones': dim_promedios,
            'dimension_mas_critica': dim_critica,
            'sin_datos': total == 0,
        })


class CatalogoTOEView(APIView):
    """GET /api/catalogo/ — Catálogo TOE (evaluadores: solo lectura)."""

    def get(self, request):
        factores = Factor.objects.prefetch_related('subfactores', 'dimension').all()
        serializer = FactorSerializer(factores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class IniciarEvaluacionView(APIView):
    """POST /api/evaluaciones/iniciar/ — RF-03."""

    def post(self, request):
        try:
            data = request.data or {}
            nombre_soft = data.get('nombre', '').strip()
            if not nombre_soft:
                return Response(
                    {'error': 'El nombre del software es obligatorio'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            duplicado = Evaluacion.objects.filter(
                usuario=request.user,
                software__nombre__iexact=nombre_soft,
                estado__in=('En Progreso', 'Pausado'),
            ).exists()
            if duplicado:
                return Response(
                    {'error': 'Ya existe un proyecto activo con el mismo nombre de software'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            software = SoftwareObjetivo.objects.filter(nombre__iexact=nombre_soft).first()
            if not software:
                software = SoftwareObjetivo.objects.create(
                    nombre=nombre_soft,
                    version=data.get('version', '1.0'),
                    proveedor=data.get('proveedor', 'Comunidad Abierta'),
                    descripcion=data.get('descripcion', ''),
                )
            elif data.get('descripcion'):
                software.descripcion = data['descripcion']
                software.save(update_fields=['descripcion'])

            evaluacion = Evaluacion.objects.create(
                usuario=request.user,
                software=software,
            )

            factores = Factor.objects.prefetch_related('subfactores').all()
            for factor in factores:
                DetalleEvaluacionFactor.objects.get_or_create(
                    evaluacion=evaluacion,
                    factor=factor,
                    defaults={'importancia_decisor': Decimal('1.00')},
                )
                for subf in factor.subfactores.all():
                    RespuestaEvaluacion.objects.get_or_create(
                        evaluacion=evaluacion,
                        subfactor=subf,
                        defaults={'valor_likert': 1, 'respondido': False},
                    )

            registrar_auditoria(request.user, evaluacion, 'CREAR', f'Proyecto: {nombre_soft}')
            return Response({'evaluacion_id': evaluacion.id}, status=status.HTTP_201_CREATED)

        except Exception as e:
            print('ERROR EN INICIAR EVALUACION:', str(e))
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DetalleEvaluacionView(APIView):
    """GET /api/evaluaciones/<id>/ — carga respuestas guardadas."""

    def get(self, request, eval_id):
        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            if request.user.rol == 'ADMIN':
                evaluacion = Evaluacion.objects.filter(id=eval_id).first()
                if not evaluacion:
                    return error_response
            else:
                return error_response

        respuestas = RespuestaEvaluacion.objects.filter(evaluacion=evaluacion)
        detalles = DetalleEvaluacionFactor.objects.filter(evaluacion=evaluacion)

        return Response(
            {
                'evaluacion_id': evaluacion.id,
                'estado': evaluacion.estado,
                'software': SoftwareSerializer(evaluacion.software).data,
                'puntajes': {str(r.subfactor_id): r.valor_likert for r in respuestas},
                'respondidos': {str(r.subfactor_id): r.respondido for r in respuestas},
                'decisiones': {
                    str(d.factor_id): float(d.importancia_decisor) for d in detalles
                },
            },
            status=status.HTTP_200_OK,
        )


class GuardarProgresoView(APIView):
    """POST /api/evaluaciones/autosave/ — RF-04."""

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        puntajes = request.data.get('puntajes', {})
        decisiones = request.data.get('decisiones', {})

        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        if evaluacion.estado in ('Calculado', 'Bloqueado'):
            return Response(
                {'error': 'Esta evaluación ya fue calculada y no admite modificaciones'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            for sf_id, val in puntajes.items():
                likert = int(val)
                if likert < 1 or likert > 4:
                    continue
                RespuestaEvaluacion.objects.filter(
                    evaluacion=evaluacion,
                    subfactor_id=sf_id,
                ).update(valor_likert=likert, respondido=True)

            for fac_id, val_dec in decisiones.items():
                importancia = float(val_dec)
                if importancia < 1 or importancia > 4:
                    continue
                DetalleEvaluacionFactor.objects.filter(
                    evaluacion=evaluacion,
                    factor_id=fac_id,
                ).update(importancia_decisor=val_dec)

            Evaluacion.objects.filter(pk=evaluacion.pk).update(
                fecha_ultima_modificacion=timezone.now(),
                estado='En Progreso',
            )

            registrar_auditoria(request.user, evaluacion, 'AUTOSAVE')
            return Response({'status': 'Sincronizado'}, status=status.HTTP_200_OK)
        except Exception as e:
            print('ERROR EN AUTOSAVE:', str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CalcularDictamenView(APIView):
    """POST /api/evaluaciones/calcular/ — RF-05 + RF-14."""

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        if evaluacion.estado in ('Calculado', 'Bloqueado'):
            evaluacion.refresh_from_db()
            serializer = EvaluacionSerializer(evaluacion)
            return Response(serializer.data, status=status.HTTP_200_OK)

        ok, pendientes = validar_completitud(evaluacion)
        if not ok:
            return Response({
                'error': 'completitud_incompleta',
                'pendientes': pendientes,
                'mensaje': 'Faltan subfactores por calificar: ' + ', '.join(
                    f'{p["cantidad"]} en {p["dimension"]}' for p in pendientes
                ),
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            evaluacion_procesada = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)
            registrar_auditoria(request.user, evaluacion_procesada, 'CALCULAR')
            evaluacion_procesada.refresh_from_db()
            serializer = EvaluacionSerializer(evaluacion_procesada)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            print('ERROR EN CALCULAR DICTAMEN:', str(e))
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BloquearEvaluacionView(APIView):
    """POST /api/evaluaciones/bloquear/ — RF-15."""

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        if evaluacion.estado != 'Calculado':
            return Response(
                {'error': 'Solo se pueden bloquear evaluaciones con dictamen calculado'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Evaluacion.objects.filter(pk=evaluacion.pk).update(
            estado='Bloqueado',
            fecha_emision_dictamen=timezone.now(),
        )
        evaluacion.refresh_from_db()
        registrar_auditoria(request.user, evaluacion, 'BLOQUEAR', 'Cierre y firma del evaluador')
        return Response(EvaluacionSerializer(evaluacion).data)


class ReabrirEvaluacionView(APIView):
    """POST /api/evaluaciones/reabrir/ — RF-15 excepción (solo admin)."""

    permission_classes = [IsAdmin]

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        justificacion = (request.data.get('justificacion') or '').strip()
        if not justificacion:
            return Response({'error': 'Justificación obligatoria para reabrir'}, status=400)

        evaluacion = Evaluacion.objects.filter(id=eval_id).first()
        if not evaluacion:
            return Response({'error': 'Evaluación no encontrada'}, status=404)

        Evaluacion.objects.filter(pk=evaluacion.pk).update(estado='Calculado')
        evaluacion.refresh_from_db()
        registrar_auditoria(
            request.user, evaluacion, 'REABRIR', justificacion,
        )
        return Response(EvaluacionSerializer(evaluacion).data)


class ArchivarEvaluacionView(APIView):
    """RF-11: archivar proyecto para cesar alertas."""

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        Evaluacion.objects.filter(pk=evaluacion.pk).update(archivado=True)
        registrar_auditoria(request.user, evaluacion, 'ARCHIVAR')
        return Response({'status': 'Archivado'})


class CompararEvaluacionesView(APIView):
    """POST /api/evaluaciones/comparar/ — RF-08."""

    def post(self, request):
        id_a = request.data.get('evaluacion_a')
        id_b = request.data.get('evaluacion_b')

        if not id_a or not id_b:
            return Response({'error': 'Se requieren dos evaluaciones'}, status=400)
        if id_a == id_b:
            return Response(
                {'error': 'Deben seleccionarse dos evaluaciones diferentes'},
                status=400,
            )

        qs = Evaluacion.objects.filter(
            id__in=[id_a, id_b],
            estado__in=('Calculado', 'Bloqueado'),
        ).select_related('software')

        if request.user.rol != 'ADMIN':
            qs = qs.filter(usuario=request.user)

        evals = list(qs)
        if len(evals) != 2:
            return Response(
                {'error': 'Evaluaciones no encontradas o no finalizadas'},
                status=404,
            )

        ea, eb = (evals[0], evals[1]) if evals[0].id == int(id_a) else (evals[1], evals[0])

        def fila(e):
            ser = EvaluacionSerializer(e)
            d = ser.data
            return {
                'id': e.id,
                'software': d['software'],
                'clase_dictamen': d['clase_dictamen'],
                'promedios': d['promedios_dimensiones'],
                'fecha': e.fecha_emision_dictamen or e.fecha_ultima_modificacion,
            }

        fa, fb = fila(ea), fila(eb)
        dimensiones = ['Tecnologica', 'Organizacional', 'Economica']
        comparativa = []
        for dim in dimensiones:
            va = fa['promedios'].get(dim, 0)
            vb = fb['promedios'].get(dim, 0)
            comparativa.append({
                'dimension': dim,
                'software_a': va,
                'software_b': vb,
                'mejor': 'A' if va > vb else ('B' if vb > va else 'Empate'),
            })

        return Response({'evaluacion_a': fa, 'evaluacion_b': fb, 'comparativa': comparativa})


class SimularEscenarioView(APIView):
    """POST /api/evaluaciones/simular/ — RF-12."""

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        puntajes = request.data.get('puntajes', {})
        decisiones = request.data.get('decisiones', {})

        original = EvaluacionSerializer(evaluacion).data
        simulado = MotorGUIOSAD.simular(evaluacion.id, puntajes, decisiones)
        registrar_auditoria(request.user, evaluacion, 'SIMULAR')

        return Response({'original': original, 'simulado': simulado})


class ExportarPDFView(APIView):
    """GET /api/evaluaciones/<id>/pdf/ — RF-07 backend."""

    def get(self, request, eval_id):
        evaluacion = Evaluacion.objects.filter(id=eval_id).select_related('software', 'usuario').first()
        if not evaluacion:
            return Response({'error': 'No encontrada'}, status=404)
        if request.user.rol != 'ADMIN' and evaluacion.usuario_id != request.user.id:
            return Response({'error': 'Sin permiso'}, status=403)
        if evaluacion.estado not in ('Calculado', 'Bloqueado'):
            return Response({'error': 'Dictamen no calculado'}, status=400)

        ser = EvaluacionSerializer(evaluacion)
        data = ser.data
        desglose = data.get('desglose_foda', {})
        factores = []
        for tipo, items in [
            ('FORTALEZA', desglose.get('fortalezas', [])),
            ('OPORTUNIDAD', desglose.get('oportunidades', [])),
            ('DEBILIDAD', desglose.get('debilidades', [])),
            ('AMENAZA', desglose.get('amenazas', [])),
        ]:
            for it in items:
                factores.append({**it, 'tipo': tipo})

        clase = data.get('clase_dictamen', 'CLASE A')
        contexto = {
            'software': data['software'],
            'evaluador': evaluacion.usuario.username,
            'fecha': timezone.now().strftime('%d/%m/%Y'),
            'clase_dictamen': clase,
            'clase_letra': clase.split()[-1].lower().replace('(', '').replace(')', '')[:1] or 'a',
            'dictamen_texto': evaluacion.dictamen_final or '',
            'promedios': data['promedios_dimensiones'],
            'counts': {k: len(desglose.get(k, [])) for k in ['fortalezas', 'oportunidades', 'debilidades', 'amenazas']},
            'factores': factores,
        }

        try:
            pdf_buffer = generar_pdf_dictamen(contexto)
            nombre = f'Reporte_TOE_{evaluacion.software.nombre}.pdf'
            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{nombre}"'
            return response
        except Exception as e:
            traceback.print_exc()
            return Response({'error': f'Error generando PDF: {e}'}, status=500)


class AuditoriaEvaluacionView(APIView):
    """GET logs de una evaluación — RF-06."""

    def get(self, request, eval_id):
        evaluacion = Evaluacion.objects.filter(id=eval_id).first()
        if not evaluacion:
            return Response({'error': 'No encontrada'}, status=404)
        if request.user.rol != 'ADMIN' and evaluacion.usuario_id != request.user.id:
            return Response({'error': 'Sin permiso'}, status=403)

        logs = evaluacion.logs.all()[:100]
        return Response(AuditLogSerializer(logs, many=True).data)
