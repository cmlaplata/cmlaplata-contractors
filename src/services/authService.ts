import { 
  signInWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '../config/firebase';
import axiosInstance from '../config/axios';
import { API_BASE_URL } from '../config/api';
import { Platform } from 'react-native';

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
      console.log('   URL:', `${API_BASE_URL}/users/byFireBaseId/${firebaseUser.uid}`);
      
      const response = await axiosInstance.get<User>(
        `${API_BASE_URL}/users/byFireBaseId/${firebaseUser.uid}`
      );

      console.log('✅ Respuesta del backend:', {
        status: response.status,
        data: response.data,
      });

      const userData = response.data;

      // 4. Formatear nombre (primera letra mayúscula)
      if (userData.name) {
        userData.name = formatName(userData.name);
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
      await signOut(auth);
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
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
};

