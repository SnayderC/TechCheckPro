import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.models import (
    Factor, 
    Evaluacion, 
    SoftwareObjetivo, 
    DetalleEvaluacionFactor, 
    RespuestaEvaluacion, 
    Usuario
)
from core.serializers import FactorSerializer, EvaluacionSerializer
from core.utils.guiosad_engine import MotorGUIOSAD


class CatalogoTOEView(APIView):
    """
    GET /api/catalogo/ - Devuelve todos los factores y los 61 subfactores para el Wizard en React.
    """
    def get(self, request):
        factores = Factor.objects.prefetch_related('subfactores', 'dimension').all()
        serializer = FactorSerializer(factores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class IniciarEvaluacionView(APIView):
    """
    POST /api/evaluaciones/iniciar/ - Crea o recupera un proyecto y sus respuestas por defecto de forma blindada.
    """
    def post(self, request):
        try:
            data = request.data or {}
            
            # 1. SOLUCIÓN BLINDADA: Buscar si ya existe al menos un software con ese nombre para evitar MultipleObjectsReturned
            nombre_soft = data.get('nombre', 'ERP Corporativo FLOSS')
            software = SoftwareObjetivo.objects.filter(nombre=nombre_soft).first()
            if not software:
                software = SoftwareObjetivo.objects.create(
                    nombre=nombre_soft,
                    version=data.get('version', '2026.1'),
                    proveedor=data.get('proveedor', 'Comunidad Abierta')
                )
            
            # 2. Obtener o crear usuario de respaldo (Si no está logueado con sesión activa)
            if request.user and request.user.is_authenticated:
                user = request.user
            else:
                user, _ = Usuario.objects.get_or_create(
                    username="evaluador_temporal",
                    defaults={
                        "first_name": "Ing. Víctor",
                        "last_name": "Rea",
                        "email": "vreas@unemi.edu.ec",
                        "rol": "EVALUADOR"
                    }
                )
            
            # 3. Reutilizar evaluación si ya tiene una activa en progreso, o crearla
            evaluacion = Evaluacion.objects.filter(usuario=user, software=software, estado='En Progreso').first()
            if not evaluacion:
                evaluacion = Evaluacion.objects.create(usuario=user, software=software)
            
            # 4. Inicializar detalles y calificaciones Likert por defecto (Valor 1)
            factores = Factor.objects.prefetch_related('subfactores').all()
            for factor in factores:
                DetalleEvaluacionFactor.objects.get_or_create(
                    evaluacion=evaluacion, 
                    factor=factor,
                    defaults={'importancia_decisor': factor.importancia_sugerida}
                )
                for subf in factor.subfactores.all():
                    RespuestaEvaluacion.objects.get_or_create(
                        evaluacion=evaluacion, 
                        subfactor=subf, 
                        defaults={'valor_likert': 1}
                    )
                    
            return Response({'evaluacion_id': evaluacion.id}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print("ERROR EN INICIAR EVALUACION:", str(e))
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GuardarProgresoView(APIView):
    """
    POST /api/evaluaciones/autosave/ - Guarda cada clic del Wizard en tiempo real (Autosave).
    """
    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        puntajes = request.data.get('puntajes', {})
        decisiones = request.data.get('decisiones', {})
        
        try:
            evaluacion = Evaluacion.objects.get(id=eval_id)
            for sf_id, val in puntajes.items():
                RespuestaEvaluacion.objects.filter(evaluacion=evaluacion, subfactor_id=sf_id).update(valor_likert=val)
            for fac_id, val_dec in decisiones.items():
                DetalleEvaluacionFactor.objects.filter(evaluacion=evaluacion, factor_id=fac_id).update(importancia_decisor=val_dec)
            return Response({'status': 'Sincronizado'}, status=status.HTTP_200_OK)
        except Evaluacion.DoesNotExist:
            return Response({'error': 'Evaluación no encontrada en la base de datos'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print("ERROR EN AUTOSAVE:", str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CalcularDictamenView(APIView):
    """
    POST /api/evaluaciones/calcular/ - Ejecuta el motor matemático y devuelve la Matriz FODA.
    """
    def post(self, request):
        eval_id = request.data.get('evaluacion_id')
        try:
            # 1. Intentamos buscar la evaluación por el ID enviado por React
            evaluacion = None
            if eval_id:
                evaluacion = Evaluacion.objects.filter(id=eval_id).first()
            
            # 2. SOLUCIÓN INTELIGENTE: Si el ID no existe o no se envió, tomamos la última auditoría creada
            if not evaluacion:
                evaluacion = Evaluacion.objects.last()
                
            if not evaluacion:
                return Response(
                    {'error': 'No hay ninguna auditoría registrada en la base de datos aún.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. Procesamos matemáticamente con el motor FODA
            evaluacion_procesada = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)
            serializer = EvaluacionSerializer(evaluacion_procesada)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print("ERROR EN CALCULAR DICTAMEN:", str(e))
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)