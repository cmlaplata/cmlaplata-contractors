import axios from 'axios';
import { auth } from './firebase';
import { API_BASE_URL, API_KEY } from './api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
});

// Interceptor para agregar token automáticamente
axiosInstance.interceptors.request.use(
  async (config) => {
    // Agregar API Key en cada petición
    if (API_KEY) {
      config.headers['x-api-key'] = API_KEY;
    }

    // NO agregar token de Firebase para estos endpoints (solo API key)
    const isSearchEndpoint = config.url?.includes('my-leads/search');
    const isGenerateEmailEndpoint = config.url?.includes('generate-email');
    
    if (!isSearchEndpoint && !isGenerateEmailEndpoint) {
      // Agregar token de Firebase si el usuario está autenticado (para otros endpoints)
      const user = auth.currentUser;
      if (user) {
        try {
          // Forzar renovación del token para asegurar que esté vigente
          const idToken = await user.getIdToken(true);
          if (idToken) {
            config.headers.Authorization = `Bearer ${idToken}`;
          }
        } catch (error: any) {
          console.error('❌ Error obteniendo token:', {
            error: error.message,
            code: error.code,
            url: config.url,
          });
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      // Opcional: intentar refrescar el token o redirigir a login
      console.error('Error de autenticación: Token inválido o expirado');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;


