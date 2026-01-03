import { useState } from 'react';
import { facebookLeadsService, CreateFacebookLeadDto, UpdateFacebookLeadDto } from '../services/facebookLeadsService';

export const useLeadOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLead = async (data: CreateFacebookLeadDto) => {
    try {
      console.log('📤 useLeadOperations.createLead - Iniciando');
      console.log('📤 useLeadOperations.createLead - Data recibida:', JSON.stringify(data, null, 2));
      setLoading(true);
      setError(null);
      const lead = await facebookLeadsService.create(data);
      console.log('✅ useLeadOperations.createLead - Lead creado exitosamente');
      return lead;
    } catch (err: any) {
      console.error('❌ useLeadOperations.createLead - Error:', err);
      console.error('❌ useLeadOperations.createLead - Error message:', err?.message);
      console.error('❌ useLeadOperations.createLead - Error response:', err?.response?.data);
      const errorMessage = err.response?.data?.message || 'Error al crear lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (id: number, data: UpdateFacebookLeadDto) => {
    try {
      console.log('📤 useLeadOperations.updateLead - Iniciando');
      console.log('📤 useLeadOperations.updateLead - Lead ID:', id);
      console.log('📤 useLeadOperations.updateLead - Data recibida:', JSON.stringify(data, null, 2));
      setLoading(true);
      setError(null);
      const lead = await facebookLeadsService.update(id, data);
      console.log('✅ useLeadOperations.updateLead - Lead actualizado exitosamente');
      console.log('✅ useLeadOperations.updateLead - Lead retornado:', JSON.stringify(lead, null, 2));
      return lead;
    } catch (err: any) {
      console.error('❌ useLeadOperations.updateLead - Error:', err);
      console.error('❌ useLeadOperations.updateLead - Error message:', err?.message);
      console.error('❌ useLeadOperations.updateLead - Error response:', err?.response?.data);
      const errorMessage = err.response?.data?.message || 'Error al actualizar lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      console.log('🏁 useLeadOperations.updateLead - Finalizado, loading:', false);
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

