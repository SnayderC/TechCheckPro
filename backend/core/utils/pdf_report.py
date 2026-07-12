"""Generación de PDF del dictamen (RF-07) en el servidor."""
from io import BytesIO

from django.template.loader import render_to_string


def generar_pdf_dictamen(contexto):
    try:
        from xhtml2pdf import pisa
    except ImportError as exc:
        raise ImportError(
            'Instale xhtml2pdf: pip install xhtml2pdf',
        ) from exc

    html = render_to_string('reporte_dictamen.html', contexto)
    buffer = BytesIO()
    pisa.CreatePDF(html, dest=buffer, encoding='utf-8')
    buffer.seek(0)
    return buffer
