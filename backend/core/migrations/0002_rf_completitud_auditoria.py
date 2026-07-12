# Generated manually for RF-06, RF-14, RF-15

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='softwareobjetivo',
            name='descripcion',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='evaluacion',
            name='archivado',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='evaluacion',
            name='fecha_emision_dictamen',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='respuestaevaluacion',
            name='respondido',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='evaluacion',
            name='estado',
            field=models.CharField(
                choices=[
                    ('En Progreso', 'En Progreso'),
                    ('Pausado', 'Pausado'),
                    ('Calculado', 'Calculado'),
                    ('Bloqueado', 'Bloqueado/Solo Lectura'),
                ],
                default='En Progreso',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('accion', models.CharField(choices=[('CREAR', 'Creación de proyecto'), ('AUTOSAVE', 'Autoguardado'), ('CALCULAR', 'Cálculo de dictamen'), ('BLOQUEAR', 'Cierre y bloqueo'), ('REABRIR', 'Reapertura por administrador'), ('SIMULAR', 'Simulación What-If'), ('PAUSAR', 'Pausa de evaluación'), ('ARCHIVAR', 'Archivo de proyecto')], max_length=20)),
                ('detalle', models.TextField(blank=True, default='')),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('evaluacion', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='core.evaluacion')),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='auditorias', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-fecha'],
            },
        ),
    ]
