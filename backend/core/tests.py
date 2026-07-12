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
from core.utils.guiosad_calculos import calcular_importancia_relativa, es_factor_relevante
from core.utils.guiosad_engine import MotorGUIOSAD


class GuiosadCalculosTestCase(TestCase):
    """Valida fórmulas idénticas a guiosad.html."""

    def test_ir_compatibilidad_opcional(self):
        """IS=Importante(3), ID=Opcional(2) → IR=Opcional (como captura GUIOS PRO)."""
        ir_val, ir_label = calcular_importancia_relativa(3, 2)
        self.assertEqual(ir_val, 2)
        self.assertEqual(ir_label, 'Opcional')

    def test_ir_irrelevante_excluye_factor(self):
        ir_val, ir_label = calcular_importancia_relativa(2, 1)
        self.assertEqual(ir_label, 'Irrelevante')
        self.assertFalse(es_factor_relevante(ir_val))


class MotorGUIOSADTestCase(TestCase):
    """Valida dictamen A/B/C como GUIOS PRO original."""

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

    def test_puntaje_perfecto_emite_clase_a_adoptar(self):
        """Likert 4 + IR relevante → Fortalezas/Oportunidades → CLASE A (Adoptar)."""
        f1, sf1, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Compatibilidad', 'Externo', 3, 3, 4
        )
        f2, sf2, _ = self._crear_factor_con_respuesta(
            self.dim_org, 'Formación', 'Interno', 3, 3, 4
        )

        evaluacion = self._inicializar_evaluacion([
            (f1, sf1, 4, 3),
            (f2, sf2, 4, 3),
        ])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)

        self.assertIn('A-CLASS', resultado.dictamen_final)
        self.assertFalse(
            resultado.detalles_factor.filter(resultado_foda__in=['Debilidad', 'Amenaza']).exists()
        )

    def test_factor_critico_negativo_emite_clase_c_rechazar(self):
        """Debilidad + IR Importante/Fundamental → CLASE C (Rechazar)."""
        f_critico, sf_critico, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Seguridad', 'Interno', 3, 3, 1
        )
        f_ok, sf_ok, _ = self._crear_factor_con_respuesta(
            self.dim_org, 'Soporte', 'Externo', 3, 3, 4
        )

        evaluacion = self._inicializar_evaluacion([
            (f_critico, sf_critico, 1, 3),
            (f_ok, sf_ok, 4, 3),
        ])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)

        self.assertIn('C-CLASS', resultado.dictamen_final)
        detalle_critico = resultado.detalles_factor.get(factor=f_critico)
        self.assertEqual(detalle_critico.resultado_foda, 'Debilidad')

    def test_factor_opcional_negativo_emite_clase_b(self):
        """Debilidad + IR Opcional → CLASE B, no CLASE C."""
        f_menor, sf_menor, _ = self._crear_factor_con_respuesta(
            self.dim_eco, 'Documentación', 'Interno', 2, 3, 2
        )
        f_ok, sf_ok, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Interoperabilidad', 'Externo', 3, 3, 4
        )

        evaluacion = self._inicializar_evaluacion([
            (f_menor, sf_menor, 2, 3),
            (f_ok, sf_ok, 4, 3),
        ])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)

        self.assertIn('B-CLASS', resultado.dictamen_final)
        self.assertNotIn('C-CLASS', resultado.dictamen_final)

    def test_factor_irrelevante_no_genera_foda(self):
        """IR Irrelevante → sin clasificación FODA (excluido del análisis)."""
        f_irr, sf_irr, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Portabilidad', 'Externo', 2, 1, 1
        )
        evaluacion = self._inicializar_evaluacion([(f_irr, sf_irr, 1, 1)])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)
        detalle = resultado.detalles_factor.get(factor=f_irr)

        self.assertIsNone(detalle.resultado_foda)
        self.assertIn('A-CLASS', resultado.dictamen_final)

    def test_importancia_relativa_guiosad(self):
        """IS=3, ID=2 → IR=2 (Opcional), misma fórmula que guiosad.html."""
        f1, sf1, _ = self._crear_factor_con_respuesta(
            self.dim_tec, 'Escalabilidad', 'Interno', 3, 2, 4
        )
        evaluacion = self._inicializar_evaluacion([(f1, sf1, 4, 2)])

        resultado = MotorGUIOSAD.procesar_evaluacion(evaluacion.id)
        detalle = resultado.detalles_factor.get(factor=f1)

        self.assertEqual(detalle.importancia_relativa, Decimal('2'))


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
            importancia_sugerida=Decimal('3.00'),
            alcance='Interno',
        )
        self.subfactor = Subfactor.objects.create(
            factor=self.factor,
            enunciado_pregunta='¿Es compatible con Linux?',
        )
        self.evaluacion = Evaluacion.objects.create(
            usuario=self.usuario,
            software=self.software,
            dictamen_final='A-CLASS: Adoptar.',
        )
        DetalleEvaluacionFactor.objects.create(
            evaluacion=self.evaluacion,
            factor=self.factor,
            importancia_decisor=Decimal('3.00'),
            importancia_relativa=Decimal('3.00'),
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
        self.assertEqual(data['clase_dictamen'], 'CLASE A')


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
            importancia_sugerida=Decimal('3.00'),
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

    def test_autosave_solo_marca_respondido_explicito(self):
        subfactor_b = Subfactor.objects.create(
            factor=self.factor,
            enunciado_pregunta='¿Tiene auditoría?',
        )
        RespuestaEvaluacion.objects.create(
            evaluacion=self.eval_a,
            subfactor=subfactor_b,
            valor_likert=1,
            respondido=False,
        )
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/autosave/', {
            'evaluacion_id': self.eval_a.id,
            'puntajes': {
                str(self.subfactor.id): 4,
                str(subfactor_b.id): 1,
            },
            'respondidos': {str(self.subfactor.id): True},
            'decisiones': {str(self.factor.id): 3},
        }, format='json')
        self.assertEqual(res.status_code, 200)

        resp_a = RespuestaEvaluacion.objects.get(
            evaluacion=self.eval_a, subfactor=self.subfactor,
        )
        resp_b = RespuestaEvaluacion.objects.get(
            evaluacion=self.eval_a, subfactor=subfactor_b,
        )
        self.assertTrue(resp_a.respondido)
        self.assertEqual(resp_a.valor_likert, 4)
        self.assertFalse(resp_b.respondido)
        self.assertEqual(resp_b.valor_likert, 1)

    def test_calcular_falla_si_incompleto(self):
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/calcular/', {
            'evaluacion_id': self.eval_a.id,
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['error'], 'completitud_incompleta')

    def test_calcular_ok_si_respondido(self):
        RespuestaEvaluacion.objects.filter(
            evaluacion=self.eval_a, subfactor=self.subfactor,
        ).update(respondido=True, valor_likert=4)
        DetalleEvaluacionFactor.objects.filter(
            evaluacion=self.eval_a, factor=self.factor,
        ).update(importancia_decisor=Decimal('3.00'))
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/calcular/', {
            'evaluacion_id': self.eval_a.id,
        }, format='json')
        self.assertEqual(res.status_code, 200)

    def test_calcular_requiere_evaluacion_id_valido(self):
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/calcular/', {'evaluacion_id': 99999})
        self.assertEqual(res.status_code, 404)

    def test_iniciar_requiere_nombre(self):
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/iniciar/', {'nombre': '  '})
        self.assertEqual(res.status_code, 400)

    def test_iniciar_decisor_por_defecto_importancia_sugerida(self):
        client_a = self._token('user_a', 'pass12345')
        res = client_a.post('/api/evaluaciones/iniciar/', {
            'nombre': 'LibreOffice Test',
            'version': '1.0',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        eval_id = res.data['evaluacion_id']
        detalle = DetalleEvaluacionFactor.objects.filter(
            evaluacion_id=eval_id,
            factor=self.factor,
        ).first()
        self.assertEqual(detalle.importancia_decisor, self.factor.importancia_sugerida)
