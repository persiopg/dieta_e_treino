import React, { useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import Login from '@/components/Login';
import Register from '@/components/Register';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const colorScheme = useColorScheme();
  const { token, loading, login } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Ocultar splash screen após terminar o carregamento do token
  React.useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!token) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {authView === 'login' ? (
          <Login onLoginSuccess={login} onNavigateToRegister={() => setAuthView('register')} />
        ) : (
          <Register onRegisterSuccess={login} onNavigateToLogin={() => setAuthView('login')} />
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../db/database';

export default function TabLayout() {
  return (
    <AuthProvider>
      <SQLiteProvider databaseName="fitlife.db" onInit={migrateDbIfNeeded}>
        <AppContent />
      </SQLiteProvider>
    </AuthProvider>
  );
}
