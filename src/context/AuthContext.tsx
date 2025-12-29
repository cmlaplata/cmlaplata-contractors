import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService, User } from '../services/authService';
import axiosInstance from '../config/axios';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPhone: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  requestVerificationCode: (phone: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
  refreshUserClientData: () => Promise<void>;
  savePendingDeepLink: (url: string) => Promise<void>;
  getPendingDeepLink: () => Promise<string | null>;
  clearPendingDeepLink: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  // Función auxiliar para guardar sesión completa
  const saveUserSession = async (userData: User, token: string, method: 'firebase' | 'phone') => {
    try {
      const promises = [
        AsyncStorage.setItem('api_auth_token', token),
        AsyncStorage.setItem('auth_method', method),
        // 👇 ESTA ES LA LÍNEA CLAVE QUE FALTABA
        AsyncStorage.setItem('user_data', JSON.stringify(userData))
      ];
      await Promise.all(promises);
      console.log('💾 Sesión completa guardada en AsyncStorage');
    } catch (e) {
      console.error('❌ Error guardando sesión:', e);
    }
  };

  // Función para restaurar usuario desde AsyncStorage
  const loadUserFromStorage = async (): Promise<boolean> => {
    try {
      // Intentar recuperar los datos del usuario guardados
      const storedUser = await AsyncStorage.getItem('user_data');
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        
        // Si el usuario tiene clientId pero no userClientData, refrescar los datos
        if (parsedUser.clientId && !parsedUser.userClientData) {
          try {
            const clientUrl = `${API_BASE_URL}/clients/get/client/${parsedUser.clientId}`;
            const clientResponse = await axiosInstance.get(clientUrl);
            // response.data puede ser un array o un objeto, extraer el primer elemento si es array
            parsedUser.userClientData = Array.isArray(clientResponse.data) ? clientResponse.data[0] : clientResponse.data;
          } catch (error) {
            // Si falla, continuar sin userClientData
            parsedUser.userClientData = null;
          }
        }
        
        setUser(parsedUser);
        return true;
      }
    } catch (error) {
      console.error('❌ Error restaurando usuario local:', error);
    }
    return false;
  };

  useEffect(() => {
    // Inicializar persistencia al montar el componente
    const initializeAuth = async () => {
      if (!isInitialized.current) {
        console.log('🚀 Inicializando AuthProvider...');
        try {
          await authService.initializePersistence();
          
          // LÓGICA CORREGIDA: Restaurar usuario desde AsyncStorage
          const authMethod = await authService.getAuthMethod();
          
          if (authMethod === 'phone') {
            const apiToken = await authService.getApiToken();
            if (apiToken) {
              console.log('📱 Sesión de teléfono detectada');
              // Intentamos restaurar los datos del usuario
              const restored = await loadUserFromStorage();
              
              if (!restored) {
                // ⚠️ Si tenemos token pero NO datos de usuario, intentar recargar desde backend
                console.log('⚠️ Token existe pero faltan datos de usuario, intentando recargar...');
                // Nota: El usuario se cargará cuando se verifique la sesión más abajo
              }
            }
          } else if (authMethod === 'firebase') {
            // Mientras esperamos a onAuthStateChanged, cargamos lo local para que no se vea vacío
            console.log('🔥 Sesión de Firebase detectada, cargando datos locales...');
            await loadUserFromStorage();
          }
          
          isInitialized.current = true;
        } catch (error) {
          console.error('⚠️ Error inicializando persistencia:', error);
          // Continuamos de todas formas, Firebase puede funcionar sin esto
        }
      }
    };

    initializeAuth();

    // Observador de estado de autenticación de Firebase
    // IMPORTANTE: onAuthStateChanged se ejecuta inmediatamente con el estado actual
    // y luego cada vez que cambia. NO debemos cambiar loading a false hasta que
    // esta primera verificación haya terminado completamente.
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        console.log('🔄 Estado de autenticación cambió:', firebaseUser ? `Usuario: ${firebaseUser.uid}` : 'Sin usuario');
        
        if (firebaseUser) {
          try {
            console.log('📡 Obteniendo datos del usuario desde el backend...');
            // Obtener token
            const idToken = await firebaseUser.getIdToken();
            console.log('✅ Token obtenido para consulta de usuario');

            // Obtener datos del usuario desde el backend
            const url = `${API_BASE_URL}/users/byFireBaseId/${firebaseUser.uid}`;
            console.log('🌐 Consultando:', url);
            
            const response = await axiosInstance.get<User>(url);

            console.log('✅ Datos del usuario obtenidos:', {
              status: response.status,
              userType: response.data?.userType,
              name: response.data?.name,
            });

            // Console log detallado con toda la información del usuario
            // (Nota: userClientData se agregará después de la segunda llamada)
            console.log('📋 INFORMACIÓN COMPLETA DEL USUARIO:', {
              id: response.data?.id,
              name: response.data?.name,
              email: response.data?.email,
              firebase_id: response.data?.firebase_id,
              userType: response.data?.userType,
              clientId: response.data?.clientId,
              person: response.data?.person ? {
                id: response.data.person.id,
                name: response.data.person.name,
                email: response.data.person.email,
                phone: response.data.person.phone,
                country: response.data.person.country,
              } : null,
              // Mostrar toda la respuesta completa del backend
              fullResponse: JSON.stringify(response.data, null, 2),
            });
            
            // Console log adicional para ver la estructura completa de la respuesta
            console.log('🔍 ESTRUCTURA COMPLETA DE LA RESPUESTA DEL BACKEND:', response.data);
            console.log('🔍 TODOS LOS CAMPOS DISPONIBLES:', Object.keys(response.data || {}));

            const userData = response.data;

            // Formatear nombre (primera letra mayúscula)
            if (userData.name) {
              let name = userData.name.toLowerCase();
              name = name.charAt(0).toUpperCase() + name.slice(1);
              userData.name = name;
            }

            // Si el usuario tiene clientId, obtener los datos del cliente
            if (userData.clientId) {
              try {
                const clientUrl = `${API_BASE_URL}/clients/get/client/${userData.clientId}`;
                const clientResponse = await axiosInstance.get(clientUrl);
                
                // response.data puede ser un array o un objeto, extraer el primer elemento si es array
                userData.userClientData = Array.isArray(clientResponse.data) ? clientResponse.data[0] : clientResponse.data;
              } catch (clientError: any) {
                // Continuar sin los datos del cliente si hay error
                userData.userClientData = null;
              }
            } else {
              userData.userClientData = null;
            }

            setUser(userData);
            setFirebaseUser(firebaseUser);
            setError(null);
            
            // Guardar sesión completa en AsyncStorage
            await saveUserSession(userData, idToken, 'firebase');
          } catch (error: any) {
            console.warn('⚠️ Error obteniendo datos del usuario:', {
              code: error.code,
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              url: error.config?.url,
            });

            // Determinar el tipo de error
            let errorMessage = 'Error al cargar datos del usuario';
            let shouldClearSession = false;
            
            if (error.response) {
              const status = error.response.status;
              if (status === 404) {
                errorMessage = 'Usuario no encontrado en el sistema. Contacta al administrador.';
                // Solo limpiar sesión si el usuario no existe (404)
                shouldClearSession = true;
              } else if (status === 401) {
                errorMessage = 'Token inválido. Por favor, inicia sesión nuevamente.';
                // Solo limpiar sesión si el token es inválido (401)
                shouldClearSession = true;
              } else if (status >= 500) {
                errorMessage = 'Error del servidor. Intenta más tarde.';
                // NO limpiar sesión en errores del servidor - mantener Firebase auth
                // El usuario puede seguir usando la app con datos en caché
                shouldClearSession = false;
              } else {
                errorMessage = `Error del servidor (${status})`;
                // NO limpiar sesión en otros errores - mantener Firebase auth
                shouldClearSession = false;
              }
            } else if (error.request) {
              errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión.';
              // NO limpiar sesión en errores de red - mantener Firebase auth
              // El usuario puede seguir usando la app con datos en caché
              shouldClearSession = false;
            } else {
              // Otros errores - mantener Firebase auth
              shouldClearSession = false;
            }
            
            // Solo limpiar sesión si es necesario (404 o 401)
            // En otros casos, mantener firebaseUser para que la sesión persista
            if (shouldClearSession) {
              setUser(null);
              setFirebaseUser(null);
            } else {
              // Mantener firebaseUser pero limpiar user (datos del backend)
              // Esto permite que la sesión persista y se reintente obtener los datos
              setUser(null);
              // firebaseUser se mantiene, así que onAuthStateChanged puede reintentar
            }
            
            setError(errorMessage);
          }
        } else {
          // Verificar si hay sesión de teléfono cuando no hay Firebase
          const authMethod = await AsyncStorage.getItem('auth_method');
          if (authMethod === 'phone') {
            const apiToken = await AsyncStorage.getItem('api_auth_token');
            if (apiToken) {
              console.log('📱 Sesión de teléfono activa (sin Firebase)');
              // Intentar restaurar el usuario desde AsyncStorage
              const restored = await loadUserFromStorage();
              
              if (!restored) {
                // Si tenemos token pero NO datos de usuario, intentar recargar desde backend
                console.log('⚠️ Token existe pero faltan datos de usuario, intentando recargar...');
                // Aquí podrías hacer una llamada al backend para obtener el perfil del usuario
                // Por ahora, dejamos que el usuario se cargue cuando se haga una petición
              }
              setLoading(false);
              return;
            }
          }
          
          console.log('👋 Usuario cerró sesión o no hay sesión activa');
          setUser(null);
          setFirebaseUser(null);
          setError(null);
        }
        
        // CRÍTICO: Solo cambiamos loading a false DESPUÉS de que toda la verificación
        // haya terminado. Esto asegura que las rutas protegidas no se rendericen
        // antes de que Firebase haya verificado completamente el estado de autenticación.
        console.log('✅ Verificación de autenticación completada');
        setLoading(false);
      },
      (error) => {
        // Manejar errores del observador
        console.error('❌ Error en onAuthStateChanged:', error);
        // NO limpiar la sesión en errores del observador
        // Firebase puede tener problemas temporales pero la sesión puede persistir
        // Solo mostrar el error pero mantener la sesión si existe
        if (auth.currentUser) {
          console.log('⚠️ Error en observador pero hay sesión activa, manteniendo sesión');
          // Mantener firebaseUser si existe
          setFirebaseUser(auth.currentUser);
        }
        setError('Error al verificar el estado de autenticación. Reintentando...');
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Limpiando observador de autenticación');
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // La persistencia ya se configura dentro de authService.login
      const result = await authService.login(email, password);
      
      if (result.success && result.user) {
        // No necesitamos setUser/setFirebaseUser aquí porque onAuthStateChanged
        // se disparará automáticamente cuando Firebase detecte el cambio
        // Esto asegura que el estado esté sincronizado con Firebase
        console.log('✅ Login exitoso, esperando actualización de onAuthStateChanged...');
        return { success: true };
      } else {
        const errorMsg = result.error || 'Error al iniciar sesión';
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error al iniciar sesión';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
    // NOTA: No usamos finally aquí porque onAuthStateChanged manejará el loading
    // cuando detecte el cambio de estado de autenticación
  };

  const loginWithPhone = async (phone: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.verifyCodeAndLogin(phone, code);
      
      if (result.success && result.user) {
        console.log('✅ Login con teléfono exitoso');
        // Establecer el usuario directamente ya que no hay Firebase
        setUser(result.user);
        setFirebaseUser(null);
        
        // Guardar sesión completa en AsyncStorage
        const apiToken = await authService.getApiToken();
        if (apiToken) {
          await saveUserSession(result.user, apiToken, 'phone');
        }
        
        setLoading(false);
        return { success: true };
      } else {
        const errorMsg = result.error || 'Error al iniciar sesión';
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error al iniciar sesión';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const requestVerificationCode = async (phone: string) => {
    setError(null);
    try {
      const result = await authService.requestVerificationCode(phone);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Error al solicitar código';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      // Limpiar también los datos del usuario guardados
      await AsyncStorage.removeItem('user_data');
      setUser(null);
      setFirebaseUser(null);
      setError(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const refreshUserClientData = async () => {
    if (!user?.clientId) {
      return;
    }

    try {
      const clientUrl = `${API_BASE_URL}/clients/get/client/${user.clientId}`;
      const clientResponse = await axiosInstance.get(clientUrl);
      
      // response.data puede ser un array o un objeto, extraer el primer elemento si es array
      const updatedClientData = Array.isArray(clientResponse.data) ? clientResponse.data[0] : clientResponse.data;
      
      // Actualizar el estado del usuario con los nuevos datos del cliente
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          userClientData: updatedClientData,
        };
      });
      
      // Guardar usuario actualizado en AsyncStorage (después de actualizar el estado)
      const updatedUser = {
        ...user!,
        userClientData: updatedClientData,
      };
      
      try {
        const authMethod = await AsyncStorage.getItem('auth_method');
        if (authMethod === 'phone') {
          const apiToken = await AsyncStorage.getItem('api_auth_token');
          if (apiToken) {
            await saveUserSession(updatedUser, apiToken, 'phone');
          }
        } else if (authMethod === 'firebase' && firebaseUser) {
          const token = await firebaseUser.getIdToken();
          await saveUserSession(updatedUser, token, 'firebase');
        }
      } catch (saveError) {
        console.warn('⚠️ Error guardando usuario actualizado:', saveError);
      }
    } catch (clientError: any) {
      console.warn('⚠️ Error refrescando datos del cliente:', {
        code: clientError.code,
        message: clientError.message,
        response: clientError.response?.data,
        status: clientError.response?.status,
      });
    }
  };

  const savePendingDeepLink = async (url: string) => {
    try {
      await AsyncStorage.setItem('pending_deep_link', url);
      console.log('💾 Deep link guardado:', url);
    } catch (error) {
      console.error('❌ Error guardando deep link:', error);
    }
  };

  const getPendingDeepLink = async (): Promise<string | null> => {
    try {
      const url = await AsyncStorage.getItem('pending_deep_link');
      if (url) {
        console.log('📖 Deep link pendiente encontrado:', url);
      }
      return url;
    } catch (error) {
      console.error('❌ Error obteniendo deep link:', error);
      return null;
    }
  };

  const clearPendingDeepLink = async () => {
    try {
      await AsyncStorage.removeItem('pending_deep_link');
      console.log('🗑️ Deep link pendiente eliminado');
    } catch (error) {
      console.error('❌ Error eliminando deep link:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        loginWithPhone,
        requestVerificationCode,
        logout,
        // Considerar autenticado si hay firebaseUser (Firebase) o user (teléfono)
        isAuthenticated: !!firebaseUser || !!user,
        error,
        refreshUserClientData,
        savePendingDeepLink,
        getPendingDeepLink,
        clearPendingDeepLink,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

