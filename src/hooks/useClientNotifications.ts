import { useState, useEffect } from 'react';
import { clientService, Client } from '../services/clientService';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useClientNotifications = (clientId: number | null | undefined) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchClient = async () => {
    console.log('📡 fetchClient llamado. clientId:', clientId);
    
    if (!clientId) {
      console.log('⚠️ fetchClient: No hay clientId, abortando');
      return;
    }

    // Verificar autenticación antes de hacer peticiones
    const authMethod = await AsyncStorage.getItem('auth_method');
    let isAuthenticated = false;
    
    if (authMethod === 'phone') {
      const apiToken = await AsyncStorage.getItem('api_auth_token');
      isAuthenticated = !!apiToken;
    } else if (authMethod === 'firebase') {
      // Esperar un momento para que Firebase se inicialice si es necesario
      let user = auth.currentUser;
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 200));
        user = auth.currentUser;
      }
      isAuthenticated = !!user;
    } else {
      // Si no hay método de autenticación, verificar si hay usuario de Firebase
      isAuthenticated = !!auth.currentUser;
    }
    
    if (!isAuthenticated) {
      console.warn('⚠️ fetchClient: Usuario no autenticado, no se puede cargar el cliente');
      setError('No estás autenticado. Por favor, inicia sesión nuevamente.');
      setLoading(false);
      return;
    }

    try {
      console.log('⏳ fetchClient: Iniciando carga del cliente...');
      setLoading(true);
      setError(null);
      const clientData = await clientService.getById(clientId);
      console.log('✅ fetchClient: Cliente obtenido:', clientData);
      setClient(clientData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar configuración del cliente';
      setError(errorMessage);
      console.warn('⚠️ Error obteniendo cliente:', {
        error: err,
        message: errorMessage,
        response: err.response?.data,
        status: err.response?.status,
      });
    } finally {
      setLoading(false);
      console.log('✅ fetchClient: Finalizado');
    }
  };

  const toggleNotifications = async () => {
    console.log('🔄 toggleNotifications llamado');
    console.log('🔄 clientId:', clientId);
    console.log('🔄 client:', client);
    
    if (!clientId) {
      console.error('❌ toggleNotifications: No hay clientId');
      throw new Error('No hay clientId disponible');
    }

    // Verificar autenticación antes de hacer peticiones
    const authMethod = await AsyncStorage.getItem('auth_method');
    let isAuthenticated = false;
    
    if (authMethod === 'phone') {
      const apiToken = await AsyncStorage.getItem('api_auth_token');
      isAuthenticated = !!apiToken;
      console.log('📱 Verificación de autenticación (teléfono):', isAuthenticated ? 'Autenticado' : 'No autenticado');
    } else if (authMethod === 'firebase') {
      // Esperar un momento para que Firebase se inicialice si es necesario
      let user = auth.currentUser;
      if (!user) {
        console.log('⚠️ auth.currentUser es null, esperando inicialización...');
        await new Promise(resolve => setTimeout(resolve, 300));
        user = auth.currentUser;
      }
      isAuthenticated = !!user;
      console.log('🔥 Verificación de autenticación (Firebase):', isAuthenticated ? `Autenticado (${user?.uid})` : 'No autenticado');
    } else {
      // Si no hay método de autenticación, verificar si hay usuario de Firebase
      const user = auth.currentUser;
      isAuthenticated = !!user;
      console.log('🔍 Verificación de autenticación (sin método):', isAuthenticated ? `Autenticado (${user?.uid})` : 'No autenticado');
    }
    
    if (!isAuthenticated) {
      const errorMsg = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
      setError(errorMsg);
      console.error('❌ toggleNotifications: Usuario no autenticado');
      throw new Error(errorMsg);
    }

    // Si no hay cliente cargado, intentar cargarlo primero
    let currentClient = client;
    if (!currentClient) {
      console.log('⚠️ toggleNotifications: No hay cliente cargado, intentando cargar...');
      try {
        currentClient = await clientService.getById(clientId);
        setClient(currentClient);
        console.log('✅ toggleNotifications: Cliente cargado:', currentClient);
      } catch (err: any) {
        console.error('❌ toggleNotifications: Error al cargar cliente:', err);
        // Si falla al cargar, usar el valor por defecto false
        currentClient = { id: clientId, businessName: '', leadsNotificationAllDay: false } as Client;
      }
    }

    try {
      console.log('⏳ toggleNotifications: Iniciando actualización...');
      setUpdating(true);
      setError(null);
      const newValue = !(currentClient?.leadsNotificationAllDay ?? false);
      console.log('🔄 toggleNotifications: Nuevo valor:', newValue);
      console.log('📡 toggleNotifications: Llamando a clientService.update...');
      
      const updatedClient = await clientService.update(clientId, {
        leadsNotificationAllDay: newValue,
      });
      
      console.log('✅ toggleNotifications: Cliente actualizado:', updatedClient);
      setClient(updatedClient);
      return updatedClient;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al actualizar configuración';
      setError(errorMessage);
      console.error('❌ Error en toggleNotifications:', {
        error: err,
        message: errorMessage,
        response: err.response?.data,
        status: err.response?.status,
      });
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
      console.log('✅ toggleNotifications: Finalizado');
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect ejecutado. clientId:', clientId);
    if (clientId) {
      fetchClient();
    } else {
      console.log('⚠️ useEffect: No hay clientId, no se ejecuta fetchClient');
      setClient(null);
      setError(null);
    }
  }, [clientId]);

  // Convertir leadsNotificationAllDay a boolean si viene como string del backend
  const leadsNotificationAllDay = client?.leadsNotificationAllDay !== undefined 
    ? (typeof client.leadsNotificationAllDay === 'string' 
        ? client.leadsNotificationAllDay === 'true' || client.leadsNotificationAllDay === '1'
        : Boolean(client.leadsNotificationAllDay))
    : false;

  return {
    client,
    leadsNotificationAllDay,
    loading,
    updating,
    error,
    toggleNotifications,
    refetch: fetchClient,
  };
};

