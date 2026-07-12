"""
Lógica de cálculo GUIOSAD — réplica del prototipo Flexx (guiosad.html).

Paso 1-2: IR = floor((idx(IS) + idx(ID)) / 2) sobre escala 1-4.
Factores con IR = Irrelevante (índice 0) se excluyen del análisis FODA.
Paso 5-6: dictamen A=Adoptar, B=Condicionado, C=Rechazar (como GUIOS PRO original).
"""

NIVELES_IMPORTANCIA = ('Irrelevante', 'Opcional', 'Importante', 'Fundamental')


def normalizar_nivel(valor):
    """Convierte un valor a entero 1-4 (escala GUIOSAD)."""
    return max(1, min(4, int(round(float(valor)))))


def calcular_importancia_relativa(is_valor, id_valor):
    """
    Réplica de update_results() en guiosad.html:
    r = floor((index(IS) + index(ID)) / 2)
    Retorna (valor 1-4, etiqueta).
    """
    is_n = normalizar_nivel(is_valor)
    id_n = normalizar_nivel(id_valor)
    r = (is_n - 1 + id_n - 1) // 2
    return r + 1, NIVELES_IMPORTANCIA[r]


def es_factor_relevante(ir_valor):
    """r > 0 en el prototipo original — excluye Irrelevante."""
    return normalizar_nivel(ir_valor) >= 2


def etiqueta_importancia(valor):
    return NIVELES_IMPORTANCIA[normalizar_nivel(valor) - 1]


def clasificar_foda(promedio_likert, alcance):
    """PM >= 3 → positivo; PM < 3 → negativo. Ecuación 5.3 / btn_sub_pressed."""
    es_alto = float(promedio_likert) >= 3.0
    if alcance == 'Interno':
        return 'Fortaleza' if es_alto else 'Debilidad'
    return 'Oportunidad' if es_alto else 'Amenaza'


def resolver_dictamen(detalles_evaluados):
    """
    Réplica de compute_recommendation() en guiosad.html.
    detalles_evaluados: iterable de dicts con keys 'resultado_foda', 'ir_etiqueta'
    """
    hay_rechazo = False
    hay_condicionado = False

    for det in detalles_evaluados:
        foda = det['resultado_foda']
        ir_label = det['ir_etiqueta']
        if foda not in ('Debilidad', 'Amenaza'):
            continue
        if ir_label in ('Importante', 'Fundamental'):
            hay_rechazo = True
        elif ir_label == 'Opcional':
            hay_condicionado = True

    if hay_rechazo:
        return (
            'C-CLASS',
            'C-CLASS: Se sugiere analizar la adopción y debería ser pospuesta. '
            'Se han detectado amenazas y/o debilidades en factores cuya importancia '
            'relativa es importante o fundamental. La organización debe proporcionar '
            'los recursos necesarios que garanticen una adopción satisfactoria.',
        )
    if hay_condicionado:
        return (
            'B-CLASS',
            'B-CLASS: Es posible adoptar, con matices. Se han detectado amenazas y/o '
            'debilidades en características cuya importancia relativa es opcional. '
            'Sugerimos realizar una segunda evaluación del software más específica.',
        )
    return (
        'A-CLASS',
        'A-CLASS: Adoptar el FLOSS seleccionado. Todos los factores evaluados han '
        'sido identificados como Oportunidades y/o Fortalezas. La organización cumple '
        'satisfactoriamente con los requisitos TOE.',
    )
