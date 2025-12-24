import { useState, useEffect } from 'react';
import { clientService, Client } from '../services/clientService';

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

