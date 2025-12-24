import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClientNotifications } from '../hooks/useClientNotifications';
import { colors } from '../theme/colors';

interface NotificationToggleProps {
  clientId: number | null | undefined;
}

export const NotificationToggle: React.FC<NotificationToggleProps> = ({ clientId }) => {
  console.log('🔔 NotificationToggle renderizado. clientId:', clientId);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const {
    leadsNotificationAllDay,
    loading,
    updating,
    error,
    toggleNotifications,
  } = useClientNotifications(clientId);

  console.log('🔔 Estado del hook:', {
    leadsNotificationAllDay,
    loading,
    updating,
    error,
    hasToggleFunction: !!toggleNotifications,
  });

  if (!clientId) {
    console.log('⚠️ NotificationToggle: No hay clientId, no se muestra el botón');
    // Mostrar un mensaje de debug en desarrollo
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Sin clientId</Text>
      </View>
    );
  }

  // Mostrar el botón incluso si está cargando, pero deshabilitado
  // if (loading) {
  //   console.log('⏳ NotificationToggle: Cargando...');
  //   return (
  //     <View style={styles.container}>
  //       <ActivityIndicator size="small" color={colors.primary} />
  //     </View>
  //   );
  // }

  const handleToggle = () => {
    console.log('🔄 handleToggle llamado. Estado actual:', leadsNotificationAllDay);
    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setShowConfirmModal(false);
    console.log('🔄 clientId:', clientId);
    console.log('🔄 toggleNotifications disponible:', !!toggleNotifications);
    
    try {
      console.log('📡 Llamando a toggleNotifications...');
      await toggleNotifications();
      console.log('✅ toggleNotifications completado exitosamente');
    } catch (err) {
      console.error('❌ Error al cambiar notificaciones:', err);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[
          styles.button,
          leadsNotificationAllDay ? styles.buttonActive : styles.buttonInactive,
          (loading || updating) && styles.buttonDisabled,
        ]}
        onPress={handleToggle}
        disabled={updating || loading}
        activeOpacity={0.8}
      >
        {(updating || loading) ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name={leadsNotificationAllDay ? 'notifications' : 'notifications-outline'}
              size={18}
              color="#fff"
            />
            <Text style={styles.buttonText}>
              {leadsNotificationAllDay ? 'Recibir 24H' : 'Recibir 24H'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      {error ? (
        <Text style={styles.errorText} numberOfLines={1}>
          {error}
        </Text>
      ) : null}

      {/* Modal de confirmación */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Ionicons
                name={leadsNotificationAllDay ? 'notifications-off' : 'notifications'}
                size={32}
                color={colors.primary}
              />
              <Text style={styles.modalTitle}>
                {leadsNotificationAllDay ? 'Apagar recepción 24H' : 'Activar recepción 24H'}
              </Text>
            </View>

            <Text style={styles.modalMessage}>
              {leadsNotificationAllDay
                ? '¿Quieres apagar la recepción de estimados por Whatsapp las 24 horas? Si lo apagas, los estimados que llegan durante la noche se guardarán y serán enviados a tu Whatsapp durante la mañana, para no molestar tus horas de sueño.'
                : '¿Quieres activar la recepción de estimados por Whatsapp las 24 horas? Si lo activas, recibirás los estimados inmediatamente, incluso durante la noche.'}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {leadsNotificationAllDay ? 'Apagar' : 'Activar'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
  },
  wrapper: {
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  buttonActive: {
    backgroundColor: '#10b981', // Verde cuando está activo
    shadowColor: '#10b981',
  },
  buttonInactive: {
    backgroundColor: '#6b7280', // Gris cuando está inactivo
    shadowColor: '#6b7280',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 10,
    color: colors.error,
    marginTop: 4,
    maxWidth: 100,
  },
  debugContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  debugText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

