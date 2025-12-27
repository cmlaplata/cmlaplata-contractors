import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const SCHEME = 'cmlaplata';

/**
 * Genera un deep link para la app
 * @param path - Ruta dentro de la app (ej: 'dashboard', 'leads/123')
 * @param params - Parámetros opcionales como objeto
 * @returns URL del deep link
 */
export const generateDeepLink = (path: string = '', params?: Record<string, string>): string => {
  const baseUrl = `${SCHEME}://${path}`;
  
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    return `${baseUrl}?${queryString}`;
  }
  
  return baseUrl;
};

/**
 * Abre un deep link en la app
 * @param path - Ruta dentro de la app
 * @param params - Parámetros opcionales
 */
export const openDeepLink = async (path: string = '', params?: Record<string, string>): Promise<void> => {
  const url = generateDeepLink(path, params);
  const canOpen = await Linking.canOpenURL(url);
  
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    console.warn(`No se puede abrir el link: ${url}`);
  }
};

/**
 * Copia un deep link al portapapeles
 * @param path - Ruta dentro de la app
 * @param params - Parámetros opcionales
 * @returns El link generado
 */
export const copyDeepLink = async (path: string = '', params?: Record<string, string>): Promise<string> => {
  const link = generateDeepLink(path, params);
  
  if (Platform.OS === 'web') {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    }
  } else {
    try {
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(link);
    } catch {
      // Si no está disponible, solo retornamos el link
    }
  }
  
  return link;
};

