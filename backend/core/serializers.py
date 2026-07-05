from rest_framework import serializers
from core.models import SoftwareObjetivo, DimensionTOE, Factor, Subfactor, Evaluacion, DetalleEvaluacionFactor

class SubfactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subfactor
        fields = ['id', 'enunciado_pregunta']

class FactorSerializer(serializers.ModelSerializer):
    subfactores = SubfactorSerializer(many=True, read_only=True)
    dimension_nombre = serializers.ReadOnlyField(source='dimension.nombre_dimension')
    
    class Meta:
        model = Factor
        fields = ['id', 'nombre_factor', 'dimension_nombre', 'importancia_sugerida', 'alcance', 'subfactores']

class SoftwareSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoftwareObjetivo
        fields = ['id', 'nombre', 'version', 'proveedor']

class DetalleFactorSerializer(serializers.ModelSerializer):
    factor_nombre = serializers.ReadOnlyField(source='factor.nombre_factor')
    dimension_nombre = serializers.ReadOnlyField(source='factor.dimension.nombre_dimension')
    alcance = serializers.ReadOnlyField(source='factor.alcance')
    
    class Meta:
        model = DetalleEvaluacionFactor
        fields = ['factor', 'factor_nombre', 'dimension_nombre', 'alcance', 'importancia_decisor', 'importancia_relativa', 'resultado_foda']

class EvaluacionSerializer(serializers.ModelSerializer):
    software = SoftwareSerializer(read_only=True)
    detalles_factor = DetalleFactorSerializer(many=True, read_only=True)
    
    class Meta:
        model = Evaluacion
        fields = ['id', 'software', 'fecha_inicio', 'fecha_ultima_modificacion', 'estado', 'promedio_T', 'promedio_O', 'promedio_E', 'dictamen_final', 'detalles_factor']