from decimal import Decimal
from django.db import transaction
from core.models import Evaluacion, DetalleEvaluacionFactor, RespuestaEvaluacion
from core.utils.guiosad_calculos import (
    calcular_importancia_relativa,
    clasificar_foda,
    es_factor_relevante,
    normalizar_nivel,
    resolver_dictamen,
)


class MotorGUIOSAD:
    """
    Motor algorítmico GUIOSAD — misma lógica que guiosad.html (Flexx).
    Solo la interfaz cambió; los cálculos de IR, FODA y dictamen se mantienen.
    """

    @staticmethod
    @transaction.atomic
    def procesar_evaluacion(evaluacion_id):
        evaluacion = Evaluacion.objects.select_for_update().get(id=evaluacion_id)
        detalles_factor = (
            DetalleEvaluacionFactor.objects.filter(evaluacion=evaluacion)
            .select_related('factor', 'factor__dimension')
        )
        respuestas = (
            RespuestaEvaluacion.objects.filter(evaluacion=evaluacion)
            .select_related('subfactor', 'subfactor__factor')
        )

        puntajes_por_factor = {}
        for resp in respuestas:
            f_id = resp.subfactor.factor_id
            puntajes_por_factor.setdefault(f_id, []).append(Decimal(resp.valor_likert))

        dim_totales = {'Tecnológica': [], 'Organizacional': [], 'Económica': []}
        detalles_para_dictamen = []

        for detalle in detalles_factor:
            f = detalle.factor
            is_val = normalizar_nivel(f.importancia_sugerida)
            id_val = normalizar_nivel(detalle.importancia_decisor)
            ir_val, ir_etiqueta = calcular_importancia_relativa(is_val, id_val)

            detalle.importancia_relativa = Decimal(str(ir_val))

            if not es_factor_relevante(ir_val):
                detalle.resultado_foda = None
                detalle.save()
                continue

            lista_likert = puntajes_por_factor.get(f.id, [Decimal('1.00')])
            promedio_likert = sum(lista_likert) / Decimal(len(lista_likert))

            porcentaje_factor = (promedio_likert / Decimal('4.00')) * Decimal('100.00')
            dim_nombre = f.dimension.nombre_dimension
            if dim_nombre in dim_totales:
                dim_totales[dim_nombre].append(porcentaje_factor)

            detalle.resultado_foda = clasificar_foda(promedio_likert, f.alcance)
            detalle.save()

            detalles_para_dictamen.append({
                'resultado_foda': detalle.resultado_foda,
                'ir_etiqueta': ir_etiqueta,
            })

        evaluacion.promedio_T = round(
            sum(dim_totales['Tecnológica']) / Decimal(max(1, len(dim_totales['Tecnológica']))), 2
        )
        evaluacion.promedio_O = round(
            sum(dim_totales['Organizacional']) / Decimal(max(1, len(dim_totales['Organizacional']))), 2
        )
        evaluacion.promedio_E = round(
            sum(dim_totales['Económica']) / Decimal(max(1, len(dim_totales['Económica']))), 2
        )

        evaluacion.dictamen_final = resolver_dictamen(detalles_para_dictamen)[1]
        evaluacion.estado = 'Calculado'
        evaluacion.save()
        return evaluacion

    @staticmethod
    def simular(evaluacion_id, puntajes_override=None, decisiones_override=None):
        """RF-12: recalcula dictamen en memoria sin persistir cambios."""
        evaluacion = Evaluacion.objects.get(id=evaluacion_id)
        detalles_factor = (
            DetalleEvaluacionFactor.objects.filter(evaluacion=evaluacion)
            .select_related('factor', 'factor__dimension')
        )
        respuestas = (
            RespuestaEvaluacion.objects.filter(evaluacion=evaluacion)
            .select_related('subfactor', 'subfactor__factor')
        )

        puntajes_override = puntajes_override or {}
        decisiones_override = decisiones_override or {}

        puntajes_por_factor = {}
        for resp in respuestas:
            sf_id = str(resp.subfactor_id)
            val = puntajes_override.get(sf_id, puntajes_override.get(resp.subfactor_id, resp.valor_likert))
            f_id = resp.subfactor.factor_id
            puntajes_por_factor.setdefault(f_id, []).append(Decimal(val))

        dim_totales = {'Tecnológica': [], 'Organizacional': [], 'Económica': []}
        detalles_para_dictamen = []
        desglose = {'fortalezas': [], 'oportunidades': [], 'debilidades': [], 'amenazas': []}

        for detalle in detalles_factor:
            f = detalle.factor
            fac_id = str(f.id)
            id_raw = decisiones_override.get(fac_id, decisiones_override.get(f.id, detalle.importancia_decisor))
            is_val = normalizar_nivel(f.importancia_sugerida)
            id_val = normalizar_nivel(id_raw)
            ir_val, ir_etiqueta = calcular_importancia_relativa(is_val, id_val)

            if not es_factor_relevante(ir_val):
                continue

            lista_likert = puntajes_por_factor.get(f.id, [Decimal('1.00')])
            promedio_likert = sum(lista_likert) / Decimal(len(lista_likert))
            porcentaje_factor = (promedio_likert / Decimal('4.00')) * Decimal('100.00')
            dim_nombre = f.dimension.nombre_dimension
            if dim_nombre in dim_totales:
                dim_totales[dim_nombre].append(porcentaje_factor)

            resultado_foda = clasificar_foda(promedio_likert, f.alcance)
            item = {
                'nombre': f.nombre_factor,
                'dimension': dim_nombre,
                'importancia': float(ir_val),
                'alcance': f.alcance,
                'resultado_foda': resultado_foda,
            }
            if resultado_foda == 'Fortaleza':
                desglose['fortalezas'].append(item)
            elif resultado_foda == 'Oportunidad':
                desglose['oportunidades'].append(item)
            elif resultado_foda == 'Debilidad':
                desglose['debilidades'].append(item)
            else:
                desglose['amenazas'].append(item)

            detalles_para_dictamen.append({
                'resultado_foda': resultado_foda,
                'ir_etiqueta': ir_etiqueta,
            })

        promedio_T = float(
            sum(dim_totales['Tecnológica']) / Decimal(max(1, len(dim_totales['Tecnológica'])))
        )
        promedio_O = float(
            sum(dim_totales['Organizacional']) / Decimal(max(1, len(dim_totales['Organizacional'])))
        )
        promedio_E = float(
            sum(dim_totales['Económica']) / Decimal(max(1, len(dim_totales['Económica'])))
        )

        clase, dictamen_texto = resolver_dictamen(detalles_para_dictamen)
        clase_map = {'A-CLASS': 'CLASE A', 'B-CLASS': 'CLASE B', 'C-CLASS': 'CLASE C'}

        return {
            'promedios_dimensiones': {
                'Tecnologica': round(promedio_T, 2),
                'Organizacional': round(promedio_O, 2),
                'Economica': round(promedio_E, 2),
            },
            'clase_dictamen': clase_map.get(clase, clase),
            'dictamen_final': dictamen_texto,
            'desglose_foda': desglose,
        }
