import { analytics } from '../config/firebase';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { Platform } from 'react-native';

/**
 * Servicio para Google Analytics / Firebase Analytics
 * Funciona en web. Para móvil nativo, se requiere configuración adicional.
 */
class AnalyticsService {
  private isAvailable(): boolean {
    return analytics !== null && Platform.OS === 'web';
  }

  /**
   * Registra un evento en Analytics
   */
  logEvent(eventName: string, params?: Record<string, any>): void {
    if (!this.isAvailable()) {
      console.log(`[Analytics] Event: ${eventName}`, params);
      return;
    }

    try {
      logEvent(analytics!, eventName, params);
      console.log(`✅ [Analytics] Event enviado: ${eventName}`, params);
    } catch (error) {
      console.error('❌ Error logging event to Analytics:', error);
    }
  }

  /**
   * Establece el ID de usuario
   */
  setUserId(userId: string | null): void {
    if (!this.isAvailable()) {
      console.log(`[Analytics] Set User ID: ${userId}`);
      return;
    }

    try {
      setUserId(analytics!, userId);
    } catch (error) {
      console.error('Error setting user ID in Analytics:', error);
    }
  }

  /**
   * Establece propiedades del usuario
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.isAvailable()) {
      console.log(`[Analytics] Set User Properties:`, properties);
      return;
    }

    try {
      setUserProperties(analytics!, properties);
    } catch (error) {
      console.error('Error setting user properties in Analytics:', error);
    }
  }

  /**
   * Eventos predefinidos comunes
   */
  logLogin(method: string): void {
    this.logEvent('login', { method });
  }

  logSignUp(method: string): void {
    this.logEvent('sign_up', { method });
  }

  logScreenView(screenName: string, screenClass?: string): void {
    this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  logLeadCreated(leadId: number): void {
    this.logEvent('lead_created', { lead_id: leadId });
  }

  logLeadUpdated(leadId: number): void {
    this.logEvent('lead_updated', { lead_id: leadId });
  }

  logLeadDeleted(leadId: number): void {
    this.logEvent('lead_deleted', { lead_id: leadId });
  }

  logCodeSent(): void {
    this.logEvent('verification_code_sent');
  }

  logCodeVerified(): void {
    this.logEvent('verification_code_verified');
  }

  // Eventos de estado de cliente
  logClientStatusChanged(leadId: number, status: string): void {
    this.logEvent('client_status_changed', {
      lead_id: leadId,
      status: status,
    });
  }

  // Eventos de acciones de contacto
  logCallInitiated(leadId: number): void {
    this.logEvent('call_initiated', { lead_id: leadId });
  }

  logWhatsAppInitiated(leadId: number): void {
    this.logEvent('whatsapp_initiated', { lead_id: leadId });
  }

  logSMSInitiated(leadId: number): void {
    this.logEvent('sms_initiated', { lead_id: leadId });
  }

  logEmailInitiated(leadId: number): void {
    this.logEvent('email_initiated', { lead_id: leadId });
  }

  // Eventos de copiar
  logLinkCopied(leadId: number): void {
    this.logEvent('link_copied', { lead_id: leadId });
  }

  logEmailCopied(leadId: number): void {
    this.logEvent('email_copied', { lead_id: leadId });
  }

  logContentCopied(leadId: number, contentType: string): void {
    this.logEvent('content_copied', {
      lead_id: leadId,
      content_type: contentType,
    });
  }

  // Evento de traducir
  logContentTranslated(leadId: number, fromLanguage: string, toLanguage: string, contentType: string): void {
    this.logEvent('content_translated', {
      lead_id: leadId,
      from_language: fromLanguage,
      to_language: toLanguage,
      content_type: contentType,
    });
  }

  // Eventos de enviar al cliente
  logContentSentToClient(leadId: number, contentType: string, method: string): void {
    this.logEvent('content_sent_to_client', {
      lead_id: leadId,
      content_type: contentType,
      method: method, // 'whatsapp', 'sms', 'email'
    });
  }

  // Evento de solicitar review
  logReviewRequested(leadId: number): void {
    this.logEvent('review_requested', { lead_id: leadId });
  }

  // Evento de editar lead
  logLeadEditInitiated(leadId: number): void {
    this.logEvent('lead_edit_initiated', { lead_id: leadId });
  }

  // Evento de agregar lead
  logAddLeadInitiated(): void {
    this.logEvent('add_lead_initiated');
  }

  // Evento de abrir mensajes
  logMessagesOpened(): void {
    this.logEvent('messages_opened');
  }

  // Evento de abrir notificaciones
  logNotificationsOpened(): void {
    this.logEvent('notifications_opened');
  }

  // Evento de actualizar cache
  logCacheUpdated(): void {
    this.logEvent('cache_updated');
  }
}

export const analyticsService = new AnalyticsService();

