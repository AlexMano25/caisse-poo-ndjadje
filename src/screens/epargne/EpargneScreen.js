import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle, responsiveValue } from '../../utils/responsive';
import { formatMontant, calculerInteretsEpargne } from '../../utils/calculations';

const ANNEES = [2024, 2025, 2026];

export default function EpargneScreen() {
  const { currentUser, peutFaire } = useAuth();
  const { membres, versements, seances, ajouterVersement, config, recap } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [selMembre, setSelMembre] = useState('');
  const [montant, setMontant] = useState('');
  const [selSeance, setSelSeance] = useState('');
  const [annee, setAnnee] = useState(config?.annee_courante || 2025);
  const [filterMembre, setFilterMembre] = useState('');

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;
  const canAdd = peutFaire('saisirVersements');

  // Filter seances by year
  const seancesForYear = useMemo(() => {
    return (seances || []).filter(s => s.annee === annee);
  }, [seances, annee]);

  // Filter versements by year and optionally by member
  const versementsFiltres = useMemo(() => {
    let v = (versements || []).filter(h => h.annee === annee && (h.type === 'epargne' || !h.type));
    if (filterMembre) {
      // Need to look up member name from membres array
      const q = filterMembre.toLowerCase();
      v = v.filter(h => {
        const m = (membres || []).find(m => m.id === h.membre_id);
        return m && (m.nom || '').toLowerCase().includes(q);
      });
    }
    return v.sort((a, b) => {
      // Sort by date descending
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return 0;
    });
  }, [versements, annee, filterMembre, membres]);

  // Member totals from recap (membresCalcul)
  const membreTotals = useMemo(() => {
    return (recap?.membresCalcul || [])
      .filter(m => m.actif !== false)
      .sort((a, b) => (b.calcul?.solde || 0) - (a.calcul?.solde || 0));
  }, [recap]);

  // Get member name by id
  const getMembreName = (membreId) => {
    const m = (membres || []).find(m => m.id === membreId);
    return m?.nom || '--';
  };

  // Get seance label by id
  const getSeanceLabel = (seanceId) => {
    const s = (seances || []).find(s => s.id === seanceId);
    if (!s) return '--';
    try {
      return new Date(s.date).toLocaleDateString('fr-FR');
    } catch { return s.date || '--'; }
  };

  const handleAjouter = () => {
    if (!selMembre || !montant || isNaN(parseInt(montant))) {
      Alert.alert('Erreur', 'Selectionnez un membre et entrez un montant valide.');
      return;
    }
    const seanceId = selSeance || (seancesForYear.length > 0 ? seancesForYear[0].id : null);
    ajouterVersement(selMembre, seanceId, parseInt(montant), 'epargne', annee);
    setShowForm(false);
    setMontant('');
    setSelMembre('');
    setSelSeance('');
    Alert.alert('Versement enregistre', 'Le depot a ete ajoute au journal.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 100 }, webStyle()]}>
        <Text style={s.titre}>Epargne membres -- {annee}</Text>
        <Text style={s.sous}>
          Taux interet annuel : {config?.taux_interet_epargne_brut || 7.5}%  -  Retenue : {config?.taux_retenue_epargne || 1.5}% sur interets
        </Text>

        {/* Year filter */}
        <View style={s.filterRow}>
          {ANNEES.map(a => (
            <TouchableOpacity
              key={a}
              style={[s.filterBtn, annee === a && s.filterBtnActive]}
              onPress={() => setAnnee(a)}
            >
              <Text style={[s.filterBtnT, annee === a && { color: '#fff' }]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Member filter */}
        <TextInput
          style={s.searchInput}
          placeholder="Filtrer par nom de membre..."
          value={filterMembre}
          onChangeText={setFilterMembre}
          placeholderTextColor={COLORS.gray}
        />

        {/* Tableau recapitulatif */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <View style={[s.row, { backgroundColor: COLORS.primary }]}>
            <Text style={[s.cell, s.hdr, { flex: 2 }]}>Membre</Text>
            <Text style={[s.cell, s.hdr]}>Epargne</Text>
            <Text style={[s.cell, s.hdr]}>Interets</Text>
            <Text style={[s.cell, s.hdr]}>Solde</Text>
          </View>
          {membreTotals.map((m, i) => (
            <View key={m.id} style={[s.row, { backgroundColor: i % 2 === 0 ? '#fff' : '#F8FAF9' }]}>
              <View style={[s.cell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <MemberAvatar member={{ ...m, name: m.nom }} size={28} />
                <Text style={{ fontSize: 11, flex: 1, color: COLORS.darkGray }} numberOfLines={1}>
                  {(m.nom || '').split(' ')[0]}
                </Text>
              </View>
              <Text style={[s.cell, { fontSize: 11 }]}>
                {formatMontant(m.calcul?.totalEpargne || 0)}
              </Text>
              <Text style={[s.cell, { fontSize: 11, color: COLORS.secondary }]}>
                {formatMontant(m.calcul?.interetNet || 0)}
              </Text>
              <Text style={[s.cell, { fontSize: 12, fontWeight: '700', color: COLORS.primary }]}>
                {formatMontant(m.calcul?.solde || 0)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Historique des versements */}
        <Text style={[s.titre, { marginTop: SPACING.lg }]}>📋 Historique des versements</Text>
        {versementsFiltres.length === 0 ? (
          <Card>
            <Text style={{ textAlign: 'center', color: COLORS.gray }}>
              Aucun versement pour cette periode.
            </Text>
          </Card>
        ) : (
          versementsFiltres.slice(0, 30).map(h => (
            <Card key={h.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkGray }}>
                  {getMembreName(h.membre_id)}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.gray }}>
                  Seance : {getSeanceLabel(h.seance_id)}
                </Text>
              </View>
              <Text style={{
                fontSize: 15, fontWeight: '700',
                color: (h.montant || 0) >= 0 ? COLORS.primary : COLORS.danger,
              }}>
                {(h.montant || 0) >= 0 ? '+' : ''}{formatMontant(h.montant || 0)} F
              </Text>
            </Card>
          ))
        )}
      </ScrollView>

      {canAdd && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            + Enregistrer un versement
          </Text>
        </TouchableOpacity>
      )}

      {/* Formulaire versement */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modal, isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
            <Text style={s.mTitre}>💰 Nouveau versement epargne</Text>

            <Text style={s.label}>Membre</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
              {(membres || []).filter(m => m.actif !== false).map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.chip, selMembre === m.id && s.chipA]}
                  onPress={() => setSelMembre(m.id)}
                >
                  <Text
                    style={{ fontSize: 11, color: selMembre === m.id ? '#fff' : COLORS.darkGray }}
                    numberOfLines={1}
                  >
                    {(m.nom || '').split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Seance</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
              {seancesForYear.map(sq => {
                let lbl = sq.date;
                try { lbl = new Date(sq.date).toLocaleDateString('fr-FR'); } catch {}
                return (
                  <TouchableOpacity
                    key={sq.id}
                    style={[s.chip, selSeance === sq.id && s.chipA]}
                    onPress={() => setSelSeance(sq.id)}
                  >
                    <Text style={{ fontSize: 11, color: selSeance === sq.id ? '#fff' : COLORS.darkGray }}>
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={s.label}>Montant (FCFA)</Text>
            <TextInput
              style={s.input}
              placeholder="ex: 100000"
              keyboardType="numeric"
              value={montant}
              onChangeText={setMontant}
            />

            <TouchableOpacity style={s.btnPri} onPress={handleAjouter}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={s.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  titre: { fontSize: 16, fontWeight: '700', color: COLORS.darkGray, marginBottom: 4 },
  sous: { fontSize: 11, color: COLORS.gray, marginBottom: SPACING.sm },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff',
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBtnT: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray },
  searchInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: SPACING.sm, backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  cell: { flex: 1, padding: 8, textAlign: 'right', color: COLORS.darkGray },
  hdr: { color: '#fff', fontWeight: '700', fontSize: 11, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '90%',
  },
  mTitre: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.md },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.border, marginRight: 8, backgroundColor: '#fff',
  },
  chipA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 14, fontSize: 16, marginBottom: SPACING.md,
  },
  btnPri: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 16, alignItems: 'center' },
  cancel: { textAlign: 'center', marginTop: 16, color: COLORS.gray },
});
