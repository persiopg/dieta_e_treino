import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  lang: 'pt' | 'en';
  changeLanguage: (newLang: 'pt' | 'en') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [storedToken, storedLang] = await Promise.all([
          AsyncStorage.getItem('fitlife_token'),
          AsyncStorage.getItem('fitlife_lang')
        ]);
        
        if (storedToken) {
          setToken(storedToken);
        }
        if (storedLang === 'en' || storedLang === 'pt') {
          setLang(storedLang);
        }
      } catch (err) {
        console.error('Erro ao ler dados do AsyncStorage:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const login = async (newToken: string) => {
    await AsyncStorage.setItem('fitlife_token', newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('fitlife_token');
    setToken(null);
  };

  const changeLanguage = async (newLang: 'pt' | 'en') => {
    await AsyncStorage.setItem('fitlife_lang', newLang);
    setLang(newLang);
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout, lang, changeLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
