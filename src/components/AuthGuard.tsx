import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useDebugLog } from '../context/DebugLogContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user, getPendingDeepLink, clearPendingDeepLink } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { addLog } = useDebugLog();
  const processedDeepLinkRef = useRef(false);

  useEffect(() => {
    addLog(`🔄 useEffect - loading: ${loading}, isAuthenticated: ${isAuthenticated}`, 'AUTH_GUARD');
    addLog(`🔄 segments: [${segments.join(', ')}]`, 'AUTH_GUARD');
    
    if (loading) {
      addLog('⏳ Auth cargando, esperando...', 'AUTH_GUARD');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    addLog(`📍 inAuthGroup: ${inAuthGroup}`, 'AUTH_GUARD');

    if (!isAuthenticated && !inAuthGroup) {
      addLog('🔒 Usuario NO autenticado, redirigiendo a LOGIN', 'AUTH_GUARD');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      addLog('✅ Usuario AUTENTICADO pero en pantalla de login', 'AUTH_GUARD');
      
      // Usuario autenticado pero en pantalla de login
      // Procesar deep link pendiente si existe
      if (!processedDeepLinkRef.current) {
        processedDeepLinkRef.current = true;
        addLog('🔍 Buscando deep link pendiente...', 'AUTH_GUARD');
        
        getPendingDeepLink().then((pendingUrl) => {
          if (pendingUrl) {
            addLog(`📋 Deep link pendiente encontrado: "${pendingUrl}"`, 'AUTH_GUARD');
            clearPendingDeepLink();
            
            // Extraer leadId del deep link
            const match = pendingUrl.match(/leads\/(\d+)/);
            addLog(`🔍 Match result: ${match ? JSON.stringify(match) : 'null'}`, 'AUTH_GUARD');
            
            if (match && match[1]) {
              const leadId = parseInt(match[1], 10);
              addLog(`📊 leadId extraído: ${leadId}`, 'AUTH_GUARD');
              
              if (!isNaN(leadId) && leadId > 0) {
                addLog(`🚀 Navegando a dashboard CON leadId=${leadId}`, 'AUTH_GUARD');
                router.replace({
                  pathname: '/(tabs)/dashboard',
                  params: { leadId: leadId.toString() }
                });
                return;
              } else {
                addLog(`⚠️ leadId inválido: ${leadId}`, 'AUTH_GUARD');
              }
            } else {
              addLog('❌ No se encontró leads/(número) en el deep link', 'AUTH_GUARD');
            }
          } else {
            addLog('ℹ️ No hay deep link pendiente', 'AUTH_GUARD');
          }
          
          // Si no hay deep link pendiente o no es válido, ir al dashboard normal
          addLog('🔄 Redirigiendo al dashboard SIN params', 'AUTH_GUARD');
          router.replace('/(tabs)/dashboard');
        });
      } else {
        addLog('ℹ️ Deep link ya procesado, redirigiendo al dashboard', 'AUTH_GUARD');
        router.replace('/(tabs)/dashboard');
      }
    } else {
      addLog(`ℹ️ Estado normal - isAuthenticated: ${isAuthenticated}, inAuthGroup: ${inAuthGroup}`, 'AUTH_GUARD');
    }
  }, [isAuthenticated, loading, segments, user, getPendingDeepLink, clearPendingDeepLink, router, addLog]);

  // Resetear el flag cuando el usuario cierra sesión
  useEffect(() => {
    if (!isAuthenticated) {
      addLog('🔄 Usuario cerró sesión, reseteando flag de deep link', 'AUTH_GUARD');
      processedDeepLinkRef.current = false;
    }
  }, [isAuthenticated, addLog]);

  return <>{children}</>;
}

