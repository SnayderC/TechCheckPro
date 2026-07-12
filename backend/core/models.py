from django.db import models
from django.contrib.auth.models import AbstractUser
from decimal import Decimal

class Usuario(AbstractUser):
    """
    Entidad USUARIO: Gestiona credenciales, roles y auditoría.
    """
    ROLES = (
        ('ADMIN', 'Administrador Global'),
        ('EVALUADOR', 'Evaluador TI'),
    )
    rol = models.CharField(max_length=15, choices=ROLES, default='EVALUADOR')
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_rol_display()})"


class SoftwareObjetivo(models.Model):
    """
    Entidad SOFTWARE_OBJETIVO: Almacena los metadatos del software auditado.
    """
    nombre = models.CharField(max_length=150)
    version = models.CharField(max_length=50)
    proveedor = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.nombre} v{self.version} ({self.proveedor})"


class DimensionTOE(models.Model):
    """
    Entidad DIMENSION_TOE: Contenedor macro (Tecnológica, Organizacional, Económica).
    """
    nombre_dimension = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nombre_dimension


class Factor(models.Model):
    """
    Entidad FACTOR: Agrupa criterios específicos bajo una dimensión.
    """
    ALCANCES = (
        ('Interno', 'Interno'),
        ('Externo', 'Externo'),
        ('Ambos', 'Ambos'),
    )
    dimension = models.ForeignKey(DimensionTOE, on_delete=models.CASCADE, related_name='factores')
    nombre_factor = models.CharField(max_length=150)
    importancia_sugerida = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('2.00'))
    alcance = models.CharField(max_length=10, choices=ALCANCES, default='Externo')

    def __str__(self):
        return f"[{self.dimension.nombre_dimension[:3].upper()}] {self.nombre_factor}"


class Subfactor(models.Model):
    """
    Entidad SUBFACTOR: Criterios atómicos de evaluación (Los 61 ítems).
    """
    factor = models.ForeignKey(Factor, on_delete=models.CASCADE, related_name='subfactores')
    enunciado_pregunta = models.TextField()

    def __str__(self):
        return f"{self.factor.nombre_factor} - {self.enunciado_pregunta[:50]}..."


class Evaluacion(models.Model):
    """
    Entidad EVALUACION: Cabecera que enlaza al usuario con el software.
    """
    ESTADOS = (
        ('En Progreso', 'En Progreso'),
        ('Pausado', 'Pausado'),
        ('Calculado', 'Calculado'),
        ('Bloqueado', 'Bloqueado/Solo Lectura'),
    )
    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='evaluaciones')
    software = models.ForeignKey(SoftwareObjetivo, on_delete=models.PROTECT, related_name='evaluaciones')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_ultima_modificacion = models.DateTimeField(auto_now=True)
    fecha_emision_dictamen = models.DateTimeField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='En Progreso')
    archivado = models.BooleanField(default=False)
    
    # Promedios calculados decimales (Sustituyen la lógica empírica del GUIOSAD viejo)
    promedio_T = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    promedio_O = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    promedio_E = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    dictamen_final = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Auditoría #{self.id}: {self.software.nombre} - Estado: {self.estado}"


class DetalleEvaluacionFactor(models.Model):
    """
    Entidad DETALLE_EVALUACION_FACTOR: Registra la importancia personalizada por el decisor 
    y la clasificación FODA calculada para un factor específico en una auditoría.
    """
    evaluacion = models.ForeignKey(Evaluacion, on_delete=models.CASCADE, related_name='detalles_factor')
    factor = models.ForeignKey(Factor, on_delete=models.PROTECT)
    
    # Valores exactos sin división entera (Ej: 2.50)
    importancia_decisor = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('2.00'))
    importancia_relativa = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('2.00'))
    resultado_foda = models.CharField(max_length=20, blank=True, null=True) # Fortaleza, Oportunidad, Debilidad, Amenaza

    class Meta:
        unique_together = ('evaluacion', 'factor')


class RespuestaEvaluacion(models.Model):
    """
    Entidad RESPUESTA_EVALUACION: Captura la calificación Likert (1 al 4) por cada subfactor.
    """
    evaluacion = models.ForeignKey(Evaluacion, on_delete=models.CASCADE, related_name='respuestas')
    subfactor = models.ForeignKey(Subfactor, on_delete=models.PROTECT)
    valor_likert = models.PositiveSmallIntegerField(default=1) # 1: No cumple, 2: Desconoce, 3: Parcial, 4: Total
    respondido = models.BooleanField(default=False)

    class Meta:
        unique_together = ('evaluacion', 'subfactor')


class AuditLog(models.Model):
    """RF-06: trazabilidad de acciones sobre evaluaciones."""

    ACCIONES = (
        ('CREAR', 'Creación de proyecto'),
        ('AUTOSAVE', 'Autoguardado'),
        ('CALCULAR', 'Cálculo de dictamen'),
        ('BLOQUEAR', 'Cierre y bloqueo'),
        ('REABRIR', 'Reapertura por administrador'),
        ('SIMULAR', 'Simulación What-If'),
        ('PAUSAR', 'Pausa de evaluación'),
        ('ARCHIVAR', 'Archivo de proyecto'),
    )

    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='auditorias')
    evaluacion = models.ForeignKey(
        Evaluacion, on_delete=models.CASCADE, related_name='logs', null=True, blank=True,
    )
    accion = models.CharField(max_length=20, choices=ACCIONES)
    detalle = models.TextField(blank=True, default='')
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.accion} — {self.usuario.username} — {self.fecha:%Y-%m-%d %H:%M}'