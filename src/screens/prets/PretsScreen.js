import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

export default function PretsScreen() {
  const { currentUser, peutFaire } = useAuth();
  const { prets, membres, accorderPret, rembourserPret, config } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [selMembre, setSelMembre] = useState('');
  const [montant, setMontant] = useState('');
  const [nbTrim, setNbTrim] = useState(1);

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;
  const canAccorder = peutFaire('accordePret');

  const tauxPret = config?.taux_interet_pret || 7.5;

  const pretsEnCours = (prets || []).filter(p => p.statut === 'en_cours');
  const pretsRembourses = (prets || []).filter(p => p.statut === 'rembourse');

  // Get member name by membre_id
  const getMembreName = (membreId) => {
    const m = (membres || []).find(m => m.id === membreId);
    return m?.nom || '--';
  };

  const simuler = (m, t) => {
    const mt = parseInt(m) || 0;
    const interets = Math.round(mt * (tauxPret / 100) * (t || 1));
    return { interets, total: mt + interets };
  };
  const sim = simuler(montant, nbTrim);

  const handleAccorder = () => {
    if (!selMembre || !montant || parseInt(montant) <= 0) {
      Alert.alert('Erreur', 'Selectionnez un membre et un montant.');
      return;
    }
    const taux = tauxPret * nbTrim;
    Alert.alert(
      'Confirmer le pret',
      `Pret de ${formatMontant(parseInt(montant))} FCFA\nDuree: ${nbTrim} trimestre(s)\nInterets (${tauxPret}%x${nbTrim}): ${formatMontant(sim.interets)} FCFA\nTotal a rembourser: ${formatMontant(sim.total)} FCFA`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accorder', onPress: () => {
            accorderPret(selMembre, parseInt(montant), taux);
            setShowForm(false);
            setMontant('');
            setSelMembre('');
            setNbTrim(1);
            Alert.alert('Pret accorde', 'Enregistre dans le journal.');
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 100 }, webStyle()]}>
        {/* Totaux */}
        <Card style={{ backgroundColor: COLORS.primary }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: SPACING.sm }}>
            📊 Prets en cours
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#A8D5BA', fontSize: 12 }}>Capital prete</Text>
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {formatMontant(pretsEnCours.reduce((s, p) => s + (p.montant || 0), 0))} FCFA
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#A8D5BA', fontSize: 12 }}>Interets ({tauxPret}%)</Text>
            <Text style={{ color: '#A8D5BA', fontWeight: '600' }}>
              {formatMontant(pretsEnCours.reduce((s, p) => s + (p.interet || 0), 0))} FCFA
            </Text>
          </View>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
            marginTop: 8, paddingTop: 8,
          }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Total a rembourser</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
              {formatMontant(pretsEnCours.reduce((s, p) => s + (p.montant_a_rembourser || 0), 0))} FCFA
            </Text>
          </View>
        </Card>

        {/* Prets en cours */}
        <Text style={s.titre}>Prets en cours ({pretsEnCours.length})</Text>
        <View style={isDesktop ? s.gridDesktop : null}>
          {pretsEnCours.map(p => (
            <Card key={p.id} style={isDesktop ? { width: '48%' } : null}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.darkGray }}>
                    {getMembreName(p.membre_id)}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                    Capital: {formatMontant(p.montant)} - Interets: {formatMontant(p.interet)} FCFA
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.danger }}>
                    {formatMontant(p.montant_a_rembourser)} F
                  </Text>
                  <StatusBadge status="en_cours" />
                </View>
              </View>
              {canAccorder && (
                <TouchableOpacity
                  style={{
                    marginTop: SPACING.sm, backgroundColor: '#F0FFF4', borderRadius: 8,
                    padding: SPACING.sm, alignItems: 'center', borderWidth: 1,
                    borderColor: COLORS.secondary,
                  }}
                  onPress={() => {
                    Alert.alert(
                      'Rembourser ?',
                      `Confirmer le remboursement de ${getMembreName(p.membre_id)} ?\nMontant: ${formatMontant(p.montant_a_rembourser)} FCFA`,
                      [
                        { text: 'Non', style: 'cancel' },
                        { text: 'Oui', onPress: () => rembourserPret(p.id, p.montant_a_rembourser) },
                      ]
                    );
                  }}
                >
                  <Text style={{ color: COLORS.secondary, fontWeight: '700' }}>
                    Marquer rembourse
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          ))}
        </View>

        {/* Prets rembourses */}
        {pretsRembourses.length > 0 && (
          <Text style={[s.titre, { marginTop: SPACING.lg, color: COLORS.secondary }]}>
            Rembourses ({pretsRembourses.length})
          </Text>
        )}
        {pretsRembourses.map(p => (
          <Card key={p.id} style={{ opacity: 0.6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray }}>
              {getMembreName(p.membre_id)}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.gray }}>
              {formatMontant(p.montant_a_rembourser)} FCFA rembourse
            </Text>
          </Card>
        ))}
      </ScrollView>

      {canAccorder && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            + Accorder un pret
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal nouveau pret */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modal, isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
            <Text style={s.mTitre}>💳 Nouveau pret</Text>
            <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: SPACING.md }}>
              Taux : {tauxPret}% (interet fixe)
            </Text>

            <Text style={s.label}>Beneficiaire</Text>
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

            <Text style={s.label}>Montant (FCFA)</Text>
            <TextInput
              style={s.input}
              placeholder="ex: 500000"
              keyboardType="numeric"
              value={montant}
              onChangeText={setMontant}
            />

            <Text style={s.label}>Duree (trimestres a 90 j)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.sm }}>
              {[1, 2, 3, 4].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.chip, nbTrim === t && s.chipA]}
                  onPress={() => setNbTrim(t)}
                >
                  <Text style={{
                    fontSize: 12, fontWeight: '700',
                    color: nbTrim === t ? '#fff' : COLORS.darkGray,
                  }}>
                    {t}T{t > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {parseInt(montant) > 0 && (
              <View style={{
                backgroundColor: '#F0FFF4', borderRadius: 8,
                padding: SPACING.sm, marginBottom: SPACING.md,
              }}>
                <Text style={{ fontSize: 11, color: COLORS.secondary }}>
                  {tauxPret}% x {nbTrim} trimestre(s) = {(tauxPret * nbTrim).toFixed(1)}%
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.secondary, marginTop: 2 }}>
                  Interets : {formatMontant(sim.interets)} FCFA
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.primary, marginTop: 4 }}>
                  Total a rembourser : {formatMontant(sim.total)} FCFA
                </Text>
              </View>
            )}

            <TouchableOpacity style={s.btnPri} onPress={handleAccorder}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Accorder le pret</Text>
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
  titre: {
    fontSize: 15, fontWeight: '700', color: COLORS.darkGray,
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  fab: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: COLORS.danger, borderRadius: 12, padding: 16, alignItems: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24,
  },
  mTitre: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.border, marginRight: 8, backgroundColor: '#fff',
  },
  chipA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 14, fontSize: 16, marginBottom: SPACING.sm,
  },
  btnPri: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 16, alignItems: 'center' },
  cancel: { textAlign: 'center', marginTop: 16, color: COLORS.gray },
});
