import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

// Polyfill for web
if (Platform.OS === 'web') {
  // Ensure URL polyfill works on web
  if (typeof window !== 'undefined' && !window.process) {
    window.process = { env: {} };
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AppProvider>
    </AuthProvider>
  );
}
