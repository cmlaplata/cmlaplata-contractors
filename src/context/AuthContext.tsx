import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService, User } from '../services/authService';
import axiosInstance from '../config/axios';
import { API_BASE_URL } from '../config/api';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Inicializar persistencia al montar el componente
    const initializeAuth = async () => {
      if (!isInitialized.current) {
        console.log('🚀 Inicializando AuthProvider...');
        try {
          await authService.initializePersistence();
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

            const userData = response.data;

            // Formatear nombre (primera letra mayúscula)
            if (userData.name) {
              let name = userData.name.toLowerCase();
              name = name.charAt(0).toUpperCase() + name.slice(1);
              userData.name = name;
            }

            setUser(userData);
            setFirebaseUser(firebaseUser);
            setError(null);
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
            
            if (error.response) {
              const status = error.response.status;
              if (status === 404) {
                errorMessage = 'Usuario no encontrado en el sistema. Contacta al administrador.';
              } else if (status === 401) {
                errorMessage = 'Token inválido. Por favor, inicia sesión nuevamente.';
              } else if (status >= 500) {
                errorMessage = 'Error del servidor. Intenta más tarde.';
              } else {
                errorMessage = `Error del servidor (${status})`;
              }
            } else if (error.request) {
              errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión.';
            }

            // Si el usuario no existe en la BD, podría ser un nuevo usuario
            setUser(null);
            setFirebaseUser(null);
            setError(errorMessage);
          }
        } else {
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
        setUser(null);
        setFirebaseUser(null);
        setError('Error al verificar el estado de autenticación');
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

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        error,
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

