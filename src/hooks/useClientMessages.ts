import { useState, useEffect } from 'react';
import { clientService, Client } from '../services/clientService';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useClientMessages = (clientId: number | null | undefined) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchClient = async () => {
    if (!clientId) {
      return;
    }

    const authMethod = await AsyncStorage.getItem('auth_method');
    let isAuthenticated = false;
    
    if (authMethod === 'phone') {
      const apiToken = await AsyncStorage.getItem('api_auth_token');
      isAuthenticated = !!apiToken;
    } else if (authMethod === 'firebase') {
      let user = auth.currentUser;
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 200));
        user = auth.currentUser;
      }
      isAuthenticated = !!user;
    } else {
      isAuthenticated = !!auth.currentUser;
    }
    
    if (!isAuthenticated) {
      setError('No estás autenticado. Por favor, inicia sesión nuevamente.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const clientData = await clientService.getById(clientId);
      setClient(clientData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al cargar configuración del cliente';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateMessageInstructions = async (instructions: string) => {
    if (!clientId) {
      throw new Error('No hay clientId disponible');
    }

    const authMethod = await AsyncStorage.getItem('auth_method');
    let isAuthenticated = false;
    
    if (authMethod === 'phone') {
      const apiToken = await AsyncStorage.getItem('api_auth_token');
      isAuthenticated = !!apiToken;
    } else if (authMethod === 'firebase') {
      let user = auth.currentUser;
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 300));
        user = auth.currentUser;
      }
      isAuthenticated = !!user;
    } else {
      isAuthenticated = !!auth.currentUser;
    }
    
    if (!isAuthenticated) {
      const errorMsg = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    let currentClient = client;
    if (!currentClient) {
      try {
        currentClient = await clientService.getById(clientId);
        setClient(currentClient);
      } catch (err: any) {
        currentClient = { id: clientId, businessName: '', aiMessageInstructions: '' } as Client;
      }
    }

    try {
      setUpdating(true);
      setError(null);
      
      const updatedClient = await clientService.update(clientId, {
        aiMessageInstructions: instructions,
      });
      
      setClient(updatedClient);
      return updatedClient;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al actualizar instrucciones';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClient();
    } else {
      setClient(null);
      setError(null);
    }
  }, [clientId]);

  const updateSetWhatsapp = async (setWhatsapp: 'show' | 'both' | 'hidden') => {
    if (!clientId) {
      throw new Error('No hay clientId disponible');
    }

    const authMethod = await AsyncStorage.getItem('auth_method');
    let isAuthenticated = false;
    
    if (authMethod === 'phone') {
      const apiToken = await AsyncStorage.getItem('api_auth_token');
      isAuthenticated = !!apiToken;
    } else if (authMethod === 'firebase') {
      let user = auth.currentUser;
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 300));
        user = auth.currentUser;
      }
      isAuthenticated = !!user;
    } else {
      isAuthenticated = !!auth.currentUser;
    }
    
    if (!isAuthenticated) {
      const errorMsg = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    let currentClient = client;
    if (!currentClient) {
      try {
        currentClient = await clientService.getById(clientId);
        setClient(currentClient);
      } catch (err: any) {
        currentClient = { id: clientId, businessName: '', aiMessageInstructions: '', setWhatsapp: 'both' } as Client;
      }
    }

    try {
      setUpdating(true);
      setError(null);
      
      const updatedClient = await clientService.update(clientId, {
        setWhatsapp: setWhatsapp,
      });
      
      setClient(updatedClient);
      return updatedClient;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al actualizar configuración de botones';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const aiMessageInstructions = client?.aiMessageInstructions || '';
  const setWhatsapp = client?.setWhatsapp || 'both';

  return {
    client,
    aiMessageInstructions,
    setWhatsapp,
    loading,
    updating,
    error,
    updateMessageInstructions,
    updateSetWhatsapp,
    refetch: fetchClient,
  };
};

