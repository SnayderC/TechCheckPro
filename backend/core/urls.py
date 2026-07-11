from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import (
    CatalogoTOEView,
    IniciarEvaluacionView,
    GuardarProgresoView,
    CalcularDictamenView,
    MisEvaluacionesView,
    DetalleEvaluacionView,
)

urlpatterns = [
    # Auth
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Evaluaciones
    path('catalogo/', CatalogoTOEView.as_view(), name='catalogo_toe'),
    path('evaluaciones/iniciar/', IniciarEvaluacionView.as_view(), name='iniciar_evaluacion'),
    path('evaluaciones/<int:eval_id>/', DetalleEvaluacionView.as_view(), name='detalle_evaluacion'),
    path('evaluaciones/autosave/', GuardarProgresoView.as_view(), name='autosave'),
    path('evaluaciones/calcular/', CalcularDictamenView.as_view(), name='calcular_dictamen'),
    path('evaluaciones/misfichas/', MisEvaluacionesView.as_view(), name='mis_evaluaciones'),
]