from core.models import DetalleEvaluacionFactor, RespuestaEvaluacion
from core.utils.guiosad_calculos import calcular_importancia_relativa, es_factor_relevante, normalizar_nivel


def validar_completitud(evaluacion):
    """
    RF-14: verifica que todos los subfactores relevantes estén calificados.
    Retorna (ok: bool, pendientes: list[dict]).
    """
    detalles = DetalleEvaluacionFactor.objects.filter(
        evaluacion=evaluacion,
    ).select_related('factor', 'factor__dimension')
    respuestas = {
        r.subfactor_id: r
        for r in RespuestaEvaluacion.objects.filter(evaluacion=evaluacion).select_related('subfactor')
    }

    pendientes_por_dimension = {}
    for detalle in detalles:
        f = detalle.factor
        is_val = normalizar_nivel(f.importancia_sugerida)
        id_val = normalizar_nivel(detalle.importancia_decisor)
        ir_val, _ = calcular_importancia_relativa(is_val, id_val)
        if not es_factor_relevante(ir_val):
            continue
        for subf in f.subfactores.all():
            resp = respuestas.get(subf.id)
            if not resp or not resp.respondido:
                dim = f.dimension.nombre_dimension
                pendientes_por_dimension.setdefault(dim, 0)
                pendientes_por_dimension[dim] += 1

    if not pendientes_por_dimension:
        return True, []

    mensajes = [
        {'dimension': dim, 'cantidad': cant}
        for dim, cant in pendientes_por_dimension.items()
    ]
    return False, mensajes
