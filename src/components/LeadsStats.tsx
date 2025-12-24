import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface LeadsStatsProps {
  total: number; // Total de leads desde la lista (pagination.total o leads.length)
}

export const LeadsStats: React.FC<LeadsStatsProps> = ({ total }) => {
  // Asegurar que el total sea un número válido y no negativo
  const displayTotal = typeof total === 'number' && total >= 0 ? total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="people-outline" size={20} color={colors.primary} />
        <Text style={styles.label}>Total de Leads:</Text>
        <Text style={styles.value}>{displayTotal}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
});
