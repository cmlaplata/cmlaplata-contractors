import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface MobileDrawerProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userEmail?: string;
  onLogout: () => void;
  clientId?: number | null;
  leadsNotificationAllDay?: boolean;
  notificationsUpdating?: boolean;
  onToggleNotifications?: () => void;
  aiMessageInstructions?: string;
  messagesUpdating?: boolean;
  onOpenMessages?: () => void;
  onOpenButtons?: () => void;
  onOpenNotifications?: () => void;
  onUpdateMessagesCache?: () => Promise<void>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(300, SCREEN_WIDTH * 0.85);

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  visible,
  onClose,
  userName,
  userEmail,
  onLogout,
  clientId,
  leadsNotificationAllDay,
  notificationsUpdating,
  onToggleNotifications,
  onOpenMessages,
  onOpenButtons,
  onOpenNotifications,
  messagesUpdating,
  onUpdateMessagesCache,
}) => {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={64} color="#fff" />
          </View>
          <Text style={styles.userName}>{userName}</Text>
          {userEmail && <Text style={styles.userEmail}>{userEmail}</Text>}
        </View>

        <View style={styles.divider} />

        <View style={styles.menuSection}>
          {clientId && onOpenNotifications && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                // Abrir el modal después de que el drawer se cierre
                if (Platform.OS === 'web') {
                  setTimeout(() => {
                    onOpenNotifications();
                  }, 100);
                } else {
                  // En Android, esperar a que la animación termine
                  setTimeout(() => {
                    onOpenNotifications();
                  }, 350);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="notifications-outline" 
                size={24} 
                color="#fff" 
              />
              <Text style={[styles.menuItemText, { color: '#fff' }]}>
                Notificaciones
              </Text>
            </TouchableOpacity>
          )}
          {clientId && onOpenMessages && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onOpenMessages();
              }}
              disabled={messagesUpdating}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="chatbubble-outline" 
                size={24} 
                color="#fff" 
              />
              <Text style={[styles.menuItemText, { color: '#fff' }]}>
                Mensajes
              </Text>
            </TouchableOpacity>
          )}
          {clientId && onOpenButtons && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                if (Platform.OS === 'web') {
                  setTimeout(() => {
                    onOpenButtons();
                  }, 100);
                } else {
                  setTimeout(() => {
                    onOpenButtons();
                  }, 350);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="phone-portrait-outline" 
                size={24} 
                color="#fff" 
              />
              <Text style={[styles.menuItemText, { color: '#fff' }]}>
                Botones
              </Text>
            </TouchableOpacity>
          )}
          {clientId && onUpdateMessagesCache && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                console.log('📢 MobileDrawer - Click en Actualizar');
                console.log('📢 MobileDrawer - onUpdateMessagesCache existe?', !!onUpdateMessagesCache);
                onClose();
                try {
                  console.log('📢 MobileDrawer - Llamando onUpdateMessagesCache...');
                  await onUpdateMessagesCache();
                  console.log('📢 MobileDrawer - onUpdateMessagesCache completado');
                } catch (err) {
                  console.error('❌ MobileDrawer - Error al actualizar cache:', err);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="refresh-outline" 
                size={24} 
                color="#fff" 
              />
              <Text style={[styles.menuItemText, { color: '#fff' }]}>
                Actualizar
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onLogout();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={[styles.menuItemText, { color: '#fff' }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#00acec',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  userSection: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuSection: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  notificationsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notificationsModalContent: {
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
    backgroundColor: '#f3f4f6',
  },
  notificationsModalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  notificationsModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  notificationsModalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});






