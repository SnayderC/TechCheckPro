from decimal import Decimal
from django.db import transaction
from core.models import Evaluacion, DetalleEvaluacionFactor, RespuestaEvaluacion

class MotorGUIOSAD:
    """
    Motor algorítmico desacoplado para el cálculo multidimensional TOE.
    Sustituye la lógica de scripts locales y corrige la pérdida de precisión por truncamiento.
    """
    @staticmethod
    @transaction.atomic
    def procesar_evaluacion(evaluacion_id):
        evaluacion = Evaluacion.objects.select_for_update().get(id=evaluacion_id)
        detalles_factor = DetalleEvaluacionFactor.objects.filter(evaluacion=evaluacion).select_related('factor', 'factor__dimension')
        respuestas = RespuestaEvaluacion.objects.filter(evaluacion=evaluacion).select_related('subfactor', 'subfactor__factor')
        
        # Mapear respuestas por factor para promediar Likert (1 al 4)
        puntajes_por_factor = {}
        for resp in respuestas:
            f_id = resp.subfactor.factor_id
            if f_id not in puntajes_por_factor:
                puntajes_por_factor[f_id] = []
            puntajes_por_factor[f_id].append(Decimal(resp.valor_likert))
            
        hay_clase_a = False
        hay_clase_b = False
        
        dim_totales = {'Tecnológica': [], 'Organizacional': [], 'Económica': []}
        
        for detalle in detalles_factor:
            f = detalle.factor
            # 1. Cálculo Decimal Exacto de Importancia Relativa (Sin división entera //)
            imp_sugerida = f.importancia_sugerida
            imp_decisor = detalle.importancia_decisor
            imp_relativa = (imp_sugerida + imp_decisor) / Decimal('2.00')
            detalle.importancia_relativa = round(imp_relativa, 2)
            
            # 2. Promedio de cumplimiento Likert en sus subfactores
            lista_likert = puntajes_por_factor.get(f.id, [Decimal('1.00')])
            promedio_likert = sum(lista_likert) / Decimal(len(lista_likert))
            
            # Almacenar para el promedio global de la dimensión TOE (Porcentaje 0-100%)
            porcentaje_factor = (promedio_likert / Decimal('4.00')) * Decimal('100.00')
            dim_nombre = f.dimension.nombre_dimension
            if dim_nombre in dim_totales:
                dim_totales[dim_nombre].append(porcentaje_factor)
            
            # 3. Clasificación FODA (Cruce entre cumplimiento y alcance)
            es_cumplimiento_alto = promedio_likert >= Decimal('3.00')
            alcance = f.alcance
            
            if es_cumplimiento_alto:
                if alcance == 'Interno':
                    detalle.resultado_foda = 'Fortaleza'
                else: # Externo o Ambos
                    detalle.resultado_foda = 'Oportunidad'
            else:
                if alcance == 'Interno':
                    detalle.resultado_foda = 'Debilidad'
                else: # Externo o Ambos
                    detalle.resultado_foda = 'Amenaza'
            
            detalle.save()
            
            # 4. Evaluación para Regla de Dictamen (Kerly / Matriz Recomendación)
            # Consideramos relevante para bloqueo crítico si la importancia relativa es >= 2.0 (Importante/Fundamental)
            es_factor_critico = detalle.importancia_relativa >= Decimal('2.00')
            es_negativo = detalle.resultado_foda in ['Debilidad', 'Amenaza']
            
            if es_negativo and es_factor_critico:
                hay_clase_a = True
            elif es_negativo and not es_factor_critico:
                hay_clase_b = True

        # 5. Promedios Globales TOE
        evaluacion.promedio_T = round(sum(dim_totales['Tecnológica']) / Decimal(max(1, len(dim_totales['Tecnológica']))), 2)
        evaluacion.promedio_O = round(sum(dim_totales['Organizacional']) / Decimal(max(1, len(dim_totales['Organizacional']))), 2)
        evaluacion.promedio_E = round(sum(dim_totales['Económica']) / Decimal(max(1, len(dim_totales['Económica']))), 2)
        
        # 6. Dictamen Final Oficial
        if hay_clase_a:
            evaluacion.dictamen_final = "A-CLASS: No es posible adoptar. Se han detectado amenazas y/o debilidades en factores cuya importancia relativa es fundamental o importante. Es indispensable proporcionar recursos para mitigar las brechas críticas."
        elif hay_clase_b:
            evaluacion.dictamen_final = "B-CLASS: Es posible adoptar con condiciones. Se detectaron debilidades menores en criterios opcionales. Se sugiere revisar planes de mejora a mediano plazo."
        else:
            evaluacion.dictamen_final = "C-CLASS: Adopción Viable Óptima. Todos los factores críticos han sido identificados como Oportunidades o Fortalezas. La organización cumple satisfactoriamente con los requisitos TOE."
            
        evaluacion.estado = 'Calculado'
        evaluacion.save()
        return evaluacion