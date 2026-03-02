import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING } from '../../utils/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Entrez votre adresse email.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://poo-ndjadje.vercel.app/reset-password',
      });
      if (error) {
        Alert.alert('Erreur', error.message);
      } else {
        setSent(true);
        Alert.alert(
          'Email envoye',
          'Un lien de reinitialisation a ete envoye a votre adresse email. Verifiez votre boite de reception.'
        );
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email. Reessayez.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.container, isDesktop && { alignItems: 'center' }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.card, isDesktop && { maxWidth: 440, width: '100%' }]}>
          <Text style={s.emoji}>📧</Text>
          <Text style={s.titre}>Mot de passe oublie</Text>
          <Text style={s.sous}>
            Entrez votre adresse email pour recevoir un lien de reinitialisation.
          </Text>

          {sent ? (
            <View style={s.successBox}>
              <Text style={s.successText}>
                Un email a ete envoye a {email}. Verifiez votre boite de reception et suivez le lien.
              </Text>
            </View>
          ) : (
            <>
              <Text style={s.label}>Adresse email</Text>
              <TextInput
                style={s.input}
                placeholder="ex: gamaliel@poo-ndjadje.cm"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                placeholderTextColor={COLORS.gray}
              />

              <TouchableOpacity style={s.btn} onPress={handleReset} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnT}>Envoyer le lien</Text>
                }
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={s.backBtn}
            onPress={() => {
              if (navigation && navigation.goBack) {
                navigation.goBack();
              }
            }}
          >
            <Text style={s.backT}>Retour a la connexion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: COLORS.primary,
    justifyContent: 'center', padding: SPACING.lg,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: SPACING.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: SPACING.sm },
  titre: {
    fontSize: 22, fontWeight: '800', color: COLORS.darkGray, textAlign: 'center',
  },
  sous: {
    fontSize: 13, color: COLORS.gray, textAlign: 'center',
    marginTop: 4, marginBottom: SPACING.lg, lineHeight: 20,
  },
  label: {
    fontSize: 12, fontWeight: '600', color: COLORS.gray,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    padding: 14, fontSize: 15, marginBottom: SPACING.md, backgroundColor: '#FAFAFA',
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: 16,
    alignItems: 'center',
  },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backBtn: { marginTop: SPACING.md, alignItems: 'center' },
  backT: { color: COLORS.secondary, fontSize: 13 },
  successBox: {
    backgroundColor: '#D4EDDA', borderRadius: 12, padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  successText: { color: '#155724', fontSize: 13, lineHeight: 20 },
});
