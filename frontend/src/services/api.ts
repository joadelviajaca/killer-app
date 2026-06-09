import axios from 'axios';

// Creamos la instancia apuntando a nuestro backend
const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:5000/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Antes de que salga cualquier petición, miramos si hay un token
api.interceptors.request.use(
  (config) => {
    // Leeremos el token del localStorage del navegador
    const token = localStorage.getItem('killer_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;