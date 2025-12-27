import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator, Modal, Platform, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FacebookLeadsList, FacebookLeadsListRef } from './FacebookLeadsList';
import { LeadForm } from './LeadForm';
import { useClientNotifications } from '../hooks/useClientNotifications';
import { MobileDrawer } from './MobileDrawer';
import { FacebookLead, facebookLeadsService } from '../services/facebookLeadsService';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useDebugLog } from '../context/DebugLogContext';

const isMobile = Platform.OS !== 'web';

interface FacebookLeadsPageProps {
  leadId?: number;
}

export const FacebookLeadsPage: React.FC<FacebookLeadsPageProps> = ({ leadId }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<FacebookLead | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const listRef = useRef<FacebookLeadsListRef>(null);
  const { user, logout } = useAuth();
  const router = useRouter();
  const { addLog } = useDebugLog();

  // Log al montar
  useEffect(() => {
    addLog('🚀 COMPONENTE MONTADO', 'LEADS_PAGE');
  }, []);

  // Log cuando cambia el leadId
  useEffect(() => {
    addLog(`📥 leadId recibido: ${leadId} (tipo: ${typeof leadId})`, 'LEADS_PAGE');
    if (leadId) {
      addLog(`✅ leadId VÁLIDO, pasando a FacebookLeadsList`, 'LEADS_PAGE');
    } else {
      addLog(`ℹ️ leadId es falsy, NO filtrará`, 'LEADS_PAGE');
    }
  }, [leadId, addLog]);

  const {
    leadsNotificationAllDay,
    loading: notificationsLoading,
    updating: notificationsUpdating,
    toggleNotifications,
  } = useClientNotifications(user?.clientId);

  // Deep links se manejan en [...unmatched].tsx y AuthGuard.tsx
  // Este componente solo recibe el leadId como prop desde dashboard.tsx

  const handleEdit = (lead: FacebookLead) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingLead(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLead(null);
    if (listRef.current) {
      listRef.current.refetch();
    }
    setRefreshKey((prev) => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingLead(null);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    setShowMobileDrawer(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      console.log('🚪 Iniciando proceso de logout...');
      setShowLogoutModal(false);
      await logout();
      console.log('✅ Logout exitoso, redirigiendo...');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      setShowLogoutModal(false);
      Alert.alert('Error', 'No se pudo cerrar sesión. Por favor, intenta nuevamente.');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { backgroundColor: '#00acec' }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          {user?.name && (
            <Text style={styles.userNameText}>{user.name}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {isMobile ? (
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => setShowMobileDrawer(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="menu-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => setShowUserMenu(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>


      {showForm ? (
        <LeadForm
          lead={editingLead}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <FacebookLeadsList ref={listRef} onEdit={handleEdit} onNew={handleNew} filterLeadId={leadId} />
      )}

      {/* Botón flotante para volver cuando se muestra un lead específico */}
      {leadId && !showForm && (
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => router.push('/(tabs)/dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Menú móvil - Drawer lateral */}
      {isMobile && (
        <MobileDrawer
          visible={showMobileDrawer}
          onClose={() => setShowMobileDrawer(false)}
          userName={user?.name || 'Usuario'}
          userEmail={user?.email}
          onLogout={handleLogout}
          clientId={user?.clientId}
          leadsNotificationAllDay={leadsNotificationAllDay}
          notificationsUpdating={notificationsUpdating}
          onToggleNotifications={toggleNotifications}
        />
      )}

      {/* Menú desktop - Modal */}
      {!isMobile && (
        <Modal
          visible={showUserMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowUserMenu(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowUserMenu(false)}
          >
            <View 
              style={styles.menuContainer}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
            >
              <View style={styles.menuHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#fff" />
                <Text style={styles.menuUserName}>
                  {user?.name || user?.email || 'Usuario'}
                </Text>
              </View>
              <View style={styles.menuDivider} />
              {user?.clientId && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowUserMenu(false);
                    setShowNotificationsModal(true);
                  }}
                  disabled={notificationsUpdating}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="notifications-outline" 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={[styles.menuItemText, { color: '#fff' }]}>
                    Notificaciones
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={[styles.menuItemText, { color: '#fff' }]}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Modal de configuración de notificaciones */}
      <Modal
        visible={showNotificationsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <TouchableOpacity
          style={styles.notificationsModalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotificationsModal(false)}
        >
          <View 
            style={styles.notificationsModalContainer}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.notificationsModalHeader}>
              <Ionicons
                name={leadsNotificationAllDay ? 'notifications' : 'notifications-off'}
                size={32}
                color={colors.primary}
              />
              <Text style={styles.notificationsModalTitle}>Notificaciones</Text>
            </View>

            <View style={styles.notificationsStatusContainer}>
              <View style={[
                styles.notificationsStatusBadge,
                leadsNotificationAllDay ? styles.notificationsStatusActive : styles.notificationsStatusInactive
              ]}>
                <Text style={styles.notificationsStatusText}>
                  {leadsNotificationAllDay ? 'Activado' : 'Desactivado'}
                </Text>
              </View>
            </View>

            <Text style={styles.notificationsModalMessage}>
              {leadsNotificationAllDay
                ? 'Actualmente recibes estimados por WhatsApp las 24 horas. Si lo desactivas, los estimados que lleguen durante la noche se guardarán y serán enviados durante la mañana.'
                : 'Actualmente no recibes estimados durante la noche. Si lo activas, recibirás los estimados inmediatamente, incluso durante la noche.'}
            </Text>

            <View style={styles.notificationsModalButtons}>
              <TouchableOpacity
                style={[styles.notificationsModalButton, styles.notificationsModalButtonCancel]}
                onPress={() => setShowNotificationsModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.notificationsModalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notificationsModalButton, styles.notificationsModalButtonConfirm]}
                onPress={async () => {
                  try {
                    if (toggleNotifications) {
                      await toggleNotifications();
                      setShowNotificationsModal(false);
                    }
                  } catch (err) {
                    console.error('Error al cambiar notificaciones:', err);
                  }
                }}
                disabled={notificationsUpdating}
                activeOpacity={0.7}
              >
                <Text style={styles.notificationsModalButtonConfirmText}>
                  {notificationsUpdating 
                    ? 'Actualizando...' 
                    : leadsNotificationAllDay 
                      ? 'Desactivar' 
                      : 'Activar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de confirmación de logout */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <TouchableOpacity
          style={styles.logoutModalOverlay}
          activeOpacity={1}
          onPress={cancelLogout}
        >
          <View 
            style={styles.logoutModalContainer}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.logoutModalHeader}>
              <Ionicons name="log-out-outline" size={32} color={colors.error} />
              <Text style={styles.logoutModalTitle}>Cerrar sesión</Text>
            </View>
            <Text style={styles.logoutModalMessage}>
              ¿Estás seguro de que deseas cerrar sesión?
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonCancel]}
                onPress={cancelLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutModalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonConfirm]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutModalButtonConfirmText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark,
    zIndex: 1,
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userNameText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexShrink: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalButtonCancel: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutModalButtonConfirm: {
    backgroundColor: colors.error,
  },
  logoutModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logoutModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  floatingBackButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  notificationsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notificationsModalContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationsModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  notificationsStatusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationsStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  notificationsStatusActive: {
    backgroundColor: '#10b981',
  },
  notificationsStatusInactive: {
    backgroundColor: '#6b7280',
  },
  notificationsStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsModalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  notificationsModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationsModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsModalButtonCancel: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationsModalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  notificationsModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  notificationsModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
