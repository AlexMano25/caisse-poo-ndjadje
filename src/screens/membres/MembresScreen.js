import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Dimensions,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle, responsiveColumns } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

const ROLE_LABEL = {
  president: 'Presidente', tresorier: 'Tresorier',
  secretaire: 'Secretaire', membre: 'Membre',
};

export default function MembresScreen({ navigation }) {
  const { membres, prets, recap } = useApp();
  const [search, setSearch] = useState('');

  const width = Dimensions.get('window').width;
  const numColumns = responsiveColumns(1, 2, 3);

  // Build a lookup map from recap.membresCalcul for quick access to solde
  const calculMap = useMemo(() => {
    const map = {};
    if (recap && recap.membresCalcul) {
      recap.membresCalcul.forEach(mc => {
        map[mc.id] = mc.calcul;
      });
    }
    return map;
  }, [recap]);

  const filteredMembres = useMemo(() => {
    if (!search.trim()) return membres || [];
    const q = search.toLowerCase();
    return (membres || []).filter(m =>
      (m.nom || '').toLowerCase().includes(q) ||
      (m.prenom || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q)
    );
  }, [membres, search]);

  const cardWidth = numColumns > 1
    ? `${Math.floor(100 / numColumns) - 2}%`
    : '100%';

  const handlePress = (m) => {
    if (navigation && navigation.navigate) {
      navigation.navigate('MembreDetail', { membreId: m.id });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 32 }, webStyle()]}>
        <Text style={s.titre}>Membres ({filteredMembres.length})</Text>

        {/* Search bar */}
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un membre..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.gray}
        />

        {/* Grid layout */}
        <View style={s.grid}>
          {filteredMembres.map(m => {
            const pretActif = (prets || []).find(
              p => p.membre_id === m.id && p.statut === 'en_cours'
            );
            const calcul = calculMap[m.id];
            const solde = calcul?.solde || 0;
            return (
              <TouchableOpacity
                key={m.id}
                style={[s.cardWrap, { width: cardWidth }]}
                onPress={() => handlePress(m)}
              >
                <Card>
                  <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
                    <MemberAvatar member={{ ...m, name: m.nom }} size={46} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.nom}>{m.prenom} {m.nom}</Text>
                      <Text style={s.roleT}>{ROLE_LABEL[m.role] || 'Membre'}</Text>
                      <View style={{ marginTop: 6 }}>
                        <CreditScoreBar score={m.credit_score} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>
                        {formatMontant(solde)}
                      </Text>
                      <Text style={{ fontSize: 9, color: COLORS.gray }}>FCFA</Text>
                      {pretActif && (
                        <View style={{
                          backgroundColor: '#FFEBEE', borderRadius: 6,
                          paddingHorizontal: 6, paddingVertical: 2,
                        }}>
                          <Text style={{ fontSize: 9, color: COLORS.danger, fontWeight: '700' }}>
                            PRET
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  titre: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray, marginBottom: SPACING.sm },
  searchInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: SPACING.md, backgroundColor: '#fff',
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  cardWrap: {
    minWidth: 280,
  },
  nom: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray },
  roleT: { fontSize: 11, color: COLORS.secondary, marginTop: 2 },
});
