from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from core.models import (
    Usuario,
    SoftwareObjetivo,
    DimensionTOE,
    Factor,
    Subfactor,
    Evaluacion,
    DetalleEvaluacionFactor,
    RespuestaEvaluacion,
    AuditLog,
)


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'email', 'rol', 'is_active')
    fieldsets = UserAdmin.fieldsets + (('Rol TechCheck', {'fields': ('rol',)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (('Rol TechCheck', {'fields': ('rol',)}),)


admin.site.register(SoftwareObjetivo)
admin.site.register(DimensionTOE)
admin.site.register(Factor)
admin.site.register(Subfactor)
admin.site.register(Evaluacion)
admin.site.register(DetalleEvaluacionFactor)
admin.site.register(RespuestaEvaluacion)
admin.site.register(AuditLog)
