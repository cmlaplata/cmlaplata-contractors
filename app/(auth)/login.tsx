import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Image, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { analyticsService } from '../../src/services/analyticsService';

type LoginTab = 'phone' | 'password';

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<LoginTab>('phone');
  
  // Estados para login con teléfono
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneInputFocused, setPhoneInputFocused] = useState(false);
  
  // Estados para login con contraseña
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados compartidos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Estados para el toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  
  const { login, loginWithPhone, requestVerificationCode } = useAuth();
  const router = useRouter();

  // Normalizar número de teléfono (remover espacios, guiones, paréntesis)
  const normalizePhone = (phoneNumber: string): string => {
    return phoneNumber.replace(/[\s\-\(\)]/g, '');
  };

  // Validar formato de teléfono
  const validatePhone = (phoneNumber: string): boolean => {
    const normalized = normalizePhone(phoneNumber);
    // Acepta números con o sin código de país
    return normalized.length >= 10 && /^\d+$/.test(normalized);
  };

  // Validar código de 6 dígitos
  const validateCode = (codeValue: string): boolean => {
    return /^\d{6}$/.test(codeValue);
  };

  // Función para pegar código desde el portapapeles
  const handlePasteCode = async () => {
    try {
      let clipboardContent = '';
      
      if (Platform.OS === 'web') {
        // Para web, usar la API del navegador
        if (navigator.clipboard && navigator.clipboard.readText) {
          clipboardContent = await navigator.clipboard.readText();
        }
      } else {
        // Para móvil, usar expo-clipboard
        try {
          const Clipboard = require('expo-clipboard');
          clipboardContent = await Clipboard.getStringAsync();
        } catch {
          console.warn('Clipboard no disponible');
        }
      }
      
      // Limpiar el contenido del portapapeles (solo números)
      const numericCode = clipboardContent.replace(/[^\d]/g, '').slice(0, 6);
      if (numericCode.length > 0) {
        setCode(numericCode);
        setError(null);
      }
    } catch (error) {
      console.error('Error al pegar código:', error);
    }
  };

  // Función para volver atrás y modificar el número de teléfono
  const handleBackToPhone = () => {
    setCodeSent(false);
    setCode('');
    setError(null);
  };

  // Función para mostrar toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    
    // Resetear la animación
    toastOpacity.setValue(0);
    
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(4000), // Duración duplicada: 4 segundos
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  // Solicitar código de verificación
  const handleRequestCode = async () => {
    setError(null);
    setErrorDetails(null);
    setShowDetails(false);

    if (!validatePhone(phone)) {
      setError('Ingrese un número de teléfono válido');
      return;
    }

    try {
      setRequestingCode(true);
      const normalizedPhone = normalizePhone(phone);
      const result = await requestVerificationCode(normalizedPhone);

      if (result.success) {
        setCodeSent(true);
        setError(null);
        showToast('Enviado por WhatsApp');
        analyticsService.logCodeSent();
      } else {
        setError(result.error || 'Error al solicitar código');
      }
    } catch (error: any) {
      setError(error?.message || 'Error inesperado al solicitar código');
    } finally {
      setRequestingCode(false);
    }
  };

  // Verificar código y autenticar
  const handleVerifyCode = async () => {
    setError(null);
    setErrorDetails(null);
    setShowDetails(false);

    if (!validateCode(code)) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    try {
      setVerifyingCode(true);
      setError(null);
      const normalizedPhone = normalizePhone(phone);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifica tu conexión.')), 15000);
      });
      
      const result = await Promise.race([
        loginWithPhone(normalizedPhone, code),
        timeoutPromise
      ]) as any;

      if (result.success) {
        console.log('✅ Login exitoso, redirigiendo...');
        setError(null);
        analyticsService.logCodeVerified();
        analyticsService.logLogin('phone');
      } else {
        const errorMsg = result.error || 'Error al verificar código';
        setError(errorMsg);
        setErrorDetails(`Código de error: ${result.errorCode || 'unknown'}`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Error inesperado al verificar código';
      setError(errorMsg);
      setErrorDetails(`Error: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setVerifyingCode(false);
    }
  };

  // Login con email y contraseña
  const handleLogin = async () => {
    setError(null);
    setErrorDetails(null);
    setShowDetails(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Ingrese un email válido');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🚀 Iniciando login desde componente...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifica tu conexión.')), 15000);
      });
      
      const result = await Promise.race([
        login(email, password),
        timeoutPromise
      ]) as any;

      if (result.success) {
        console.log('✅ Login exitoso, redirigiendo...');
        setError(null);
        analyticsService.logLogin('email');
      } else {
        const errorMsg = result.error || 'Error al iniciar sesión';
        const errorCode = result.errorCode || 'unknown';
        
        console.warn('⚠️ Error en login:', {
          message: errorMsg,
          code: errorCode,
        });

        setError(errorMsg);
        setErrorDetails(`Código de error: ${errorCode}`);
      }
    } catch (error: any) {
      console.warn('⚠️ Error inesperado en login:', {
        error,
        message: error?.message,
        stack: error?.stack,
      });

      const errorMsg = error?.message || 'Error inesperado al iniciar sesión';
      setError(errorMsg);
      setErrorDetails(`Error: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  // Resetear formulario de teléfono al cambiar de pestaña
  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    setError(null);
    setErrorDetails(null);
    setShowDetails(false);
    if (tab === 'phone') {
      setCodeSent(false);
      setCode('');
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Bienvenido</Text>
          </View>
        </View>
        <View style={styles.bodySection}>
          <Text style={styles.subtitle}>App solo para clientes de CM La Plata</Text>
          <Text style={styles.subtitleSecondary}>Inicie sesión para continuar</Text>

          {/* Pestañas */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'phone' && styles.tabActive]}
            onPress={() => handleTabChange('phone')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="call-outline" 
              size={20} 
              color={activeTab === 'phone' ? '#ffffff' : colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'phone' && styles.tabTextActive]}>
              Teléfono
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'password' && styles.tabActive]}
            onPress={() => handleTabChange('password')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={activeTab === 'password' ? '#ffffff' : colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
              Contraseña
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {/* Formulario de teléfono */}
          {activeTab === 'phone' && (
            <>
              {/* Input de teléfono - solo se muestra si NO se ha enviado el código */}
              {!codeSent && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Número de teléfono</Text>
                  <View style={[
                    styles.inputContainer,
                    phoneInputFocused && styles.inputContainerFocused,
                    error && styles.inputError
                  ]}>
                    <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, error && styles.inputError]}
                      placeholder=""
                      placeholderTextColor={colors.textTertiary}
                      value={phone}
                      onChangeText={(text) => {
                        // Solo permitir números
                        const numericText = text.replace(/[^\d]/g, '');
                        setPhone(numericText);
                        setError(null);
                      }}
                      onFocus={() => setPhoneInputFocused(true)}
                      onBlur={() => setPhoneInputFocused(false)}
                      keyboardType="phone-pad"
                      autoComplete={Platform.OS === 'android' ? 'tel' : 'tel'}
                      textContentType="telephoneNumber"
                      autoCorrect={false}
                      editable={!requestingCode && !verifyingCode}
                      textAlignVertical="center"
                      {...(Platform.OS === 'android' && {
                        includeFontPadding: false,
                      })}
                    />
                  </View>
                </View>
              )}

              {/* Input de código - solo se muestra si se ha enviado el código */}
              {codeSent && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Código de verificación</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="key-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, error && styles.inputError]}
                        placeholder="123456"
                        placeholderTextColor={colors.textTertiary}
                        value={code}
                        onChangeText={(text) => {
                          // Solo permitir números y máximo 6 dígitos
                          const numericText = text.replace(/[^\d]/g, '').slice(0, 6);
                          setCode(numericText);
                          setError(null);
                        }}
                        keyboardType="number-pad"
                        autoComplete="off"
                        autoCorrect={false}
                        editable={!verifyingCode}
                        textAlignVertical="center"
                        maxLength={6}
                        {...(Platform.OS === 'android' && {
                          includeFontPadding: false,
                        })}
                      />
                      {/* Botón para pegar código */}
                      <TouchableOpacity
                        onPress={handlePasteCode}
                        style={styles.pasteButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {!codeSent ? (
                <TouchableOpacity
                  style={[styles.button, (requestingCode || !phone) && styles.buttonDisabled]}
                  onPress={handleRequestCode}
                  disabled={requestingCode || !phone}
                  activeOpacity={0.8}
                >
                  {requestingCode ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.buttonText}>Enviando código...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Enviar código</Text>
                      <Ionicons name="send-outline" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.button, (verifyingCode || !code || code.length !== 6) && styles.buttonDisabled]}
                    onPress={handleVerifyCode}
                    disabled={verifyingCode || !code || code.length !== 6}
                    activeOpacity={0.8}
                  >
                    {verifyingCode ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.buttonText}>Verificando...</Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Verificar código</Text>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  {/* Botón para volver atrás y modificar el número */}
                  <TouchableOpacity
                    onPress={handleBackToPhone}
                    style={styles.backButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={20} color={colors.primary} />
                    <Text style={styles.backButtonText}>Modificar número de teléfono</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleRequestCode}
                    style={styles.resendButton}
                  >
                    <Text style={styles.resendButtonText}>Solicitar código de nuevo</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* Formulario de contraseña */}
          {activeTab === 'password' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    placeholder="tu@email.com"
                    placeholderTextColor={colors.textTertiary}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete={Platform.OS === 'android' ? 'email' : 'email'}
                    textContentType="emailAddress"
                    autoCorrect={false}
                    editable={!loading}
                    textAlignVertical="center"
                    {...(Platform.OS === 'android' && {
                      includeFontPadding: false,
                      importantForAutofill: 'yes' as any,
                    })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textTertiary}
                    value={password}
                    onChangeText={(text) => {
                      const textWithoutSpaces = text.replace(/\s/g, '');
                      setPassword(textWithoutSpaces);
                      setError(null);
                    }}
                    secureTextEntry={!showPassword}
                    autoComplete={Platform.OS === 'android' ? 'password' : 'password'}
                    textContentType="password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    textAlignVertical="center"
                    {...(Platform.OS === 'android' && {
                      includeFontPadding: false,
                      importantForAutofill: 'yes' as any,
                    })}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Iniciando sesión...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Iniciar Sesión</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
              {errorDetails && (
                <TouchableOpacity 
                  onPress={() => setShowDetails(!showDetails)}
                  style={styles.detailsButton}
                >
                  <Text style={styles.detailsButtonText}>
                    {showDetails ? 'Ocultar' : 'Ver'} detalles técnicos
                  </Text>
                </TouchableOpacity>
              )}
              {showDetails && errorDetails && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsText}>{errorDetails}</Text>
                </View>
              )}
            </View>
          )}
        </View>
        </View>
      </View>

      {/* Toast de notificación */}
      <Modal
        visible={toastVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => {}}
        statusBarTranslucent={true}
      >
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
              <Ionicons name="logo-whatsapp" size={24} color="#ffffff" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    ...(Platform.OS === 'web' && {
      alignItems: 'center',
    }),
  },
  content: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 24,
    padding: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
    }),
  },
  headerSection: {
    backgroundColor: colors.primary,
    width: '100%',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  subtitleSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 0,
    textAlign: 'center',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  bodySection: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '400',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
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
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      outlineWidth: 0,
    }),
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    ...(Platform.OS === 'web' && {
      boxShadow: `0 0 0 3px ${colors.primary}20`,
    }),
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'android' ? 12 : 0,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: Platform.OS === 'android' ? 12 : 0,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      outlineWidth: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
    }),
  },
  inputError: {
    borderColor: colors.error,
  },
  eyeIcon: {
    padding: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  pasteButton: {
    padding: Platform.OS === 'android' ? 12 : 8,
    marginLeft: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendButton: {
    marginTop: 0,
    alignSelf: 'center',
  },
  resendButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailsButton: {
    marginTop: 12,
    paddingVertical: 4,
  },
  detailsButtonText: {
    color: colors.error,
    fontSize: 12,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  detailsText: {
    color: colors.error,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
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
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: '#25D366', // Color verde de WhatsApp
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
});
