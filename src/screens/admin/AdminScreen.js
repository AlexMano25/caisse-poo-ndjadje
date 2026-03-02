import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

const RL = {
  president: '\u{1F451} Presidente', tresorier: '\u{1F4BC} Tresorier',
  secretaire: '\u{1F4DD} Secretaire', membre: '\u{1F464} Membre', superadmin: 'Admin',
};

const MAIN_TABS = [
  { key: 'wizard', label: '\u{1F9D9} Assistant' },
  { key: 'config', label: '\u2699\uFE0F Taux' },
  { key: 'membres', label: '\u{1F465} Membres' },
];

const ANNEES = [2024, 2025, 2026];

const STEPS = [
  { num: 1, label: 'Configuration', icon: '\u2699\uFE0F' },
  { num: 2, label: 'Saisie', icon: '\u{1F4CA}' },
  { num: 3, label: 'Credits', icon: '\u{1F4B3}' },
  { num: 4, label: 'Recapitulatif', icon: '\u{1F4CB}' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminScreen() {
  const { users, creerUtilisateur, adminResetPassword } = useAuth();
  const {
    config, membres, seances, versements, prets, remboursements, sanctions, recap,
    updateConfig, ajouterVersement, accorderPret, rembourserPret,
    ajouterSeance, appliquerSanction, publierRapport, refreshAll,
  } = useApp();

  const [tab, setTab] = useState('wizard');
  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  // ═══════════════════ WIZARD STATE ═══════════════════
  const [wizStep, setWizStep] = useState(1);
  const [wizYear, setWizYear] = useState(config?.annee_courante || 2025);
  const [wizSeanceId, setWizSeanceId] = useState(null);
  const [wizNewDate, setWizNewDate] = useState('');
  const [wizNewDesc, setWizNewDesc] = useState('');
  const [wizCotisDefaut, setWizCotisDefaut] = useState('100000');
  const [wizData, setWizData] = useState({});
  const [wizNewLoans, setWizNewLoans] = useState([]);
  const [wizLoanMembre, setWizLoanMembre] = useState('');
  const [wizLoanMontant, setWizLoanMontant] = useState('');
  const [wizNotes, setWizNotes] = useState('');
  const [wizSaving, setWizSaving] = useState(false);

  // ═══════════════════ CONFIG STATE ═══════════════════
  const [txEpBrut, setTxEpBrut] = useState('');
  const [txEpNet, setTxEpNet] = useState('');
  const [txRetEp, setTxRetEp] = useState('');
  const [txPret, setTxPret] = useState('');
  const [txRetCh, setTxRetCh] = useState('');
  const [montAdh, setMontAdh] = useState('');
  const [modeRetenue, setModeRetenue] = useState('unique');
  const [anneeCourante, setAnneeCourante] = useState('');

  useEffect(() => {
    if (config) {
      setTxEpBrut(String(config.taux_interet_epargne_brut ?? '7.5'));
      setTxEpNet(String(config.taux_interet_epargne_net ?? '6.0'));
      setTxRetEp(String(config.taux_retenue_epargne ?? '1.5'));
      setTxPret(String(config.taux_interet_pret ?? '7.5'));
      setTxRetCh(String(config.taux_retenue_chantier ?? '0'));
      setMontAdh(String(config.montant_adhesion ?? '50000'));
      setModeRetenue(config.mode_retenue || 'unique');
      setAnneeCourante(String(config.annee_courante ?? new Date().getFullYear()));
    }
  }, [config]);

  // ═══════════════════ MEMBRES MODAL STATE ═══════════════════
  const [showNewMember, setShowNewMember] = useState(false);
  const [nPrenom, setNPrenom] = useState('');
  const [nNom, setNNom] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nTel, setNTel] = useState('');

  // ═══════════════════ DERIVED DATA ═══════════════════
  const activeMembres = useMemo(() => {
    return (membres || []).filter(m => m.actif !== false)
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [membres]);

  const seancesForYear = useMemo(() => {
    return (seances || []).filter(s => s.annee === wizYear)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [seances, wizYear]);

  // Reliquat: remaining loan balance per member
  const reliquatPerMember = useMemo(() => {
    const map = {};
    (prets || []).filter(p => p.statut === 'en_cours').forEach(p => {
      const rembTotal = (remboursements || [])
        .filter(r => r.pret_id === p.id)
        .reduce((s, r) => s + (Number(r.montant) || 0), 0);
      const reste = (Number(p.montant_a_rembourser) || 0) - rembTotal;
      if (reste > 0) {
        if (!map[p.membre_id]) map[p.membre_id] = { total: 0, prets: [] };
        map[p.membre_id].total += reste;
        map[p.membre_id].prets.push({ ...p, reste });
      }
    });
    return map;
  }, [prets, remboursements]);

  // Initialize wizard spreadsheet data when seance is selected
  useEffect(() => {
    if (!wizSeanceId || activeMembres.length === 0) return;
    const data = {};
    activeMembres.forEach(m => {
      const existCotis = (versements || []).find(v =>
        v.membre_id === m.id && v.seance_id === wizSeanceId && v.type === 'contribution'
      );
      const existEpargne = (versements || []).find(v =>
        v.membre_id === m.id && v.seance_id === wizSeanceId && (v.type === 'epargne' || !v.type)
      );
      data[m.id] = {
        cotisation: existCotis ? String(existCotis.montant) : wizCotisDefaut,
        epargne: existEpargne ? String(existEpargne.montant) : '',
        remboursement: '',
        sanction: '',
        sanctionMotif: '',
      };
    });
    setWizData(data);
  }, [wizSeanceId]);

  // Wizard totals
  const wizTotals = useMemo(() => {
    let totalCotis = 0, totalEpargne = 0, totalRemb = 0, totalSanctions = 0;
    Object.values(wizData).forEach(d => {
      totalCotis += parseInt(d.cotisation) || 0;
      totalEpargne += parseInt(d.epargne) || 0;
      totalRemb += parseInt(d.remboursement) || 0;
      totalSanctions += parseInt(d.sanction) || 0;
    });
    const totalNewLoans = wizNewLoans.reduce((s, l) => s + (parseInt(l.montant) || 0), 0);
    const totalCollecte = totalCotis + totalEpargne + totalRemb + totalSanctions;
    return {
      totalCotis, totalEpargne, totalRemb, totalSanctions,
      totalCollecte, totalNewLoans,
      solde: totalCollecte - totalNewLoans,
    };
  }, [wizData, wizNewLoans]);

  // Fond disponible (from recap)
  const fondDisponible = useMemo(() => {
    const totalSoldes = recap?.totalSoldes || 0;
    const totalARembourser = recap?.totalARembourser || 0;
    return Math.max(0, totalSoldes - totalARembourser);
  }, [recap]);

  // ═══════════════════ HELPERS ═══════════════════
  const getMembreName = useCallback((membreId) => {
    const m = (membres || []).find(mb => mb.id === membreId);
    if (m) return `${m.prenom || ''} ${m.nom || ''}`.trim() || m.login || 'Inconnu';
    return 'Inconnu';
  }, [membres]);

  const getMembreShort = useCallback((membreId) => {
    const m = (membres || []).find(mb => mb.id === membreId);
    return m?.prenom || (m?.nom || '').split(' ')[0] || '--';
  }, [membres]);

  const formatSeanceDate = (dateStr) => {
    try { return new Date(dateStr).toLocaleDateString('fr-FR'); }
    catch { return dateStr || '--'; }
  };

  // ═══════════════════ WIZARD HANDLERS ═══════════════════
  const handleCreateSeance = async () => {
    if (!wizNewDate.trim()) {
      Alert.alert('Erreur', 'Entrez une date (ex: 2025-03-15).');
      return;
    }
    await ajouterSeance(wizNewDate.trim(), wizYear, wizNewDesc.trim() || null);
    setWizNewDate('');
    setWizNewDesc('');
    Alert.alert('Seance creee', 'Selectionnez-la dans la liste ci-dessous.');
  };

  const handleWizChange = (membreId, field, value) => {
    setWizData(prev => ({
      ...prev,
      [membreId]: { ...(prev[membreId] || {}), [field]: value },
    }));
  };

  const handleGoStep2 = () => {
    if (!wizSeanceId) {
      Alert.alert('Erreur', 'Selectionnez ou creez une seance d\'abord.');
      return;
    }
    setWizStep(2);
  };

  const handleAddLoan = () => {
    if (!wizLoanMembre || !wizLoanMontant || parseInt(wizLoanMontant) <= 0) {
      Alert.alert('Erreur', 'Selectionnez un membre et un montant valide.');
      return;
    }
    const taux = config?.taux_interet_pret || 7.5;
    const mt = parseInt(wizLoanMontant);
    const interet = Math.round(mt * taux / 100);
    setWizNewLoans(prev => [...prev, {
      membreId: wizLoanMembre, montant: mt, taux, interet, total: mt + interet,
    }]);
    setWizLoanMembre('');
    setWizLoanMontant('');
  };

  const handleRemoveLoan = (idx) => {
    setWizNewLoans(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCloturer = () => {
    if (wizSaving) return;
    Alert.alert(
      'Cloturer la seance ?',
      `Total collecte : ${formatMontant(wizTotals.totalCollecte)} FCFA\nTotal decaisse : ${formatMontant(wizTotals.totalNewLoans)} FCFA\nSolde : ${formatMontant(wizTotals.solde)} FCFA\n\nCette action est irreversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Cloturer', style: 'destructive', onPress: doCloturer },
      ]
    );
  };

  const doCloturer = async () => {
    setWizSaving(true);
    try {
      const promises = [];

      for (const m of activeMembres) {
        const d = wizData[m.id] || {};
        const cotis = parseInt(d.cotisation) || 0;
        const epargne = parseInt(d.epargne) || 0;
        const remb = parseInt(d.remboursement) || 0;
        const sanction = parseInt(d.sanction) || 0;

        // Avoid duplicates
        const existCotis = (versements || []).find(v =>
          v.membre_id === m.id && v.seance_id === wizSeanceId && v.type === 'contribution'
        );
        const existEpargne = (versements || []).find(v =>
          v.membre_id === m.id && v.seance_id === wizSeanceId && (v.type === 'epargne' || !v.type)
        );

        if (cotis > 0 && !existCotis) {
          promises.push(ajouterVersement(m.id, wizSeanceId, cotis, 'contribution', wizYear));
        }
        if (epargne > 0 && !existEpargne) {
          promises.push(ajouterVersement(m.id, wizSeanceId, epargne, 'epargne', wizYear));
        }
        if (remb > 0) {
          const memberLoans = reliquatPerMember[m.id]?.prets || [];
          if (memberLoans.length > 0) {
            promises.push(rembourserPret(memberLoans[0].id, remb));
          }
        }
        if (sanction > 0) {
          promises.push(appliquerSanction(m.id, sanction, d.sanctionMotif || 'Sanction seance'));
        }
      }

      for (const loan of wizNewLoans) {
        const seanceObj = seancesForYear.find(s => s.id === wizSeanceId);
        promises.push(accorderPret(loan.membreId, loan.montant, loan.taux, seanceObj?.date || new Date().toISOString()));
      }

      // Save PV notes as rapport
      if (wizNotes.trim()) {
        promises.push(publierRapport(
          `PV Seance ${formatSeanceDate(seancesForYear.find(s => s.id === wizSeanceId)?.date)}`,
          wizNotes.trim(),
          wizSeanceId,
        ));
      }

      await Promise.all(promises);
      await refreshAll();

      Alert.alert(
        'Seance cloturee !',
        `${promises.length} operations enregistrees avec succes.`
      );

      // Reset wizard
      setWizStep(1);
      setWizSeanceId(null);
      setWizData({});
      setWizNewLoans([]);
      setWizNotes('');
    } catch (err) {
      console.error('[AdminScreen] cloturer error:', err);
      Alert.alert('Erreur', err.message || 'Echec de la cloture de la seance.');
    } finally {
      setWizSaving(false);
    }
  };

  // ═══════════════════ CONFIG HANDLER ═══════════════════
  const handleSaveConfig = async () => {
    const data = {
      taux_interet_epargne_brut: parseFloat(txEpBrut) || 0,
      taux_interet_epargne_net: parseFloat(txEpNet) || 0,
      taux_retenue_epargne: parseFloat(txRetEp) || 0,
      taux_interet_pret: parseFloat(txPret) || 0,
      taux_retenue_chantier: parseFloat(txRetCh) || 0,
      montant_adhesion: parseInt(montAdh) || 0,
      mode_retenue: modeRetenue,
      annee_courante: parseInt(anneeCourante) || new Date().getFullYear(),
    };
    await updateConfig(data);
    Alert.alert('Configuration sauvegardee',
      `Taux epargne brut: ${txEpBrut}%\nTaux pret: ${txPret}%\nAdhesion: ${montAdh} FCFA`
    );
  };

  // ═══════════════════ MEMBRE HANDLER ═══════════════════
  const handleCreerMembre = async () => {
    if (!nPrenom.trim() || !nNom.trim()) {
      Alert.alert('Erreur', 'Prenom et Nom requis.');
      return;
    }
    const u = await creerUtilisateur({
      prenom: nPrenom.trim(),
      nom: nNom.trim() + ' ' + nPrenom.trim(),
      email: nEmail.trim() || nPrenom.toLowerCase().trim() + '@poo-ndjadje.cm',
      telephone: nTel.trim(),
    });
    setShowNewMember(false);
    setNPrenom(''); setNNom(''); setNEmail(''); setNTel('');
    if (u) Alert.alert('Membre cree', 'Login : ' + u.login + '\nMot de passe : 123456');
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* ─── Main Tabs ─── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabsBar}>
        <View style={st.tabsRow}>
          {MAIN_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[st.mainTab, tab === t.key && st.mainTabA]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[st.mainTabT, tab === t.key && { color: COLORS.primary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 120 }, webStyle()]}>

        {/* ═══════════════════ WIZARD TAB ═══════════════════ */}
        {tab === 'wizard' && (
          <>
            <Text style={st.pageTitle}>{'\u{1F9D9}'} Assistant de Seance</Text>
            <Text style={st.pageSub}>
              Saisissez les donnees financieres etape par etape
            </Text>

            {/* Step indicator */}
            <View style={st.stepBar}>
              {STEPS.map((s, i) => (
                <TouchableOpacity
                  key={s.num}
                  style={[
                    st.stepItem,
                    wizStep === s.num && st.stepItemActive,
                    wizStep > s.num && st.stepItemDone,
                  ]}
                  onPress={() => {
                    if (s.num <= wizStep || (s.num === 2 && wizSeanceId)) setWizStep(s.num);
                  }}
                  disabled={s.num > wizStep && !(s.num === 2 && wizSeanceId)}
                >
                  <View style={[
                    st.stepCircle,
                    wizStep === s.num && st.stepCircleActive,
                    wizStep > s.num && st.stepCircleDone,
                  ]}>
                    <Text style={[
                      st.stepNum,
                      (wizStep === s.num || wizStep > s.num) && { color: '#fff' },
                    ]}>
                      {wizStep > s.num ? '\u2713' : s.num}
                    </Text>
                  </View>
                  <Text style={[
                    st.stepLabel,
                    wizStep === s.num && { color: COLORS.primary, fontWeight: '700' },
                    wizStep > s.num && { color: COLORS.secondary },
                  ]} numberOfLines={1}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ──────── STEP 1: CONFIGURATION ──────── */}
            {wizStep === 1 && (
              <>
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u2699\uFE0F'} Configuration de la seance</Text>

                  {/* Year selector */}
                  <Text style={st.fieldLabel}>Annee</Text>
                  <View style={st.chipRow}>
                    {ANNEES.map(a => (
                      <TouchableOpacity
                        key={a}
                        style={[st.yearChip, wizYear === a && st.yearChipA]}
                        onPress={() => { setWizYear(a); setWizSeanceId(null); }}
                      >
                        <Text style={{
                          fontSize: 13, fontWeight: '700',
                          color: wizYear === a ? '#fff' : COLORS.darkGray,
                        }}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Seance selector */}
                  <Text style={st.fieldLabel}>Seance ({seancesForYear.length} disponible{seancesForYear.length > 1 ? 's' : ''})</Text>
                  {seancesForYear.length > 0 ? (
                    <View style={{ gap: 6, marginBottom: SPACING.sm }}>
                      {seancesForYear.map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            st.seanceItem,
                            wizSeanceId === s.id && st.seanceItemA,
                          ]}
                          onPress={() => setWizSeanceId(s.id)}
                        >
                          <Text style={{
                            fontSize: 14, fontWeight: '600',
                            color: wizSeanceId === s.id ? '#fff' : COLORS.darkGray,
                          }}>
                            {formatSeanceDate(s.date)}
                          </Text>
                          {s.description ? (
                            <Text style={{
                              fontSize: 11,
                              color: wizSeanceId === s.id ? 'rgba(255,255,255,0.8)' : COLORS.gray,
                            }}>{s.description}</Text>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: SPACING.sm }}>
                      Aucune seance pour {wizYear}. Creez-en une ci-dessous.
                    </Text>
                  )}

                  {/* Create new seance */}
                  <View style={st.createSeanceBox}>
                    <Text style={st.miniTitle}>Nouvelle seance</Text>
                    <TextInput
                      style={st.input}
                      placeholder="Date (ex: 2025-03-15)"
                      value={wizNewDate}
                      onChangeText={setWizNewDate}
                      placeholderTextColor={COLORS.gray}
                    />
                    <TextInput
                      style={st.input}
                      placeholder="Description (optionnel)"
                      value={wizNewDesc}
                      onChangeText={setWizNewDesc}
                      placeholderTextColor={COLORS.gray}
                    />
                    <TouchableOpacity style={st.btnSec} onPress={handleCreateSeance}>
                      <Text style={{ color: COLORS.secondary, fontWeight: '700', fontSize: 13 }}>
                        + Creer la seance
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Default cotisation */}
                  <Text style={[st.fieldLabel, { marginTop: SPACING.md }]}>
                    Cotisation par defaut (FCFA)
                  </Text>
                  <TextInput
                    style={st.input}
                    keyboardType="numeric"
                    placeholder="ex: 100000"
                    value={wizCotisDefaut}
                    onChangeText={setWizCotisDefaut}
                  />
                </Card>

                {/* Next button */}
                <TouchableOpacity
                  style={[st.btnPri, { marginTop: SPACING.md }]}
                  onPress={handleGoStep2}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                    Suivant \u2192 Tableau de saisie
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ──────── STEP 2: TABLEAU DE SAISIE (EXCEL) ──────── */}
            {wizStep === 2 && (
              <>
                <Card style={{ marginTop: SPACING.md, padding: 0, overflow: 'hidden' }}>
                  <View style={{ padding: SPACING.sm, backgroundColor: '#F8FAF9' }}>
                    <Text style={st.cardTitle}>
                      {'\u{1F4CA}'} Tableau de saisie — {formatSeanceDate(seancesForYear.find(s => s.id === wizSeanceId)?.date)}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>
                      Modifiez les montants directement dans le tableau
                    </Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      {/* Header */}
                      <View style={st.tRow}>
                        <View style={[st.tCell, st.tNameCell, st.tHeader]}>
                          <Text style={st.tHeaderT}>Membre</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHeaderT}>Cotisation</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHeaderT}>Epargne</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHeaderT}>Remb.Credit</Text>
                        </View>
                        <View style={[st.tCell, st.tReliquatCell, st.tHeader, { backgroundColor: '#8B0000' }]}>
                          <Text style={st.tHeaderT}>Reliquat</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHeaderT}>Sanctions</Text>
                        </View>
                        <View style={[st.tCell, st.tTotalCell, st.tHeader]}>
                          <Text style={st.tHeaderT}>Total</Text>
                        </View>
                      </View>

                      {/* Data rows */}
                      {activeMembres.map((m, idx) => {
                        const d = wizData[m.id] || {};
                        const reliquat = reliquatPerMember[m.id]?.total || 0;
                        const rowTotal = (parseInt(d.cotisation) || 0)
                          + (parseInt(d.epargne) || 0)
                          + (parseInt(d.remboursement) || 0)
                          + (parseInt(d.sanction) || 0);
                        return (
                          <View
                            key={m.id}
                            style={[st.tRow, { backgroundColor: idx % 2 === 0 ? '#fff' : '#F8FAF9' }]}
                          >
                            {/* Name */}
                            <View style={[st.tCell, st.tNameCell]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MemberAvatar member={{ ...m, name: m.nom }} size={22} />
                                <Text style={{ fontSize: 11, color: COLORS.darkGray, flex: 1 }} numberOfLines={1}>
                                  {m.prenom || (m.nom || '').split(' ')[0]}
                                </Text>
                              </View>
                            </View>
                            {/* Cotisation */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                style={st.tInput}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#ccc"
                                value={d.cotisation || ''}
                                onChangeText={v => handleWizChange(m.id, 'cotisation', v)}
                              />
                            </View>
                            {/* Epargne */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                style={st.tInput}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#ccc"
                                value={d.epargne || ''}
                                onChangeText={v => handleWizChange(m.id, 'epargne', v)}
                              />
                            </View>
                            {/* Remboursement Credit */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                style={[st.tInput, reliquat > 0 && { borderColor: COLORS.danger }]}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#ccc"
                                value={d.remboursement || ''}
                                onChangeText={v => handleWizChange(m.id, 'remboursement', v)}
                              />
                            </View>
                            {/* Reliquat (read-only) */}
                            <View style={[st.tCell, st.tReliquatCell]}>
                              <Text style={{
                                fontSize: 11, fontWeight: '700', textAlign: 'center',
                                color: reliquat > 0 ? COLORS.danger : COLORS.gray,
                              }}>
                                {reliquat > 0 ? formatMontant(reliquat) : '-'}
                              </Text>
                            </View>
                            {/* Sanctions */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                style={st.tInput}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#ccc"
                                value={d.sanction || ''}
                                onChangeText={v => handleWizChange(m.id, 'sanction', v)}
                              />
                            </View>
                            {/* Row total */}
                            <View style={[st.tCell, st.tTotalCell]}>
                              <Text style={{
                                fontSize: 11, fontWeight: '700', textAlign: 'center',
                                color: COLORS.primary,
                              }}>
                                {formatMontant(rowTotal)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* TOTALS ROW */}
                      <View style={[st.tRow, { backgroundColor: COLORS.primary }]}>
                        <View style={[st.tCell, st.tNameCell]}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>TOTAL</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotalT}>{formatMontant(wizTotals.totalCotis)}</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotalT}>{formatMontant(wizTotals.totalEpargne)}</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotalT}>{formatMontant(wizTotals.totalRemb)}</Text>
                        </View>
                        <View style={[st.tCell, st.tReliquatCell]}>
                          <Text style={st.tTotalT}>
                            {formatMontant(Object.values(reliquatPerMember).reduce((s, r) => s + r.total, 0))}
                          </Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotalT}>{formatMontant(wizTotals.totalSanctions)}</Text>
                        </View>
                        <View style={[st.tCell, st.tTotalCell]}>
                          <Text style={[st.tTotalT, { fontWeight: '800', fontSize: 12 }]}>
                            {formatMontant(wizTotals.totalCollecte)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                </Card>

                {/* Summary mini-cards */}
                <View style={[st.summaryRow, { marginTop: SPACING.md }]}>
                  <View style={[st.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Cotisations</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary }}>
                      {formatMontant(wizTotals.totalCotis)} F
                    </Text>
                  </View>
                  <View style={[st.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Epargne</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1565C0' }}>
                      {formatMontant(wizTotals.totalEpargne)} F
                    </Text>
                  </View>
                  <View style={[st.summaryCard, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Remboursements</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#E65100' }}>
                      {formatMontant(wizTotals.totalRemb)} F
                    </Text>
                  </View>
                </View>

                {/* Navigation */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: SPACING.md }}>
                  <TouchableOpacity
                    style={[st.btnOutline, { flex: 1 }]}
                    onPress={() => setWizStep(1)}
                  >
                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{'\u2190'} Retour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[st.btnPri, { flex: 2 }]}
                    onPress={() => setWizStep(3)}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      Suivant \u2192 Credits
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ──────── STEP 3: CREDITS ACCORDES ──────── */}
            {wizStep === 3 && (
              <>
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F4B3}'} Credits accordes lors de cette seance</Text>

                  {/* Fund info */}
                  <View style={[st.infoBox, { backgroundColor: '#E8F5E9', marginBottom: SPACING.md }]}>
                    <Text style={{ fontSize: 12, color: COLORS.gray }}>
                      Fond disponible (estim.)
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>
                      {formatMontant(fondDisponible)} FCFA
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
                      Collecte ce jour : {formatMontant(wizTotals.totalCollecte)} FCFA
                    </Text>
                  </View>

                  {/* New loan form */}
                  <Text style={st.fieldLabel}>Beneficiaire</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
                    {activeMembres.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={[st.chip, wizLoanMembre === m.id && st.chipA]}
                        onPress={() => setWizLoanMembre(m.id)}
                      >
                        <Text style={{
                          fontSize: 11,
                          color: wizLoanMembre === m.id ? '#fff' : COLORS.darkGray,
                        }} numberOfLines={1}>
                          {m.prenom || (m.nom || '').split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={st.fieldLabel}>Montant du credit (FCFA)</Text>
                  <TextInput
                    style={st.input}
                    keyboardType="numeric"
                    placeholder="ex: 500000"
                    value={wizLoanMontant}
                    onChangeText={setWizLoanMontant}
                  />

                  {parseInt(wizLoanMontant) > 0 && (
                    <View style={[st.infoBox, { backgroundColor: '#FFF3E0', marginBottom: SPACING.sm }]}>
                      <Text style={{ fontSize: 12, color: '#E65100' }}>
                        Taux : {config?.taux_interet_pret || 7.5}% {'\u2192'} Interets : {formatMontant(Math.round((parseInt(wizLoanMontant) || 0) * (config?.taux_interet_pret || 7.5) / 100))} FCFA
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 2 }}>
                        Total a rembourser : {formatMontant(Math.round((parseInt(wizLoanMontant) || 0) * (1 + (config?.taux_interet_pret || 7.5) / 100)))} FCFA
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity style={st.btnSec} onPress={handleAddLoan}>
                    <Text style={{ color: COLORS.secondary, fontWeight: '700' }}>
                      + Ajouter ce credit
                    </Text>
                  </TouchableOpacity>
                </Card>

                {/* List of new loans */}
                {wizNewLoans.length > 0 && (
                  <>
                    <Text style={[st.sectionTitle, { marginTop: SPACING.md }]}>
                      Credits a accorder ({wizNewLoans.length})
                    </Text>
                    {wizNewLoans.map((loan, i) => (
                      <Card key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.darkGray }}>
                            {getMembreName(loan.membreId)}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>
                            Capital: {formatMontant(loan.montant)} + Int: {formatMontant(loan.interet)} = {formatMontant(loan.total)} FCFA
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveLoan(i)}
                          style={{ padding: 8 }}
                        >
                          <Text style={{ color: COLORS.danger, fontSize: 18 }}>{'\u2716'}</Text>
                        </TouchableOpacity>
                      </Card>
                    ))}
                    <View style={[st.infoBox, { backgroundColor: '#FFEBEE', marginTop: SPACING.sm }]}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.danger }}>
                        Total decaissements : {formatMontant(wizTotals.totalNewLoans)} FCFA
                      </Text>
                    </View>
                  </>
                )}

                {/* Existing active loans */}
                <Text style={[st.sectionTitle, { marginTop: SPACING.lg }]}>
                  Prets en cours ({(prets || []).filter(p => p.statut === 'en_cours').length})
                </Text>
                {(prets || []).filter(p => p.statut === 'en_cours').map(p => {
                  const rembTotal = (remboursements || [])
                    .filter(r => r.pret_id === p.id)
                    .reduce((s, r) => s + (Number(r.montant) || 0), 0);
                  const reste = (Number(p.montant_a_rembourser) || 0) - rembTotal;
                  return (
                    <Card key={p.id} style={{ paddingVertical: SPACING.sm }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.darkGray }}>
                          {getMembreName(p.membre_id)}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.danger }}>
                          {formatMontant(reste)} F
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, color: COLORS.gray }}>
                        Capital: {formatMontant(p.montant)} | Int: {formatMontant(p.interet)} | Rembourse: {formatMontant(rembTotal)}
                      </Text>
                    </Card>
                  );
                })}

                {/* Navigation */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: SPACING.lg }}>
                  <TouchableOpacity
                    style={[st.btnOutline, { flex: 1 }]}
                    onPress={() => setWizStep(2)}
                  >
                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{'\u2190'} Saisie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[st.btnPri, { flex: 2 }]}
                    onPress={() => setWizStep(4)}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      Suivant \u2192 Recapitulatif
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ──────── STEP 4: RECAPITULATIF & PV ──────── */}
            {wizStep === 4 && (
              <>
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F4CB}'} Recapitulatif de la seance</Text>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: SPACING.md }}>
                    Seance du {formatSeanceDate(seancesForYear.find(s => s.id === wizSeanceId)?.date)} - Annee {wizYear}
                  </Text>

                  {/* Summary table */}
                  <View style={st.pvTable}>
                    <View style={st.pvRow}>
                      <Text style={st.pvLabel}>Cotisations</Text>
                      <Text style={st.pvValue}>{formatMontant(wizTotals.totalCotis)} FCFA</Text>
                    </View>
                    <View style={st.pvRow}>
                      <Text style={st.pvLabel}>Epargne</Text>
                      <Text style={st.pvValue}>{formatMontant(wizTotals.totalEpargne)} FCFA</Text>
                    </View>
                    <View style={st.pvRow}>
                      <Text style={st.pvLabel}>Remboursements credit</Text>
                      <Text style={st.pvValue}>{formatMontant(wizTotals.totalRemb)} FCFA</Text>
                    </View>
                    <View style={st.pvRow}>
                      <Text style={st.pvLabel}>Sanctions / Amendes</Text>
                      <Text style={st.pvValue}>{formatMontant(wizTotals.totalSanctions)} FCFA</Text>
                    </View>
                    <View style={[st.pvRow, { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 8 }]}>
                      <Text style={[st.pvLabel, { fontWeight: '800', color: COLORS.primary }]}>
                        TOTAL COLLECTE
                      </Text>
                      <Text style={[st.pvValue, { fontWeight: '800', color: COLORS.primary, fontSize: 16 }]}>
                        {formatMontant(wizTotals.totalCollecte)} FCFA
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm }} />

                    <View style={st.pvRow}>
                      <Text style={st.pvLabel}>Credits accordes ({wizNewLoans.length})</Text>
                      <Text style={[st.pvValue, { color: COLORS.danger }]}>
                        -{formatMontant(wizTotals.totalNewLoans)} FCFA
                      </Text>
                    </View>

                    <View style={[st.pvRow, {
                      backgroundColor: wizTotals.solde >= 0 ? '#E8F5E9' : '#FFEBEE',
                      borderRadius: 8, padding: 8, marginTop: 4,
                    }]}>
                      <Text style={[st.pvLabel, { fontWeight: '800' }]}>SOLDE NET</Text>
                      <Text style={[st.pvValue, {
                        fontWeight: '800', fontSize: 18,
                        color: wizTotals.solde >= 0 ? COLORS.primary : COLORS.danger,
                      }]}>
                        {formatMontant(wizTotals.solde)} FCFA
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Detail by member */}
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F465}'} Detail par membre</Text>
                  {activeMembres.map(m => {
                    const d = wizData[m.id] || {};
                    const total = (parseInt(d.cotisation) || 0) + (parseInt(d.epargne) || 0)
                      + (parseInt(d.remboursement) || 0) + (parseInt(d.sanction) || 0);
                    if (total === 0) return null;
                    return (
                      <View key={m.id} style={st.pvMemberRow}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.darkGray, flex: 1 }}>
                          {m.prenom || (m.nom || '').split(' ')[0]}
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700' }}>
                          {formatMontant(total)} F
                        </Text>
                      </View>
                    );
                  })}
                </Card>

                {/* PV Notes */}
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F4DD}'} Notes / Proces-verbal</Text>
                  <TextInput
                    style={[st.input, { height: 100, textAlignVertical: 'top' }]}
                    multiline
                    numberOfLines={5}
                    placeholder="Resume de la seance, decisions prises, observations..."
                    value={wizNotes}
                    onChangeText={setWizNotes}
                    placeholderTextColor={COLORS.gray}
                  />
                </Card>

                {/* Navigation & Close */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: SPACING.md }}>
                  <TouchableOpacity
                    style={[st.btnOutline, { flex: 1 }]}
                    onPress={() => setWizStep(3)}
                  >
                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{'\u2190'} Credits</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[st.btnDanger, { marginTop: SPACING.md }]}
                  onPress={handleCloturer}
                  disabled={wizSaving}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                    {wizSaving ? 'Enregistrement...' : '\u{1F512} Cloturer et Enregistrer la Seance'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ═══════════════════ CONFIG TAB ═══════════════════ */}
        {tab === 'config' && (
          <>
            <Text style={st.pageTitle}>{'\u2699\uFE0F'} Configuration des taux</Text>
            <Card>
              {[
                ['Taux interet epargne brut (%)', txEpBrut, setTxEpBrut],
                ['Taux interet epargne net (%)', txEpNet, setTxEpNet],
                ['Taux retenue epargne (%)', txRetEp, setTxRetEp],
                ['Taux interet pret (%)', txPret, setTxPret],
                ['Taux retenue chantier (%)', txRetCh, setTxRetCh],
                ['Montant adhesion (FCFA)', montAdh, setMontAdh],
                ['Annee courante', anneeCourante, setAnneeCourante],
              ].map(([label, val, setter], i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>{label}</Text>
                  <TextInput
                    style={st.input}
                    keyboardType="decimal-pad"
                    value={val}
                    onChangeText={setter}
                  />
                </View>
              ))}

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Mode retenue</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['unique', 'par_seance'].map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[st.modeBtn, modeRetenue === mode && st.modeBtnA]}
                      onPress={() => setModeRetenue(mode)}
                    >
                      <Text style={{
                        fontSize: 13, fontWeight: '600',
                        color: modeRetenue === mode ? '#fff' : COLORS.darkGray,
                      }}>
                        {mode === 'unique' ? 'Unique' : 'Par seance'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={st.btnPri} onPress={handleSaveConfig}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Enregistrer la configuration</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}

        {/* ═══════════════════ MEMBRES TAB ═══════════════════ */}
        {tab === 'membres' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={st.pageTitle}>{'\u{1F465}'} Membres ({(users || []).length})</Text>
              <TouchableOpacity
                style={[st.btnPri, { paddingHorizontal: 16, paddingVertical: 10 }]}
                onPress={() => setShowNewMember(true)}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Nouveau</Text>
              </TouchableOpacity>
            </View>

            {(users || []).map(u => (
              <Card key={u.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <MemberAvatar member={{ ...u, name: u.nom }} size={38} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkGray }}>{u.nom}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.secondary }}>
                    {RL[u.role] || u.role} - @{u.login}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <View style={{
                    backgroundColor: u.actif ? '#D4EDDA' : '#F8D7DA',
                    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                  }}>
                    <Text style={{
                      fontSize: 9, fontWeight: '700',
                      color: u.actif ? '#155724' : '#721C24',
                    }}>
                      {u.actif ? 'ACTIF' : 'INACTIF'}
                    </Text>
                  </View>
                  {u.mustChangePassword && (
                    <Text style={{ fontSize: 9, color: COLORS.accent }}>mdp defaut</Text>
                  )}
                  {u.role !== 'superadmin' && (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          'Reset mot de passe',
                          `Reinitialiser le mot de passe de ${u.nom} ?`,
                          [
                            { text: 'Non', style: 'cancel' },
                            {
                              text: 'Oui', onPress: async () => {
                                await adminResetPassword(u.id, '123456');
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={{ fontSize: 9, color: COLORS.secondary }}>Reset mdp</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* ═══════════════════ MODAL NOUVEAU MEMBRE ═══════════════════ */}
      <Modal visible={showNewMember} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.modalSheet, isDesktop && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.md }}>
              Nouveau membre
            </Text>
            {[
              ['Prenom *', nPrenom, setNPrenom, 'words'],
              ['Nom de famille *', nNom, setNNom, 'words'],
              ['Email', nEmail, setNEmail, 'email-address'],
              ['Telephone', nTel, setNTel, 'phone-pad'],
            ].map(([ph, v, sv, kbT], i) => (
              <TextInput
                key={i}
                style={st.input}
                placeholder={ph}
                value={v}
                onChangeText={sv}
                keyboardType={kbT !== 'words' ? kbT : 'default'}
                autoCapitalize={kbT === 'words' ? 'words' : 'none'}
              />
            ))}
            <View style={{ backgroundColor: '#FFF3CD', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#856404' }}>
                Login = prenom (minuscules) - Mot de passe par defaut : 123456
              </Text>
            </View>
            <TouchableOpacity style={st.btnPri} onPress={handleCreerMembre}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Creer le compte</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNewMember(false)}>
              <Text style={{ textAlign: 'center', marginTop: 14, color: COLORS.gray }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  // ─── Tabs ───
  tabsBar: {
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 50,
  },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 4 },
  mainTab: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  mainTabA: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  mainTabT: { fontSize: 13, color: COLORS.gray, fontWeight: '600' },

  // ─── Page ───
  pageTitle: { fontSize: 17, fontWeight: '800', color: COLORS.darkGray, marginBottom: 2 },
  pageSub: { fontSize: 12, color: COLORS.gray, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray, marginBottom: SPACING.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  miniTitle: { fontSize: 13, fontWeight: '700', color: COLORS.darkGray, marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 6 },

  // ─── Step indicator ───
  stepBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  stepItem: {
    flex: 1, alignItems: 'center', paddingVertical: 4,
  },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E9ECEF', justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepCircleDone: { backgroundColor: COLORS.secondary },
  stepNum: { fontSize: 12, fontWeight: '700', color: COLORS.gray },
  stepLabel: { fontSize: 10, color: COLORS.gray, textAlign: 'center' },

  // ─── Inputs ───
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, fontSize: 14, marginBottom: 8, backgroundColor: '#FAFAFA',
  },

  // ─── Chips ───
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: SPACING.sm },
  yearChip: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff',
  },
  yearChipA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: '#fff',
  },
  chipA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  // ─── Seance selector ───
  seanceItem: {
    padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  seanceItemA: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primary,
  },

  // ─── Create seance box ───
  createSeanceBox: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: SPACING.sm, backgroundColor: '#FAFAFA', marginBottom: SPACING.sm,
    borderStyle: 'dashed',
  },

  // ─── Buttons ───
  btnPri: {
    backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center',
  },
  btnSec: {
    borderWidth: 1.5, borderColor: COLORS.secondary, borderRadius: 8,
    padding: 12, alignItems: 'center', backgroundColor: '#F0FFF4',
  },
  btnOutline: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8,
    padding: 14, alignItems: 'center', backgroundColor: '#fff',
  },
  btnDanger: {
    backgroundColor: COLORS.danger, borderRadius: 12, padding: 18, alignItems: 'center',
  },

  // ─── Mode retenue ───
  modeBtn: {
    flex: 1, padding: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff',
  },
  modeBtnA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  // ─── Spreadsheet table (Step 2) ───
  tRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8e8e8',
  },
  tCell: {
    paddingVertical: 6, paddingHorizontal: 3,
    justifyContent: 'center', alignItems: 'center',
    borderRightWidth: 1, borderRightColor: '#e8e8e8',
  },
  tNameCell: { width: 110, alignItems: 'flex-start', paddingLeft: 6 },
  tDataCell: { width: 100 },
  tReliquatCell: { width: 90, backgroundColor: 'rgba(230,57,70,0.06)' },
  tTotalCell: { width: 100, backgroundColor: 'rgba(0,0,0,0.03)' },
  tHeader: { backgroundColor: COLORS.primary, paddingVertical: 8 },
  tHeaderT: { fontSize: 10, fontWeight: '700', color: '#fff', textAlign: 'center' },
  tInput: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 4,
    padding: 4, fontSize: 12, textAlign: 'center',
    width: 88, backgroundColor: '#fff',
  },
  tTotalT: {
    fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center',
  },

  // ─── Summary row ───
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1, borderRadius: 10, padding: SPACING.sm,
    alignItems: 'center',
  },

  // ─── Info box ───
  infoBox: {
    borderRadius: 10, padding: SPACING.sm,
  },

  // ─── PV table (Step 4) ───
  pvTable: { gap: 6 },
  pvRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  pvLabel: { fontSize: 13, color: COLORS.darkGray },
  pvValue: { fontSize: 13, fontWeight: '700', color: COLORS.darkGray },
  pvMemberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },

  // ─── Modal ───
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24,
  },
});
