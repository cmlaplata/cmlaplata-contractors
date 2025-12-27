import { useEffect, useState, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams, useSegments } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useDebugLog } from '../src/context/DebugLogContext';

export default function UnmatchedRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const segments = useSegments();
  const { isAuthenticated, loading: authLoading, savePendingDeepLink } = useAuth();
  const { addLog } = useDebugLog();
  const [processing, setProcessing] = useState(true);
  const processedRef = useRef(false);

  // Log al montar el componente
  useEffect(() => {
    addLog('🚀 COMPONENTE MONTADO', 'UNMATCHED');
    addLog(`authLoading: ${authLoading}, isAuthenticated: ${isAuthenticated}`, 'UNMATCHED');
    addLog(`params: ${JSON.stringify(params)}`, 'UNMATCHED');
    addLog(`segments: [${segments.join(', ')}]`, 'UNMATCHED');
    
    // En expo-router, los segmentos de la URL no coincidente están en params.unmatched
    const unmatchedSegments = params.unmatched;
    addLog(`params.unmatched: ${JSON.stringify(unmatchedSegments)}`, 'UNMATCHED');
  }, []);

  useEffect(() => {
    // Evitar procesamiento múltiple
    if (processedRef.current) {
      addLog('⏭️ Ya procesado, ignorando', 'UNMATCHED');
      return;
    }

    // Esperar a que auth termine de cargar
    if (authLoading) {
      addLog('⏳ Esperando que auth termine de cargar...', 'UNMATCHED');
      return;
    }

    // Función para navegar con leadId
    const navigateWithLeadId = (leadId: number) => {
      addLog(`🚀 Navegando a dashboard CON leadId=${leadId}`, 'UNMATCHED');
      processedRef.current = true;
      router.replace({
        pathname: '/(tabs)/dashboard',
        params: { leadId: leadId.toString() }
      });
    };

    // Función para navegar sin leadId
    const navigateWithoutLeadId = () => {
      addLog('🔄 Redirigiendo al dashboard SIN params', 'UNMATCHED');
      processedRef.current = true;
      router.replace('/(tabs)/dashboard');
    };

    // Función para guardar deep link y redirigir a login
    const saveAndRedirectToLogin = async (leadId: number) => {
      addLog('💾 Usuario NO autenticado, guardando deep link para después', 'UNMATCHED');
      await savePendingDeepLink(`cmlaplata://leads/${leadId}`);
      addLog('🔄 Redirigiendo a LOGIN', 'UNMATCHED');
      processedRef.current = true;
      router.replace('/(auth)/login');
    };

    // Función para extraer leadId de una URL
    const extractLeadIdFromUrl = (url: string): number | null => {
      const match = url.match(/leads\/(\d+)/);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (!isNaN(id) && id > 0) {
          return id;
        }
      }
      return null;
    };

    // Función para extraer leadId de los segmentos de expo-router
    const extractLeadIdFromSegments = (): number | null => {
      // params.unmatched contiene los segmentos de la URL no coincidente
      // Por ejemplo, para cmlaplata://leads/61, unmatched = ["leads", "61"]
      const unmatchedSegments = params.unmatched;
      addLog(`🔍 Analizando segments: ${JSON.stringify(unmatchedSegments)}`, 'UNMATCHED');
      
      if (Array.isArray(unmatchedSegments) && unmatchedSegments.length >= 2) {
        // Buscar el patrón ["leads", "número"]
        for (let i = 0; i < unmatchedSegments.length - 1; i++) {
          if (unmatchedSegments[i] === 'leads') {
            const idStr = unmatchedSegments[i + 1];
            const id = parseInt(idStr, 10);
            if (!isNaN(id) && id > 0) {
              addLog(`✅ Lead ID extraído de segments: ${id}`, 'UNMATCHED');
              return id;
            }
          }
        }
      } else if (typeof unmatchedSegments === 'string') {
        // A veces viene como string "leads/61"
        const match = unmatchedSegments.match(/leads\/(\d+)/);
        if (match && match[1]) {
          const id = parseInt(match[1], 10);
          if (!isNaN(id) && id > 0) {
            addLog(`✅ Lead ID extraído de string segment: ${id}`, 'UNMATCHED');
            return id;
          }
        }
      }
      
      return null;
    };

    addLog('✅ Auth cargado, iniciando procesamiento', 'UNMATCHED');

    const processDeepLink = async () => {
      try {
        // PASO 1: Intentar extraer leadId de los segmentos de expo-router (más confiable)
        let leadId = extractLeadIdFromSegments();
        
        if (leadId) {
          addLog(`📍 MÉTODO 1: leadId=${leadId} obtenido de expo-router segments`, 'UNMATCHED');
        } else {
          // PASO 2: Intentar con Linking.getInitialURL() (para cuando la app se inicia desde deep link)
          addLog('🔍 MÉTODO 2: Intentando Linking.getInitialURL()...', 'UNMATCHED');
          const initialUrl = await Linking.getInitialURL();
          addLog(`📋 URL inicial: "${initialUrl}"`, 'UNMATCHED');
          
          if (initialUrl) {
            leadId = extractLeadIdFromUrl(initialUrl);
            if (leadId) {
              addLog(`📍 leadId=${leadId} obtenido de getInitialURL`, 'UNMATCHED');
            }
          }
        }

        // Procesar el leadId encontrado
        if (leadId) {
          if (!isAuthenticated) {
            await saveAndRedirectToLogin(leadId);
          } else {
            navigateWithLeadId(leadId);
          }
        } else {
          addLog('❌ No se encontró leadId válido', 'UNMATCHED');
          navigateWithoutLeadId();
        }
      } catch (error: any) {
        addLog(`❌ Error: ${error?.message}`, 'UNMATCHED');
        navigateWithoutLeadId();
      } finally {
        setProcessing(false);
      }
    };

    processDeepLink();

    // Escuchar deep links mientras la app está abierta
    const subscription = Linking.addEventListener('url', async (event) => {
      addLog(`🔔 Deep link recibido (app abierta): "${event.url}"`, 'UNMATCHED');
      const leadId = extractLeadIdFromUrl(event.url);
      if (leadId) {
        if (!isAuthenticated) {
          await saveAndRedirectToLogin(leadId);
        } else {
          navigateWithLeadId(leadId);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router, isAuthenticated, authLoading, savePendingDeepLink, addLog, params, segments]);

  // Mostrar loading mientras se procesa
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00acec" />
      <Text style={styles.text}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

