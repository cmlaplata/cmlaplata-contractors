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

