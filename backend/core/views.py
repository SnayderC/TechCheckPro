import traceback
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
)
from core.utils.guiosad_engine import MotorGUIOSAD


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


class MisEvaluacionesView(APIView):
    """GET /api/evaluaciones/misfichas/ - Historial de auditorías del usuario en sesión."""

    def get(self, request):
        evals = (
            Evaluacion.objects.filter(usuario=request.user)
            .select_related('software')
            .order_by('-fecha_ultima_modificacion')
        )
        serializer = EvaluacionResumenSerializer(evals, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CatalogoTOEView(APIView):
    """GET /api/catalogo/ - Catálogo TOE con factores y 61 subfactores."""

    def get(self, request):
        factores = Factor.objects.prefetch_related('subfactores', 'dimension').all()
        serializer = FactorSerializer(factores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class IniciarEvaluacionView(APIView):
    """POST /api/evaluaciones/iniciar/ - Crea o recupera proyecto y respuestas por defecto."""

    def post(self, request):
        try:
            data = request.data or {}
            nombre_soft = data.get('nombre', '').strip()
            if not nombre_soft:
                return Response(
                    {'error': 'El nombre del software es obligatorio'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            software = SoftwareObjetivo.objects.filter(nombre=nombre_soft).first()
            if not software:
                software = SoftwareObjetivo.objects.create(
                    nombre=nombre_soft,
                    version=data.get('version', '1.0'),
                    proveedor=data.get('proveedor', 'Comunidad Abierta'),
                )

            evaluacion = Evaluacion.objects.filter(
                usuario=request.user,
                software=software,
                estado='En Progreso',
            ).first()
            if not evaluacion:
                evaluacion = Evaluacion.objects.create(
                    usuario=request.user,
                    software=software,
                )

            factores = Factor.objects.prefetch_related('subfactores').all()
            for factor in factores:
                DetalleEvaluacionFactor.objects.get_or_create(
                    evaluacion=evaluacion,
                    factor=factor,
                    defaults={'importancia_decisor': factor.importancia_sugerida},
                )
                for subf in factor.subfactores.all():
                    RespuestaEvaluacion.objects.get_or_create(
                        evaluacion=evaluacion,
                        subfactor=subf,
                        defaults={'valor_likert': 1},
                    )

            return Response({'evaluacion_id': evaluacion.id}, status=status.HTTP_201_CREATED)

        except Exception as e:
            print('ERROR EN INICIAR EVALUACION:', str(e))
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DetalleEvaluacionView(APIView):
    """GET /api/evaluaciones/<id>/ - Carga respuestas y decisiones guardadas para reanudar."""

    def get(self, request, eval_id):
        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        respuestas = RespuestaEvaluacion.objects.filter(evaluacion=evaluacion)
        detalles = DetalleEvaluacionFactor.objects.filter(evaluacion=evaluacion)

        return Response(
            {
                'evaluacion_id': evaluacion.id,
                'estado': evaluacion.estado,
                'software': SoftwareSerializer(evaluacion.software).data,
                'puntajes': {str(r.subfactor_id): r.valor_likert for r in respuestas},
                'decisiones': {
                    str(d.factor_id): float(d.importancia_decisor) for d in detalles
                },
            },
            status=status.HTTP_200_OK,
        )


class GuardarProgresoView(APIView):
    """POST /api/evaluaciones/autosave/ - Guarda cada clic del Wizard en tiempo real."""

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        puntajes = request.data.get('puntajes', {})
        decisiones = request.data.get('decisiones', {})

        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        if evaluacion.estado == 'Calculado':
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
                ).update(valor_likert=likert)

            for fac_id, val_dec in decisiones.items():
                importancia = float(val_dec)
                if importancia < 0 or importancia > 3:
                    continue
                DetalleEvaluacionFactor.objects.filter(
                    evaluacion=evaluacion,
                    factor_id=fac_id,
                ).update(importancia_decisor=val_dec)

            Evaluacion.objects.filter(pk=evaluacion.pk).update(
                fecha_ultima_modificacion=timezone.now(),
            )

            return Response({'status': 'Sincronizado'}, status=status.HTTP_200_OK)
        except Exception as e:
            print('ERROR EN AUTOSAVE:', str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CalcularDictamenView(APIView):
    """POST /api/evaluaciones/calcular/ - Ejecuta el motor matemático y devuelve la Matriz FODA."""

    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        evaluacion, error_response = _get_evaluacion_usuario(request, eval_id)
        if error_response:
            return error_response

        try:
            evaluacion_procesada = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)
            Evaluacion.objects.filter(pk=evaluacion_procesada.id).update(estado='Calculado')
            evaluacion_procesada.refresh_from_db()

            serializer = EvaluacionSerializer(evaluacion_procesada)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            print('ERROR EN CALCULAR DICTAMEN:', str(e))
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
