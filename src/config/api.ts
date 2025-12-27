// ============================================
// CONFIGURACIÓN DE API
// ============================================
// Cambia entre 'local' y 'production' según necesites

import { Platform } from 'react-native';

const API_MODE: 'local' | 'production' = 'production';

// ============================================
// Detectar si estamos en modo desarrollo o build
// ============================================
// __DEV__ es true en desarrollo, false en builds de producción
const isDevelopment = __DEV__;

// ============================================
// FORZAR MODO BUILD PARA TESTING
// ============================================
// Cambia esto a true para simular el modo build y testear la URL de producción
// Útil para probar antes de compilar la APK
const FORCE_BUILD_MODE = false; // Cambia a true para testear la URL de build

// ============================================
// URLs de la API
// ============================================
// En Android e iOS, localhost no funciona desde dispositivos/emuladores
// Usar la IP local de la computadora para que sea accesible desde la red
// IMPORTANTE: Asegúrate de que tu backend esté escuchando en 0.0.0.0 (todas las interfaces)
// y no solo en localhost (127.0.0.1)
const getLocalApiUrl = () => {
  // Si FORCE_BUILD_MODE está activado, usar la URL de build (para testing)
  if (FORCE_BUILD_MODE) {
    console.log('⚠️ FORCE_BUILD_MODE activado - usando URL de build para testing');
    // URL para build: misma que desarrollo, solo cambia la IP para que sea accesible desde dispositivo físico
    return 'http://192.168.0.250:3003';
  }
  
  // Si estamos en desarrollo (web o emulador)
  if (isDevelopment) {
    if (Platform.OS === 'web') {
      return 'http://localhost:3003'; // Web puede usar localhost
    }
    // En desarrollo móvil, usar IP local
    return 'http://192.168.0.250:3003'; // IP local para Android e iOS en desarrollo
  }
  
  // Si estamos en build (APK), usar la IP local (misma que desarrollo)
  // /go/103 es solo para endpoints específicos de leads, no para la API general
  return 'http://192.168.0.250:3003';
};

const API_URLS = {
  local: getLocalApiUrl(),
  production: 'https://cmlaplata.ar/api',
};

// ============================================
// API Keys por entorno
// ============================================
const API_KEYS = {
  local: 'oOxaYPZDg5pi0QRmcpkWFHb3kfoMBH4WF6grILxD5Ez02JS4XlAjaT3BlbkFJmdy2RzYd1SQ9jjjFPs6I8WEzKUwFMle4Qf-j5nUai5Uc6UOzTkFIUdOVJE',
  production: 'oOxaYPZDg5pi0QRmcpkWFHb3kfoMBH4WF6grILxD5Ez02JS4XlAjaT3BlbkFJmdy2RzYd1SQ9jjjFPs6I8WEzKUwFMle4Qf-j5nUai5Uc6UOzTkFIUdOVJE',
};

// ============================================
// URL activa según el modo
// ============================================
export const API_BASE_URL = API_URLS[API_MODE];

// ============================================
// API Key activa según el modo
// ============================================
export const API_KEY = API_KEYS[API_MODE];

// ============================================
// Para debugging - muestra qué URL está usando
// ============================================
console.log(`🌐 API Mode: ${API_MODE}`);
console.log(`🔗 API URL: ${API_BASE_URL}`);
console.log(`🔑 API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'No configurada'}`);
console.log(`📱 Platform: ${Platform.OS}`);
console.log(`🛠️ __DEV__: ${isDevelopment}`);
console.log(`🔧 FORCE_BUILD_MODE: ${FORCE_BUILD_MODE}`);

// ============================================
// Función para testear la conexión a la API
// ============================================
export const testApiConnection = async (): Promise<{ success: boolean; message: string; url: string }> => {
  // Intentar con un endpoint simple, ajusta según tu backend
  const testUrl = `${API_BASE_URL}/facebook-leads/stats`; // O cualquier endpoint que no requiera auth
  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
      },
    });
    
    if (response.ok) {
      return {
        success: true,
        message: '✅ Conexión exitosa a la API',
        url: testUrl,
      };
    } else {
      return {
        success: false,
        message: `❌ Error: ${response.status} ${response.statusText}`,
        url: testUrl,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `❌ Error de conexión: ${error.message}`,
      url: testUrl,
    };
  }
};

