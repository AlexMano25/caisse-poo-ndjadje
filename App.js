import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider }  from './src/context/AppContext';
import AppNavigator     from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="light"/>
        <AppNavigator/>
      </AppProvider>
    </AuthProvider>
  );
}

