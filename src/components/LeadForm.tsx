import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLeadOperations } from '../hooks/useLeadOperations';
import { FacebookLead, CreateFacebookLeadDto, UpdateFacebookLeadDto } from '../services/facebookLeadsService';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface LeadFormProps {
  lead?: FacebookLead | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LeadForm: React.FC<LeadFormProps> = ({ lead, onSuccess, onCancel }) => {
  const { createLead, updateLead, loading, error } = useLeadOperations();
  const [formData, setFormData] = useState<CreateFacebookLeadDto | UpdateFacebookLeadDto>({
    clientId: lead?.clientId || undefined,
    name: lead?.name || '',
    phoneManual: lead?.phoneManual || '',
    phoneAuto: lead?.phoneAuto || '',
    project: lead?.project || '',
    city: lead?.city || '',
    email: lead?.email || '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        clientId: lead.clientId || undefined,
        name: lead.name || '',
        phoneManual: lead.phoneManual || '',
        phoneAuto: lead.phoneAuto || '',
        project: lead.project || '',
        city: lead.city || '',
        email: lead.email || '',
      });
    }
  }, [lead]);

  const handleChange = (field: string, value: string | number | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (lead) {
        await updateLead(lead.id, formData);
        Alert.alert('Éxito', 'Lead actualizado correctamente');
      } else {
        await createLead(formData);
        Alert.alert('Éxito', 'Lead creado correctamente');
      }
      onSuccess?.();
    } catch (err) {
      // Error ya está manejado en el hook
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{lead ? 'Editar' : 'Nuevo'} Lead</Text>
          <Text style={styles.subtitle}>
            {lead ? 'Modifica la información del lead' : 'Completa los datos del nuevo lead'}
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.formRow}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.name || ''}
                onChangeText={(value) => handleChange('name', value)}
                placeholder="Nombre completo"
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="center"
              />
            </View>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Teléfono Manual</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.phoneManual || ''}
                onChangeText={(value) => handleChange('phoneManual', value)}
                keyboardType="phone-pad"
                placeholder="+54 9 11 1234-5678"
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="center"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Teléfono Auto</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.phoneAuto || ''}
                onChangeText={(value) => handleChange('phoneAuto', value)}
                keyboardType="phone-pad"
                placeholder="+54 9 11 1234-5678"
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="center"
              />
            </View>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.email || ''}
                onChangeText={(value) => handleChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="email@ejemplo.com"
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="center"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Proyecto</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="home-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.project || ''}
                onChangeText={(value) => handleChange('project', value)}
                placeholder="Nombre del proyecto"
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="center"
              />
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ciudad</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.city || ''}
              onChangeText={(value) => handleChange('city', value)}
              placeholder="Ciudad"
              placeholderTextColor={colors.textTertiary}
              textAlignVertical="center"
            />
          </View>
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.buttonText}>Guardar</Text>
              </View>
            )}
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="close" size={20} color="#fff" />
                <Text style={styles.buttonText}>Cancelar</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  form: {
    gap: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'android' ? 12 : 0,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: Platform.OS === 'android' ? 12 : 0,
  },
  textareaContainer: {
    alignItems: 'flex-start',
    paddingTop: 12,
    minHeight: 100,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.textSecondary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
