import axios from 'axios';

// Definimos la URL base apuntando a nuestro contenedor Django en el puerto 8000
const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const toeService = {
  // 1. Obtener los 17 factores y 61 subfactores de PostgreSQL
  getCatalogo: async () => {
    const response = await apiClient.get('/catalogo/');
    return response.data;
  },

  // 2. Iniciar una nueva evaluación o proyecto
  iniciarEvaluacion: async (datosProyecto) => {
    const response = await apiClient.post('/evaluaciones/iniciar/', datosProyecto);
    return response.data; // Retorna { evaluacion_id: X }
  },

  // 3. Guardado automático (Autosave - RF04)
  guardarProgreso: async (evaluacionId, puntajes, decisiones) => {
    const payload = {
      evaluacion_id: evaluacionId,
      puntajes: puntajes,     // { [subfactor_id]: valor_likert }
      decisiones: decisiones, // { [factor_id]: importancia_decisor }
    };
    const response = await apiClient.post('/evaluaciones/autosave/', payload);
    return response.data;
  },

  // 4. Calcular Matriz FODA y Dictamen Final (RF05)
  calcularDictamen: async (evaluacionId) => {
    const response = await apiClient.post('/evaluaciones/calcular/', { evaluacion_id: evaluacionId });
    return response.data;
  },
};

export default apiClient;