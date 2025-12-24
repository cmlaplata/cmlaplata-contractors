import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Platform, Animated, Modal, Linking } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFacebookLeads } from '../hooks/useFacebookLeads';
import { useLeadOperations } from '../hooks/useLeadOperations';
import { useAuth } from '../context/AuthContext';
import { FacebookLead, facebookLeadsService, PaginationInfo } from '../services/facebookLeadsService';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { generateDeepLink, copyDeepLink } from '../utils/deepLinks';

interface FacebookLeadsListProps {
  onEdit?: (lead: FacebookLead) => void;
  onNew?: () => void;
}

export interface FacebookLeadsListRef {
  refetch: () => void;
  getTotal: () => number;
}

export const FacebookLeadsList = forwardRef<FacebookLeadsListRef, FacebookLeadsListProps>(
  ({ onEdit, onNew }, ref) => {
  const { user, loading: authLoading } = useAuth();
  
  // Console log para ver la información del usuario en este componente
  useEffect(() => {
    if (user) {
      console.log('👤 USUARIO EN FacebookLeadsList:', {
        id: user.id,
        name: user.name,
        email: user.email,
        firebase_id: user.firebase_id,
        userType: user.userType,
        clientId: user.clientId,
        person: user.person ? {
          id: user.person.id,
          name: user.person.name,
          email: user.person.email,
          phone: user.person.phone,
          country: user.person.country,
        } : null,
        userClientData: user.userClientData ? {
          // Mostrar información del cliente si está disponible
          ...user.userClientData,
        } : null,
        // Información completa del usuario
        fullUser: JSON.stringify(user, null, 2),
      });
      
      // Console log adicional para ver todos los campos disponibles
      console.log('🔍 TODOS LOS CAMPOS DEL USUARIO:', Object.keys(user));
      console.log('🔍 ESTRUCTURA COMPLETA DEL USUARIO:', user);
      
      // Console log específico para los datos del cliente
      if (user.userClientData) {
        console.log('🏢 DATOS DEL CLIENTE (userClientData):', user.userClientData);
      }
    }
  }, [user]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchLeads, setSearchLeads] = useState<FacebookLead[]>([]);
  const [searchPagination, setSearchPagination] = useState<PaginationInfo | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const limit = 10;
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [expandedQuickResponse, setExpandedQuickResponse] = useState<number | null>(null);
  const [expandedClientStatus, setExpandedClientStatus] = useState<number | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState<number | null>(null);
  const [generatingSMS, setGeneratingSMS] = useState<number | null>(null);
  const [generatingCall, setGeneratingCall] = useState<number | null>(null);
  const [requestingReview, setRequestingReview] = useState<number | null>(null);
  const [checkingClientStatus, setCheckingClientStatus] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [modalType, setModalType] = useState<'email' | 'sms' | 'call'>('email');
  const [modalLanguage, setModalLanguage] = useState<'español' | 'ingles'>('ingles');
  const [modalLeadId, setModalLeadId] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [dateTimeModalVisible, setDateTimeModalVisible] = useState(false);
  const [dateTimeModalType, setDateTimeModalType] = useState<'appointment' | 'recontact' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [clientStatuses, setClientStatuses] = useState<{ [key: number]: string }>({});
  const [showTutorial, setShowTutorial] = useState(false);
  const animatedHeights = useRef<{ [key: number]: Animated.Value }>({});
  const quickResponseHeights = useRef<{ [key: number]: Animated.Value }>({});
  const clientStatusHeights = useRef<{ [key: number]: Animated.Value }>({});
  const menuBaseHeights = useRef<{ [key: number]: Animated.Value }>({});
  const tutorialArrowPosition = useRef(new Animated.Value(0));
  
  const clientId = user?.clientId;
  
  // Verificar si el tutorial ya fue completado
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const tutorialCompleted = await AsyncStorage.getItem('menuToggleTutorialCompleted');
        if (!tutorialCompleted) {
          setShowTutorial(true);
          // Iniciar animación de flecha
          startTutorialAnimation();
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };
    
    checkTutorialStatus();
  }, []);
  
  // Animación de flecha para el tutorial
  const startTutorialAnimation = () => {
    const arrowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(tutorialArrowPosition.current, {
          toValue: 8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(tutorialArrowPosition.current, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    arrowAnimation.start();
  };
  
  // Detener animación del tutorial
  const stopTutorialAnimation = async () => {
    try {
      tutorialArrowPosition.current.stopAnimation();
      Animated.timing(tutorialArrowPosition.current, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      await AsyncStorage.setItem('menuToggleTutorialCompleted', 'true');
      setShowTutorial(false);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };
  const { leads, pagination, loading, error, refetch, goToPage } = useFacebookLeads({
    clientId: clientId || 0,
    page: currentPage,
    limit,
  });
  const { deleteLead, loading: deleting } = useLeadOperations();

  // Inicializar estados del cliente desde los leads cargados
  useEffect(() => {
    const initialStatuses: { [key: number]: string } = {};
    leads.forEach(lead => {
      if (lead.clientStatus) {
        // El backend devuelve valores como "Trabajo terminado", pero el frontend usa códigos
        // Mapear del backend al frontend para mantener consistencia
        const frontendStatus = Object.entries({
          'No contestó': 'no-contest',
          'Cita Agendada': 'appointment',
          'Por recontactar': 'recontact',
          'Estimado vendido': 'estimated-sold',
          'Trabajo terminado': 'work-completed',
        }).find(([backend]) => backend === lead.clientStatus)?.[1] || lead.clientStatus;
        initialStatuses[lead.id] = frontendStatus;
      }
    });
    setClientStatuses(prev => ({ ...prev, ...initialStatuses }));
  }, [leads]);

  // Debounce para la búsqueda
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      debounceTimeoutRef.current = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery.trim());
        setSearchPage(1);
      }, 500);
    } else if (searchQuery.trim().length === 0) {
      setDebouncedSearchQuery('');
      setSearchLeads([]);
      setSearchPagination(null);
      setSearchError(null);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Realizar búsqueda cuando cambia el término de búsqueda con debounce
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setSearchLeads([]);
        setSearchPagination(null);
        setSearchError(null);
        return;
      }

      if (!clientId || clientId === 0) {
        // Solo establecer error si la autenticación ya terminó de cargar
        if (!authLoading) {
          setSearchError('No se encontró el ID de cliente. Por favor, inicia sesión nuevamente.');
        }
        setSearchLeads([]);
        setSearchPagination(null);
        return;
      }

      try {
        setSearchLoading(true);
        setSearchError(null);
        const response = await facebookLeadsService.searchMyLeads(
          debouncedSearchQuery,
          clientId,
          searchPage,
          limit
        );
        setSearchLeads(response.data);
        setSearchPagination(response.pagination);
      } catch (err: any) {
        setSearchError(err.response?.data?.message || err.message || 'Error al buscar leads');
        setSearchLeads([]);
        setSearchPagination(null);
      } finally {
        setSearchLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, searchPage, limit, clientId]);


  // Determinar qué datos mostrar
  const isSearching = debouncedSearchQuery.length >= 2;
  const displayLeads = isSearching ? searchLeads : leads;
  const displayPagination = isSearching ? searchPagination : pagination;
  const displayLoading = isSearching ? searchLoading : loading;
  const displayError = isSearching ? searchError : error;

  useImperativeHandle(ref, () => ({
    refetch: () => {
      setCurrentPage(1);
      setSearchPage(1);
      setSearchQuery('');
      setDebouncedSearchQuery('');
      refetch();
    },
    getTotal: () => {
      return displayPagination?.total ?? displayLeads.length;
    },
  }));

  const handlePageChange = (newPage: number) => {
    if (displayPagination) {
      if (newPage < 1 || newPage > displayPagination.totalPages) return;
      if (isSearching) {
        setSearchPage(newPage);
      } else {
        setCurrentPage(newPage);
      }
    }
  };

  const toggleMenu = (leadId: number) => {
    // Si es la primera vez que se presiona, detener el tutorial
    if (showTutorial) {
      stopTutorialAnimation();
    }
    
    if (expandedLeadId === leadId) {
      // Cerrar submenús primero si están abiertos
      if (expandedQuickResponse === leadId && quickResponseHeights.current[leadId]) {
        Animated.timing(quickResponseHeights.current[leadId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setExpandedQuickResponse(null);
        });
      }
      
      if (expandedClientStatus === leadId && clientStatusHeights.current[leadId]) {
        Animated.timing(clientStatusHeights.current[leadId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setExpandedClientStatus(null);
        });
      }
      
      // Cerrar menú principal
      if (animatedHeights.current[leadId]) {
        Animated.timing(animatedHeights.current[leadId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setExpandedLeadId(null);
        });
      } else {
        setExpandedLeadId(null);
      }
    } else {
      // Cerrar el menú anterior si hay uno abierto (incluyendo sus submenús)
      if (expandedLeadId !== null) {
        const previousLeadId = expandedLeadId;
        
        // Cerrar submenús del menú anterior
        if (expandedQuickResponse === previousLeadId && quickResponseHeights.current[previousLeadId]) {
          Animated.timing(quickResponseHeights.current[previousLeadId], {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setExpandedQuickResponse(null);
          });
        }
        
        if (expandedClientStatus === previousLeadId && clientStatusHeights.current[previousLeadId]) {
          Animated.timing(clientStatusHeights.current[previousLeadId], {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setExpandedClientStatus(null);
          });
        }
        
        // Cerrar menú principal anterior
        if (animatedHeights.current[previousLeadId]) {
          Animated.timing(animatedHeights.current[previousLeadId], {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      }
      
      // Inicializar animación si no existe y asegurar que esté en 0
      if (!animatedHeights.current[leadId]) {
        animatedHeights.current[leadId] = new Animated.Value(0);
      } else {
        // Asegurar que el valor esté en 0 antes de animar
        animatedHeights.current[leadId].setValue(0);
      }
      
      // Establecer el estado primero
      setExpandedLeadId(leadId);
      
      // Usar requestAnimationFrame para asegurar que el render se complete antes de animar
      // Esto es especialmente importante en Android
      requestAnimationFrame(() => {
        // Animar expansión
        Animated.timing(animatedHeights.current[leadId], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const closeMenu = (leadId: number) => {
    // Cerrar submenús primero si están abiertos
    if (expandedQuickResponse === leadId && quickResponseHeights.current[leadId]) {
      Animated.timing(quickResponseHeights.current[leadId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setExpandedQuickResponse(null);
      });
    }
    
    if (expandedClientStatus === leadId && clientStatusHeights.current[leadId]) {
      Animated.timing(clientStatusHeights.current[leadId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setExpandedClientStatus(null);
      });
    }
    
    // Cerrar menú principal
    if (animatedHeights.current[leadId]) {
      Animated.timing(animatedHeights.current[leadId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setExpandedLeadId(null);
      });
    } else {
      setExpandedLeadId(null);
    }
  };

  const toggleQuickResponse = (leadId: number) => {
    // Asegurar que el menú principal esté abierto
    if (expandedLeadId !== leadId) {
      if (!animatedHeights.current[leadId]) {
        animatedHeights.current[leadId] = new Animated.Value(0);
      } else {
        animatedHeights.current[leadId].setValue(0);
      }
      setExpandedLeadId(leadId);
      // Usar requestAnimationFrame para asegurar que el render se complete antes de animar
      requestAnimationFrame(() => {
        Animated.timing(animatedHeights.current[leadId], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
    
    // Inicializar animación si no existe y asegurar que esté en 0
    if (!quickResponseHeights.current[leadId]) {
      quickResponseHeights.current[leadId] = new Animated.Value(0);
    } else {
      // Asegurar que el valor esté en 0 antes de animar (si se está abriendo)
      if (expandedQuickResponse !== leadId) {
        quickResponseHeights.current[leadId].setValue(0);
      }
    }

    if (expandedQuickResponse === leadId) {
      // Cerrar
      Animated.timing(quickResponseHeights.current[leadId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setExpandedQuickResponse(null);
      });
    } else {
      // Cerrar el anterior si hay uno abierto
      if (expandedQuickResponse !== null && quickResponseHeights.current[expandedQuickResponse]) {
        Animated.timing(quickResponseHeights.current[expandedQuickResponse], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
      
      // Establecer el estado primero
      setExpandedQuickResponse(leadId);
      
      // Usar requestAnimationFrame para asegurar que el render se complete antes de animar
      requestAnimationFrame(() => {
        // Animar expansión
        Animated.timing(quickResponseHeights.current[leadId], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const handleCopyLeadLink = async (leadId: number) => {
    try {
      const link = await copyDeepLink(`leads/${leadId}`);
      Alert.alert('Link copiado', `Deep link copiado: ${link}`);
    } catch (error) {
      const link = generateDeepLink(`leads/${leadId}`);
      Alert.alert('Link generado', link);
    }
  };

  const handleCallLead = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Este lead no tiene un número de teléfono');
      return;
    }

    // Limpiar el número de teléfono (quitar espacios, guiones, etc.)
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const phoneUrl = `tel:${cleanPhone}`;

    Linking.openURL(phoneUrl).catch((err) => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de llamadas');
      console.error('Error al abrir tel:', err);
    });
  };

  const handleEmailLead = (email: string) => {
    if (!email) {
      Alert.alert('Error', 'Este lead no tiene un email');
      return;
    }

    const emailUrl = `mailto:${email}`;

    Linking.openURL(emailUrl).catch((err) => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de email');
      console.error('Error al abrir email:', err);
    });
  };

  const handleCopyPhone = async (phoneNumber: string) => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(phoneNumber);
          Alert.alert('Copiado', 'Número de teléfono copiado al portapapeles');
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = phoneNumber;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          Alert.alert('Copiado', 'Número de teléfono copiado al portapapeles');
        }
      } else {
        try {
          const Clipboard = require('@react-native-clipboard/clipboard').default;
          Clipboard.setString(phoneNumber);
          Alert.alert('Copiado', 'Número de teléfono copiado al portapapeles');
        } catch {
          Alert.alert('Info', 'Selecciona el número y cópialo manualmente');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo copiar el número');
    }
  };

  const handleCopyEmail = async (email: string) => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(email);
          Alert.alert('Copiado', 'Email copiado al portapapeles');
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = email;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          Alert.alert('Copiado', 'Email copiado al portapapeles');
        }
      } else {
        try {
          const Clipboard = require('@react-native-clipboard/clipboard').default;
          Clipboard.setString(email);
          Alert.alert('Copiado', 'Email copiado al portapapeles');
        } catch {
          Alert.alert('Info', 'Selecciona el email y cópialo manualmente');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo copiar el email');
    }
  };

  const handleSendSMS = async (leadId: number) => {
    try {
      setGeneratingSMS(leadId);
      
      // Verificar cache primero
      const cachedContent = await getCachedContent(leadId, 'sms', 'ingles');
      if (cachedContent) {
        console.log('✅ Usando contenido del cache para SMS');
        showContentModal(cachedContent, 'sms', 'ingles', leadId);
        setGeneratingSMS(null);
        return;
      }
      
      // Si no hay cache, generar nuevo contenido
      console.log('🔄 Generando nuevo contenido de SMS...');
      const result = await facebookLeadsService.generateContent(leadId, 'sms', 'ingles');
      
      // Guardar en cache
      await setCachedContent(leadId, 'sms', 'ingles', result.content);
      
      showContentModal(result.content, 'sms', 'ingles', leadId);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'No se pudo generar el SMS');
    } finally {
      setGeneratingSMS(null);
    }
  };

  const handleSendWhatsApp = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Este lead no tiene un número de teléfono');
      return;
    }

    // Limpiar el número de teléfono (quitar espacios, guiones, paréntesis, etc.)
    let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Si el número ya tiene código de país (empieza con +), mantenerlo
    // Si no tiene código de país, agregar +54 para Argentina
    if (!cleanPhone.startsWith('+')) {
      // Si empieza con 54, agregar el +
      if (cleanPhone.startsWith('54')) {
        cleanPhone = `+${cleanPhone}`;
      } else {
        // Si no tiene código de país, agregar +54
        cleanPhone = `+54${cleanPhone}`;
      }
    }
    
    // Remover el + para la URL de WhatsApp (wa.me no necesita el +)
    const whatsappPhone = cleanPhone.replace(/\+/g, '');
    const whatsappUrl = `https://wa.me/${whatsappPhone}`;

    Linking.openURL(whatsappUrl).catch((err) => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
      console.error('Error al abrir WhatsApp:', err);
    });
  };

  const handleSendEmail = async (leadId: number) => {
    try {
      setGeneratingEmail(leadId);
      
      // Verificar cache primero
      const cachedContent = await getCachedContent(leadId, 'email', 'ingles');
      if (cachedContent) {
        console.log('✅ Usando contenido del cache para email');
        showContentModal(cachedContent, 'email', 'ingles', leadId);
        setGeneratingEmail(null);
        return;
      }
      
      // Si no hay cache, generar nuevo contenido
      console.log('🔄 Generando nuevo contenido de email...');
      const result = await facebookLeadsService.generateContent(leadId, 'email', 'ingles');
      
      // Guardar en cache
      await setCachedContent(leadId, 'email', 'ingles', result.content);
      
      showContentModal(result.content, 'email', 'ingles', leadId);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'No se pudo generar el email');
    } finally {
      setGeneratingEmail(null);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      if (Platform.OS === 'web') {
        // Para web, usar la API del navegador
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(modalContent);
          Alert.alert('Copiado', 'El contenido se ha copiado al portapapeles');
        } else {
          // Fallback para navegadores antiguos
          const textArea = document.createElement('textarea');
          textArea.value = modalContent;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          Alert.alert('Copiado', 'El contenido se ha copiado al portapapeles');
        }
      } else {
        // Para móvil, usar @react-native-clipboard/clipboard si está disponible
        // Si no, el contenido será seleccionable en el modal
        try {
          const Clipboard = require('@react-native-clipboard/clipboard').default;
          Clipboard.setString(modalContent);
          Alert.alert('Copiado', 'El contenido se ha copiado al portapapeles');
        } catch {
          // Si no está disponible, el contenido es seleccionable en el modal
          Alert.alert('Info', 'Selecciona el texto en el modal y cópialo manualmente');
        }
      }
    } catch (error) {
      Alert.alert('Info', 'Selecciona el texto en el modal y cópialo manualmente');
    }
  };

  const handleToggleLanguage = async () => {
    if (!modalLeadId) return;
    
    const newLanguage = modalLanguage === 'ingles' ? 'español' : 'ingles';
    setModalLoading(true);
    
    try {
      // Verificar cache primero
      const cachedContent = await getCachedContent(modalLeadId, modalType, newLanguage);
      if (cachedContent) {
        console.log('✅ Usando contenido del cache para cambio de idioma');
        setModalContent(cachedContent);
        setModalLanguage(newLanguage);
        setModalLoading(false);
        return;
      }
      
      // Si no hay cache, generar nuevo contenido
      console.log('🔄 Generando nuevo contenido para cambio de idioma...');
      const result = await facebookLeadsService.generateContent(modalLeadId, modalType, newLanguage);
      
      // Guardar en cache
      await setCachedContent(modalLeadId, modalType, newLanguage, result.content);
      
      setModalContent(result.content);
      setModalLanguage(newLanguage);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'No se pudo cambiar el idioma');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setModalContent('');
    setModalType('email');
    setModalLanguage('ingles');
    setModalLeadId(null);
  };

  // Funciones de cache para contenido generado
  const getCacheKey = (leadId: number, type: 'email' | 'sms' | 'call', language: 'español' | 'ingles'): string => {
    return `generated-content-${leadId}-${type}-${language}`;
  };

  const getCachedContent = async (leadId: number, type: 'email' | 'sms' | 'call', language: 'español' | 'ingles'): Promise<string | null> => {
    try {
      const cacheKey = getCacheKey(leadId, type, language);
      console.log('🔍 Buscando en cache:', cacheKey);
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached && cached.trim().length > 0) {
        console.log('✅ Cache hit para:', cacheKey);
        console.log('✅ Contenido del cache (primeros 100 chars):', cached.substring(0, 100));
        return cached;
      }
      console.log('❌ Cache miss para:', cacheKey);
      console.log('❌ Valor obtenido:', cached ? `"${cached}" (length: ${cached.length})` : 'null');
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo cache:', error);
      return null;
    }
  };

  const setCachedContent = async (leadId: number, type: 'email' | 'sms' | 'call', language: 'español' | 'ingles', content: string): Promise<void> => {
    try {
      if (!content || content.trim().length === 0) {
        console.warn('⚠️ Intento de guardar contenido vacío en cache');
        return;
      }
      const cacheKey = getCacheKey(leadId, type, language);
      await AsyncStorage.setItem(cacheKey, content);
      console.log('💾 Contenido guardado en cache:', cacheKey);
      console.log('💾 Tamaño del contenido:', content.length, 'caracteres');
      console.log('💾 Primeros 100 chars:', content.substring(0, 100));
      
      // Verificar que se guardó correctamente
      const verify = await AsyncStorage.getItem(cacheKey);
      if (verify === content) {
        console.log('✅ Verificación: Cache guardado correctamente');
      } else {
        console.error('❌ Verificación: El cache no se guardó correctamente');
      }
    } catch (error) {
      console.error('❌ Error guardando en cache:', error);
    }
  };

  const showContentModal = (content: string, type: 'email' | 'sms' | 'call', language: 'español' | 'ingles', leadId: number) => {
    setModalContent(content);
    setModalType(type);
    setModalLanguage(language);
    setModalLeadId(leadId);
    setModalVisible(true);
  };

  const handleGenerateEmail = async (leadId: number, language: 'español' | 'ingles' = 'español') => {
    try {
      setGeneratingEmail(leadId);
      
      // Verificar cache primero
      const cachedContent = await getCachedContent(leadId, 'email', language);
      if (cachedContent) {
        console.log('✅ Usando contenido del cache para email');
        showContentModal(cachedContent, 'email', language, leadId);
        setGeneratingEmail(null);
        closeMenu(leadId);
        return;
      }
      
      // Si no hay cache, generar nuevo contenido
      console.log('🔄 Generando nuevo contenido de email...');
      const result = await facebookLeadsService.generateContent(leadId, 'email', language);
      
      // Guardar en cache
      await setCachedContent(leadId, 'email', language, result.content);
      
      showContentModal(result.content, 'email', language, leadId);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'No se pudo generar el email');
    } finally {
      setGeneratingEmail(null);
      closeMenu(leadId);
    }
  };

  const handleText = async (leadId: number) => {
    try {
      setGeneratingSMS(leadId);
      
      // Verificar cache primero
      const cachedContent = await getCachedContent(leadId, 'sms', 'ingles');
      if (cachedContent) {
        console.log('✅ Usando contenido del cache para SMS');
        showContentModal(cachedContent, 'sms', 'ingles', leadId);
        setGeneratingSMS(null);
        closeMenu(leadId);
        return;
      }
      
      // Si no hay cache, generar nuevo contenido
      console.log('🔄 Generando nuevo contenido de SMS...');
      const result = await facebookLeadsService.generateContent(leadId, 'sms', 'ingles');
      
      // Guardar en cache
      await setCachedContent(leadId, 'sms', 'ingles', result.content);
      
      showContentModal(result.content, 'sms', 'ingles', leadId);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'No se pudo generar el SMS');
    } finally {
      setGeneratingSMS(null);
      closeMenu(leadId);
    }
  };

  const handleCall = async (leadId: number) => {
    try {
      setGeneratingCall(leadId);
      
      // Verificar cache primero
      const cachedContent = await getCachedContent(leadId, 'call', 'ingles');
      if (cachedContent) {
        console.log('✅ Usando contenido del cache para call');
        showContentModal(cachedContent, 'call', 'ingles', leadId);
        setGeneratingCall(null);
        closeMenu(leadId);
        return;
      }
      
      // Si no hay cache, generar nuevo contenido
      console.log('🔄 Generando nuevo contenido de call...');
      const result = await facebookLeadsService.generateContent(leadId, 'call', 'ingles');
      
      // Guardar en cache
      await setCachedContent(leadId, 'call', 'ingles', result.content);
      
      showContentModal(result.content, 'call', 'ingles', leadId);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'No se pudo generar el script de llamada');
    } finally {
      setGeneratingCall(null);
      closeMenu(leadId);
    }
  };

  const toggleClientStatus = (leadId: number) => {
    // Asegurar que el menú principal esté abierto
    if (expandedLeadId !== leadId) {
      if (!animatedHeights.current[leadId]) {
        animatedHeights.current[leadId] = new Animated.Value(0);
      } else {
        animatedHeights.current[leadId].setValue(0);
      }
      setExpandedLeadId(leadId);
      requestAnimationFrame(() => {
        Animated.timing(animatedHeights.current[leadId], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
    
    // Inicializar animación si no existe y asegurar que esté en 0
    if (!clientStatusHeights.current[leadId]) {
      clientStatusHeights.current[leadId] = new Animated.Value(0);
    } else {
      if (expandedClientStatus !== leadId) {
        clientStatusHeights.current[leadId].setValue(0);
      }
    }

    if (expandedClientStatus === leadId) {
      // Cerrar
      Animated.timing(clientStatusHeights.current[leadId], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setExpandedClientStatus(null);
      });
    } else {
      // Cerrar el anterior si hay uno abierto
      if (expandedClientStatus !== null && clientStatusHeights.current[expandedClientStatus]) {
        Animated.timing(clientStatusHeights.current[expandedClientStatus], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
      
      setExpandedClientStatus(leadId);
      
      requestAnimationFrame(() => {
        Animated.timing(clientStatusHeights.current[leadId], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'no-contest': 'No contestó',
      'appointment': 'Cita Agendada',
      'recontact': 'Por recontactar',
      'estimated-sold': 'Estimado vendido',
      'work-completed': 'Trabajo terminado',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const statusColorMap: { [key: string]: string } = {
      'no-contest': '#fca5a5', // Rojo medio
      'appointment': '#fcd34d', // Amarillo medio
      'recontact': '#93c5fd', // Azul medio
      'estimated-sold': '#6ee7b7', // Verde medio
      'work-completed': '#a5b4fc', // Índigo/Morado medio
    };
    return statusColorMap[status] || colors.textSecondary;
  };

  // Mapear código del frontend al valor que espera el backend
  const mapStatusToBackend = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'no-contest': 'No contestó',
      'appointment': 'Cita Agendada',
      'recontact': 'Por recontactar',
      'estimated-sold': 'Estimado vendido',
      'work-completed': 'Trabajo terminado',
    };
    return statusMap[status] || status;
  };

  const handleClientStatusOption = async (leadId: number, status: string) => {
    console.log('🔵 handleClientStatusOption: Iniciando...');
    console.log('🔵 handleClientStatusOption: leadId:', leadId);
    console.log('🔵 handleClientStatusOption: status:', status);
    
    if (status === 'appointment' || status === 'recontact') {
      console.log('🔵 handleClientStatusOption: Abriendo modal de fecha/hora para:', status);
      setDateTimeModalType(status === 'appointment' ? 'appointment' : 'recontact');
      setModalLeadId(leadId);
      setSelectedDate(new Date());
      setSelectedTime('');
      setDateTimeModalVisible(true);
    } else {
      try {
        console.log('🔵 handleClientStatusOption: Llamando a updateClientStatus...');
        // Mapear el código del frontend al valor que espera el backend
        const backendStatus = mapStatusToBackend(status);
        console.log('🔵 handleClientStatusOption: status frontend:', status);
        console.log('🔵 handleClientStatusOption: status backend:', backendStatus);
        // Actualizar estado en el backend
        const updatedLead = await facebookLeadsService.updateClientStatus(leadId, backendStatus);
        
        console.log('✅ handleClientStatusOption: Lead actualizado exitosamente:', updatedLead);
        console.log('✅ handleClientStatusOption: clientStatus actualizado:', updatedLead.clientStatus);
        
        // Actualizar estado local
        setClientStatuses(prev => ({ ...prev, [leadId]: status }));
        console.log('✅ handleClientStatusOption: Estado local actualizado');
        
        // Cerrar el menú de estado del cliente
        if (expandedClientStatus === leadId && clientStatusHeights.current[leadId]) {
          Animated.timing(clientStatusHeights.current[leadId], {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setExpandedClientStatus(null);
          });
        }
        
        Alert.alert(
          'Estado del Cliente',
          `Estado actualizado a: ${getStatusLabel(status)}`,
          [
            { text: 'OK', onPress: () => closeMenu(leadId) },
          ]
        );
      } catch (error: any) {
        console.error('❌ handleClientStatusOption: Error actualizando estado del cliente:', error);
        console.error('❌ handleClientStatusOption: Error details:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
        });
        Alert.alert(
          'Error',
          error.response?.data?.message || 'No se pudo actualizar el estado del cliente',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSaveDateTime = async () => {
    console.log('🟢 handleSaveDateTime: Iniciando...');
    console.log('🟢 handleSaveDateTime: selectedTime:', selectedTime);
    console.log('🟢 handleSaveDateTime: selectedDate:', selectedDate);
    console.log('🟢 handleSaveDateTime: modalLeadId:', modalLeadId);
    console.log('🟢 handleSaveDateTime: dateTimeModalType:', dateTimeModalType);
    
    if (!selectedTime) {
      console.warn('⚠️ handleSaveDateTime: No hay hora seleccionada');
      Alert.alert('Error', 'Por favor selecciona una hora');
      return;
    }
    
    if (!modalLeadId || !dateTimeModalType) {
      console.error('❌ handleSaveDateTime: Faltan datos requeridos');
      Alert.alert('Error', 'No se pudo identificar el lead');
      return;
    }

    try {
      console.log('🟢 handleSaveDateTime: Llamando a updateClientStatus...');
      // Mapear el código del frontend al valor que espera el backend
      const backendStatus = mapStatusToBackend(dateTimeModalType);
      console.log('🟢 handleSaveDateTime: dateTimeModalType frontend:', dateTimeModalType);
      console.log('🟢 handleSaveDateTime: status backend:', backendStatus);
      // Actualizar estado en el backend
      const updatedLead = await facebookLeadsService.updateClientStatus(modalLeadId, backendStatus);
      
      console.log('✅ handleSaveDateTime: Lead actualizado exitosamente:', updatedLead);
      console.log('✅ handleSaveDateTime: clientStatus actualizado:', updatedLead.clientStatus);
      
      // Actualizar estado local
      setClientStatuses(prev => ({ ...prev, [modalLeadId]: dateTimeModalType }));
      console.log('✅ handleSaveDateTime: Estado local actualizado');
      
      // Cerrar el menú de estado del cliente
      if (modalLeadId && expandedClientStatus === modalLeadId && clientStatusHeights.current[modalLeadId]) {
        Animated.timing(clientStatusHeights.current[modalLeadId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setExpandedClientStatus(null);
        });
      }
      
      Alert.alert(
        'Éxito',
        `${dateTimeModalType === 'appointment' ? 'Cita agendada' : 'Por recontactar'} para ${selectedDate.toLocaleDateString()} a las ${selectedTime}`,
        [
          { text: 'OK', onPress: () => {
            console.log('🟢 handleSaveDateTime: Cerrando modal y menú');
            setDateTimeModalVisible(false);
            setDateTimeModalType(null);
            closeMenu(modalLeadId);
          }},
        ]
      );
    } catch (error: any) {
      console.error('❌ handleSaveDateTime: Error guardando fecha y hora:', error);
      console.error('❌ handleSaveDateTime: Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo guardar la fecha y hora',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRequestReview = async (leadId: number) => {
    try {
      setRequestingReview(leadId);
      
      // Llamar al endpoint para enviar la solicitud de review
      const result = await facebookLeadsService.sendReviewRequest(leadId);
      
      Alert.alert(
        'Éxito',
        result.message || 'La solicitud de review ha sido enviada al cliente exitosamente',
        [
          { text: 'OK', onPress: () => closeMenu(leadId) },
        ]
      );
    } catch (error: any) {
      // Manejar diferentes tipos de errores
      let errorMessage = 'No se pudo enviar la solicitud de review';
      
      if (error.response) {
        // Error del servidor
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 404) {
          errorMessage = 'El lead no fue encontrado';
        } else if (status === 400) {
          errorMessage = data?.message || 'El lead no tiene email o el cliente no tiene URL de Google My Business configurada';
        } else if (status === 500) {
          errorMessage = data?.message || 'Error del servidor. Por favor intenta más tarde';
        } else {
          errorMessage = data?.message || errorMessage;
        }
      } else if (error.request) {
        // Error de red
        errorMessage = 'Error de conexión. Verifica tu conexión a internet';
      } else {
        // Otro tipo de error
        errorMessage = error.message || errorMessage;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setRequestingReview(null);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar este lead?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLead(id);
              if (isSearching && debouncedSearchQuery && clientId) {
                // Refrescar búsqueda
                const response = await facebookLeadsService.searchMyLeads(
                  debouncedSearchQuery,
                  clientId,
                  searchPage,
                  limit
                );
                setSearchLeads(response.data);
                setSearchPagination(response.pagination);
              } else {
                refetch();
              }
            } catch (err) {
              Alert.alert('Error', 'Error al eliminar lead');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Mostrar loader mientras se carga la autenticación
  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Solo mostrar error si ya terminó de cargar y no hay clientId
  if (!clientId) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
        <Text style={styles.errorText}>No se encontró el ID de cliente</Text>
        <Text style={styles.emptySubtext}>Por favor, inicia sesión nuevamente</Text>
      </View>
    );
  }

  if (displayLoading && displayLeads.length === 0 && !isSearching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando leads...</Text>
      </View>
    );
  }

  if (displayError && displayLeads.length === 0 && !isSearching) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Error: {displayError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Barra de búsqueda y botón nuevo estimado */}
      <View style={styles.searchRow}>
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
            {...(Platform.OS === 'web' && { 
              // @ts-ignore - web only property
              outlineStyle: 'none',
            })}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setDebouncedSearchQuery('');
              }}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {isSearching && displayLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoading} />
          )}
        </View>
        {onNew && (
          <TouchableOpacity 
            style={styles.newButton} 
            onPress={onNew}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" style={styles.newButtonIcon} />
            <Text style={styles.newButtonText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching && displayPagination && (
        <View style={styles.searchResultsInfo}>
          <Text style={styles.searchResultsText}>
            {displayPagination.total} resultado{displayPagination.total !== 1 ? 's' : ''} encontrado{displayPagination.total !== 1 ? 's' : ''}
            {debouncedSearchQuery && ` para "${debouncedSearchQuery}"`}
          </Text>
        </View>
      )}

      {isSearching && displayError && (
        <View style={styles.searchErrorContainer}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.searchErrorText}>{displayError}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {displayLeads.length === 0 && !displayLoading ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={isSearching ? "search-outline" : "document-text-outline"} 
              size={64} 
              color={colors.textTertiary} 
            />
            <Text style={styles.emptyText}>
              {isSearching ? 'No se encontraron resultados' : 'No hay leads disponibles'}
            </Text>
            <Text style={styles.emptySubtext}>
              {isSearching 
                ? 'Intenta con otros términos de búsqueda' 
                : 'Los leads aparecerán aquí cuando se reciban'}
            </Text>
          </View>
        ) : (
          displayLeads.map((lead) => {
            const isExpanded = expandedLeadId === lead.id;
            if (!animatedHeights.current[lead.id]) {
              animatedHeights.current[lead.id] = new Animated.Value(0);
            }
            if (!quickResponseHeights.current[lead.id]) {
              quickResponseHeights.current[lead.id] = new Animated.Value(0);
            }
            if (!clientStatusHeights.current[lead.id]) {
              clientStatusHeights.current[lead.id] = new Animated.Value(0);
            }
            
            const isQuickExpanded = expandedQuickResponse === lead.id;
            const isClientStatusExpanded = expandedClientStatus === lead.id;
            // Altura base: botón de respuestas rápidas + botón de estado del cliente + fila de solicitar review y editar
            const buttonHeight = 60; // Altura aproximada de cada botón
            const baseHeight = buttonHeight + buttonHeight + buttonHeight; // Respuestas rápidas + Estado del cliente + Fila (Solicitar review + Editar)
            
            // Altura del menú de respuestas rápidas cuando está expandido
            const quickResponseExpandedHeight = 200; // Altura para 3 botones (Email, SMS, Llamada) + gaps
            // Altura del menú de estado del cliente cuando está expandido
            const clientStatusExpandedHeight = 300; // Altura para 5 opciones + gaps
            
            // Calcular altura total dinámicamente
            const quickResponseCurrentHeight = quickResponseHeights.current[lead.id].interpolate({
              inputRange: [0, 1],
              outputRange: [0, quickResponseExpandedHeight],
            });
            
            const clientStatusCurrentHeight = clientStatusHeights.current[lead.id].interpolate({
              inputRange: [0, 1],
              outputRange: [0, clientStatusExpandedHeight],
            });
            
            // Altura del menú base (sin menús expandibles)
            const baseMenuHeight = animatedHeights.current[lead.id].interpolate({
              inputRange: [0, 1],
              outputRange: [0, baseHeight],
            });
            
            // Altura total: base + respuestas rápidas + estado del cliente (solo si el menú principal está abierto)
            const menuHeight = Animated.add(
              baseMenuHeight,
              Animated.add(
                Animated.multiply(
                  animatedHeights.current[lead.id],
                  quickResponseCurrentHeight
                ),
                Animated.multiply(
                  animatedHeights.current[lead.id],
                  clientStatusCurrentHeight
                )
              )
            );

            return (
              <View key={lead.id} style={styles.leadCard}>
                <View style={styles.leadContent}>
                  <View style={styles.leadInfo}>
                    {lead.name && (
                      <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>{lead.name}</Text>
                      </View>
                    )}
                    {(() => {
                      const phone = lead.phone || lead.phoneManual || lead.phoneAuto;
                      const phoneAuto = lead.phoneAuto;
                      const phoneManual = lead.phoneManual;
                      const hasBoth = phoneAuto && phoneManual && phoneAuto !== phoneManual;
                      
                      if (!phone) return null;
                      
                      if (hasBoth) {
                        // Mostrar ambos teléfonos si son diferentes
                        return (
                          <>
                            <View style={styles.infoRow}>
                              <TouchableOpacity
                                style={styles.infoRowContent}
                                onPress={() => handleCallLead(phoneAuto || '')}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.infoText}>{phoneAuto}</Text>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleCopyPhone(phoneAuto || '');
                                  }}
                                  activeOpacity={0.7}
                                  style={styles.copyIconButton}
                                >
                                  <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.infoRow}>
                              <TouchableOpacity
                                style={styles.infoRowContent}
                                onPress={() => handleCallLead(phoneManual || '')}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.infoText}>{phoneManual}</Text>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleCopyPhone(phoneManual || '');
                                  }}
                                  activeOpacity={0.7}
                                  style={styles.copyIconButton}
                                >
                                  <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </TouchableOpacity>
                            </View>
                          </>
                        );
                      } else {
                        // Mostrar solo uno si son iguales o solo hay uno
                        return (
                          <View style={styles.infoRow}>
                            <TouchableOpacity
                              style={styles.infoRowContent}
                              onPress={() => handleCallLead(phone || '')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                              <Text style={styles.infoText}>{phone}</Text>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleCopyPhone(phone || '');
                                }}
                                activeOpacity={0.7}
                                style={styles.copyIconButton}
                              >
                                <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          </View>
                        );
                      }
                    })()}
                    {lead.email && (
                      <View style={styles.infoRow}>
                        <TouchableOpacity
                          style={styles.infoRowContent}
                          onPress={() => handleEmailLead(lead.email || '')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                          <Text style={styles.infoText}>{lead.email}</Text>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCopyEmail(lead.email || '');
                            }}
                            activeOpacity={0.7}
                            style={styles.copyIconButton}
                          >
                            <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </View>
                    )}
                    {lead.city && (
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>{lead.city}</Text>
                      </View>
                    )}
                    {lead.preferredContactMethod && (
                      <View style={styles.infoRow}>
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>Contacto: {lead.preferredContactMethod}</Text>
                      </View>
                    )}
                    {lead.project && (
                      <View style={styles.infoRow}>
                        <Ionicons name="home-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>{lead.project}</Text>
                      </View>
                    )}
                    {lead.estimatedTimeToStart && (
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>Inicio estimado: {lead.estimatedTimeToStart}</Text>
                      </View>
                    )}
                    {lead.availableBudget && (
                      <View style={styles.infoRow}>
                        <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>Presupuesto: {lead.availableBudget}</Text>
                      </View>
                    )}
                    {lead.extraInfo && (
                      <View style={styles.infoRow}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.infoText}>{lead.extraInfo}</Text>
                      </View>
                    )}
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.dateText}>{formatDate(lead.createdAt)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      {(() => {
                        const currentStatus = clientStatuses[lead.id] || (lead.clientStatus ? (() => {
                          // Mapear del backend al frontend si viene en formato del backend
                          const backendToFrontend: { [key: string]: string } = {
                            'No contestó': 'no-contest',
                            'Cita Agendada': 'appointment',
                            'Por recontactar': 'recontact',
                            'Estimado vendido': 'estimated-sold',
                            'Trabajo terminado': 'work-completed',
                          };
                          return backendToFrontend[lead.clientStatus] || lead.clientStatus;
                        })() : 'appointment');
                        const statusColor = getStatusColor(currentStatus);
                        return (
                          <View style={[styles.statusIndicator, { 
                            backgroundColor: statusColor,
                            borderColor: statusColor,
                          }]} />
                        );
                      })()}
                      <Text style={styles.statusTextInfo}>
                        Estado: {clientStatuses[lead.id] ? getStatusLabel(clientStatuses[lead.id]) : (lead.clientStatus ? (() => {
                          // Mapear del backend al frontend si viene en formato del backend
                          const backendToFrontend: { [key: string]: string } = {
                            'No contestó': 'no-contest',
                            'Cita Agendada': 'appointment',
                            'Por recontactar': 'recontact',
                            'Estimado vendido': 'estimated-sold',
                            'Trabajo terminado': 'work-completed',
                          };
                          const frontendStatus = backendToFrontend[lead.clientStatus] || lead.clientStatus;
                          return getStatusLabel(frontendStatus);
                        })() : 'Agendado')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tutorialContainer}>
                    <TouchableOpacity
                      style={styles.menuToggleButton}
                      onPress={() => toggleMenu(lead.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} 
                        size={20} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                    {showTutorial && (
                      <Animated.View
                        style={[
                          styles.tutorialArrow,
                          {
                            transform: [
                              {
                                translateY: tutorialArrowPosition.current,
                              },
                            ],
                          },
                        ]}
                      >
                        <Ionicons 
                          name="arrow-up" 
                          size={24} 
                          color={colors.primary} 
                        />
                      </Animated.View>
                    )}
                  </View>
                </View>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.callButton]}
                    onPress={() => handleCallLead(lead.phone || lead.phoneManual || lead.phoneAuto || '')}
                    disabled={!lead.phone && !lead.phoneManual && !lead.phoneAuto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={20} color={colors.primary} />
                    <Text style={styles.actionButtonText}>Llamar</Text>
                  </TouchableOpacity>
                  {user?.userClientData?.country === 'Argentina' ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.smsButton]}
                      onPress={() => handleSendWhatsApp(lead.phone || lead.phoneManual || lead.phoneAuto || '')}
                      disabled={!lead.phone && !lead.phoneManual && !lead.phoneAuto}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Whats</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.smsButton]}
                      onPress={() => handleSendSMS(lead.id)}
                      disabled={generatingSMS === lead.id}
                      activeOpacity={0.7}
                    >
                      {generatingSMS === lead.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                      )}
                      <Text style={styles.actionButtonText}>SMS</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.emailButton]}
                    onPress={() => handleSendEmail(lead.id)}
                    disabled={generatingEmail === lead.id}
                    activeOpacity={0.7}
                  >
                    {generatingEmail === lead.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="mail-outline" size={20} color={colors.primary} />
                    )}
                    <Text style={styles.actionButtonText}>Email</Text>
                  </TouchableOpacity>
                </View>
                {/* Menú desplegable animado */}
                <Animated.View 
                  style={[
                    styles.expandedMenu, 
                    { 
                      height: menuHeight, 
                      opacity: animatedHeights.current[lead.id],
                      overflow: 'hidden',
                    }
                  ]}
                >
                  <View style={styles.menuContent}>
                    <TouchableOpacity
                      style={styles.quickResponseButton}
                      onPress={() => {
                        toggleQuickResponse(lead.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickResponseButtonText}>Respuestas rápidas en inglés</Text>
                      <Ionicons 
                        name={expandedQuickResponse === lead.id ? "chevron-up-outline" : "chevron-down-outline"} 
                        size={18} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                    {(() => {
                      const quickOpacity = quickResponseHeights.current[lead.id].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      });
                      
                      const quickHeight = Animated.multiply(
                        animatedHeights.current[lead.id],
                        quickResponseHeights.current[lead.id].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200],
                        })
                      );
                      
                      return (
                        <Animated.View 
                          style={{ 
                            height: quickHeight, 
                            opacity: quickOpacity,
                            overflow: 'hidden',
                          }}
                        >
                          <View style={styles.quickResponseContent}>
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => handleGenerateEmail(lead.id, 'ingles')}
                              disabled={generatingEmail === lead.id}
                              activeOpacity={0.7}
                            >
                              {generatingEmail === lead.id ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : (
                                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                              )}
                              <Text style={styles.menuItemText}>Email</Text>
                            </TouchableOpacity>
                            {user?.userClientData?.country === 'Argentina' ? (
                              <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                  handleSendWhatsApp(lead.phone || lead.phoneManual || lead.phoneAuto || '');
                                  closeMenu(lead.id);
                                }}
                                disabled={!lead.phone && !lead.phoneManual && !lead.phoneAuto}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
                                <Text style={styles.menuItemText}>Whats</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleText(lead.id)}
                                disabled={generatingSMS === lead.id}
                                activeOpacity={0.7}
                              >
                                {generatingSMS === lead.id ? (
                                  <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                  <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                                )}
                                <Text style={styles.menuItemText}>SMS</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.menuItem}
                              onPress={() => handleCall(lead.id)}
                              disabled={generatingCall === lead.id}
                              activeOpacity={0.7}
                            >
                              {generatingCall === lead.id ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : (
                                <Ionicons name="call-outline" size={20} color={colors.primary} />
                              )}
                              <Text style={styles.menuItemText}>Llamada</Text>
                            </TouchableOpacity>
                          </View>
                        </Animated.View>
                      );
                    })()}
                    <TouchableOpacity
                      style={styles.quickResponseButton}
                      onPress={() => {
                        toggleClientStatus(lead.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickResponseButtonText}>Estado del cliente</Text>
                      <Ionicons 
                        name={expandedClientStatus === lead.id ? "chevron-up-outline" : "chevron-down-outline"} 
                        size={18} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                    {(() => {
                      const statusOpacity = clientStatusHeights.current[lead.id].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      });
                      
                      const statusHeight = Animated.multiply(
                        animatedHeights.current[lead.id],
                        clientStatusHeights.current[lead.id].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 300],
                        })
                      );
                      
                      return (
                        <Animated.View 
                          style={{ 
                            height: statusHeight, 
                            opacity: statusOpacity,
                            overflow: 'hidden',
                          }}
                        >
                          <View style={styles.quickResponseContent}>
                            <TouchableOpacity
                              style={[styles.menuItem, styles.statusButtonNoContest]}
                              onPress={() => handleClientStatusOption(lead.id, 'no-contest')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.statusText}>No contestó</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.menuItem, styles.statusButtonAppointment]}
                              onPress={() => handleClientStatusOption(lead.id, 'appointment')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.statusText}>Cita Agendada</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.menuItem, styles.statusButtonRecontact]}
                              onPress={() => handleClientStatusOption(lead.id, 'recontact')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.statusText}>Por recontactar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.menuItem, styles.statusButtonEstimatedSold]}
                              onPress={() => handleClientStatusOption(lead.id, 'estimated-sold')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.statusText}>Estimado vendido</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.menuItem, styles.statusButtonWorkCompleted]}
                              onPress={() => handleClientStatusOption(lead.id, 'work-completed')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.statusText}>Trabajo terminado</Text>
                            </TouchableOpacity>
                          </View>
                        </Animated.View>
                      );
                    })()}
                    <View style={styles.twoButtonsRow}>
                      <TouchableOpacity
                        style={[styles.menuItem, styles.reviewButton]}
                        onPress={() => handleRequestReview(lead.id)}
                        disabled={requestingReview === lead.id}
                        activeOpacity={0.7}
                      >
                        {requestingReview === lead.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons name="star-outline" size={20} color={colors.primary} />
                        )}
                        <Text style={styles.menuItemText}>Solicitar review</Text>
                      </TouchableOpacity>
                      {onEdit && (
                        <TouchableOpacity
                          style={[styles.menuItem, styles.editButtonRow]}
                          onPress={() => {
                            closeMenu(lead.id);
                            onEdit(lead);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={20} color={colors.primary} />
                          <Text style={styles.menuItemText}>Editar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Animated.View>
              </View>
            );
          })
        )}
      </ScrollView>

      {!isSearching && displayPagination && displayPagination.totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, (!displayPagination.hasPreviousPage || displayLoading) && styles.paginationButtonDisabled]}
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={!displayPagination.hasPreviousPage || displayLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back-outline" size={20} color={displayPagination.hasPreviousPage && !displayLoading ? colors.textPrimary : colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              Página {displayPagination.page} de {displayPagination.totalPages}
            </Text>
            <Text style={styles.paginationSubtext}>
              {((displayPagination.page - 1) * displayPagination.limit + 1)} - {Math.min(displayPagination.page * displayPagination.limit, displayPagination.total)} de {displayPagination.total}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.paginationButton, (!displayPagination.hasNextPage || displayLoading) && styles.paginationButtonDisabled]}
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={!displayPagination.hasNextPage || displayLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward-outline" size={20} color={displayPagination.hasNextPage && !displayLoading ? colors.textPrimary : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {isSearching && displayPagination && displayPagination.totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, (!displayPagination.hasPreviousPage || displayLoading) && styles.paginationButtonDisabled]}
            onPress={() => handlePageChange(searchPage - 1)}
            disabled={!displayPagination.hasPreviousPage || displayLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back-outline" size={20} color={displayPagination.hasPreviousPage && !displayLoading ? colors.textPrimary : colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              Página {displayPagination.page} de {displayPagination.totalPages}
            </Text>
            <Text style={styles.paginationSubtext}>
              {((displayPagination.page - 1) * displayPagination.limit + 1)} - {Math.min(displayPagination.page * displayPagination.limit, displayPagination.total)} de {displayPagination.total}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.paginationButton, (!displayPagination.hasNextPage || displayLoading) && styles.paginationButtonDisabled]}
            onPress={() => handlePageChange(searchPage + 1)}
            disabled={!displayPagination.hasNextPage || displayLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward-outline" size={20} color={displayPagination.hasNextPage && !displayLoading ? colors.textPrimary : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para mostrar contenido generado */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'email' ? 'Email' : modalType === 'sms' ? 'SMS' : 'Script de Llamada'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.modalText} selectable={true}>{modalContent}</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.copyButton, styles.halfWidthButton]}
                  onPress={handleCopyToClipboard}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={20} color="#fff" />
                  <Text style={styles.modalActionButtonText}>Copiar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.languageButton, styles.halfWidthButton]}
                  onPress={handleToggleLanguage}
                  disabled={modalLoading}
                  activeOpacity={0.7}
                >
                  {modalLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                      <Text style={styles.modalActionButtonText}>Traducir</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.closeButton, styles.fullWidthButton]}
                onPress={handleCloseModal}
                activeOpacity={0.7}
              >
                <Ionicons name="close-outline" size={20} color="#fff" />
                <Text style={styles.modalActionButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para fecha y hora */}
      <Modal
        visible={dateTimeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setDateTimeModalVisible(false);
          setDateTimeModalType(null);
          setShowDatePicker(false);
          setShowTimePicker(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {dateTimeModalType === 'appointment' ? 'Cita Agendada' : 'Por recontactar'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setDateTimeModalVisible(false);
                  setDateTimeModalType(null);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }} 
                style={styles.modalCloseButton}
              >
                <Ionicons name="close-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.dateTimeInputContainer}>
                <Text style={styles.dateTimeLabel}>Fecha:</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={styles.dateTimeButtonText}>
                    {selectedDate.toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, date?: Date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) {
                        setSelectedDate(date);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </View>
              
              <View style={styles.dateTimeInputContainer}>
                <Text style={styles.dateTimeLabel}>Hora:</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={styles.dateTimeButtonText}>
                    {selectedTime || 'Seleccionar hora'}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime ? (() => {
                      const [hours, minutes] = selectedTime.split(':');
                      const time = new Date();
                      time.setHours(parseInt(hours || '0', 10));
                      time.setMinutes(parseInt(minutes || '0', 10));
                      return time;
                    })() : new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, time?: Date) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (time) {
                        const hours = time.getHours().toString().padStart(2, '0');
                        const minutes = time.getMinutes().toString().padStart(2, '0');
                        setSelectedTime(`${hours}:${minutes}`);
                      }
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.closeButton, styles.fullWidthButton]}
                onPress={() => {
                  setDateTimeModalVisible(false);
                  setDateTimeModalType(null);
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-outline" size={20} color="#fff" />
                <Text style={styles.modalActionButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.copyButton, styles.fullWidthButton]}
                onPress={handleSaveDateTime}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-outline" size={20} color="#fff" />
                <Text style={styles.modalActionButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 44,
    flex: 0.6,
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    paddingTop: Platform.OS === 'android' ? 12 : 10,
    paddingBottom: Platform.OS === 'android' ? 12 : 10,
    minWidth: 0,
    width: '100%',
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
    flexShrink: 0,
  },
  searchResultsInfo: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  searchResultsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  searchErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  searchErrorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  searchLoading: {
    marginLeft: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 32 : 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  paginationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationInfo: {
    alignItems: 'center',
    gap: 4,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paginationSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  leadCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tutorialContainer: {
    alignItems: 'center',
    flexShrink: 0,
  },
  menuToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  tutorialArrow: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedMenu: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  menuContent: {
    gap: 4,
  },
  twoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  reviewButton: {
    flex: 0.65,
  },
  editButtonRow: {
    flex: 0.35,
  },
  quickResponseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickResponseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  quickResponseContent: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  leadContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  leadInfo: {
    flex: 1,
    gap: 12,
    minWidth: 0,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  copyIconButton: {
    padding: 0,
    marginLeft: 0,
  },
  infoText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  statusTextInfo: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
  },
  callButton: {
    // Usa el estilo base de actionButton
  },
  smsButton: {
    // Usa el estilo base de actionButton
  },
  emailButton: {
    // Usa el estilo base de actionButton
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
    padding: 20,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  modalActions: {
    flexDirection: 'column',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  halfWidthButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  copyButton: {
    backgroundColor: colors.primary,
  },
  languageButton: {
    backgroundColor: colors.primary,
  },
  closeButton: {
    backgroundColor: colors.error,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dateTimeInputContainer: {
    marginBottom: 16,
  },
  dateTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dateTimeInput: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateTimeButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  statusButtonNoContest: {
    backgroundColor: '#fca5a5', // Rojo medio
  },
  statusButtonAppointment: {
    backgroundColor: '#fcd34d', // Amarillo medio
  },
  statusButtonRecontact: {
    backgroundColor: '#93c5fd', // Azul medio
  },
  statusButtonEstimatedSold: {
    backgroundColor: '#6ee7b7', // Verde medio
  },
  statusButtonWorkCompleted: {
    backgroundColor: '#a5b4fc', // Índigo/Morado medio
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 0.4,
    justifyContent: 'center',
    minHeight: 40,
  },
  newButtonIcon: {
    marginTop: 4,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
