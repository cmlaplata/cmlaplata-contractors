// ============================================
// CONFIGURACIÓN DE API
// ============================================
// Cambia entre 'local' y 'production' según necesites

import { Platform } from 'react-native';

const API_MODE: 'local' | 'production' = 'local';

// ============================================
// URLs de la API
// ============================================
// En Android e iOS, localhost no funciona desde dispositivos/emuladores
// Usar la IP local de la computadora para que sea accesible desde la red
// IMPORTANTE: Asegúrate de que tu backend esté escuchando en 0.0.0.0 (todas las interfaces)
// y no solo en localhost (127.0.0.1)
const getLocalApiUrl = () => {
  // Para todos los dispositivos (Android, iOS, web), usar la IP local
  // Asegúrate de que tu dispositivo/emulador y computadora estén en la misma red WiFi
  if (Platform.OS === 'web') {
    return 'http://localhost:3003'; // Web puede usar localhost
  }
  return 'http://192.168.0.250:3003'; // IP local para Android e iOS
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

