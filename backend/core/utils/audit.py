from core.models import AuditLog


def registrar_auditoria(usuario, evaluacion, accion, detalle=''):
    """RF-06: inserta registro inalterable en audit_log."""
    AuditLog.objects.create(
        usuario=usuario,
        evaluacion=evaluacion,
        accion=accion,
        detalle=detalle[:500],
    )
