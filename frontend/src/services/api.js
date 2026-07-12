import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh });
        localStorage.setItem('access', res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export const authService = {
  getPerfil: async () => (await apiClient.get('/perfil/')).data,
};

export const toeService = {
  getCatalogo: async () => (await apiClient.get('/catalogo/')).data,

  getMisEvaluaciones: async (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.q) params.set('q', filtros.q);
    if (filtros.dictamen) params.set('dictamen', filtros.dictamen);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.anio) params.set('anio', filtros.anio);
    const qs = params.toString();
    return (await apiClient.get(`/evaluaciones/misfichas/${qs ? `?${qs}` : ''}`)).data;
  },

  getAlertas: async () => (await apiClient.get('/evaluaciones/alertas/')).data,

  getDashboardEjecutivo: async () => (await apiClient.get('/dashboard/ejecutivo/')).data,

  iniciarEvaluacion: async (datos) =>
    (await apiClient.post('/evaluaciones/iniciar/', datos)).data,

  getEvaluacionDetalle: async (id) =>
    (await apiClient.get(`/evaluaciones/${id}/`)).data,

  guardarProgreso: async (evaluacionId, puntajes, decisiones, respondidos = {}) =>
    (await apiClient.post('/evaluaciones/autosave/', {
      evaluacion_id: evaluacionId,
      puntajes,
      decisiones,
      respondidos,
    })).data,

  calcularDictamen: async (evaluacionId) =>
    (await apiClient.post('/evaluaciones/calcular/', { evaluacion_id: evaluacionId })).data,

  bloquearEvaluacion: async (evaluacionId) =>
    (await apiClient.post('/evaluaciones/bloquear/', { evaluacion_id: evaluacionId })).data,

  archivarEvaluacion: async (evaluacionId) =>
    (await apiClient.post('/evaluaciones/archivar/', { evaluacion_id: evaluacionId })).data,

  comparar: async (evaluacionA, evaluacionB) =>
    (await apiClient.post('/evaluaciones/comparar/', {
      evaluacion_a: evaluacionA,
      evaluacion_b: evaluacionB,
    })).data,

  simular: async (evaluacionId, puntajes, decisiones) =>
    (await apiClient.post('/evaluaciones/simular/', {
      evaluacion_id: evaluacionId,
      puntajes,
      decisiones,
    })).data,

  exportarPDF: async (evaluacionId) =>
    apiClient.get(`/evaluaciones/${evaluacionId}/pdf/`, { responseType: 'blob' }),

  getAuditoria: async (evaluacionId) =>
    (await apiClient.get(`/evaluaciones/${evaluacionId}/auditoria/`)).data,
};

export const adminService = {
  getUsuarios: async () => (await apiClient.get('/admin/usuarios/')).data,
  crearUsuario: async (data) => (await apiClient.post('/admin/usuarios/', data)).data,
  actualizarUsuario: async (id, data) =>
    (await apiClient.patch(`/admin/usuarios/${id}/`, data)).data,

  getDimensiones: async () => (await apiClient.get('/admin/dimensiones/')).data,
  crearDimension: async (nombre) =>
    (await apiClient.post('/admin/dimensiones/', { nombre_dimension: nombre })).data,

  crearFactor: async (data) => (await apiClient.post('/admin/factores/', data)).data,
  actualizarFactor: async (id, data) =>
    (await apiClient.patch(`/admin/factores/${id}/`, data)).data,

  crearSubfactor: async (data) => (await apiClient.post('/admin/subfactores/', data)).data,
  actualizarSubfactor: async (id, data) =>
    (await apiClient.patch(`/admin/subfactores/${id}/`, data)).data,
  eliminarSubfactor: async (id) =>
    (await apiClient.delete(`/admin/subfactores/${id}/`)).data,
};

/** RNF-15: caché local del wizard */
export const wizardCache = {
  save: (evalId, data) => {
    localStorage.setItem(`wizard_cache_${evalId}`, JSON.stringify({ ...data, ts: Date.now() }));
  },
  load: (evalId) => {
    try {
      return JSON.parse(localStorage.getItem(`wizard_cache_${evalId}`) || 'null');
    } catch {
      return null;
    }
  },
  clear: (evalId) => localStorage.removeItem(`wizard_cache_${evalId}`),
};

export default apiClient;
