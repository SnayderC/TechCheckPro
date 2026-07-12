from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import DimensionTOE, Factor, Subfactor
from core.permissions import IsAdmin
from core.serializers import (
    DimensionSerializer,
    FactorAdminSerializer,
    SubfactorAdminSerializer,
    UsuarioSerializer,
)

Usuario = get_user_model()


class UsuariosListCreateView(APIView):
    """RF-09: listar y crear evaluadores (solo admin)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        users = Usuario.objects.all().order_by('-date_joined')
        return Response(UsuarioSerializer(users, many=True).data)

    def post(self, request):
        data = request.data or {}
        email = (data.get('email') or '').strip()
        username = (data.get('username') or email.split('@')[0] if email else '').strip()
        password = data.get('password', 'TechCheck2026!')
        rol = data.get('rol', 'EVALUADOR')

        if not username:
            return Response({'error': 'El nombre de usuario es obligatorio'}, status=400)
        if Usuario.objects.filter(Q(username=username) | Q(email=email)).exists():
            return Response({'error': 'El correo electrónico ya está en uso'}, status=400)

        user = Usuario.objects.create_user(
            username=username,
            email=email or f'{username}@techcheck.local',
            password=password,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            rol=rol if rol in ('ADMIN', 'EVALUADOR') else 'EVALUADOR',
            is_active=data.get('is_active', True),
        )
        return Response(UsuarioSerializer(user).data, status=201)


class UsuarioDetailView(APIView):
    """RF-09: editar o desactivar usuarios."""

    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        user = Usuario.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'Usuario no encontrado'}, status=404)

        data = request.data or {}
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'rol' in data and data['rol'] in ('ADMIN', 'EVALUADOR'):
            user.rol = data['rol']
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        user.save()
        return Response(UsuarioSerializer(user).data)


class DimensionesView(APIView):
    """RF-02: CRUD dimensiones TOE."""

    permission_classes = [IsAdmin]

    def get(self, request):
        dims = DimensionTOE.objects.prefetch_related('factores__subfactores').all()
        return Response(DimensionSerializer(dims, many=True).data)

    def post(self, request):
        nombre = (request.data.get('nombre_dimension') or '').strip()
        if not nombre:
            return Response({'error': 'Nombre de dimensión requerido'}, status=400)
        dim, created = DimensionTOE.objects.get_or_create(nombre_dimension=nombre)
        return Response(DimensionSerializer(dim).data, status=201 if created else 200)


class FactoresAdminView(APIView):
    """RF-02: crear/editar factores."""

    permission_classes = [IsAdmin]

    def post(self, request):
        data = request.data or {}
        dim_id = data.get('dimension_id')
        nombre = (data.get('nombre_factor') or '').strip()
        if not dim_id or not nombre:
            return Response({'error': 'Dimensión y nombre son obligatorios'}, status=400)

        dim = DimensionTOE.objects.filter(id=dim_id).first()
        if not dim:
            return Response({'error': 'Dimensión no encontrada'}, status=404)

        factor = Factor.objects.create(
            dimension=dim,
            nombre_factor=nombre,
            importancia_sugerida=Decimal(str(data.get('importancia_sugerida', 2))),
            alcance=data.get('alcance', 'Externo'),
        )
        return Response(FactorAdminSerializer(factor).data, status=201)

    def patch(self, request, factor_id):
        factor = Factor.objects.filter(id=factor_id).first()
        if not factor:
            return Response({'error': 'Factor no encontrado'}, status=404)

        data = request.data or {}
        if 'nombre_factor' in data:
            factor.nombre_factor = data['nombre_factor']
        if 'importancia_sugerida' in data:
            factor.importancia_sugerida = Decimal(str(data['importancia_sugerida']))
        if 'alcance' in data:
            factor.alcance = data['alcance']
        factor.save()
        return Response(FactorAdminSerializer(factor).data)


class SubfactoresAdminView(APIView):
    """RF-02: crear/editar/eliminar subfactores."""

    permission_classes = [IsAdmin]

    def post(self, request):
        data = request.data or {}
        factor_id = data.get('factor_id')
        enunciado = (data.get('enunciado_pregunta') or '').strip()
        if not factor_id or not enunciado:
            return Response({'error': 'Factor y enunciado son obligatorios'}, status=400)

        factor = Factor.objects.filter(id=factor_id).first()
        if not factor:
            return Response({'error': 'Factor no encontrado'}, status=404)

        peso = data.get('peso')
        if peso is not None:
            try:
                peso_val = Decimal(str(peso))
                if peso_val < 0 or peso_val > 4:
                    return Response({'error': 'Peso fuera de rango válido (0-4)'}, status=400)
            except Exception:
                return Response({'error': 'Peso inválido'}, status=400)

        subf = Subfactor.objects.create(factor=factor, enunciado_pregunta=enunciado)
        return Response(SubfactorAdminSerializer(subf).data, status=201)

    def patch(self, request, subfactor_id):
        subf = Subfactor.objects.filter(id=subfactor_id).first()
        if not subf:
            return Response({'error': 'Subfactor no encontrado'}, status=404)
        enunciado = (request.data.get('enunciado_pregunta') or '').strip()
        if enunciado:
            subf.enunciado_pregunta = enunciado
            subf.save()
        return Response(SubfactorAdminSerializer(subf).data)

    def delete(self, request, subfactor_id):
        subf = Subfactor.objects.filter(id=subfactor_id).first()
        if not subf:
            return Response({'error': 'Subfactor no encontrado'}, status=404)
        subf.delete()
        return Response(status=204)
