import axiosInstance from '../config/axios';
import { API_BASE_URL } from '../config/api';

const api = axiosInstance;

export interface FacebookLead {
  id: number;
  clientId: number | null;
  name: string | null;
  phone: string | null;                          // Teléfono del destinatario
  phoneManual: string | null;                    // Teléfono manual (opcional)
  phoneAuto: string | null;                     // Teléfono automático (opcional)
  email: string | null;                          // Email
  city: string | null;                           // Ciudad
  preferredContactMethod: string | null;         // Método de contacto preferido
  project: string | null;                        // Proyecto
  estimatedTimeToStart: string | null;          // Fecha estimada para comenzar (opcional)
  availableBudget: string | null;               // Presupuesto disponible (opcional)
  extraInfo: string | null;                     // Información extra (opcional)
  clientStatus: string | null;                  // Estado del cliente
  appointmentDate?: string | null;              // Fecha de cita agendada (ISO string)
  appointmentTime?: string | null;              // Hora de cita agendada (HH:MM)
  recontactDate?: string | null;                // Fecha de recontacto (ISO string)
  recontactTime?: string | null;                // Hora de recontacto (HH:MM)
  data1: string | null;
  data2: string | null;
  data3: string | null;
  data4: string | null;
  data5: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: number;
    businessName: string;
  } | null;
}

export interface CreateFacebookLeadDto {
  clientId?: number;
  name?: string;
  phoneManual?: string;
  phoneAuto?: string;
  project?: string;
  city?: string;
  email?: string;
  data1?: string;
  data2?: string;
  data3?: string;
  data4?: string;
  data5?: string;
}

export interface UpdateFacebookLeadDto {
  clientId?: number;
  name?: string;
  phoneManual?: string;
  phoneAuto?: string;
  project?: string;
  city?: string;
  email?: string;
  data1?: string;
  data2?: string;
  data3?: string;
  data4?: string;
  data5?: string;
}

export interface LeadsStats {
  total: number;
  withClient: number;
  withoutClient: number;
  withPhone: number;
  withEmail: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  count?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationInfo;
  searchTerm?: string;
}

export interface SendPendingResponse {
  success: boolean;
  message: string;
  note?: string;
}

// El token se agrega automáticamente mediante el interceptor en axios.ts

