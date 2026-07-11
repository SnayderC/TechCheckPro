import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest?.url?.includes('/token/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh');

      if (!refresh) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        localStorage.removeItem('activeEvalId');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh });
        localStorage.setItem('access', res.data.access);
        originalRequest.headers['Authorization'] = `Bearer ${res.data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        localStorage.removeItem('activeEvalId');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const toeService = {
  getCatalogo: async () => {
    const response = await apiClient.get('/catalogo/');
    return response.data;
  },

  iniciarEvaluacion: async (datosProyecto) => {
    const response = await apiClient.post('/evaluaciones/iniciar/', datosProyecto);
    return response.data;
  },

  getEvaluacionDetalle: async (evaluacionId) => {
    const response = await apiClient.get(`/evaluaciones/${evaluacionId}/`);
    return response.data;
  },

  getMisEvaluaciones: async () => {
    const response = await apiClient.get('/evaluaciones/misfichas/');
    return response.data;
  },

  guardarProgreso: async (evaluacionId, puntajes, decisiones) => {
    const payload = {
      evaluacion_id: evaluacionId,
      puntajes,
      decisiones,
    };
    const response = await apiClient.post('/evaluaciones/autosave/', payload);
    return response.data;
  },

  calcularDictamen: async (evaluacionId) => {
    const response = await apiClient.post('/evaluaciones/calcular/', {
      evaluacion_id: evaluacionId,
    });
    return response.data;
  },
};

export default apiClient;
