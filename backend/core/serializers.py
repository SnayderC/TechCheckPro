from rest_framework import serializers
from core.models import SoftwareObjetivo, Factor, Subfactor, Evaluacion, DetalleEvaluacionFactor


class SubfactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subfactor
        fields = ['id', 'enunciado_pregunta']


class FactorSerializer(serializers.ModelSerializer):
    subfactores = SubfactorSerializer(many=True, read_only=True)
    dimension_nombre = serializers.ReadOnlyField(source='dimension.nombre_dimension')

    class Meta:
        model = Factor
        fields = [
            'id', 'nombre_factor', 'dimension_nombre',
            'importancia_sugerida', 'alcance', 'subfactores',
        ]


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
        fields = [
            'factor', 'factor_nombre', 'dimension_nombre', 'alcance',
            'importancia_decisor', 'importancia_relativa', 'resultado_foda',
        ]


class EvaluacionResumenSerializer(serializers.ModelSerializer):
    software = SoftwareSerializer(read_only=True)

    class Meta:
        model = Evaluacion
        fields = [
            'id', 'software', 'fecha_inicio',
            'fecha_ultima_modificacion', 'estado',
        ]


class EvaluacionSerializer(serializers.ModelSerializer):
    software = SoftwareSerializer(read_only=True)
    detalles_factor = DetalleFactorSerializer(many=True, read_only=True)
    promedios_dimensiones = serializers.SerializerMethodField()
    clase_dictamen = serializers.SerializerMethodField()
    desglose_foda = serializers.SerializerMethodField()

    class Meta:
        model = Evaluacion
        fields = [
            'id', 'software', 'fecha_inicio', 'fecha_ultima_modificacion', 'estado',
            'promedio_T', 'promedio_O', 'promedio_E', 'dictamen_final', 'detalles_factor',
            'promedios_dimensiones', 'clase_dictamen', 'desglose_foda',
        ]

    def get_promedios_dimensiones(self, obj):
        return {
            'Tecnologica': float(obj.promedio_T),
            'Organizacional': float(obj.promedio_O),
            'Economica': float(obj.promedio_E),
        }

    def get_clase_dictamen(self, obj):
        if not obj.dictamen_final:
            return 'CLASE C'
        if obj.dictamen_final.startswith('A-CLASS'):
            return 'CLASE A'
        if obj.dictamen_final.startswith('B-CLASS'):
            return 'CLASE B'
        return 'CLASE C'

    @staticmethod
    def _item_foda(detalle):
        factor = detalle.factor
        return {
            'nombre': factor.nombre_factor,
            'factor': factor.nombre_factor,
            'dimension': factor.dimension.nombre_dimension,
            'importancia': float(detalle.importancia_relativa),
            'alcance': factor.alcance,
        }

    def get_desglose_foda(self, obj):
        desglose = {
            'fortalezas': [],
            'oportunidades': [],
            'debilidades': [],
            'amenazas': [],
        }
        detalles = obj.detalles_factor.select_related(
            'factor', 'factor__dimension',
        ).all()
        for detalle in detalles:
            item = self._item_foda(detalle)
            resultado = detalle.resultado_foda
            if resultado == 'Fortaleza':
                desglose['fortalezas'].append(item)
            elif resultado == 'Oportunidad':
                desglose['oportunidades'].append(item)
            elif resultado == 'Debilidad':
                desglose['debilidades'].append(item)
            elif resultado == 'Amenaza':
                desglose['amenazas'].append(item)
        return desglose
