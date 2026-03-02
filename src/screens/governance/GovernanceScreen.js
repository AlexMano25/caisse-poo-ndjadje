import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle, responsiveColumns } from '../../utils/responsive';

const RL = {
  president: '👑 Presidente', tresorier: '💼 Tresorier',
  secretaire: '📝 Secretaire', membre: '👤 Membre',
};
const BUREAU_COULEURS = {
  president: '#7B2D8B', tresorier: '#1B4332',
  secretaire: '#0D3B66', membre: '#6C757D',
};

const formatDate = (d) => {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('fr-FR');
  } catch { return '--'; }
};

export default function GovernanceScreen() {
  const { currentUser, peutFaire, users, elireBureau } = useAuth();
  const { membres, appliquerSanction, config, seances } = useApp();

  const isBureau = ['president', 'tresorier', 'secretaire', 'superadmin'].includes(currentUser?.role);
  const canElect = peutFaire('elireBureau');

  const [sel, setSel] = useState(null);
  const [showPen, setShowPen] = useState(false);
  const [penAmt, setPenAmt] = useState('');
  const [penReason, setPenReason] = useState('');
  const [showElection, setShowElection] = useState(false);
  const [ePres, setEPres] = useState('');
  const [eTres, setETres] = useState('');
  const [eSec, setESec] = useState('');

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  // Next seance from seances array
  const prochaineSeance = useMemo(() => {
    const today = new Date().toISOString();
    const futures = (seances || []).filter(s => s.date >= today);
    return futures.length > 0 ? futures[0] : null;
  }, [seances]);

  const handleSanction = () => {
    const amt = parseInt(penAmt, 10);
    if (!amt || !penReason.trim()) {
      Alert.alert('Erreur', 'Montant et motif requis.');
      return;
    }
    appliquerSanction(sel.id, amt, penReason);
    setShowPen(false);
    setPenAmt('');
    setPenReason('');
    Alert.alert('Sanction appliquee', amt.toLocaleString('fr-FR') + ' FCFA imputes a ' + sel.nom + '.');
  };

  const handleElire = () => {
    if (!ePres || !eTres || !eSec) {
      Alert.alert('Erreur', 'Designez les 3 postes.');
      return;
    }
    if (new Set([ePres, eTres, eSec]).size < 3) {
      Alert.alert('Erreur', '3 personnes differentes requises.');
      return;
    }
    const nP = (users || []).find(u => u.id === ePres)?.nom || '';
    const nT = (users || []).find(u => u.id === eTres)?.nom || '';
    const nS = (users || []).find(u => u.id === eSec)?.nom || '';
    Alert.alert(
      'Confirmer les elections',
      `Presidente : ${nP}\nTresorier : ${nT}\nSecretaire : ${nS}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider', onPress: () => {
            elireBureau({ president: ePres, tresorier: eTres, secretaire: eSec });
            setShowElection(false);
            Alert.alert('Bureau elu', 'Les droits ont ete mis a jour.');
          },
        },
      ]
    );
  };

  const bureau = (membres || []).filter(m => ['president', 'tresorier', 'secretaire'].includes(m.role));
  const simples = (membres || []).filter(m => m.role === 'membre');
  const candidats = (users || []).filter(u => u.role !== 'superadmin' && u.actif);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 80 }, webStyle()]}>
        {/* Bureau elu */}
        <Text style={s.sec}>🏛️ Bureau de la Caisse</Text>
        <View style={isDesktop ? s.bureauGrid : null}>
          {bureau.map(m => (
            <Card key={m.id} style={[
              { borderLeftWidth: 4, borderLeftColor: BUREAU_COULEURS[m.role] },
              isDesktop && { flex: 1, minWidth: 250 },
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <MemberAvatar member={{ ...m, name: m.nom }} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.darkGray }}>
                    {m.nom}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: BUREAU_COULEURS[m.role] }}>
                    {RL[m.role]}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: BUREAU_COULEURS[m.role], borderRadius: 20,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {m.credit_score}/100
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Election button */}
        {canElect && (
          <TouchableOpacity
            style={s.electionBtn}
            onPress={() => setShowElection(true)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>🗳️ Elire un nouveau bureau</Text>
          </TouchableOpacity>
        )}

        {/* Regles & Charte */}
        <Text style={s.sec}>📜 Reglement interieur</Text>
        <Card style={{ backgroundColor: '#F0FFF4' }}>
          {[
            ['Adhesion', (config?.montant_adhesion ? config.montant_adhesion.toLocaleString('fr-FR') + ' FCFA' : '50 000 FCFA')],
            ['Taux epargne brut', (config?.taux_interet_epargne_brut || '--') + '% / an'],
            ['Taux epargne net', (config?.taux_interet_epargne_net || '--') + '% / an'],
            ['Taux pret', (config?.taux_interet_pret || '--') + '% / trimestre'],
            ['Retenue epargne', (config?.taux_retenue_epargne || '--') + '%'],
            ['Retenue chantier', (config?.taux_retenue_chantier || '--') + '%'],
            ['Prochaine seance', prochaineSeance ? formatDate(prochaineSeance.date) : 'Non programmee'],
          ].map(([k, v], i) => (
            <View key={i} style={{
              flexDirection: 'row', justifyContent: 'space-between',
              paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 13, color: COLORS.gray }}>{k}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkGray }}>{v}</Text>
            </View>
          ))}
        </Card>

        {/* Liste membres */}
        <Text style={s.sec}>👥 Membres ({simples.length})</Text>
        {simples.map(m => (
          <Card key={m.id}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
              <MemberAvatar member={{ ...m, name: m.nom }} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.darkGray }}>
                  {m.nom}
                </Text>
                <CreditScoreBar score={m.credit_score} />
              </View>
              {isBureau && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFF0F0', borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 6,
                    borderWidth: 1, borderColor: COLORS.danger,
                  }}
                  onPress={() => { setSel(m); setShowPen(true); }}
                >
                  <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '700' }}>
                    ⚠️ Sanction
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Modal sanction */}
      <Modal visible={showPen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[s.modalSheet, isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.danger, marginBottom: SPACING.md }}>
              ⚠️ Sanction -- {sel?.nom}
            </Text>
            <TextInput
              style={s.input}
              placeholder="Montant FCFA"
              keyboardType="numeric"
              value={penAmt}
              onChangeText={setPenAmt}
            />
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Motif (ex: absence seance du 26/02/2026)"
              multiline
              value={penReason}
              onChangeText={setPenReason}
            />
            <TouchableOpacity
              style={{ backgroundColor: COLORS.danger, borderRadius: 8, padding: 16, alignItems: 'center' }}
              onPress={handleSanction}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                Appliquer la sanction
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPen(false)}>
              <Text style={{ textAlign: 'center', marginTop: 14, color: COLORS.gray }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal elections */}
      <Modal visible={showElection} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <ScrollView contentContainerStyle={[
            s.modalSheet,
            isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' },
          ]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.md }}>
              🗳️ Elire le bureau
            </Text>
            {[
              ['👑 Presidente/President', ePres, setEPres],
              ['💼 Tresorier(e)', eTres, setETres],
              ['📝 Secretaire', eSec, setESec],
            ].map(([label, val, set], i) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 6 }}>
                  {label}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {candidats.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={[s.chip, val === u.id && s.chipA]}
                      onPress={() => set(u.id)}
                    >
                      <Text style={{ fontSize: 11, color: val === u.id ? '#fff' : COLORS.darkGray }}>
                        {u.prenom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center' }}
              onPress={handleElire}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Valider les elections</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowElection(false)}>
              <Text style={{ textAlign: 'center', marginTop: 14, color: COLORS.gray }}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  sec: {
    fontSize: 15, fontWeight: '700', color: COLORS.darkGray,
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  bureauGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  electionBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: SPACING.sm,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 14, marginBottom: 10, fontSize: 15,
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28,
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff',
  },
  chipA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
});
