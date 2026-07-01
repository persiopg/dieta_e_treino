import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import api from '@/constants/api';
import { translations } from '../utils/translations';

export default function SettingsScreen() {
  const { logout, lang, changeLanguage } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setProfile(res.data.profile);
      setEmail(res.data.email);
    } catch (err) {
      console.error(err);
      Alert.alert(
        lang === 'pt' ? 'Erro' : 'Error', 
        lang === 'pt' ? 'Não foi possível buscar as informações da conta.' : 'Could not fetch account info.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      translations[lang].confirmTitle,
      translations[lang].logoutConfirm,
      [
        { text: lang === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { text: lang === 'pt' ? 'Sair' : 'Log Out', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      lang === 'pt' ? 'Excluir Conta DEFINITIVAMENTE' : 'Delete Account PERMANENTLY',
      translations[lang].deleteConfirm,
      [
        { text: lang === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { 
          text: lang === 'pt' ? 'Excluir' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/auth/account');
              Alert.alert(
                lang === 'pt' ? 'Conta Excluída' : 'Account Deleted', 
                translations[lang].deleteSuccess
              );
              logout();
            } catch (err) {
              console.error(err);
              Alert.alert(
                lang === 'pt' ? 'Erro' : 'Error', 
                translations[lang].errorOccurred
              );
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>{translations[lang].settingsTitle}</Text>
        <Text style={styles.subtitle}>{translations[lang].settingsSub}</Text>
      </View>

      {/* Seção de Idioma */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{translations[lang].langSelect}</Text>
        <View style={styles.langButtonsRow}>
          <TouchableOpacity 
            style={[styles.langBtn, lang === 'pt' && styles.langBtnActive]} 
            onPress={() => changeLanguage('pt')}
          >
            <Text style={[styles.langBtnText, lang === 'pt' && styles.langBtnTextActive]}>🇧🇷 Português</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.langBtn, lang === 'en' && styles.langBtnActive]} 
            onPress={() => changeLanguage('en')}
          >
            <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>🇺🇸 English</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seção 1: Informações da Conta */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{translations[lang].profileInfo}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{translations[lang].email}</Text>
          <Text style={styles.infoValue}>{email}</Text>
        </View>

        {profile ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations[lang].goal}</Text>
              <Text style={styles.infoValue}>
                {translations[lang][profile.goal] || profile.goal}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations[lang].initialWeight}</Text>
              <Text style={styles.infoValue}>{profile.weight} kg</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations[lang].height}</Text>
              <Text style={styles.infoValue}>{profile.height} cm</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations[lang].age}</Text>
              <Text style={styles.infoValue}>{profile.age} {lang === 'pt' ? 'anos' : 'years'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{translations[lang].targetCal}</Text>
              <Text style={styles.infoValue}>{profile.targetCalories} kcal</Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>{translations[lang].noProfile}</Text>
        )}
      </View>

      {/* Seção 2: Ações de Sessão */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{translations[lang].sessionTitle}</Text>
        
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>{translations[lang].sessionLogout}</Text>
        </TouchableOpacity>
      </View>

      {/* Seção 3: Zona de Perigo */}
      <View style={styles.cardDanger}>
        <Text style={styles.cardHeaderDanger}>{translations[lang].criticalZone}</Text>
        <Text style={styles.dangerDescription}>
          {translations[lang].criticalDesc}
        </Text>
        
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>{translations[lang].deleteBtn}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    marginTop: 26,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fafafa',
  },
  subtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#0c0c0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 16,
  },
  cardDanger: {
    backgroundColor: '#0c0c0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#450a0a',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fafafa',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeaderDanger: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ef4444',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  infoLabel: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    color: '#fafafa',
    fontWeight: '800',
  },
  langButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  langBtn: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  langBtnText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: '#ffffff',
  },
  logoutBtn: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerDescription: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteBtn: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#991b1b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    marginVertical: 10,
  },
});
