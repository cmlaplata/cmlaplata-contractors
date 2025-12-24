import { useState, useEffect } from 'react';
import { facebookLeadsService, LeadsStats } from '../services/facebookLeadsService';

export const useLeadsStats = () => {
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📊 useLeadsStats: Obteniendo estadísticas...');
      const data = await facebookLeadsService.getStats();
      console.log('📊 useLeadsStats: Datos recibidos del servicio:', data);
      console.log('📊 useLeadsStats: data.total:', data.total, 'tipo:', typeof data.total);
      setStats(data);
    } catch (err: any) {
      console.error('❌ useLeadsStats: Error al obtener estadísticas:', err);
      setError(err.response?.data?.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};

