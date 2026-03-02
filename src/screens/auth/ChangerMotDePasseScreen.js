import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../utils/theme';

export default function ChangerMotDePasseScreen() {
  const { currentUser, changerMotDePasse } = useAuth();
  const [nouveau, setNouveau] = useState('');
  const [confirmer, setConfirmer] = useState('');
  const [showN, setShowN] = useState(false);
  const [showC, setShowC] = useState(false);

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  const handleChange = () => {
    if (nouveau.length < 6) {
      Alert.alert('Trop court', 'Minimum 6 caracteres.');
      return;
    }
    if (nouveau !== confirmer) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    changerMotDePasse(currentUser.id, nouveau);
    Alert.alert('Succes', 'Mot de passe mis a jour. Bienvenue !', [{ text: 'OK' }]);
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
          <Text style={s.emoji}>🔐</Text>
          <Text style={s.titre}>
            {currentUser?.mustChangePassword ? 'Nouveau mot de passe' : 'Changer le mot de passe'}
          </Text>
          <Text style={s.sous}>
            {currentUser?.mustChangePassword
              ? `Bonjour ${currentUser?.prenom || ''} ! C'est votre premiere connexion.\nChoisissez un mot de passe personnel (min. 6 caracteres).`
              : 'Choisissez votre nouveau mot de passe (min. 6 caracteres).'}
          </Text>

          <Text style={s.label}>Nouveau mot de passe</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="--------"
              secureTextEntry={!showN}
              value={nouveau}
              onChangeText={setNouveau}
              placeholderTextColor={COLORS.gray}
            />
            <TouchableOpacity onPress={() => setShowN(p => !p)} style={s.eye}>
              <Text>{showN ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Confirmer</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="--------"
              secureTextEntry={!showC}
              value={confirmer}
              onChangeText={setConfirmer}
              placeholderTextColor={COLORS.gray}
            />
            <TouchableOpacity onPress={() => setShowC(p => !p)} style={s.eye}>
              <Text>{showC ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.btn} onPress={handleChange}>
            <Text style={s.btnT}>Enregistrer et continuer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.primary,
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
    fontSize: 12, color: COLORS.gray, textAlign: 'center',
    marginTop: 4, marginBottom: SPACING.md, lineHeight: 18,
  },
  label: {
    fontSize: 12, fontWeight: '600', color: COLORS.gray,
    marginBottom: 4, marginTop: SPACING.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    padding: 14, fontSize: 15, backgroundColor: '#FAFAFA',
  },
  eye: { padding: 10 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: SPACING.md,
  },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
