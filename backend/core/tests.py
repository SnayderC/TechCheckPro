from decimal import Decimal

from django.test import TestCase

from core.models import (
    DimensionTOE,
    Factor,
    Subfactor,
    Usuario,
    SoftwareObjetivo,
    Evaluacion,
    DetalleEvaluacionFactor,
    RespuestaEvaluacion,
)
from core.utils.guiosad_engine import MotorGUIOSAD


class MotorGUIOSADTestCase(TestCase):
    """Valida umbrales de Clase A, B y C del motor altimétrico TOE."""

    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='evaluador_test',
            password='testpass123',
            email='test@unemi.edu.ec',
        )
        self.software = SoftwareObjetivo.objects.create(
            nombre='Software FLOSS Test',
            version='1.0',
            proveedor='Comunidad',
        )
        self.dim_tec = DimensionTOE.objects.create(nombre_dimension='Tecnológica')
        self.dim_org = DimensionTOE.objects.create(nombre_dimension='Organizacional')
        self.dim_eco = DimensionTOE.objects.create(nombre_dimension='Económica')

    def _crear_factor_con_respuesta(self, dimension, nombre, alcance, imp_sugerida, imp_decisor, likert):
        factor = Factor.objects.create(
            dimension=dimension,
            nombre_factor=nombre,
            importancia_sugerida=Decimal(str(imp_sugerida)),
            alcance=alcance,
        )
        subfactor = Subfactor.objects.create(
            factor=factor,
            enunciado_pregunta=f'Pregunta de prueba para {nombre}',
        )
        return factor, subfactor, likert

    def _inicializar_evaluacion(self, factores_config):
        evaluacion = Evaluacion.objects.create(usuario=self.usuario, software=self.software)
        for factor, subfactor, likert, imp_decisor in factores_config:
            DetalleEvaluacionFactor.objects.create(
                evaluacion=evaluacion,
                factor=factor,
                importancia_decisor=Decimal(str(imp_decisor)),
            )
            RespuestaEvaluacion.objects.create(
                evaluacion=evaluacion,
                subfactor=subfactor,
                valor_likert=likert,
            )
        return evaluacion

    def test_puntaje_perfecto_emite_clase_c(self):
        """Likert 4 en todos los factores → solo Fortalezas/Oportunidades → CLASE C."""
        f1, sf1, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Compatibilidad', 'Interno', 2.0, 2.0, 4
        )
        f2, sf2, _ = self._crear_factor_con_respuesta(
            self.dim_org, 'Formación', 'Externo', 2.0, 2.0, 4
        )
        f3, sf3, _ = self._crear_factor_con_respuesta(
            self.dim_eco, 'Costo Total', 'Interno', 2.0, 2.0, 4
        )

        evaluacion = self._inicializar_evaluacion([
            (f1, sf1, 4, 2.0),
            (f2, sf2, 4, 2.0),
            (f3, sf3, 4, 2.0),
        ])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)

        self.assertEqual(resultado.estado, 'Calculado')
        self.assertIn('C-CLASS', resultado.dictamen_final)
        self.assertGreaterEqual(resultado.promedio_T, Decimal('99.00'))
        self.assertFalse(
            resultado.detalles_factor.filter(resultado_foda__in=['Debilidad', 'Amenaza']).exists()
        )

    def test_factor_critico_negativo_emite_clase_a(self):
        """Debilidad/Amenaza con importancia relativa >= 2.0 → CLASE A (Rechazar)."""
        f_critico, sf_critico, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Seguridad', 'Interno', 2.5, 2.5, 1
        )
        f_ok, sf_ok, _ = self._crear_factor_con_respuesta(
            self.dim_org, 'Soporte', 'Externo', 2.0, 2.0, 4
        )

        evaluacion = self._inicializar_evaluacion([
            (f_critico, sf_critico, 1, 2.5),
            (f_ok, sf_ok, 4, 2.0),
        ])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)

        self.assertEqual(resultado.estado, 'Calculado')
        self.assertIn('A-CLASS', resultado.dictamen_final)
        detalle_critico = resultado.detalles_factor.get(factor=f_critico)
        self.assertEqual(detalle_critico.resultado_foda, 'Debilidad')
        self.assertGreaterEqual(detalle_critico.importancia_relativa, Decimal('2.00'))

    def test_factor_no_critico_negativo_emite_clase_b(self):
        """Debilidad con importancia relativa < 2.0 → CLASE B (Condicionado), no CLASE A."""
        f_menor, sf_menor, _ = self._crear_factor_con_respuesta(
            self.dim_eco, 'Documentación', 'Interno', 1.0, 1.0, 2
        )
        f_ok, sf_ok, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Interoperabilidad', 'Externo', 2.0, 2.0, 4
        )

        evaluacion = self._inicializar_evaluacion([
            (f_menor, sf_menor, 2, 1.0),
            (f_ok, sf_ok, 4, 2.0),
        ])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)

        self.assertEqual(resultado.estado, 'Calculado')
        self.assertIn('B-CLASS', resultado.dictamen_final)
        self.assertNotIn('A-CLASS', resultado.dictamen_final)
        detalle_menor = resultado.detalles_factor.get(factor=f_menor)
        self.assertEqual(detalle_menor.resultado_foda, 'Debilidad')
        self.assertLess(detalle_menor.importancia_relativa, Decimal('2.00'))

    def test_importancia_relativa_usa_precision_decimal(self):
        """Verifica que la importancia relativa no sufre truncamiento entero."""
        f1, sf1, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Escalabilidad', 'Interno', 2.5, 1.5, 4
        )
        evaluacion = self._inicializar_evaluacion([(f1, sf1, 4, 1.5)])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)
        detalle = resultado.detalles_factor.get(factor=f1)

        self.assertEqual(detalle.importancia_relativa, Decimal('2.00'))


