import axiosInstance from '../config/axios';
import { API_BASE_URL } from '../config/api';

export interface Client {
  id: number;
  businessName: string;
  leadsNotificationAllDay: boolean;
  // ... otros campos
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface UpdateClientDto {
  leadsNotificationAllDay?: boolean;
  // ... otros campos opcionales
}

export const clientService = {
  // Obtener cliente por ID
  getById: async (clientId: number): Promise<Client> => {
    const url = `${API_BASE_URL}/clients/${clientId}`;
    console.log('📡 clientService.getById:', url);
    console.log('📡 clientService.getById: clientId:', clientId);
    
    const response = await axiosInstance.get<ApiResponse<Client>>(url);
    
    console.log('✅ clientService.getById: Respuesta:', {
      status: response.status,
      data: response.data,
    });
    
    // Manejar diferentes estructuras de respuesta del backend
    // Puede venir como response.data.data o directamente como response.data
    const clientData = (response.data as any).data || response.data;
    
    // Validar que clientData existe
    if (!clientData) {
      console.error('❌ Estructura de respuesta inesperada:', response.data);
      throw new Error('No se recibieron datos del cliente');
    }
    
    // Asegurar que leadsNotificationAllDay sea boolean, con valor por defecto false
    if (clientData.leadsNotificationAllDay === undefined || clientData.leadsNotificationAllDay === null) {
      clientData.leadsNotificationAllDay = false;
    } else {
      clientData.leadsNotificationAllDay = typeof clientData.leadsNotificationAllDay === 'string'
        ? clientData.leadsNotificationAllDay === 'true' || clientData.leadsNotificationAllDay === '1'
        : Boolean(clientData.leadsNotificationAllDay);
    }
    
    return clientData;
  },

  // Actualizar cliente
  update: async (clientId: number, data: UpdateClientDto): Promise<Client> => {
    const url = `${API_BASE_URL}/clients/${clientId}`;
    console.log('📡 clientService.update:', url);
    console.log('📡 clientService.update: clientId:', clientId);
    console.log('📡 clientService.update: data:', data);
    
    // Asegurar que leadsNotificationAllDay sea boolean antes de enviar
    const normalizedData = { ...data };
    if (normalizedData.leadsNotificationAllDay !== undefined) {
      normalizedData.leadsNotificationAllDay = typeof normalizedData.leadsNotificationAllDay === 'string'
        ? normalizedData.leadsNotificationAllDay === 'true' || normalizedData.leadsNotificationAllDay === '1'
        : Boolean(normalizedData.leadsNotificationAllDay);
    }
    
    const response = await axiosInstance.patch<ApiResponse<Client>>(url, normalizedData);
    
    console.log('✅ clientService.update: Respuesta:', {
      status: response.status,
      data: response.data,
    });
    
    // Manejar diferentes estructuras de respuesta del backend
    // Puede venir como response.data.data o directamente como response.data
    const clientData = (response.data as any).data || response.data;
    
    // Validar que clientData existe
    if (!clientData) {
      console.error('❌ Estructura de respuesta inesperada:', response.data);
      throw new Error('No se recibieron datos del cliente actualizado');
    }
    
    // Asegurar que leadsNotificationAllDay sea boolean en la respuesta, con valor por defecto false
    if (clientData.leadsNotificationAllDay === undefined || clientData.leadsNotificationAllDay === null) {
      clientData.leadsNotificationAllDay = false;
    } else {
      clientData.leadsNotificationAllDay = typeof clientData.leadsNotificationAllDay === 'string'
        ? clientData.leadsNotificationAllDay === 'true' || clientData.leadsNotificationAllDay === '1'
        : Boolean(clientData.leadsNotificationAllDay);
    }
    
    return clientData;
  },

  // Activar notificaciones 24h
  enableAllDayNotifications: async (clientId: number): Promise<Client> => {
    return await clientService.update(clientId, { leadsNotificationAllDay: true });
  },

  // Desactivar notificaciones 24h (solo 9 AM - 11:59 PM)
  disableAllDayNotifications: async (clientId: number): Promise<Client> => {
    return await clientService.update(clientId, { leadsNotificationAllDay: false });
  },
};

