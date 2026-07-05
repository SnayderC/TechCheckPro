from django.urls import path
from core.views import CatalogoTOEView, IniciarEvaluacionView, GuardarProgresoView, CalcularDictamenView

urlpatterns = [
    path('catalogo/', CatalogoTOEView.as_view(), name='catalogo_toe'),
    path('evaluaciones/iniciar/', IniciarEvaluacionView.as_view(), name='iniciar_evaluacion'),
    path('evaluaciones/autosave/', GuardarProgresoView.as_view(), name='autosave'),
    path('evaluaciones/calcular/', CalcularDictamenView.as_view(), name='calcular_dictamen'),
]