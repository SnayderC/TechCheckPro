from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import (
    PerfilView,
    CatalogoTOEView,
    IniciarEvaluacionView,
    GuardarProgresoView,
    CalcularDictamenView,
    MisEvaluacionesView,
    DetalleEvaluacionView,
    BloquearEvaluacionView,
    ReabrirEvaluacionView,
    ArchivarEvaluacionView,
    CompararEvaluacionesView,
    SimularEscenarioView,
    ExportarPDFView,
    AuditoriaEvaluacionView,
    AlertasProgresoView,
    DashboardEjecutivoView,
)
from core.views_admin import (
    UsuariosListCreateView,
    UsuarioDetailView,
    DimensionesView,
    FactoresAdminView,
    SubfactoresAdminView,
)

urlpatterns = [
    # Auth
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('perfil/', PerfilView.as_view(), name='perfil'),

    # Evaluaciones
    path('catalogo/', CatalogoTOEView.as_view(), name='catalogo_toe'),
    path('evaluaciones/iniciar/', IniciarEvaluacionView.as_view(), name='iniciar_evaluacion'),
    path('evaluaciones/misfichas/', MisEvaluacionesView.as_view(), name='mis_evaluaciones'),
    path('evaluaciones/alertas/', AlertasProgresoView.as_view(), name='alertas_progreso'),
    path('evaluaciones/comparar/', CompararEvaluacionesView.as_view(), name='comparar'),
    path('evaluaciones/simular/', SimularEscenarioView.as_view(), name='simular'),
    path('evaluaciones/autosave/', GuardarProgresoView.as_view(), name='autosave'),
    path('evaluaciones/calcular/', CalcularDictamenView.as_view(), name='calcular_dictamen'),
    path('evaluaciones/bloquear/', BloquearEvaluacionView.as_view(), name='bloquear'),
    path('evaluaciones/reabrir/', ReabrirEvaluacionView.as_view(), name='reabrir'),
    path('evaluaciones/archivar/', ArchivarEvaluacionView.as_view(), name='archivar'),
    path('evaluaciones/<int:eval_id>/', DetalleEvaluacionView.as_view(), name='detalle_evaluacion'),
    path('evaluaciones/<int:eval_id>/pdf/', ExportarPDFView.as_view(), name='exportar_pdf'),
    path('evaluaciones/<int:eval_id>/auditoria/', AuditoriaEvaluacionView.as_view(), name='auditoria'),

    # Dashboard ejecutivo
    path('dashboard/ejecutivo/', DashboardEjecutivoView.as_view(), name='dashboard_ejecutivo'),

    # Admin — usuarios y catálogo TOE
    path('admin/usuarios/', UsuariosListCreateView.as_view(), name='admin_usuarios'),
    path('admin/usuarios/<int:user_id>/', UsuarioDetailView.as_view(), name='admin_usuario_detail'),
    path('admin/dimensiones/', DimensionesView.as_view(), name='admin_dimensiones'),
    path('admin/factores/', FactoresAdminView.as_view(), name='admin_factores_create'),
    path('admin/factores/<int:factor_id>/', FactoresAdminView.as_view(), name='admin_factores_update'),
    path('admin/subfactores/', SubfactoresAdminView.as_view(), name='admin_subfactores_create'),
    path('admin/subfactores/<int:subfactor_id>/', SubfactoresAdminView.as_view(), name='admin_subfactores'),
]
