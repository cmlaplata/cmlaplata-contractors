import { useState, useEffect, useCallback } from 'react';
import { facebookLeadsService, FacebookLead, PaginationInfo } from '../services/facebookLeadsService';

interface UseFacebookLeadsOptions {
  clientId: number;
  page?: number;
  limit?: number;
}

export const useFacebookLeads = ({ clientId, page = 1, limit = 50 }: UseFacebookLeadsOptions) => {
  const [leads, setLeads] = useState<FacebookLead[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (currentPage: number) => {
    if (!clientId || clientId === 0) {
      setError('Client ID es requerido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await facebookLeadsService.findByClient(clientId, currentPage, limit);
      // Log para debug: verificar campos de fecha/hora en la respuesta
      console.log('📥📥📥 useFacebookLeads: Leads recibidos:', response.data.length);
      if (response.data.length > 0) {
        // Buscar leads con recontactDate para debug
        const leadsWithRecontact = response.data.filter((lead: FacebookLead) => lead.recontactDate);
        console.log('📥 useFacebookLeads: Leads con recontactDate:', leadsWithRecontact.length);
        leadsWithRecontact.forEach((lead: FacebookLead) => {
          console.log(`📥 useFacebookLeads: Lead ID ${lead.id}:`, {
            id: lead.id,
            name: lead.name,
            clientStatus: lead.clientStatus,
            recontactDate: lead.recontactDate,
            recontactDate_type: typeof lead.recontactDate,
            recontactTime: lead.recontactTime,
            recontactTime_type: typeof lead.recontactTime,
            recontactDate_raw: JSON.stringify(lead.recontactDate),
          });
        });
      }
      setLeads(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar leads');
      setLeads([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, limit]);

  useEffect(() => {
    fetchLeads(page);
  }, [page, fetchLeads]);

  return { 
    leads, 
    pagination,
    loading, 
    error, 
    refetch: () => fetchLeads(page),
    goToPage: (newPage: number) => fetchLeads(newPage)
  };
};

