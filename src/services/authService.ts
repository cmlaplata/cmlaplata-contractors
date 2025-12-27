import { 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  signOut, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '../config/firebase';
import axiosInstance from '../config/axios';
import axios from 'axios';
import { API_BASE_URL, API_KEY } from '../config/api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  name: string;
  email: string;
  firebase_id: string;
  userType: 'Admin' | 'Manager' | 'Seller';
  clientId?: number; // ID del cliente asociado al usuario
  person?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    country?: string;
  };
  userClientData?: any; // Datos del cliente obtenidos del endpoint /clients/get/client/:clientId
}

export interface LoginResult {
  success: boolean;
  user?: User;
  firebaseUser?: FirebaseUser;
  error?: string;
  errorCode?: string;
}

// Formatear nombre (primera letra mayúscula)
const formatName = (name: string): string => {
  if (!name) return name;
  let formatted = name.toLowerCase();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const authService = {
  // Configurar persistencia de Firebase
  initializePersistence: async (): Promise<void> => {
    try {
      // En web, configuramos explícitamente la persistencia local
      // En React Native, Firebase maneja la persistencia automáticamente con AsyncStorage
      if (Platform.OS === 'web') {
        console.log('🔧 Configurando persistencia local para web...');
        await setPersistence(auth, browserLocalPersistence);
        console.log('✅ Persistencia local configurada correctamente');
      } else {
        // En React Native, Firebase Auth usa AsyncStorage automáticamente
        // No necesitamos configurar persistencia explícitamente
        console.log('📱 React Native detectado - Firebase usa AsyncStorage automáticamente');
      }
    } catch (error: any) {
      console.error('⚠️ Error configurando persistencia:', error);
      // No lanzamos el error, solo lo registramos
      // Firebase puede funcionar sin esta configuración explícita
    }
  },

  // Login con Firebase
  login: async (email: string, password: string): Promise<LoginResult> => {
    console.log('🔐 Iniciando proceso de login...');
    console.log('📧 Email:', email);
    console.log('🌐 API URL:', API_BASE_URL);

    try {
      // 0. Configurar persistencia antes de autenticar
      await authService.initializePersistence();

      // 1. Autenticar con Firebase
      console.log('1️⃣ Autenticando con Firebase...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('✅ Firebase autenticación exitosa. UID:', firebaseUser.uid);

      // 2. Obtener ID Token
      console.log('2️⃣ Obteniendo ID Token de Firebase...');
      const idToken = await firebaseUser.getIdToken();
      console.log('✅ Token obtenido (primeros 20 chars):', idToken.substring(0, 20) + '...');

      // 3. Obtener datos del usuario desde el backend
      console.log('3️⃣ Consultando backend para obtener datos del usuario...');
      const userEndpoint = `/users/byFireBaseId/${firebaseUser.uid}`;
      const fullUrl = `${API_BASE_URL}${userEndpoint}`;
      console.log('   URL completa:', fullUrl);
      console.log('   Platform:', Platform.OS);
      
      // Obtener token nuevamente para asegurar que esté vigente
      const freshToken = await firebaseUser.getIdToken(true);
      console.log('   Token fresco obtenido (length):', freshToken.length);
      console.log('   Token preview:', freshToken.substring(0, 30) + '...');
      
      const response = await axiosInstance.get<User>(userEndpoint);

      console.log('✅ Respuesta del backend:', {
        status: response.status,
        data: response.data,
      });

      const userData = response.data;

      // 4. Formatear nombre (primera letra mayúscula)
      if (userData.name) {
        userData.name = formatName(userData.name);
      }

      // 5. Si el usuario tiene clientId, obtener los datos del cliente
      if (userData.clientId) {
        try {
          console.log('📡 Obteniendo datos del cliente durante login...');
          const clientUrl = `${API_BASE_URL}/clients/get/client/${userData.clientId}`;
          console.log('🌐 Consultando cliente:', clientUrl);
          
          const clientResponse = await axiosInstance.get(clientUrl);
          
          console.log('✅ Datos del cliente obtenidos durante login:', {
            status: clientResponse.status,
            data: clientResponse.data,
          });
          
          // Agregar los datos del cliente al objeto user
          // Si la respuesta es un array, tomar el primer elemento; si es un objeto, usarlo directamente
          const clientData = Array.isArray(clientResponse.data) 
            ? clientResponse.data[0] 
            : clientResponse.data;
          
          userData.userClientData = clientData;
        } catch (clientError: any) {
          console.warn('⚠️ Error obteniendo datos del cliente durante login:', {
            code: clientError.code,
            message: clientError.message,
            response: clientError.response?.data,
            status: clientError.response?.status,
          });
          // Continuar sin los datos del cliente si hay error
          userData.userClientData = null;
        }
      } else {
        console.log('ℹ️ Usuario sin clientId, no se obtienen datos del cliente');
        userData.userClientData = null;
      }

      console.log('✅ Login completado exitosamente');
      return {
        success: true,
        user: userData,
        firebaseUser: firebaseUser,
      };
    } catch (error: any) {
      console.warn('⚠️ Error en login:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });

      // Determinar el tipo de error
      let errorMessage = 'Error al iniciar sesión';
      let errorCode = error.code || 'unknown';

      // Errores de Firebase
      if (error.code && error.code.startsWith('auth/')) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'Usuario no encontrado. Verifica tu email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Contraseña incorrecta. Verifica tu contraseña.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Email inválido. Verifica el formato del email.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Usuario deshabilitado. Contacta al administrador.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Demasiados intentos fallidos. Espera unos minutos e intenta nuevamente.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
            break;
          default:
            errorMessage = `Error de Firebase: ${error.message || error.code}`;
        }
      }
      // Errores del backend (axios)
      else if (error.response) {
        const status = error.response.status;
        const backendError = error.response.data?.message || error.response.data?.error;

        switch (status) {
          case 401:
            errorMessage = 'No autorizado. El token de Firebase no es válido.';
            errorCode = 'backend/unauthorized';
            break;
          case 404:
            errorMessage = 'Usuario no encontrado en el sistema. Contacta al administrador.';
            errorCode = 'backend/user-not-found';
            break;
          case 500:
            errorMessage = 'Error del servidor. Intenta más tarde o contacta al soporte.';
            errorCode = 'backend/server-error';
            break;
          case 503:
            errorMessage = 'Servicio no disponible. El servidor está en mantenimiento.';
            errorCode = 'backend/service-unavailable';
            break;
          default:
            errorMessage = backendError || `Error del servidor (${status})`;
            errorCode = `backend/${status}`;
        }
      }
      // Errores de red o timeout
      else if (error.request || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet y que la API esté disponible.';
        errorCode = 'network/connection-failed';
        console.warn('⚠️ Error de red o timeout:', {
          message: error.message,
          code: error.code,
          request: error.request ? 'Request failed' : undefined,
        });
      }
      // Otros errores
      else {
        errorMessage = error.message || 'Error inesperado al iniciar sesión';
        errorCode = 'unknown';
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode,
      };
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      // Cerrar sesión de Firebase si existe
      if (auth.currentUser) {
        await signOut(auth);
      }
      // Limpiar token del backend y datos del usuario
      await Promise.all([
        AsyncStorage.removeItem('api_auth_token'),
        AsyncStorage.removeItem('auth_method'),
        AsyncStorage.removeItem('user_data'), // <--- Borrar datos del usuario también
      ]);
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  },

  // Obtener token del backend almacenado
  getApiToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('api_auth_token');
    } catch (error) {
      console.error('Error obteniendo token del backend:', error);
      return null;
    }
  },

  // Verificar método de autenticación
  getAuthMethod: async (): Promise<'firebase' | 'phone' | null> => {
    try {
      const method = await AsyncStorage.getItem('auth_method');
      return method as 'firebase' | 'phone' | null;
    } catch (error) {
      console.error('Error obteniendo método de autenticación:', error);
      return null;
    }
  },

  // Obtener usuario actual desde Firebase
  getCurrentUser: (): FirebaseUser | null => {
    return auth.currentUser;
  },

  // Obtener token del usuario actual
  getToken: async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  },

  // Obtener datos del usuario desde el backend
  getUserData: async (firebaseId: string): Promise<User | null> => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return null;

      const response = await axiosInstance.get<User>(
        `${API_BASE_URL}/users/byFireBaseId/${firebaseId}`
      );

      const userData = response.data;
      if (userData.name) {
        userData.name = formatName(userData.name);
      }

      return userData;
    } catch (error) {
      console.error('Error obteniendo datos del usuario:', error);
      return null;
    }
  },

  // Solicitar código de verificación por WhatsApp
  requestVerificationCode: async (phone: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      console.log('📱 Solicitando código de verificación para:', phone);
      console.log('🔑 API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'No configurada');
      console.log('🌐 URL:', `${API_BASE_URL}/auth/request-code`);
      
      // Crear una petición limpia sin el interceptor que agrega tokens
      const response = await axios.post(
        `${API_BASE_URL}/auth/request-code`,
        { phone },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          timeout: 10000,
        }
      );
      
      console.log('✅ Código de verificación solicitado exitosamente');
      return {
        success: true,
        message: response.data.message || 'Código de verificación enviado exitosamente'
      };
    } catch (error: any) {
      console.error('❌ Error solicitando código:', error);
      console.error('📋 Detalles del error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.config?.headers,
      });
      
      let errorMessage = 'Error al solicitar código de verificación';
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        if (status === 404) {
          errorMessage = 'Cliente no encontrado con ese número de teléfono';
        } else if (status === 400) {
          errorMessage = Array.isArray(message) ? message.join(', ') : message || 'Teléfono inválido';
        } else if (status === 500) {
          errorMessage = message || 'Error al enviar código por WhatsApp';
        } else {
          errorMessage = message || `Error del servidor (${status})`;
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  // Verificar código y autenticar (sin Firebase, solo con token del backend)
  verifyCodeAndLogin: async (phone: string, code: string): Promise<LoginResult> => {
    console.log('🔐 Iniciando verificación de código...');
    console.log('📱 Teléfono:', phone);
    console.log('🔑 Código:', code);

    try {
      // 1. Verificar código y obtener token del backend (solo con x-api-key)
      console.log('1️⃣ Verificando código con el backend...');
      console.log('🔑 API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'No configurada');
      console.log('🌐 URL:', `${API_BASE_URL}/auth/verify-code`);
      
      // Usar axios directamente (sin interceptor) para endpoints de auth
      // ya que solo necesitan x-api-key, no token de autenticación
      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-code`,
        { phone, code },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          timeout: 10000,
        }
      );

      if (!response.data.success || !response.data.token) {
        throw new Error('Token no recibido del servidor');
      }

      const apiToken = response.data.token;
      const userData = response.data.user;
      console.log('✅ Código verificado, token recibido');

      // 2. Almacenar el token del backend en AsyncStorage
      console.log('2️⃣ Almacenando token del backend...');
      await AsyncStorage.setItem('api_auth_token', apiToken);
      await AsyncStorage.setItem('auth_method', 'phone'); // Marcar que se autenticó con teléfono
      console.log('✅ Token almacenado');

      // 3. Construir objeto de usuario con los datos recibidos
      console.log('3️⃣ Construyendo datos del usuario...');
      const user: User = {
        id: userData.id,
        name: formatName(userData.name),
        email: userData.email || '',
        firebase_id: userData.firebase_id || '', // Puede estar vacío si no usa Firebase
        userType: userData.userType || 'Seller',
        clientId: userData.clientId,
      };

      // 4. Obtener datos del cliente si tiene clientId
      if (userData.clientId) {
        try {
          console.log('4️⃣ Obteniendo datos del cliente...');
          // Crear una instancia temporal de axios con el token para esta petición
          const clientResponse = await axiosInstance.get(
            `${API_BASE_URL}/clients/get/client/${userData.clientId}`
          );
          const clientData = Array.isArray(clientResponse.data) 
            ? clientResponse.data[0] 
            : clientResponse.data;
          user.userClientData = clientData;
          console.log('✅ Datos del cliente obtenidos');
        } catch (clientError) {
          console.warn('⚠️ Error obteniendo datos del cliente:', clientError);
          user.userClientData = null;
        }
      }

      console.log('✅ Login con teléfono completado exitosamente');
      return {
        success: true,
        user: user,
        firebaseUser: null, // No hay Firebase user cuando se autentica con teléfono
      };
    } catch (error: any) {
      console.warn('⚠️ Error en verificación de código:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = 'Error al verificar código';
      let errorCode = error.code || 'unknown';

      // Errores del backend
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;

        if (status === 400) {
          if (Array.isArray(message)) {
            errorMessage = message.join(', ');
          } else if (message?.includes('expirado')) {
            errorMessage = 'Código de verificación expirado. Solicita uno nuevo.';
            errorCode = 'code/expired';
          } else if (message?.includes('inválido')) {
            errorMessage = 'Código de verificación inválido. Verifica el código ingresado.';
            errorCode = 'code/invalid';
          } else {
            errorMessage = message || 'Código inválido';
          }
        } else if (status === 404) {
          errorMessage = 'Cliente no encontrado';
          errorCode = 'client/not-found';
        } else if (status === 500) {
          errorMessage = message || 'Error del servidor. Intenta más tarde.';
          errorCode = 'server/error';
        } else {
          errorMessage = message || `Error del servidor (${status})`;
          errorCode = `backend/${status}`;
        }
      }
      // Errores de red
      else if (error.request || error.code === 'ECONNABORTED') {
        errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
        errorCode = 'network/connection-failed';
      }
      // Otros errores
      else {
        errorMessage = error.message || 'Error inesperado al verificar código';
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode,
      };
    }
  },
};

