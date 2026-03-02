import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Dimensions, Platform,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

/* Web-safe confirm/alert helpers */
const webConfirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: onConfirm },
    ]);
  }
};

const webAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}${message ? '\n\n' + message : ''}`);
  } else {
    Alert.alert(title, message || '');
  }
};

export default function PretsScreen() {
  const { currentUser, peutFaire } = useAuth();
  const { prets, membres, remboursements, accorderPret, rembourserPret, config } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [showRembModal, setShowRembModal] = useState(null); // pret object or null
  const [rembMontant, setRembMontant] = useState('');
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

  // Calculate remaining amount for a loan
  const getReste = (p) => {
    const rembTotal = (remboursements || [])
      .filter(r => r.pret_id === p.id)
      .reduce((s, r) => s + (Number(r.montant) || 0), 0);
    return Math.max(0, (Number(p.montant_a_rembourser) || 0) - rembTotal);
  };

  const simuler = (m, t) => {
    const mt = parseInt(m) || 0;
    const interets = Math.round(mt * (tauxPret / 100) * (t || 1));
    return { interets, total: mt + interets };
  };
  const sim = simuler(montant, nbTrim);

  const handleAccorder = () => {
    if (!selMembre || !montant || parseInt(montant) <= 0) {
      webAlert('Erreur', 'Selectionnez un membre et un montant.');
      return;
    }
    const taux = tauxPret * nbTrim;
    const mt = parseInt(montant);
    webConfirm(
      'Confirmer le pret',
      `Pret de ${formatMontant(mt)} FCFA\nDuree: ${nbTrim} trimestre(s)\nInterets (${tauxPret}%x${nbTrim}): ${formatMontant(sim.interets)} FCFA\nTotal a rembourser: ${formatMontant(sim.total)} FCFA`,
      async () => {
        await accorderPret(selMembre, mt, taux);
        setShowForm(false);
        setMontant('');
        setSelMembre('');
        setNbTrim(1);
        webAlert('Pret accorde', 'Enregistre dans le journal.');
      }
    );
  };

  const openRembourser = (p) => {
    const reste = getReste(p);
    setShowRembModal(p);
    setRembMontant(String(reste));
  };

  const handleRembourser = async () => {
    if (!showRembModal) return;
    const mt = parseInt(rembMontant) || 0;
    if (mt <= 0) {
      webAlert('Erreur', 'Entrez un montant valide.');
      return;
    }
    const reste = getReste(showRembModal);
    if (mt > reste) {
      webAlert('Erreur', `Le montant (${formatMontant(mt)}) depasse le reste a rembourser (${formatMontant(reste)}).`);
      return;
    }
    await rembourserPret(showRembModal.id, mt);
    setShowRembModal(null);
    setRembMontant('');
    webAlert('Remboursement enregistre', `${formatMontant(mt)} FCFA rembourses pour ${getMembreName(showRembModal.membre_id)}.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 100 }, webStyle()]}>
        {/* Totaux */}
        <Card style={{ backgroundColor: COLORS.primary }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: SPACING.sm }}>
            {'\u{1F4CA}'} Prets en cours
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
          {pretsEnCours.map(p => {
            const reste = getReste(p);
            const rembTotal = (Number(p.montant_a_rembourser) || 0) - reste;
            return (
              <Card key={p.id} style={isDesktop ? { width: '48%' } : null}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.darkGray }}>
                      {getMembreName(p.membre_id)}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                      Capital: {formatMontant(p.montant)} - Interets: {formatMontant(p.interet)} FCFA
                    </Text>
                    {rembTotal > 0 && (
                      <Text style={{ fontSize: 11, color: COLORS.secondary, marginTop: 2 }}>
                        Deja rembourse: {formatMontant(rembTotal)} FCFA
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.danger }}>
                      {formatMontant(reste)} F
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
                    onPress={() => openRembourser(p)}
                  >
                    <Text style={{ color: COLORS.secondary, fontWeight: '700' }}>
                      Rembourser
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })}
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

      {/* ═══════════ Modal remboursement ═══════════ */}
      <Modal visible={!!showRembModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modal, isDesktop && { maxWidth: 450, alignSelf: 'center', width: '100%' }]}>
            <Text style={s.mTitre}>{'\u{1F4B0}'} Rembourser un pret</Text>
            {showRembModal && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkGray, marginBottom: 4 }}>
                  {getMembreName(showRembModal.membre_id)}
                </Text>
                <View style={{ backgroundColor: '#FFF3E0', borderRadius: 8, padding: SPACING.sm, marginBottom: SPACING.md }}>
                  <Text style={{ fontSize: 12, color: '#E65100' }}>
                    Capital: {formatMontant(showRembModal.montant)} | Interet: {formatMontant(showRembModal.interet)}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.danger, marginTop: 2 }}>
                    Reste a rembourser: {formatMontant(getReste(showRembModal))} FCFA
                  </Text>
                </View>

                <Text style={s.label}>Montant du remboursement (FCFA)</Text>
                <TextInput
                  style={s.input}
                  keyboardType="numeric"
                  value={rembMontant}
                  onChangeText={setRembMontant}
                  placeholder={String(getReste(showRembModal))}
                />
                <Text style={{ fontSize: 10, color: COLORS.gray, marginTop: -6, marginBottom: SPACING.sm }}>
                  Vous pouvez saisir un remboursement partiel ou total.
                </Text>

                <TouchableOpacity style={s.btnPri} onPress={handleRembourser}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                    {'\u2713'} Confirmer le remboursement
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => { setShowRembModal(null); setRembMontant(''); }}>
              <Text style={s.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════ Modal nouveau pret ═══════════ */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modal, isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
            <Text style={s.mTitre}>{'\u{1F4B3}'} Nouveau pret</Text>
            <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: SPACING.md }}>
              Taux : {tauxPret}% (interet fixe)
            </Text>

            <Text style={s.label}>Beneficiaire</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
              {(membres || []).filter(m => m.actif !== false && m.login !== 'admin').map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.chip, selMembre === m.id && s.chipA]}
                  onPress={() => setSelMembre(m.id)}
                >
                  <Text
                    style={{ fontSize: 11, color: selMembre === m.id ? '#fff' : COLORS.darkGray }}
                    numberOfLines={1}
                  >
                    {m.prenom || (m.nom || '').split(' ')[0]}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, marginHorizontal: 20, maxHeight: '90%',
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
