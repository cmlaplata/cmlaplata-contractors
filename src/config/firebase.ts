import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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
export default app;