// Servicios
export const facebookLeadsService = {
  // Crear lead
  create: async (data: CreateFacebookLeadDto): Promise<FacebookLead> => {
    const response = await api.post<ApiResponse<FacebookLead>>(`${API_BASE_URL}/facebook-leads`, data);
    return response.data.data;
  },

  // Obtener todos los leads (legacy - mantener para compatibilidad)
  findAll: async (clientId?: number): Promise<FacebookLead[]> => {
    const params = clientId ? { clientId: clientId.toString() } : {};
    const response = await api.get<ApiResponse<FacebookLead[]>>(`${API_BASE_URL}/facebook-leads`, { params });
    return response.data.data;
  },

  // Obtener leads por cliente con paginación
  findByClient: async (
    clientId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<FacebookLead>> => {
    const params = { page, limit };
    const response = await api.get<PaginatedResponse<FacebookLead>>(
      `${API_BASE_URL}/facebook-leads/client/${clientId}`,
      { params }
    );
    return response.data;
  },

  // Buscar leads del usuario autenticado (solo con API key, sin token de Firebase)
  searchMyLeads: async (
    query: string,
    clientId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<FacebookLead>> => {
    if (query.trim().length < 2) {
      throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
    }
    if (!clientId || clientId === 0) {
      throw new Error('Client ID es requerido para la búsqueda');
    }
    const params = { q: query.trim(), clientId, page, limit };
    const response = await api.get<PaginatedResponse<FacebookLead>>(
      `${API_BASE_URL}/facebook-leads/my-leads/search`,
      { params }
    );
    return response.data;
  },

  // Obtener por ID
  findOne: async (id: number): Promise<FacebookLead> => {
    const response = await api.get<ApiResponse<FacebookLead>>(`${API_BASE_URL}/facebook-leads/${id}`);
    return response.data.data;
  },

  // Obtener estadísticas
  getStats: async (): Promise<LeadsStats> => {
    console.log('📡 facebookLeadsService.getStats: Llamando a GET /facebook-leads/stats...');
    const response = await api.get<ApiResponse<LeadsStats>>(`${API_BASE_URL}/facebook-leads/stats`);
    console.log('📡 facebookLeadsService.getStats: Respuesta completa:', JSON.stringify(response.data, null, 2));
    console.log('📡 facebookLeadsService.getStats: response.data.data:', response.data.data);
    console.log('📡 facebookLeadsService.getStats: response.data.data.total:', response.data.data?.total, 'tipo:', typeof response.data.data?.total);
    
    // Validar y corregir el total si es necesario
    const stats = response.data.data;
    if (stats && typeof stats.total !== 'number') {
      console.warn('⚠️ facebookLeadsService.getStats: total no es un número, corrigiendo a 0');
      stats.total = 0;
    }
    
    return stats;
  },

  // Actualizar lead
  update: async (id: number, data: UpdateFacebookLeadDto): Promise<FacebookLead> => {
    const response = await api.patch<ApiResponse<FacebookLead>>(`${API_BASE_URL}/facebook-leads/${id}`, data);
    return response.data.data;
  },

  // Eliminar lead
  delete: async (id: number): Promise<void> => {
    await api.delete(`${API_BASE_URL}/facebook-leads/${id}`);
  },

  // Enviar leads pendientes (test)
  sendPending: async (): Promise<SendPendingResponse> => {
    const url = `${API_BASE_URL}/facebook-leads/send-pending`;
    console.log('📡 sendPending: Iniciando...');
    console.log('📡 sendPending: URL:', url);
    console.log('📡 sendPending: API_BASE_URL:', API_BASE_URL);
    
    try {
      const response = await api.post<SendPendingResponse>(url);
      console.log('✅ sendPending: Respuesta recibida:', {
        status: response.status,
        data: response.data,
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ sendPending: Error:', {
        error,
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url,
      });
      throw error;
    }
  },

  // Generar contenido para un lead (nuevo endpoint)
  generateContent: async (
    leadId: number,
    type: 'email' | 'sms' | 'call',
    language: 'español' | 'ingles' = 'español'
  ): Promise<{ leadId: number; type: string; language: string; content: string }> => {
    const response = await api.post<ApiResponse<{ leadId: number; type: string; language: string; content: string }>>(
      `${API_BASE_URL}/facebook-leads/${leadId}/generate-content`,
      {},
      { params: { type, language } }
    );
    return response.data.data;
  },

  // Generar email para un lead (legacy - mantenido para compatibilidad)
  generateEmail: async (
    leadId: number,
    language: 'español' | 'ingles' = 'español'
  ): Promise<{ leadId: number; language: string; email: string }> => {
    const response = await api.post<ApiResponse<{ leadId: number; language: string; email: string }>>(
      `${API_BASE_URL}/facebook-leads/${leadId}/generate-email`,
      {},
      { params: { language } }
    );
    return response.data.data;
  },

  // Enviar solicitud de review al cliente
  sendReviewRequest: async (leadId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>(
      `${API_BASE_URL}/email/send-review-request/${leadId}`
    );
    return response.data.data;
  },

  // Actualizar estado del cliente
  updateClientStatus: async (
    leadId: number, 
    clientStatus: string,
    options?: {
      appointmentDate?: string; // Formato: YYYY-MM-DD
      appointmentTime?: string; // Formato: HH:MM
      recontactDate?: string; // Formato: YYYY-MM-DD
      recontactTime?: string; // Formato: HH:MM
    }
  ): Promise<FacebookLead> => {
    const url = `${API_BASE_URL}/facebook-leads/${leadId}/client-status`;
    
    // Validar que clientStatus no sea undefined o null
    if (!clientStatus || clientStatus === 'undefined' || clientStatus === 'null') {
      throw new Error('clientStatus no puede ser undefined o null');
    }
    
    // Asegurar que clientStatus sea un string válido
    const cleanStatus = String(clientStatus).trim();
    if (!cleanStatus) {
      throw new Error('clientStatus no puede estar vacío');
    }
    
    const body: any = { clientStatus: cleanStatus };
    
    // Agregar campos de fecha y hora si están presentes
    if (options?.appointmentDate) {
      body.appointmentDate = options.appointmentDate;
    }
    if (options?.appointmentTime) {
      body.appointmentTime = options.appointmentTime;
    }
    if (options?.recontactDate) {
      body.recontactDate = options.recontactDate;
    }
    if (options?.recontactTime) {
      body.recontactTime = options.recontactTime;
    }
    
    console.log('📡 updateClientStatus: Iniciando...');
    console.log('📡 updateClientStatus: URL:', url);
    console.log('📡 updateClientStatus: leadId:', leadId);
    console.log('📡 updateClientStatus: clientStatus:', clientStatus);
    console.log('📡 updateClientStatus: clientStatus type:', typeof clientStatus);
    console.log('📡 updateClientStatus: clientStatus length:', clientStatus?.length);
    console.log('📡 updateClientStatus: clientStatus charCodes:', clientStatus?.split('').map(c => c.charCodeAt(0)));
    console.log('📡 updateClientStatus: options:', options);
    console.log('📡 updateClientStatus: Body:', JSON.stringify(body, null, 2));
    
    try {
      const response = await api.patch<ApiResponse<FacebookLead>>(url, body);
      
      console.log('✅ updateClientStatus: Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
      console.log('✅ updateClientStatus: Lead actualizado:', JSON.stringify(response.data.data, null, 2));
      console.log('✅ updateClientStatus: clientStatus en respuesta:', response.data.data?.clientStatus);
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ updateClientStatus: Error:', {
        error,
        message: error?.message,
        response: error?.response?.data,
        responseData: JSON.stringify(error?.response?.data, null, 2),
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        url: error?.config?.url,
        method: error?.config?.method,
        requestData: error?.config?.data,
        requestDataParsed: error?.config?.data ? JSON.parse(error?.config?.data) : null,
      });
      throw error;
    }
  },
};

