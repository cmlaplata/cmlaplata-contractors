import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyCTaVyA0rABdtZL6IZVgr5G4FPNeKcpovw',
  authDomain: 'goat-gaming-todo.firebaseapp.com',
  databaseURL: 'https://goat-gaming-todo.firebaseio.com',
  projectId: 'goat-gaming-todo',
  storageBucket: 'goat-gaming-todo.appspot.com',
  messagingSenderId: '840026123751',
  appId: '1:840026123751:web:98eb22cda61bf006bba142',
  measurementId: 'G-4FYQVW48E9',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firebase Analytics (solo funciona en web por ahora)
let analytics: Analytics | null = null;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics inicializado correctamente');
  } catch (error) {
    console.warn('❌ Firebase Analytics no disponible:', error);
  }
} else {
  console.log('ℹ️ Firebase Analytics solo disponible en web');
}

export { analytics };
export default app;


