import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, Dimensions, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONSTANTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
  { num: 3, label: 'Sorties', icon: '\u{1F4B3}' },
  { num: 4, label: 'Cloture & PV', icon: '\u{1F4CB}' },
];

const COTISATION_BASE_DEFAUT = 150000;
const CAISSE_PROJET_DEFAUT = 10000;

const ROLES_LIST = ['membre', 'president', 'tresorier', 'secretaire'];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WEB-SAFE CONFIRM (Alert.alert doesn't work on web with button callbacks)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
    window.alert(`${title}\n\n${message || ''}`);
  } else {
    Alert.alert(title, message || '');
  }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function AdminScreen() {
  const { users, creerUtilisateur, adminResetPassword, mettreAJourProfil, fetchAllUsers } = useAuth();
  const {
    config, membres, seances, versements, prets, remboursements, sanctions, recap,
    updateConfig, ajouterVersement, accorderPret, rembourserPret,
    ajouterSeance, appliquerSanction, publierRapport, refreshAll,
    modifierMembre,
  } = useApp();

  const [tab, setTab] = useState('wizard');
  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  /* ═══════════ WIZARD STATE ═══════════ */
  const [wizStep, setWizStep] = useState(1);
  const [wizYear, setWizYear] = useState(config?.annee_courante || 2025);
  const [wizSeanceId, setWizSeanceId] = useState(null);
  const [wizNewDate, setWizNewDate] = useState('');
  const [wizNewDesc, setWizNewDesc] = useState('');
  const [wizCotisBase, setWizCotisBase] = useState(String(COTISATION_BASE_DEFAUT));
  const [wizData, setWizData] = useState({});
  const [wizNewLoans, setWizNewLoans] = useState([]);
  const [wizLoanMembre, setWizLoanMembre] = useState('');
  const [wizLoanMontant, setWizLoanMontant] = useState('');
  const [wizLoanTaux, setWizLoanTaux] = useState('');
  const [wizNotes, setWizNotes] = useState('');
  const [wizPvFile, setWizPvFile] = useState(null);
  const [wizSaving, setWizSaving] = useState(false);
  const [wizErrors, setWizErrors] = useState({});
  const [showClotureModal, setShowClotureModal] = useState(false);

  // Refs for keyboard navigation in spreadsheet
  const inputRefs = useRef({});

  /* ═══════════ CONFIG STATE ═══════════ */
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
      if (!wizLoanTaux) setWizLoanTaux(String(config.taux_interet_pret ?? '7.5'));
    }
  }, [config]);

  /* ═══════════ MEMBRES MODAL STATE ═══════════ */
  const [showNewMember, setShowNewMember] = useState(false);
  const [nPrenom, setNPrenom] = useState('');
  const [nNom, setNNom] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nTel, setNTel] = useState('');

  /* ═══════════ EDIT MEMBER MODAL STATE ═══════════ */
  const [editMember, setEditMember] = useState(null);
  const [editNom, setEditNom] = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('membre');

  /* ═══════════ DERIVED DATA ═══════════ */
  const activeMembres = useMemo(() => {
    return (membres || []).filter(m => m.actif !== false)
      .sort((a, b) => (a.numero || 99) - (b.numero || 99));
  }, [membres]);

  const seancesForYear = useMemo(() => {
    return (seances || []).filter(s => s.annee === wizYear)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [seances, wizYear]);

  // Reliquat: remaining loan per member
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
    const base = parseInt(wizCotisBase) || COTISATION_BASE_DEFAUT;
    const data = {};
    activeMembres.forEach(m => {
      if (m.login === 'admin') return; // skip admin
      const existCotis = (versements || []).find(v =>
        v.membre_id === m.id && v.seance_id === wizSeanceId && v.type === 'contribution'
      );
      const existEpargne = (versements || []).find(v =>
        v.membre_id === m.id && v.seance_id === wizSeanceId && (v.type === 'epargne' || !v.type)
      );
      data[m.id] = {
        cotisation: existCotis ? String(existCotis.montant) : String(base),
        epargne: existEpargne ? String(existEpargne.montant) : '',
        remboursement: '',
        sanction: '',
        sanctionMotif: '',
        caisseProjet: String(CAISSE_PROJET_DEFAUT),
        reliquatOverride: '',
      };
    });
    setWizData(data);
    setWizErrors({});
  }, [wizSeanceId]);

  // Recalculate when cotisBase changes (and seance is selected)
  useEffect(() => {
    if (!wizSeanceId || activeMembres.length === 0) return;
    const base = parseInt(wizCotisBase) || COTISATION_BASE_DEFAUT;
    setWizData(prev => {
      const next = { ...prev };
      activeMembres.forEach(m => {
        if (m.login === 'admin') return;
        if (next[m.id]) {
          const existCotis = (versements || []).find(v =>
            v.membre_id === m.id && v.seance_id === wizSeanceId && v.type === 'contribution'
          );
          if (!existCotis) {
            next[m.id] = { ...next[m.id], cotisation: String(base) };
          }
        }
      });
      return next;
    });
  }, [wizCotisBase]);

  // Wizard totals
  const wizTotals = useMemo(() => {
    let totalCotis = 0, totalEpargne = 0, totalRemb = 0, totalSanctions = 0, totalCaisseProjet = 0;
    const base = parseInt(wizCotisBase) || COTISATION_BASE_DEFAUT;
    let totalDette = 0;
    Object.entries(wizData).forEach(([memId, d]) => {
      const c = parseInt(d.cotisation) || 0;
      totalCotis += c;
      totalEpargne += parseInt(d.epargne) || 0;
      totalRemb += parseInt(d.remboursement) || 0;
      totalSanctions += parseInt(d.sanction) || 0;
      totalCaisseProjet += parseInt(d.caisseProjet) || 0;
      if (c > 0 && c < base) totalDette += (base - c);
    });
    const totalNewLoans = wizNewLoans.reduce((s, l) => s + (parseInt(l.montant) || 0), 0);
    const totalCollecte = totalCotis + totalEpargne + totalRemb + totalSanctions + totalCaisseProjet;
    return {
      totalCotis, totalEpargne, totalRemb, totalSanctions, totalDette, totalCaisseProjet,
      totalCollecte, totalNewLoans,
      solde: totalCollecte - totalNewLoans,
    };
  }, [wizData, wizNewLoans, wizCotisBase]);

  // Fond disponible
  const fondDisponible = useMemo(() => {
    const totalSoldes = recap?.totalSoldes || 0;
    const totalARembourser = recap?.totalARembourser || 0;
    return Math.max(0, totalSoldes - totalARembourser);
  }, [recap]);

  /* ═══════════ HELPERS ═══════════ */
  const getMembreName = useCallback((membreId) => {
    const m = (membres || []).find(mb => mb.id === membreId);
    if (m) return `${m.prenom || ''} ${m.nom || ''}`.trim() || m.login || 'Inconnu';
    return 'Inconnu';
  }, [membres]);

  const formatSeanceDate = (dateStr) => {
    try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return dateStr || '--'; }
  };

  /* ═══════════ VALIDATION ═══════════ */
  const validateStep1 = () => {
    if (!wizSeanceId) {
      webAlert('Erreur', 'Selectionnez ou creez une seance avant de continuer.');
      return false;
    }
    if (!wizCotisBase || parseInt(wizCotisBase) <= 0) {
      webAlert('Erreur', 'Le montant de cotisation de base doit etre > 0.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const errors = {};
    const base = parseInt(wizCotisBase) || COTISATION_BASE_DEFAUT;
    let hasData = false;

    Object.entries(wizData).forEach(([memId, d]) => {
      const remb = parseInt(d.remboursement) || 0;
      const reliquat = reliquatPerMember[memId]?.total || 0;

      // Check remboursement > reliquat (unless override is set for cassation)
      if (remb > 0 && remb > reliquat && !d.reliquatOverride) {
        errors[memId] = `Remboursement (${formatMontant(remb)}) > dette (${formatMontant(reliquat)})`;
      }

      if ((parseInt(d.cotisation) || 0) > 0 || (parseInt(d.epargne) || 0) > 0 || remb > 0 || (parseInt(d.caisseProjet) || 0) > 0) {
        hasData = true;
      }
    });

    setWizErrors(errors);

    if (Object.keys(errors).length > 0) {
      webAlert(
        'Incoherence detectee',
        'Un ou plusieurs remboursements depassent la dette du membre. Verifiez les montants en rouge.'
      );
      return false;
    }

    if (!hasData) {
      webAlert('Attention', 'Aucun montant saisi. Le tableau est vide.');
      return false;
    }
    return true;
  };

  /* ═══════════ WIZARD HANDLERS ═══════════ */
  const handleCreateSeance = async () => {
    if (!wizNewDate.trim()) {
      webAlert('Erreur', 'Entrez une date (format: AAAA-MM-JJ, ex: 2025-03-15).');
      return;
    }
    await ajouterSeance(wizNewDate.trim(), wizYear, wizNewDesc.trim() || null);
    setWizNewDate('');
    setWizNewDesc('');
    webAlert('Seance creee', 'Selectionnez-la dans la liste.');
  };

  const handleWizChange = (membreId, field, value) => {
    setWizData(prev => ({
      ...prev,
      [membreId]: { ...(prev[membreId] || {}), [field]: value },
    }));
    // Clear error for this member
    if (wizErrors[membreId]) {
      setWizErrors(prev => { const n = { ...prev }; delete n[membreId]; return n; });
    }
  };

  // Keyboard navigation: Tab/Enter moves to next cell
  const handleCellKeyPress = (e, membreId, field, memberIdx) => {
    if (Platform.OS !== 'web') return;
    const key = e.nativeEvent?.key || e.key;
    if (key !== 'Enter' && key !== 'Tab') return;

    const fields = ['caisseProjet', 'cotisation', 'epargne', 'remboursement', 'sanction'];
    const fieldIdx = fields.indexOf(field);
    const fMembres = activeMembres.filter(m => m.login !== 'admin');

    let nextMemberIdx = memberIdx;
    let nextFieldIdx = fieldIdx + 1;

    if (nextFieldIdx >= fields.length) {
      nextFieldIdx = 0;
      nextMemberIdx = memberIdx + 1;
    }

    if (nextMemberIdx < fMembres.length) {
      const nextMem = fMembres[nextMemberIdx];
      const refKey = `${nextMem.id}_${fields[nextFieldIdx]}`;
      if (inputRefs.current[refKey]) {
        inputRefs.current[refKey].focus();
      }
    }
  };

  const goStep = (target) => {
    if (target > wizStep) {
      if (wizStep === 1 && !validateStep1()) return;
      if (wizStep === 2 && target > 2 && !validateStep2()) return;
    }
    setWizStep(target);
  };

  const handleAddLoan = () => {
    if (!wizLoanMembre) {
      webAlert('Erreur', 'Selectionnez un beneficiaire.');
      return;
    }
    const mt = parseInt(wizLoanMontant) || 0;
    if (mt <= 0) {
      webAlert('Erreur', 'Entrez un montant valide.');
      return;
    }
    const taux = parseFloat(wizLoanTaux) || config?.taux_interet_pret || 7.5;
    const interet = Math.round(mt * taux / 100);
    const newLoan = {
      membreId: wizLoanMembre, montant: mt, taux, interet, total: mt + interet,
    };
    setWizNewLoans(prev => [...prev, newLoan]);

    // Auto-report: update the remboursement field in the spreadsheet for this member
    // (This tracks the new loan amount so it shows up in the main table)
    setWizLoanMembre('');
    setWizLoanMontant('');
  };

  const handleRemoveLoan = (idx) => {
    setWizNewLoans(prev => prev.filter((_, i) => i !== idx));
  };

  // File picker (web only)
  const handlePickFile = () => {
    if (Platform.OS !== 'web') {
      webAlert('Info', 'Upload de fichier disponible uniquement sur web.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setWizPvFile({ name: file.name, size: file.size, type: file.type });
      }
    };
    input.click();
  };

  // Show the cloture confirmation modal
  const handleCloturer = () => {
    if (wizSaving) return;
    if (wizTotals.totalCollecte === 0 && wizNewLoans.length === 0) {
      webAlert('Erreur', 'Aucune donnee a enregistrer. Retournez aux etapes precedentes.');
      return;
    }
    setShowClotureModal(true);
  };

  const doCloturer = async () => {
    setShowClotureModal(false);
    setWizSaving(true);
    try {
      const promises = [];
      const fMembres = activeMembres.filter(m => m.login !== 'admin');

      for (const m of fMembres) {
        const d = wizData[m.id] || {};
        const cotis = parseInt(d.cotisation) || 0;
        const epargne = parseInt(d.epargne) || 0;
        const remb = parseInt(d.remboursement) || 0;
        const sanction = parseInt(d.sanction) || 0;
        const caisseP = parseInt(d.caisseProjet) || 0;

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
        if (caisseP > 0) {
          promises.push(ajouterVersement(m.id, wizSeanceId, caisseP, 'caisse_projet', wizYear));
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

      if (wizNotes.trim()) {
        promises.push(publierRapport(
          `PV Seance du ${formatSeanceDate(seancesForYear.find(s => s.id === wizSeanceId)?.date)}`,
          wizNotes.trim(),
          wizSeanceId,
        ));
      }

      await Promise.all(promises);
      await refreshAll();

      webAlert('Seance cloturee !', `${promises.length} operations enregistrees avec succes.`);

      setWizStep(1);
      setWizSeanceId(null);
      setWizData({});
      setWizNewLoans([]);
      setWizNotes('');
      setWizPvFile(null);
      setWizErrors({});
    } catch (err) {
      console.error('[AdminScreen] cloturer error:', err);
      webAlert('Erreur', err.message || 'Echec de la cloture.');
    } finally {
      setWizSaving(false);
    }
  };

  /* ═══════════ CONFIG HANDLER ═══════════ */
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
    webAlert('Succes', 'Configuration sauvegardee');
  };

  /* ═══════════ MEMBRE HANDLER ═══════════ */
  const handleCreerMembre = async () => {
    if (!nPrenom.trim() || !nNom.trim()) {
      webAlert('Erreur', 'Prenom et Nom requis.');
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
    if (u) webAlert('Membre cree', `Login : ${u.login}\nMot de passe : 123456`);
  };

  /* ═══════════ EDIT MEMBER HANDLER ═══════════ */
  const openEditMember = (u) => {
    setEditMember(u);
    setEditNom(u.nom || '');
    setEditPrenom(u.prenom || '');
    setEditTel(u.telephone || '');
    setEditEmail(u.email || '');
    setEditRole(u.role || 'membre');
  };

  const handleSaveEditMember = async () => {
    if (!editMember) return;
    try {
      // Use mettreAJourProfil from AuthContext (updates djangui_membres + local state)
      await mettreAJourProfil(editMember.id, {
        nom: editNom.trim(),
        prenom: editPrenom.trim(),
        telephone: editTel.trim(),
        email: editEmail.trim(),
      });
      // Update role separately if changed (requires direct DB update)
      if (editRole !== editMember.role && modifierMembre) {
        await modifierMembre(editMember.id, { role: editRole });
      }
      setEditMember(null);
      if (fetchAllUsers) await fetchAllUsers();
      await refreshAll();
      webAlert('Succes', 'Profil mis a jour.');
    } catch (err) {
      console.error('[AdminScreen] edit member error:', err);
      webAlert('Erreur', 'Impossible de sauvegarder : ' + (err.message || ''));
    }
  };

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     RENDER
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const filteredMembres = activeMembres.filter(m => m.login !== 'admin');

  // Pre-fill PV text for cassation
  const defaultPvText = `Reunion du 28/03/26 chez M. MOTHO Jonadab. Cassation 2025 effectuee. Resolutions : Caisse projet 10k/seance (40k/an). Projets a lancer avant la reunion au village. Cas Junias Motho : compensation par epargne validee avec l'avaliste Bonaventure.`;

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
              <Text style={[st.mainTabT, tab === t.key && { color: COLORS.primary, fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 140 }, webStyle()]}>

        {/* ═══════════════════ WIZARD TAB ═══════════════════ */}
        {tab === 'wizard' && (
          <>
            <Text style={st.pageTitle}>{'\u{1F9D9}\u200D\u2642\uFE0F'} Assistant de Seance</Text>
            <Text style={st.pageSub}>
              Saisissez les donnees de la seance etape par etape
            </Text>

            {/* ─── Step indicator ─── */}
            <View style={st.stepBar}>
              {STEPS.map((s, i) => {
                const isCurrent = wizStep === s.num;
                const isDone = wizStep > s.num;
                const canClick = s.num <= wizStep;
                return (
                  <React.Fragment key={s.num}>
                    {i > 0 && (
                      <View style={[st.stepLine, isDone && st.stepLineDone]} />
                    )}
                    <TouchableOpacity
                      style={st.stepItem}
                      onPress={() => canClick && goStep(s.num)}
                      disabled={!canClick}
                    >
                      <View style={[
                        st.stepCircle,
                        isCurrent && st.stepCircleActive,
                        isDone && st.stepCircleDone,
                      ]}>
                        <Text style={[
                          st.stepNum,
                          (isCurrent || isDone) && { color: '#fff' },
                        ]}>
                          {isDone ? '\u2713' : s.num}
                        </Text>
                      </View>
                      <Text style={[
                        st.stepLabel,
                        isCurrent && { color: COLORS.primary, fontWeight: '700' },
                        isDone && { color: COLORS.secondary },
                      ]} numberOfLines={1}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>

            {/* ════════ STEP 1: CONFIGURATION ════════ */}
            {wizStep === 1 && (
              <>
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u2699\uFE0F'} Configuration de la seance</Text>

                  {/* Year */}
                  <Text style={st.fieldLabel}>Annee de l'exercice</Text>
                  <View style={st.chipRow}>
                    {ANNEES.map(a => (
                      <TouchableOpacity
                        key={a}
                        style={[st.yearChip, wizYear === a && st.yearChipA]}
                        onPress={() => { setWizYear(a); setWizSeanceId(null); }}
                      >
                        <Text style={{
                          fontSize: 14, fontWeight: '700',
                          color: wizYear === a ? '#fff' : COLORS.darkGray,
                        }}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Seance selector */}
                  <Text style={st.fieldLabel}>
                    Date de la seance ({seancesForYear.length} seance{seancesForYear.length > 1 ? 's' : ''})
                  </Text>
                  {seancesForYear.length > 0 ? (
                    <View style={{ gap: 6, marginBottom: SPACING.sm }}>
                      {seancesForYear.map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={[st.seanceItem, wizSeanceId === s.id && st.seanceItemA]}
                          onPress={() => setWizSeanceId(s.id)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[st.radio, wizSeanceId === s.id && st.radioA]} />
                            <View>
                              <Text style={{
                                fontSize: 14, fontWeight: '700',
                                color: wizSeanceId === s.id ? '#fff' : COLORS.darkGray,
                              }}>
                                {formatSeanceDate(s.date)}
                              </Text>
                              {s.description ? (
                                <Text style={{
                                  fontSize: 11,
                                  color: wizSeanceId === s.id ? 'rgba(255,255,255,0.7)' : COLORS.gray,
                                }}>{s.description}</Text>
                              ) : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: SPACING.sm }}>
                      Aucune seance pour {wizYear}. Creez-en une.
                    </Text>
                  )}

                  {/* Create new seance */}
                  <View style={st.createBox}>
                    <Text style={st.miniTitle}>+ Creer une nouvelle seance</Text>
                    <TextInput
                      style={st.input}
                      placeholder="Date (ex: 2026-03-28)"
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
                        Creer la seance
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Cotisation base */}
                  <Text style={[st.fieldLabel, { marginTop: SPACING.md }]}>
                    Cotisation de base (FCFA) - Appliquee a tous par defaut
                  </Text>
                  <TextInput
                    style={st.input}
                    keyboardType="numeric"
                    placeholder="150 000"
                    value={wizCotisBase}
                    onChangeText={setWizCotisBase}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: -4 }}>
                    Ce montant pre-remplira la colonne "Cotisation" pour chaque membre.
                  </Text>
                </Card>

                <TouchableOpacity
                  style={[st.btnPri, { marginTop: SPACING.md }]}
                  onPress={() => goStep(2)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                    Suivant {'\u2192'} Tableau de Saisie
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ════════ STEP 2: TABLEAU EXCEL-LIVE ════════ */}
            {wizStep === 2 && (
              <>
                <Card style={{ marginTop: SPACING.md, padding: 0, overflow: 'hidden' }}>
                  <View style={{ padding: SPACING.sm, backgroundColor: '#F0F7F4' }}>
                    <Text style={st.cardTitle}>
                      {'\u{1F4CA}'} Tableau de Saisie — {formatSeanceDate(seancesForYear.find(s => s.id === wizSeanceId)?.date)}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>
                      Cotisation de base : {formatMontant(parseInt(wizCotisBase) || 0)} FCFA | Caisse Projet : {formatMontant(CAISSE_PROJET_DEFAUT)} FCFA | Naviguez avec Tab/Entree
                    </Text>
                    {wizTotals.totalDette > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger }} />
                        <Text style={{ fontSize: 11, color: COLORS.danger, fontWeight: '600' }}>
                          {Object.entries(wizData).filter(([_, d]) => {
                            const c = parseInt(d.cotisation) || 0;
                            const base = parseInt(wizCotisBase) || COTISATION_BASE_DEFAUT;
                            return c > 0 && c < base;
                          }).length} membre(s) avec dette de seance
                        </Text>
                      </View>
                    )}
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      {/* ── Header ── */}
                      <View style={st.tRow}>
                        <View style={[st.tCell, st.tNumCell, st.tHeader]}>
                          <Text style={st.tHT}>#</Text>
                        </View>
                        <View style={[st.tCell, st.tNameCell, st.tHeader]}>
                          <Text style={st.tHT}>Membre</Text>
                        </View>
                        <View style={[st.tCell, st.tSmCell, st.tHeader, { backgroundColor: '#5D4E8C' }]}>
                          <Text style={st.tHT}>C.Projet</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHT}>Cotisation</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHT}>Epargne</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHT}>Remb.Credit</Text>
                        </View>
                        <View style={[st.tCell, st.tRelCell, st.tHeader, { backgroundColor: '#8B0000' }]}>
                          <Text style={st.tHT}>Reliquat</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell, st.tHeader]}>
                          <Text style={st.tHT}>Amendes</Text>
                        </View>
                        <View style={[st.tCell, st.tTotCell, st.tHeader]}>
                          <Text style={st.tHT}>Total</Text>
                        </View>
                      </View>

                      {/* ── Data rows ── */}
                      {filteredMembres.map((m, idx) => {
                        const d = wizData[m.id] || {};
                        const reliquat = reliquatPerMember[m.id]?.total || 0;
                        const reliquatDisplay = d.reliquatOverride !== undefined && d.reliquatOverride !== ''
                          ? parseInt(d.reliquatOverride) || 0
                          : reliquat;
                        const base = parseInt(wizCotisBase) || COTISATION_BASE_DEFAUT;
                        const cotisVal = parseInt(d.cotisation) || 0;
                        const isDette = cotisVal > 0 && cotisVal < base;
                        const dette = isDette ? base - cotisVal : 0;
                        const hasError = !!wizErrors[m.id];
                        const rowTotal = cotisVal
                          + (parseInt(d.epargne) || 0)
                          + (parseInt(d.remboursement) || 0)
                          + (parseInt(d.sanction) || 0)
                          + (parseInt(d.caisseProjet) || 0);

                        return (
                          <View
                            key={m.id}
                            style={[
                              st.tRow,
                              { backgroundColor: hasError ? '#FFF0F0' : idx % 2 === 0 ? '#fff' : '#F8FAF9' },
                            ]}
                          >
                            <View style={[st.tCell, st.tNumCell]}>
                              <Text style={{ fontSize: 10, color: COLORS.gray }}>{m.numero || idx + 1}</Text>
                            </View>
                            <View style={[st.tCell, st.tNameCell]}>
                              <Text style={{ fontSize: 11, color: COLORS.darkGray, fontWeight: '600' }} numberOfLines={1}>
                                {m.prenom || (m.nom || '').split(' ')[0]}
                              </Text>
                              {isDette && (
                                <Text style={{ fontSize: 9, color: COLORS.danger, fontWeight: '700' }}>
                                  Dette: {formatMontant(dette)}
                                </Text>
                              )}
                            </View>
                            {/* Caisse Projet */}
                            <View style={[st.tCell, st.tSmCell, { backgroundColor: 'rgba(93,78,140,0.04)' }]}>
                              <TextInput
                                ref={r => { if (r) inputRefs.current[`${m.id}_caisseProjet`] = r; }}
                                style={[st.tInputSm, { borderColor: '#B39DDB' }]}
                                keyboardType="numeric"
                                value={d.caisseProjet || ''}
                                onChangeText={v => handleWizChange(m.id, 'caisseProjet', v)}
                                onKeyPress={e => handleCellKeyPress(e, m.id, 'caisseProjet', idx)}
                                placeholderTextColor="#ccc"
                                placeholder="10000"
                              />
                            </View>
                            {/* Cotisation */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                ref={r => { if (r) inputRefs.current[`${m.id}_cotisation`] = r; }}
                                style={[st.tInput, isDette && { borderColor: COLORS.danger, backgroundColor: '#FFF5F5' }]}
                                keyboardType="numeric"
                                value={d.cotisation || ''}
                                onChangeText={v => handleWizChange(m.id, 'cotisation', v)}
                                onKeyPress={e => handleCellKeyPress(e, m.id, 'cotisation', idx)}
                                placeholderTextColor="#ccc"
                                placeholder="0"
                              />
                            </View>
                            {/* Epargne */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                ref={r => { if (r) inputRefs.current[`${m.id}_epargne`] = r; }}
                                style={st.tInput}
                                keyboardType="numeric"
                                value={d.epargne || ''}
                                onChangeText={v => handleWizChange(m.id, 'epargne', v)}
                                onKeyPress={e => handleCellKeyPress(e, m.id, 'epargne', idx)}
                                placeholderTextColor="#ccc"
                                placeholder="0"
                              />
                            </View>
                            {/* Remboursement */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                ref={r => { if (r) inputRefs.current[`${m.id}_remboursement`] = r; }}
                                style={[st.tInput, hasError && { borderColor: COLORS.danger, backgroundColor: '#FFF0F0' }]}
                                keyboardType="numeric"
                                value={d.remboursement || ''}
                                onChangeText={v => handleWizChange(m.id, 'remboursement', v)}
                                onKeyPress={e => handleCellKeyPress(e, m.id, 'remboursement', idx)}
                                placeholderTextColor="#ccc"
                                placeholder="0"
                              />
                            </View>
                            {/* Reliquat (editable for cassation) */}
                            <View style={[st.tCell, st.tRelCell]}>
                              {reliquat > 0 ? (
                                <TextInput
                                  style={[st.tInputSm, {
                                    borderColor: COLORS.danger,
                                    backgroundColor: 'rgba(230,57,70,0.06)',
                                    color: COLORS.danger,
                                    fontWeight: '700',
                                  }]}
                                  keyboardType="numeric"
                                  value={d.reliquatOverride !== undefined && d.reliquatOverride !== '' ? d.reliquatOverride : String(reliquat)}
                                  onChangeText={v => handleWizChange(m.id, 'reliquatOverride', v)}
                                  placeholderTextColor="#ccc"
                                />
                              ) : (
                                <Text style={{ fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#ccc' }}>
                                  -
                                </Text>
                              )}
                            </View>
                            {/* Amendes */}
                            <View style={[st.tCell, st.tDataCell]}>
                              <TextInput
                                ref={r => { if (r) inputRefs.current[`${m.id}_sanction`] = r; }}
                                style={st.tInput}
                                keyboardType="numeric"
                                value={d.sanction || ''}
                                onChangeText={v => handleWizChange(m.id, 'sanction', v)}
                                onKeyPress={e => handleCellKeyPress(e, m.id, 'sanction', idx)}
                                placeholderTextColor="#ccc"
                                placeholder="0"
                              />
                            </View>
                            {/* Total */}
                            <View style={[st.tCell, st.tTotCell]}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary, textAlign: 'center' }}>
                                {formatMontant(rowTotal)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* ── TOTALS ROW ── */}
                      <View style={[st.tRow, { backgroundColor: COLORS.primary }]}>
                        <View style={[st.tCell, st.tNumCell]} />
                        <View style={[st.tCell, st.tNameCell]}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>TOTAL</Text>
                        </View>
                        <View style={[st.tCell, st.tSmCell]}>
                          <Text style={st.tTotT}>{formatMontant(wizTotals.totalCaisseProjet)}</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotT}>{formatMontant(wizTotals.totalCotis)}</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotT}>{formatMontant(wizTotals.totalEpargne)}</Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotT}>{formatMontant(wizTotals.totalRemb)}</Text>
                        </View>
                        <View style={[st.tCell, st.tRelCell]}>
                          <Text style={st.tTotT}>
                            {formatMontant(Object.values(reliquatPerMember).reduce((s, r) => s + r.total, 0))}
                          </Text>
                        </View>
                        <View style={[st.tCell, st.tDataCell]}>
                          <Text style={st.tTotT}>{formatMontant(wizTotals.totalSanctions)}</Text>
                        </View>
                        <View style={[st.tCell, st.tTotCell]}>
                          <Text style={[st.tTotT, { fontWeight: '900', fontSize: 12 }]}>
                            {formatMontant(wizTotals.totalCollecte)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                </Card>

                {/* Error messages */}
                {Object.keys(wizErrors).length > 0 && (
                  <View style={[st.alertBox, { backgroundColor: '#FFEBEE', borderColor: COLORS.danger }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.danger }}>
                      {'\u26A0\uFE0F'} Incoherences detectees :
                    </Text>
                    {Object.entries(wizErrors).map(([memId, msg]) => (
                      <Text key={memId} style={{ fontSize: 11, color: COLORS.danger, marginTop: 2 }}>
                        {'\u2022'} {getMembreName(memId)} : {msg}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Summary cards */}
                <View style={[st.summaryRow, { marginTop: SPACING.md }]}>
                  <View style={[st.summaryCard, { backgroundColor: '#EDE7F6' }]}>
                    <Text style={{ fontSize: 9, color: COLORS.gray }}>C. Projet</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#5D4E8C' }}>
                      {formatMontant(wizTotals.totalCaisseProjet)}
                    </Text>
                  </View>
                  <View style={[st.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={{ fontSize: 9, color: COLORS.gray }}>Cotisations</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.primary }}>
                      {formatMontant(wizTotals.totalCotis)}
                    </Text>
                  </View>
                  <View style={[st.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={{ fontSize: 9, color: COLORS.gray }}>Epargne</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1565C0' }}>
                      {formatMontant(wizTotals.totalEpargne)}
                    </Text>
                  </View>
                  <View style={[st.summaryCard, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={{ fontSize: 9, color: COLORS.gray }}>Remb.</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#E65100' }}>
                      {formatMontant(wizTotals.totalRemb)}
                    </Text>
                  </View>
                </View>

                {/* Nav */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: SPACING.md }}>
                  <TouchableOpacity style={[st.btnOutline, { flex: 1 }]} onPress={() => goStep(1)}>
                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{'\u2190'} Config</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.btnPri, { flex: 2 }]} onPress={() => goStep(3)}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      Suivant {'\u2192'} Sorties & Credits
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ════════ STEP 3: SORTIES & CREDITS ════════ */}
            {wizStep === 3 && (
              <>
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F4B3}'} Sorties & Nouveaux Credits</Text>

                  <View style={[st.infoBox, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Fond total disponible (estim.)</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.primary }}>
                      {formatMontant(fondDisponible)} FCFA
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
                      Collecte cette seance : {formatMontant(wizTotals.totalCollecte)} FCFA
                    </Text>
                  </View>

                  {/* New loan form */}
                  <View style={{ marginTop: SPACING.md }}>
                    <Text style={st.fieldLabel}>Beneficiaire</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
                      {filteredMembres.map(m => (
                        <TouchableOpacity
                          key={m.id}
                          style={[st.chip, wizLoanMembre === m.id && st.chipA]}
                          onPress={() => setWizLoanMembre(m.id)}
                        >
                          <Text style={{
                            fontSize: 11, fontWeight: '600',
                            color: wizLoanMembre === m.id ? '#fff' : COLORS.darkGray,
                          }} numberOfLines={1}>
                            {m.prenom || (m.nom || '').split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 8 }}>
                      <View style={{ flex: 2 }}>
                        <Text style={st.fieldLabel}>Montant (FCFA)</Text>
                        <TextInput
                          style={st.input}
                          keyboardType="numeric"
                          placeholder="ex: 500000"
                          value={wizLoanMontant}
                          onChangeText={setWizLoanMontant}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.fieldLabel}>Taux (%)</Text>
                        <TextInput
                          style={st.input}
                          keyboardType="decimal-pad"
                          placeholder={String(config?.taux_interet_pret || '7.5')}
                          value={wizLoanTaux}
                          onChangeText={setWizLoanTaux}
                        />
                      </View>
                    </View>

                    {parseInt(wizLoanMontant) > 0 && (
                      <View style={[st.infoBox, { backgroundColor: '#FFF8E1', marginBottom: SPACING.sm }]}>
                        <Text style={{ fontSize: 12, color: '#F57F17' }}>
                          Interet ({wizLoanTaux || config?.taux_interet_pret || 7.5}%) : {formatMontant(Math.round((parseInt(wizLoanMontant) || 0) * (parseFloat(wizLoanTaux) || config?.taux_interet_pret || 7.5) / 100))} FCFA
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary }}>
                          Total a rembourser : {formatMontant(Math.round((parseInt(wizLoanMontant) || 0) * (1 + (parseFloat(wizLoanTaux) || config?.taux_interet_pret || 7.5) / 100)))} FCFA
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity style={st.btnSec} onPress={handleAddLoan}>
                      <Text style={{ color: COLORS.secondary, fontWeight: '700' }}>+ Ajouter ce credit</Text>
                    </TouchableOpacity>
                  </View>
                </Card>

                {/* Loans list */}
                {wizNewLoans.length > 0 && (
                  <>
                    <Text style={[st.sectionTitle, { marginTop: SPACING.md }]}>
                      Credits a accorder ({wizNewLoans.length})
                    </Text>
                    {wizNewLoans.map((loan, i) => (
                      <Card key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.darkGray }}>
                            {getMembreName(loan.membreId)}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>
                            Capital: {formatMontant(loan.montant)} | Int ({loan.taux}%): {formatMontant(loan.interet)} | Total: {formatMontant(loan.total)}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveLoan(i)} style={{ padding: 8 }}>
                          <Text style={{ color: COLORS.danger, fontSize: 18, fontWeight: '700' }}>{'\u00D7'}</Text>
                        </TouchableOpacity>
                      </Card>
                    ))}
                    <View style={[st.infoBox, { backgroundColor: '#FFEBEE' }]}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.danger }}>
                        Total decaissements : {formatMontant(wizTotals.totalNewLoans)} FCFA
                      </Text>
                    </View>
                  </>
                )}

                {/* Existing loans */}
                {(prets || []).filter(p => p.statut === 'en_cours').length > 0 && (
                  <>
                    <Text style={[st.sectionTitle, { marginTop: SPACING.lg }]}>
                      Prets en cours ({(prets || []).filter(p => p.statut === 'en_cours').length})
                    </Text>
                    {(prets || []).filter(p => p.statut === 'en_cours').map(p => {
                      const rembTotal = (remboursements || [])
                        .filter(r => r.pret_id === p.id)
                        .reduce((s, r) => s + (Number(r.montant) || 0), 0);
                      const reste = (Number(p.montant_a_rembourser) || 0) - rembTotal;
                      return (
                        <Card key={p.id} style={{ paddingVertical: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600' }}>{getMembreName(p.membre_id)}</Text>
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
                  </>
                )}

                {/* Warning if total loans > collecte */}
                {wizTotals.totalNewLoans > wizTotals.totalCollecte && (
                  <View style={[st.alertBox, { backgroundColor: '#FFF3E0', borderColor: COLORS.accent }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#E65100' }}>
                      {'\u26A0\uFE0F'} Les decaissements ({formatMontant(wizTotals.totalNewLoans)}) depassent la collecte ({formatMontant(wizTotals.totalCollecte)}).
                    </Text>
                  </View>
                )}

                {/* Nav */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: SPACING.lg }}>
                  <TouchableOpacity style={[st.btnOutline, { flex: 1 }]} onPress={() => goStep(2)}>
                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{'\u2190'} Saisie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.btnPri, { flex: 2 }]} onPress={() => goStep(4)}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                      Suivant {'\u2192'} Cloture & PV
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ════════ STEP 4: CLOTURE & PV ════════ */}
            {wizStep === 4 && (
              <>
                {/* Financial summary */}
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F4CB}'} Recapitulatif Financier</Text>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: SPACING.sm }}>
                    Seance du {formatSeanceDate(seancesForYear.find(s => s.id === wizSeanceId)?.date)} — Annee {wizYear}
                  </Text>

                  <View style={st.pvTable}>
                    <View style={st.pvRow}>
                      <Text style={st.pvL}>Caisse Projet ({filteredMembres.length} x {formatMontant(CAISSE_PROJET_DEFAUT)})</Text>
                      <Text style={[st.pvV, { color: '#5D4E8C' }]}>{formatMontant(wizTotals.totalCaisseProjet)} F</Text>
                    </View>
                    <View style={st.pvRow}>
                      <Text style={st.pvL}>Cotisations ({filteredMembres.length} mbr)</Text>
                      <Text style={st.pvV}>{formatMontant(wizTotals.totalCotis)} F</Text>
                    </View>
                    <View style={st.pvRow}>
                      <Text style={st.pvL}>Epargne</Text>
                      <Text style={st.pvV}>{formatMontant(wizTotals.totalEpargne)} F</Text>
                    </View>
                    <View style={st.pvRow}>
                      <Text style={st.pvL}>Remboursements credit</Text>
                      <Text style={st.pvV}>{formatMontant(wizTotals.totalRemb)} F</Text>
                    </View>
                    <View style={st.pvRow}>
                      <Text style={st.pvL}>Amendes / Sanctions</Text>
                      <Text style={st.pvV}>{formatMontant(wizTotals.totalSanctions)} F</Text>
                    </View>

                    <View style={[st.pvRow, { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 }]}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary }}>TOTAL ENTREES</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.primary }}>
                        {formatMontant(wizTotals.totalCollecte)} F
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 8 }} />

                    <View style={st.pvRow}>
                      <Text style={st.pvL}>Credits accordes ({wizNewLoans.length})</Text>
                      <Text style={[st.pvV, { color: COLORS.danger }]}>
                        -{formatMontant(wizTotals.totalNewLoans)} F
                      </Text>
                    </View>

                    {wizTotals.totalDette > 0 && (
                      <View style={st.pvRow}>
                        <Text style={[st.pvL, { color: COLORS.danger }]}>Dettes de seance</Text>
                        <Text style={[st.pvV, { color: COLORS.danger }]}>{formatMontant(wizTotals.totalDette)} F</Text>
                      </View>
                    )}

                    <View style={[st.pvRow, {
                      backgroundColor: wizTotals.solde >= 0 ? '#E8F5E9' : '#FFEBEE',
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4,
                    }]}>
                      <Text style={{ fontSize: 14, fontWeight: '800' }}>SOLDE NET</Text>
                      <Text style={{
                        fontSize: 18, fontWeight: '900',
                        color: wizTotals.solde >= 0 ? COLORS.primary : COLORS.danger,
                      }}>
                        {formatMontant(wizTotals.solde)} F
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Detail par membre */}
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F465}'} Detail par membre</Text>
                  {filteredMembres.map(m => {
                    const d = wizData[m.id] || {};
                    const total = (parseInt(d.cotisation) || 0) + (parseInt(d.epargne) || 0)
                      + (parseInt(d.remboursement) || 0) + (parseInt(d.sanction) || 0)
                      + (parseInt(d.caisseProjet) || 0);
                    if (total === 0) return null;
                    const base = parseInt(wizCotisBase) || COTISATION_BASE_DEFAUT;
                    const isDette = (parseInt(d.cotisation) || 0) > 0 && (parseInt(d.cotisation) || 0) < base;
                    return (
                      <View key={m.id} style={[st.pvMemRow, isDette && { backgroundColor: '#FFF5F5' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.darkGray }}>
                            {m.prenom || (m.nom || '').split(' ')[0]}
                          </Text>
                          {isDette && (
                            <Text style={{ fontSize: 9, color: COLORS.danger, fontWeight: '600' }}>
                              Dette: {formatMontant(base - (parseInt(d.cotisation) || 0))} F
                            </Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700' }}>
                          {formatMontant(total)} F
                        </Text>
                      </View>
                    );
                  })}
                </Card>

                {/* PV / Notes */}
                <Card style={{ marginTop: SPACING.md }}>
                  <Text style={st.cardTitle}>{'\u{1F4DD}'} Compte-rendu / Proces-verbal</Text>
                  <TextInput
                    style={[st.input, { height: 120, textAlignVertical: 'top' }]}
                    multiline
                    numberOfLines={6}
                    placeholder="Resume de la seance, decisions prises, observations..."
                    value={wizNotes}
                    onChangeText={setWizNotes}
                    placeholderTextColor={COLORS.gray}
                  />
                  {!wizNotes && (
                    <TouchableOpacity
                      style={[st.btnSec, { marginBottom: SPACING.sm }]}
                      onPress={() => setWizNotes(defaultPvText)}
                    >
                      <Text style={{ color: COLORS.secondary, fontWeight: '600', fontSize: 12 }}>
                        {'\u{1F4CB}'} Pre-remplir avec le PV du 28/03/26
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* File attachment */}
                  <Text style={[st.fieldLabel, { marginTop: SPACING.sm }]}>Piece jointe (PV scanne)</Text>
                  <TouchableOpacity style={st.fileBtn} onPress={handlePickFile}>
                    <Text style={{ fontSize: 13, color: COLORS.secondary }}>
                      {wizPvFile ? `\u{1F4CE} ${wizPvFile.name} (${Math.round(wizPvFile.size / 1024)} Ko)` : '\u{1F4CE} Selectionner un fichier PDF ou Image'}
                    </Text>
                  </TouchableOpacity>
                  {wizPvFile && (
                    <TouchableOpacity onPress={() => setWizPvFile(null)}>
                      <Text style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>Retirer le fichier</Text>
                    </TouchableOpacity>
                  )}
                </Card>

                {/* Nav + Close */}
                <TouchableOpacity
                  style={[st.btnOutline, { marginTop: SPACING.md }]}
                  onPress={() => goStep(3)}
                >
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{'\u2190'} Retour aux Credits</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[st.btnDanger, { marginTop: SPACING.md }]}
                  onPress={handleCloturer}
                  disabled={wizSaving}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                    {wizSaving ? 'Enregistrement en cours...' : '\u{1F512} Soumettre et Enregistrer la Seance'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ═══════════════════ CONFIG TAB ═══════════════════ */}
        {tab === 'config' && (
          <>
            <Text style={st.pageTitle}>{'\u2699\uFE0F'} Configuration des Taux</Text>
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
                  <TextInput style={st.input} keyboardType="decimal-pad" value={val} onChangeText={setter} />
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
              <Card key={u.id} style={{ paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MemberAvatar member={{ ...u, name: u.nom }} size={38} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkGray }}>{u.nom}</Text>
                    <Text style={{ fontSize: 10, color: COLORS.secondary }}>
                      {RL[u.role] || u.role} — @{u.login}
                    </Text>
                    {u.telephone ? (
                      <Text style={{ fontSize: 10, color: COLORS.gray }}>{'\u{1F4DE}'} {u.telephone}</Text>
                    ) : null}
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
                    {/* Edit button */}
                    <TouchableOpacity
                      onPress={() => openEditMember(u)}
                      style={{ paddingVertical: 2 }}
                    >
                      <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' }}>
                        {'\u270F\uFE0F'} Modifier
                      </Text>
                    </TouchableOpacity>
                    {u.role !== 'superadmin' && (
                      <TouchableOpacity
                        onPress={() => {
                          webConfirm('Reset mdp', `Reinitialiser le mot de passe de ${u.prenom} ?`, () => {
                            adminResetPassword(u.id, '123456');
                          });
                        }}
                      >
                        <Text style={{ fontSize: 9, color: COLORS.secondary, textDecorationLine: 'underline' }}>Reset mdp</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* ═══════════ MODAL CLOTURE CONFIRMATION ═══════════ */}
      <Modal visible={showClotureModal} transparent animationType="fade">
        <View style={st.overlay}>
          <View style={[st.modalSheet, isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.danger, marginBottom: SPACING.sm, textAlign: 'center' }}>
              {'\u{1F512}'} Cloturer et Verrouiller ?
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.darkGray, textAlign: 'center', marginBottom: SPACING.md }}>
              Voulez-vous cloturer la seance ? Cette action verrouillera les donnees financieres.
            </Text>

            <View style={{ backgroundColor: '#F5F5F5', borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>Total collecte</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>{formatMontant(wizTotals.totalCollecte)} F</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>Total decaisse</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.danger }}>-{formatMontant(wizTotals.totalNewLoans)} F</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#DDD', paddingTop: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '800' }}>Solde</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: wizTotals.solde >= 0 ? COLORS.primary : COLORS.danger }}>
                  {formatMontant(wizTotals.solde)} F
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[st.btnDanger, { marginBottom: 8 }]}
              onPress={doCloturer}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                {'\u2713'} Oui, Cloturer la seance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowClotureModal(false)}>
              <Text style={{ textAlign: 'center', color: COLORS.gray, marginTop: 8, fontSize: 14 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════ MODAL NOUVEAU MEMBRE ═══════════ */}
      <Modal visible={showNewMember} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.modalSheet, isDesktop && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.md }}>
              Nouveau membre
            </Text>
            {[
              ['Prenom *', nPrenom, setNPrenom, 'default'],
              ['Nom de famille *', nNom, setNNom, 'default'],
              ['Email', nEmail, setNEmail, 'email-address'],
              ['Telephone', nTel, setNTel, 'phone-pad'],
            ].map(([ph, v, sv, kbT], i) => (
              <TextInput
                key={i}
                style={st.input}
                placeholder={ph}
                value={v}
                onChangeText={sv}
                keyboardType={kbT}
                autoCapitalize={kbT === 'default' ? 'words' : 'none'}
              />
            ))}
            <View style={{ backgroundColor: '#FFF3CD', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#856404' }}>
                Login = prenom (minuscules) — Mot de passe par defaut : 123456
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

      {/* ═══════════ MODAL EDIT MEMBRE ═══════════ */}
      <Modal visible={!!editMember} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.modalSheet, isDesktop && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.md }}>
              {'\u270F\uFE0F'} Modifier : {editMember?.prenom || editMember?.nom || ''}
            </Text>
            <Text style={st.fieldLabel}>Prenom</Text>
            <TextInput style={st.input} value={editPrenom} onChangeText={setEditPrenom} placeholder="Prenom" />
            <Text style={st.fieldLabel}>Nom complet</Text>
            <TextInput style={st.input} value={editNom} onChangeText={setEditNom} placeholder="Nom" />
            <Text style={st.fieldLabel}>Telephone</Text>
            <TextInput style={st.input} value={editTel} onChangeText={setEditTel} placeholder="Telephone" keyboardType="phone-pad" />
            <Text style={st.fieldLabel}>Email</Text>
            <TextInput style={st.input} value={editEmail} onChangeText={setEditEmail} placeholder="Email" keyboardType="email-address" />
            <Text style={st.fieldLabel}>Role</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: SPACING.md }}>
              {ROLES_LIST.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[st.chip, editRole === r && st.chipA]}
                  onPress={() => setEditRole(r)}
                >
                  <Text style={{
                    fontSize: 11, fontWeight: '600',
                    color: editRole === r ? '#fff' : COLORS.darkGray,
                  }}>
                    {RL[r] || r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={st.btnPri} onPress={handleSaveEditMember}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Enregistrer les modifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditMember(null)}>
              <Text style={{ textAlign: 'center', marginTop: 14, color: COLORS.gray }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STYLES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const st = StyleSheet.create({
  tabsBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 50 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 4 },
  mainTab: { paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center' },
  mainTabA: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  mainTabT: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },

  pageTitle: { fontSize: 17, fontWeight: '800', color: COLORS.darkGray, marginBottom: 2 },
  pageSub: { fontSize: 12, color: COLORS.gray, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.darkGray, marginBottom: SPACING.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  miniTitle: { fontSize: 13, fontWeight: '700', color: COLORS.darkGray, marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 4 },

  stepBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm },
  stepItem: { alignItems: 'center', width: 68 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#DEE2E6', marginHorizontal: 2 },
  stepLineDone: { backgroundColor: COLORS.secondary },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#E9ECEF', justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  stepCircleActive: { backgroundColor: COLORS.primary },
  stepCircleDone: { backgroundColor: COLORS.secondary },
  stepNum: { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  stepLabel: { fontSize: 9, color: COLORS.gray, textAlign: 'center' },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, fontSize: 14, marginBottom: 8, backgroundColor: '#FAFAFA',
  },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: SPACING.sm },
  yearChip: {
    paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#fff',
  },
  yearChipA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, marginRight: 6, backgroundColor: '#fff',
  },
  chipA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  seanceItem: {
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#fff',
  },
  seanceItemA: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border },
  radioA: { borderColor: '#fff', backgroundColor: '#fff' },

  createBox: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    padding: SPACING.sm, backgroundColor: '#FAFAFA', marginBottom: SPACING.sm,
    borderStyle: 'dashed',
  },

  btnPri: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  btnSec: {
    borderWidth: 1.5, borderColor: COLORS.secondary, borderRadius: 10,
    padding: 12, alignItems: 'center', backgroundColor: '#F0FFF4',
  },
  btnOutline: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10,
    padding: 14, alignItems: 'center', backgroundColor: '#fff',
  },
  btnDanger: { backgroundColor: COLORS.danger, borderRadius: 12, padding: 18, alignItems: 'center' },

  modeBtn: {
    flex: 1, padding: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff',
  },
  modeBtnA: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  fileBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center', backgroundColor: '#FAFAFA',
  },

  // ─── Spreadsheet ───
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  tCell: { paddingVertical: 6, paddingHorizontal: 3, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E8E8E8' },
  tNumCell: { width: 30 },
  tNameCell: { width: 100, alignItems: 'flex-start', paddingLeft: 6 },
  tSmCell: { width: 80 },
  tDataCell: { width: 100 },
  tRelCell: { width: 90, backgroundColor: 'rgba(230,57,70,0.04)' },
  tTotCell: { width: 100, backgroundColor: 'rgba(27,67,50,0.04)' },
  tHeader: { backgroundColor: COLORS.primary, paddingVertical: 8 },
  tHT: { fontSize: 10, fontWeight: '700', color: '#fff', textAlign: 'center' },
  tInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4,
    paddingVertical: 4, paddingHorizontal: 4, fontSize: 12, textAlign: 'center',
    width: 88, backgroundColor: '#fff',
  },
  tInputSm: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4,
    paddingVertical: 4, paddingHorizontal: 3, fontSize: 11, textAlign: 'center',
    width: 70, backgroundColor: '#fff',
  },
  tTotT: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },

  summaryRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  summaryCard: { flex: 1, minWidth: 70, borderRadius: 10, padding: 8, alignItems: 'center' },

  infoBox: { borderRadius: 10, padding: SPACING.sm, marginBottom: SPACING.sm },
  alertBox: { borderRadius: 10, padding: SPACING.sm, marginTop: SPACING.sm, borderWidth: 1 },

  pvTable: { gap: 4 },
  pvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  pvL: { fontSize: 13, color: COLORS.darkGray },
  pvV: { fontSize: 13, fontWeight: '700', color: COLORS.darkGray },
  pvMemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalSheet: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginHorizontal: 20, maxHeight: '90%' },
});
