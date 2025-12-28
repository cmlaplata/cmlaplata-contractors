import axios from 'axios';
import { auth } from './firebase';
import { API_BASE_URL, API_KEY } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


// Detectar si estamos en Expo Go
const isExpoGo = () => {
  try {
    // @ts-ignore
    return typeof __DEV__ !== 'undefined' && __DEV__ && !Platform.select({ web: false, android: true, ios: true });
  } catch {
    return false;
  }
};

// Detectar si estamos en desarrollo o Expo Go
const isDevelopmentOrExpoGo = () => {
  try {
    // @ts-ignore
    return typeof __DEV__ !== 'undefined' && __DEV__;
  } catch {
    return false;
  }
};

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
    // Log de la petición que se está haciendo (especialmente útil para Expo Go)
    const inExpoGo = isExpoGo();
    if (inExpoGo || config.url?.includes('byFireBaseId')) {
      console.log('📤 [axios] Petición iniciada:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL || axiosInstance.defaults.baseURL,
        fullUrl: `${config.baseURL || axiosInstance.defaults.baseURL}${config.url}`,
        platform: Platform.OS,
        expoGo: inExpoGo,
      });
    }
    
    // Agregar API Key en cada petición
    if (API_KEY) {
      config.headers['x-api-key'] = API_KEY;
    }

    // NO agregar token de autenticación para estos endpoints (solo API key)
    const isSearchEndpoint = config.url?.includes('my-leads/search');
    const isGenerateEmailEndpoint = config.url?.includes('generate-email');
    const isAuthEndpoint = config.url?.includes('/auth/');
    
    // Detectar si es un endpoint de clients
    const isClientsEndpoint = config.url?.includes('/clients');
    
    // Para endpoints de auth, asegurar que NO se agregue Authorization header
    if (isAuthEndpoint) {
      delete config.headers.Authorization;
      console.log('🔐 Endpoint de auth detectado, solo usando x-api-key');
    }
    
    // Para endpoints de clients, usar solo x-api-key (sin Authorization header)
    if (isClientsEndpoint) {
      delete config.headers.Authorization;
      console.log('🔑 [axios] Endpoint de clients detectado, usando solo x-api-key:', config.url);
      return config;
    }
    
    if (!isSearchEndpoint && !isGenerateEmailEndpoint && !isAuthEndpoint && !isClientsEndpoint) {
      // Verificar método de autenticación
      const authMethod = await AsyncStorage.getItem('auth_method');
      
      if (authMethod === 'phone') {
        // Si se autenticó con teléfono, usar token del backend
        const apiToken = await AsyncStorage.getItem('api_auth_token');
        if (apiToken) {
          config.headers.Authorization = `Bearer ${apiToken}`;
          // Log para debugging
          const inExpoGo = isExpoGo();
          if (inExpoGo || config.url?.includes('clients')) {
            console.log('📱 [axios] Token de teléfono agregado:', {
              url: config.url,
              tokenLength: apiToken.length,
              tokenPreview: apiToken.substring(0, 30) + '...',
              hasToken: !!apiToken,
            });
          }
        } else {
          console.warn('⚠️ [axios] No hay token de teléfono disponible para:', config.url);
        }
      } else {
        // Si se autenticó con Firebase (email/password), usar token de Firebase
        let user = auth.currentUser;
        
        // Si auth.currentUser es null pero el método es firebase, intentar esperar un momento
        // Esto puede pasar si Firebase aún no ha inicializado completamente
        if (!user && authMethod === 'firebase') {
          console.log('⚠️ [axios] auth.currentUser es null, esperando inicialización de Firebase...');
          // Esperar un momento para que Firebase se inicialice
          await new Promise(resolve => setTimeout(resolve, 100));
          user = auth.currentUser;
          
          // Si aún es null, intentar obtener el token desde AsyncStorage si existe
          if (!user) {
            console.log('⚠️ [axios] auth.currentUser sigue siendo null, verificando token guardado...');
            // No podemos usar el token guardado directamente porque puede estar expirado
            // Pero podemos intentar forzar la inicialización de Firebase
            try {
              // Esperar un poco más para que Firebase se sincronice
              await new Promise(resolve => setTimeout(resolve, 200));
              user = auth.currentUser;
            } catch (waitError) {
              console.warn('⚠️ [axios] Error esperando inicialización de Firebase:', waitError);
            }
          }
        }
        
        if (user) {
          try {
            // Usar token cacheado (false) en lugar de forzar renovación (true)
            // Esto evita problemas de sincronización de reloj entre Google, el celular y el servidor
            // Solo se renueva automáticamente si el token expiró
            const idToken = await user.getIdToken(false);
            if (idToken) {
              // Asegurar que el header se establezca correctamente
              const authHeader = `Bearer ${idToken.trim()}`;
              config.headers.Authorization = authHeader;
              
              // Logs específicos para Expo Go
              const inExpoGo = isExpoGo();
              console.log('✅ [axios] Token de Firebase agregado a petición:', config.url);
              console.log('📱 [axios] Platform:', Platform.OS);
              console.log('📱 [axios] Expo Go:', inExpoGo);
              console.log('📱 [axios] Token length:', idToken.length);
              console.log('📱 [axios] Token preview:', idToken.substring(0, 20) + '...');
              console.log('📱 [axios] Authorization header:', config.headers.Authorization ? `Presente (${config.headers.Authorization.substring(0, 30)}...)` : 'Faltante');
              console.log('📱 [axios] x-api-key header:', config.headers['x-api-key'] ? 'Presente' : 'Faltante');
              
              // En Expo Go, forzar que los headers se establezcan correctamente
              if (inExpoGo) {
                // Los headers ya están definidos, solo aseguramos que estén correctos
                config.headers.Authorization = authHeader;
                if (API_KEY) {
                  config.headers['x-api-key'] = API_KEY;
                }
                console.log('🔧 [axios] Headers forzados para Expo Go');
              }
              
              // Log detallado de headers finales (para todos los casos, no solo Expo Go)
              console.log('🔧 [axios] Headers finales antes de enviar:', {
                'Authorization': config.headers.Authorization ? `Presente (${config.headers.Authorization.substring(0, 40)}...)` : 'Faltante',
                'x-api-key': config.headers['x-api-key'] ? `Presente (${config.headers['x-api-key'].substring(0, 15)}...)` : 'Faltante',
                'Content-Type': config.headers['Content-Type'] || 'No definido',
              });
              console.log('🔧 [axios] Todos los headers keys:', Object.keys(config.headers || {}).join(', '));
            } else {
              console.warn('⚠️ [axios] No se pudo obtener token de Firebase para:', config.url);
            }
          } catch (error: any) {
            console.error('❌ [axios] Error obteniendo token de Firebase:', {
              error: error.message,
              code: error.code,
              url: config.url,
              user: user ? `Sí (${user.uid})` : 'No',
            });
            // En Expo, a veces el token no está disponible inmediatamente
            // Intentar obtenerlo sin forzar renovación
            try {
              const idToken = await user.getIdToken(false);
              if (idToken) {
                config.headers.Authorization = `Bearer ${idToken}`;
                console.log('✅ [axios] Token obtenido sin forzar renovación');
              }
            } catch (retryError: any) {
              console.error('❌ [axios] Error en segundo intento de obtener token:', retryError.message);
            }
          }
        } else {
          console.warn('⚠️ [axios] No hay usuario de Firebase para:', config.url);
          console.warn('⚠️ [axios] auth.currentUser es null');
          console.warn('⚠️ [axios] authMethod:', authMethod);
          // Si no hay usuario pero el método es firebase, puede ser un problema de sincronización
          // En este caso, la petición fallará con 403, pero al menos sabemos por qué
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación y conexión
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log detallado del error para debugging
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error') || !error.response) {
      console.error('❌ Error de conexión a la API:', {
        message: error.message,
        code: error.code,
        baseURL: axiosInstance.defaults.baseURL,
        url: error.config?.url,
        fullUrl: error.config ? `${axiosInstance.defaults.baseURL}${error.config.url}` : 'N/A',
      });
    } else if (error.response?.status === 401) {
      // Token expirado o inválido
      console.error('❌ [axios] Error 401: Token inválido o expirado');
      console.error('❌ [axios] URL:', error.config?.url);
      console.error('❌ [axios] Headers enviados:', error.config?.headers);
      // NO hacer logout automáticamente - Firebase puede renovar el token
      // Solo loguear el error pero no limpiar la sesión
    } else if (error.response?.status === 403) {
      // Forbidden - token no autorizado o falta de permisos
      const inExpoGo = isExpoGo();
      const authMethod = await AsyncStorage.getItem('auth_method');
      
      console.error('❌ [axios] Error 403: Forbidden');
      console.error('❌ [axios] Platform:', Platform.OS);
      console.error('❌ [axios] Expo Go:', inExpoGo);
      console.error('❌ [axios] URL:', error.config?.url);
      console.error('❌ [axios] BaseURL:', axiosInstance.defaults.baseURL);
      console.error('❌ [axios] Full URL:', `${axiosInstance.defaults.baseURL}${error.config?.url}`);
      console.error('❌ [axios] Auth Method:', authMethod || 'No definido');
      console.error('❌ [axios] Headers enviados:', {
        'x-api-key': error.config?.headers?.['x-api-key'] ? `Presente (${error.config.headers['x-api-key'].substring(0, 10)}...)` : 'Faltante',
        'Authorization': error.config?.headers?.Authorization ? `Presente (${error.config.headers.Authorization.substring(0, 30)}...)` : 'Faltante',
        'Content-Type': error.config?.headers?.['Content-Type'] || 'No definido',
      });
      console.error('❌ [axios] Todos los headers keys enviados:', Object.keys(error.config?.headers || {}).join(', '));
      console.error('❌ [axios] Request config:', {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      console.error('❌ [axios] auth.currentUser:', auth.currentUser ? `Sí (${auth.currentUser.uid})` : 'No');
      
      // Si es autenticación por teléfono, verificar el token
      if (authMethod === 'phone') {
        const apiToken = await AsyncStorage.getItem('api_auth_token');
        console.error('❌ [axios] Token de teléfono presente:', !!apiToken);
        if (apiToken) {
          console.error('❌ [axios] Token length:', apiToken.length);
          console.error('❌ [axios] Token preview:', apiToken.substring(0, 50) + '...');
          console.error('⚠️ [axios] El token puede estar expirado o no tener permisos para este endpoint');
        }
      }
      
      console.error('❌ [axios] Response data:', error.response?.data);
      console.error('❌ [axios] Response headers:', error.response?.headers);
    } else {
      console.error('❌ [axios] Error en petición:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        baseURL: axiosInstance.defaults.baseURL,
      });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;


