import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FacebookLeadsPage } from '../../src/components/FacebookLeadsPage';
import { useDebugLog } from '../../src/context/DebugLogContext';

export default function DashboardScreen() {
  const params = useLocalSearchParams();
  const { addLog } = useDebugLog();
  const [leadId, setLeadId] = useState<number | undefined>(undefined);

  // Log al montar
  useEffect(() => {
    addLog('🚀 COMPONENTE MONTADO', 'DASHBOARD');
    addLog(`Platform: ${Platform.OS}`, 'DASHBOARD');
  }, []);

  // Actualizar leadId cuando cambian los parámetros de la URL
  useEffect(() => {
    addLog(`📥 Params recibidos: ${JSON.stringify(params)}`, 'DASHBOARD');
    addLog(`params.leadId: "${params?.leadId}" (tipo: ${typeof params?.leadId})`, 'DASHBOARD');

    if (params?.leadId) {
      // En Android, a veces llega como ["123"] en lugar de "123"
      const rawId = Array.isArray(params.leadId) ? params.leadId[0] : params.leadId;
      addLog(`rawId (después de procesar array): "${rawId}"`, 'DASHBOARD');
      
      const parsedId = parseInt(String(rawId), 10);
      addLog(`parsedId: ${parsedId}`, 'DASHBOARD');
      
      if (!isNaN(parsedId) && parsedId > 0) {
        addLog(`✅ leadId VÁLIDO: ${parsedId}`, 'DASHBOARD');
        setLeadId(parsedId);
      } else {
        addLog(`⚠️ leadId INVÁLIDO, limpiando`, 'DASHBOARD');
        setLeadId(undefined);
      }
    } else {
      addLog('ℹ️ NO hay leadId en params', 'DASHBOARD');
      setLeadId(undefined);
    }
  }, [params?.leadId, addLog]);

  // Log cuando el estado leadId cambia
  useEffect(() => {
    addLog(`📊 Estado leadId cambió a: ${leadId} (tipo: ${typeof leadId})`, 'DASHBOARD');
    addLog(`➡️ Pasando leadId=${leadId} a FacebookLeadsPage`, 'DASHBOARD');
  }, [leadId, addLog]);

  return (
    <View style={styles.container}>
      <FacebookLeadsPage leadId={leadId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

