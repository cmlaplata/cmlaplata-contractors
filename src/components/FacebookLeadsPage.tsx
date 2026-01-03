import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Modal, Platform, ScrollView, Image, Linking, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FacebookLeadsList, FacebookLeadsListRef } from './FacebookLeadsList';
import { LeadForm } from './LeadForm';
import { useClientNotifications } from '../hooks/useClientNotifications';
import { useClientMessages } from '../hooks/useClientMessages';
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
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [messagesInstructions, setMessagesInstructions] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const listRef = useRef<FacebookLeadsListRef>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
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

  const {
    aiMessageInstructions,
    loading: messagesLoading,
    updating: messagesUpdating,
    updateMessageInstructions,
  } = useClientMessages(user?.clientId);

  // Sincronizar el estado local con el valor del hook cuando cambia
  useEffect(() => {
    setMessagesInstructions(aiMessageInstructions);
  }, [aiMessageInstructions]);

  // Monitorear cambios en el estado del toast
  useEffect(() => {
    console.log('📢 FacebookLeadsPage - toastVisible cambió a:', toastVisible);
    console.log('📢 FacebookLeadsPage - toastMessage:', toastMessage);
    console.log('📢 FacebookLeadsPage - toastOpacity value:', toastOpacity);
  }, [toastVisible, toastMessage]);

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

  const [shouldRefetch, setShouldRefetch] = useState(false);

  // Refrescar cuando showForm cambia de true a false y shouldRefetch es true
  useEffect(() => {
    if (!showForm && shouldRefetch && listRef.current) {
      console.log('🔄 FacebookLeadsPage - showForm es false, listRef existe, llamando refetch()');
      listRef.current.refetch();
      setShouldRefetch(false);
      console.log('✅ FacebookLeadsPage - refetch() completado');
    }
  }, [showForm, shouldRefetch]);

  const handleFormSuccess = () => {
    console.log('📞 FacebookLeadsPage.handleFormSuccess - Iniciando');
    setShowForm(false);
    console.log('📞 FacebookLeadsPage.handleFormSuccess - showForm establecido a false');
    setEditingLead(null);
    console.log('📞 FacebookLeadsPage.handleFormSuccess - editingLead establecido a null');
    setShouldRefetch(true);
    console.log('📞 FacebookLeadsPage.handleFormSuccess - shouldRefetch establecido a true');
    setRefreshKey((prev) => {
      const newKey = prev + 1;
      console.log('📞 FacebookLeadsPage.handleFormSuccess - refreshKey actualizado:', newKey);
      return newKey;
    });
    console.log('✅ FacebookLeadsPage.handleFormSuccess - Completado (refetch se ejecutará cuando el componente se monte)');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingLead(null);
  };

  const showToast = (message: string) => {
    console.log('📢 FacebookLeadsPage.showToast - Iniciando');
    console.log('📢 FacebookLeadsPage.showToast - Mensaje:', message);
    console.log('📢 FacebookLeadsPage.showToast - toastVisible antes:', toastVisible);
    setToastMessage(message);
    console.log('📢 FacebookLeadsPage.showToast - toastMessage establecido a:', message);
    setToastVisible(true);
    console.log('📢 FacebookLeadsPage.showToast - toastVisible establecido a true');
    
    // Resetear la animación
    toastOpacity.setValue(0);
    
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('📢 FacebookLeadsPage.showToast - Animación completada, ocultando toast');
      setToastVisible(false);
    });
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
      setErrorMessage('No se pudo cerrar sesión. Por favor, intenta nuevamente.');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('all');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {errorMessage && (
        <View style={styles.errorMessageContainer}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <TouchableOpacity 
            onPress={() => setErrorMessage(null)}
            style={styles.errorCloseButton}
          >
            <Ionicons name="close" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
      {/* Header con barra de búsqueda y botón agregar */}
      <View style={styles.newHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, teléfono o email..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="center"
            {...(Platform.OS === 'android' && { includeFontPadding: false })}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.newButton} 
          onPress={handleNew}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" style={styles.newButtonIcon} />
          <Text style={styles.newButtonText}>Agregar</Text>
        </TouchableOpacity>
        {isMobile ? (
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => setShowMobileDrawer(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => setShowUserMenu(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {showForm ? (
        <LeadForm
          lead={editingLead}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <FacebookLeadsList 
          ref={listRef} 
          onEdit={handleEdit} 
          onNew={handleNew} 
          filterLeadId={leadId} 
          searchQuery={searchQuery}
          clientStatusFilter={clientStatusFilter}
          onClientStatusFilterChange={setClientStatusFilter}
          onViewAllContacts={() => router.replace('/(tabs)/dashboard')}
        />
      )}

      {/* Botón flotante para volver cuando se muestra un lead específico - OCULTO */}

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
          aiMessageInstructions={aiMessageInstructions}
          messagesUpdating={messagesUpdating}
          onOpenMessages={() => setShowMessagesModal(true)}
          onOpenNotifications={() => setShowNotificationsModal(true)}
          onUpdateMessagesCache={async () => {
            console.log('📢 FacebookLeadsPage.onUpdateMessagesCache - INICIANDO');
            console.log('📢 FacebookLeadsPage.onUpdateMessagesCache - listRef.current:', !!listRef.current);
            try {
              if (listRef.current) {
                console.log('📢 FacebookLeadsPage.onUpdateMessagesCache - listRef.current existe, limpiando cache...');
                await listRef.current.clearMessagesCache();
                console.log('📢 FacebookLeadsPage.onUpdateMessagesCache - Cache limpiado, llamando showToast...');
                showToast('App actualizada');
                console.log('📢 FacebookLeadsPage.onUpdateMessagesCache - showToast llamado');
              } else {
                console.warn('⚠️ FacebookLeadsPage.onUpdateMessagesCache - listRef.current es null');
              }
            } catch (err) {
              console.error('❌ FacebookLeadsPage.onUpdateMessagesCache - Error:', err);
              setErrorMessage('No se pudo actualizar el cache de mensajes');
              setTimeout(() => setErrorMessage(null), 5000);
            }
          }}
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
                <>
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
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowUserMenu(false);
                      setShowMessagesModal(true);
                    }}
                    disabled={messagesUpdating}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="chatbubble-outline" 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={[styles.menuItemText, { color: '#fff' }]}>
                      Mensajes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={async () => {
                      console.log('📢 FacebookLeadsPage - Menú desktop: Click en Actualizar');
                      try {
                        setShowUserMenu(false);
                        if (listRef.current) {
                          console.log('📢 FacebookLeadsPage - Menú desktop: Limpiando cache...');
                          await listRef.current.clearMessagesCache();
                          console.log('📢 FacebookLeadsPage - Menú desktop: Cache limpiado, llamando showToast...');
                          showToast('App actualizada');
                          console.log('📢 FacebookLeadsPage - Menú desktop: showToast llamado');
                        }
                      } catch (err) {
                        console.error('❌ FacebookLeadsPage - Menú desktop: Error al actualizar cache:', err);
                        setErrorMessage('No se pudo actualizar el cache de mensajes');
                        setTimeout(() => setErrorMessage(null), 5000);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="refresh-outline" 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={[styles.menuItemText, { color: '#fff' }]}>
                      Actualizar
                    </Text>
                  </TouchableOpacity>
                </>
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
          <TouchableOpacity
            style={styles.notificationsModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.notificationsModalHeader}>
              <Ionicons
                name={leadsNotificationAllDay ? 'notifications' : 'notifications-off'}
                size={32}
                color="#FFFFFF"
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
          </TouchableOpacity>
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

      {/* Modal de configuración de mensajes */}
      <Modal
        visible={showMessagesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMessagesModal(false)}
      >
        <TouchableOpacity
          style={styles.notificationsModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMessagesModal(false)}
        >
          <TouchableOpacity
            style={styles.notificationsModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.notificationsModalHeader}>
              <Ionicons
                name="chatbubble-outline"
                size={32}
                color="#FFFFFF"
              />
              <Text style={styles.notificationsModalTitle}>Mensajes</Text>
            </View>

            <Text style={styles.messagesModalDescription}>
              Instrucciones específicas para la generación de mensajes que hace la IA
            </Text>

            <TextInput
              style={styles.messagesTextInput}
              placeholder="Escribe aquí las instrucciones para la IA..."
              placeholderTextColor={colors.textTertiary}
              value={messagesInstructions}
              onChangeText={setMessagesInstructions}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!messagesUpdating}
            />

            <View style={styles.notificationsModalButtons}>
              <TouchableOpacity
                style={[styles.notificationsModalButton, styles.notificationsModalButtonCancel]}
                onPress={() => setShowMessagesModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.notificationsModalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notificationsModalButton, styles.notificationsModalButtonConfirm]}
                onPress={async () => {
                  try {
                    if (updateMessageInstructions) {
                      await updateMessageInstructions(messagesInstructions);
                      // Borrar el cache de mensajes después de actualizar las instrucciones
                      if (listRef.current) {
                        await listRef.current.clearMessagesCache();
                      }
                      setShowMessagesModal(false);
                      // Instrucciones actualizadas y cache de mensajes limpiado
                    }
                  } catch (err) {
                    console.error('Error al actualizar instrucciones:', err);
                    setErrorMessage('No se pudieron actualizar las instrucciones');
                    setTimeout(() => setErrorMessage(null), 5000);
                  }
                }}
                disabled={messagesUpdating}
                activeOpacity={0.7}
              >
                <Text style={styles.notificationsModalButtonConfirmText}>
                  {messagesUpdating ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Toast de notificación */}
      {(() => {
        console.log('📢 FacebookLeadsPage - Renderizando toast, toastVisible:', toastVisible, 'toastMessage:', toastMessage);
        return null;
      })()}
      <Modal
        visible={toastVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          console.log('📢 FacebookLeadsPage - Modal onRequestClose llamado');
        }}
        statusBarTranslucent={true}
        onShow={() => {
          console.log('📢 FacebookLeadsPage - Modal onShow llamado, toastVisible:', toastVisible);
        }}
      >
        {(() => {
          console.log('📢 FacebookLeadsPage - Modal visible, renderizando contenido del toast');
          return (
            <View style={styles.toastModalContainer}>
              <Animated.View
                style={[
                  styles.toastContainer,
                  {
                    opacity: toastOpacity,
                    transform: [
                      {
                        translateY: toastOpacity.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-50, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.toastContent}>
                  <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                  <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
              </Animated.View>
            </View>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  newHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primary,
    borderBottomWidth: 0,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'android' ? 4 : 2,
    minWidth: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  newButtonIcon: {
    marginTop: 2,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
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
    backgroundColor: colors.primary,
    marginHorizontal: -24,
    marginTop: -24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  notificationsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
  messagesModalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  toastModalContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
    paddingTop: Platform.OS === 'web' ? 80 : 60,
    zIndex: 9999,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  },
  toastContainer: {
    alignItems: 'center',
    pointerEvents: 'none',
  },
  toastContent: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
    minWidth: 280,
    maxWidth: '92%',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  messagesTextInput: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 150,
    maxHeight: 300,
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  errorMessageText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  errorCloseButton: {
    padding: 4,
  },
});
