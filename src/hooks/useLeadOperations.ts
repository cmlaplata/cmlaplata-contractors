import { useState } from 'react';
import { facebookLeadsService, CreateFacebookLeadDto, UpdateFacebookLeadDto } from '../services/facebookLeadsService';

export const useLeadOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLead = async (data: CreateFacebookLeadDto) => {
    try {
      setLoading(true);
      setError(null);
      const lead = await facebookLeadsService.create(data);
      return lead;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al crear lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (id: number, data: UpdateFacebookLeadDto) => {
    try {
      setLoading(true);
      setError(null);
      const lead = await facebookLeadsService.update(id, data);
      return lead;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al actualizar lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await facebookLeadsService.delete(id);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al eliminar lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createLead,
    updateLead,
    deleteLead,
    loading,
    error,
  };
};

