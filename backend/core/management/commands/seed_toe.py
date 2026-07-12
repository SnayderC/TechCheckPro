import os
import csv
from decimal import Decimal
from django.core.management.base import BaseCommand
from core.models import DimensionTOE, Factor, Subfactor

class Command(BaseCommand):
    help = 'Pobla la base de datos con el catálogo oficial TOE desde los archivos CSV originales.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Sincronizando Catálogo TOE en PostgreSQL...")
        
        # 1. Crear las 3 Dimensiones
        dims = {}
        for nombre in ['Tecnológica', 'Organizacional', 'Económica']:
            dim, _ = DimensionTOE.objects.get_or_create(nombre_dimension=nombre)
            dims[nombre] = dim
            
        # Rutas a archivos CSV en backend/core/data/ o carpeta raíz
        factors_path = 'factors.csv'
        data_path = 'guiosad_data.csv'
        
        if not os.path.exists(factors_path) or not os.path.exists(data_path):
            self.stdout.write(self.style.WARNING("No se encontraron los CSV en la raíz, intentando en core/data/..."))
            factors_path = os.path.join('core', 'data', 'factors.csv')
            data_path = os.path.join('core', 'data', 'guiosad_data.csv')

        # 2. Cargar Factores
        factores_dict = {}
        if os.path.exists(factors_path):
            with open(factors_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter='\t')
                for row in reader:
                    nombre_factor = row['Factor'].strip()
                    # Si no tiene dimensión explícita en factors.csv, la inferimos del segundo archivo
                    factores_dict[nombre_factor] = {
                        'sugerida': Decimal(row['Sugerida'].strip()),
                        'alcance': row['Alcance'].strip(),
                    }

        # 3. Cargar Subfactores cruzando con guiosad_data.csv
        if os.path.exists(data_path):
            with open(data_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter='\t')
                for row in reader:
                    dim_nombre = row['Dimensión'].strip()
                    fac_nombre = row['Factor'].strip()
                    pregunta = row['Subfactor'].strip()

                    dim_obj = dims.get(dim_nombre)
                    meta_fac = factores_dict.get(fac_nombre, {'sugerida': Decimal('2.00'), 'alcance': 'Externo'})

                    factor_obj, created = Factor.objects.get_or_create(
                        nombre_factor=fac_nombre,
                        dimension=dim_obj,
                        defaults={
                            'importancia_sugerida': meta_fac['sugerida'],
                            'alcance': meta_fac['alcance'],
                        },
                    )
                    if not created:
                        factor_obj.importancia_sugerida = meta_fac['sugerida']
                        factor_obj.alcance = meta_fac['alcance']
                        factor_obj.save(update_fields=['importancia_sugerida', 'alcance'])
                    
                    Subfactor.objects.get_or_create(
                        factor=factor_obj,
                        enunciado_pregunta=pregunta
                    )
            self.stdout.write(self.style.SUCCESS("¡Catálogo TOE de 61 Subfactores cargado exitosamente!"))
        else:
            self.stdout.write(self.style.ERROR("Error: No se encontró el archivo guiosad_data.csv"))