class EvaluacionSerializerTestCase(TestCase):
    """Valida que el serializer no falle al construir desglose FODA."""

    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            username='serializer_test',
            password='testpass123',
        )
        self.software = SoftwareObjetivo.objects.create(
            nombre='Odoo', version='17', proveedor='Odoo SA',
        )
        self.dim = DimensionTOE.objects.create(nombre_dimension='Tecnológica')
        self.factor = Factor.objects.create(
            dimension=self.dim,
            nombre_factor='Compatibilidad',
            importancia_sugerida=Decimal('2.00'),
            alcance='Interno',
        )
        self.subfactor = Subfactor.objects.create(
            factor=self.factor,
            enunciado_pregunta='¿Es compatible con Linux?',
        )
        self.evaluacion = Evaluacion.objects.create(
            usuario=self.usuario,
            software=self.software,
        )
        DetalleEvaluacionFactor.objects.create(
            evaluacion=self.evaluacion,
            factor=self.factor,
            importancia_decisor=Decimal('2.00'),
            importancia_relativa=Decimal('2.00'),
            resultado_foda='Fortaleza',
        )
        RespuestaEvaluacion.objects.create(
            evaluacion=self.evaluacion,
            subfactor=self.subfactor,
            valor_likert=4,
        )

    def test_desglose_foda_no_lanza_attribute_error(self):
        from core.serializers import EvaluacionSerializer

        data = EvaluacionSerializer(self.evaluacion).data
        self.assertEqual(len(data['desglose_foda']['fortalezas']), 1)
        self.assertEqual(data['desglose_foda']['fortalezas'][0]['nombre'], 'Compatibilidad')
        self.assertEqual(data['clase_dictamen'], 'CLASE C')


class EvaluacionAPITestCase(TestCase):
    """Valida permisos por usuario y reglas de negocio en los endpoints."""

    def setUp(self):
        self.user_a = Usuario.objects.create_user(username='user_a', password='pass12345')
        self.user_b = Usuario.objects.create_user(username='user_b', password='pass12345')
        self.software = SoftwareObjetivo.objects.create(
            nombre='Nextcloud', version='28', proveedor='Nextcloud GmbH',
        )
        self.dim = DimensionTOE.objects.create(nombre_dimension='Tecnológica')
        self.factor = Factor.objects.create(
            dimension=self.dim,
            nombre_factor='Seguridad',
            importancia_sugerida=Decimal('2.00'),
            alcance='Interno',
        )
        self.subfactor = Subfactor.objects.create(
            factor=self.factor,
            enunciado_pregunta='¿Tiene cifrado?',
        )
        self.eval_a = Evaluacion.objects.create(usuario=self.user_a, software=self.software)
        DetalleEvaluacionFactor.objects.create(
            evaluacion=self.eval_a,
            factor=self.factor,
            importancia_decisor=Decimal('2.00'),
        )
        RespuestaEvaluacion.objects.create(
            evaluacion=self.eval_a,
            subfactor=self.subfactor,
            valor_likert=2,
        )

    def _token(self, username, password):
        from rest_framework.test import APIClient
        client = APIClient()
        res = client.post('/api/token/', {'username': username, 'password': password})
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')
        return client

    def test_detalle_evaluacion_solo_propietario(self):
        client_b = self._token('user_b', 'pass12345')
        res = client_b.get(f'/api/evaluaciones/{self.eval_a.id}/')
        self.assertEqual(res.status_code, 404)

    def test_detalle_evaluacion_retorna_puntajes(self):
        client_a = self._token('user_a', 'pass12345')
        res = client_a.get(f'/api/evaluaciones/{self.eval_a.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['puntajes'][str(self.subfactor.id)], 2)

    def test_autosave_bloqueado_si_calculado(self):
        self.eval_a.estado = 'Calculado'
        self.eval_a.save()
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/autosave/', {
            'evaluacion_id': self.eval_a.id,
            'puntajes': {str(self.subfactor.id): 3},
            'decisiones': {str(self.factor.id): 2},
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_calcular_requiere_evaluacion_id_valido(self):
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/calcular/', {'evaluacion_id': 99999})
        self.assertEqual(res.status_code, 404)

    def test_iniciar_requiere_nombre(self):
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/iniciar/', {'nombre': '  '})
        self.assertEqual(res.status_code, 400)

