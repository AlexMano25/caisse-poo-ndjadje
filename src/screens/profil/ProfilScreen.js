import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

const ROLE_LABEL = {
  superadmin: 'Super Admin', president: '👑 Presidente',
  tresorier: '💼 Tresorier', secretaire: '📝 Secretaire', membre: '👤 Membre',
};

export default function ProfilScreen({ navigation }) {
  const { currentUser, logout, mettreAJourProfil, changerMotDePasse } = useAuth();
  const { membres, versements, prets, rapports, seances, recap } = useApp();

  const [showEdit, setShowEdit] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showAnnonce, setShowAnnonce] = useState(false);
  const [nom, setNom] = useState(currentUser?.nom || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [telephone, setTelephone] = useState(currentUser?.telephone || '');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [montantAnn, setMontantAnn] = useState('');

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  const m = (membres || []).find(x => x.id === currentUser?.membreId) || {};
  const mesDepots = (versements || []).filter(h => h.membre_id === currentUser?.membreId);
  const monPret = (prets || []).find(p => p.membre_id === currentUser?.membreId && p.statut === 'en_cours');

  // Get financial data from recap.membresCalcul
  const monCalcul = useMemo(() => {
    if (!recap?.membresCalcul || !currentUser?.membreId) return null;
    return recap.membresCalcul.find(mc => mc.id === currentUser.membreId)?.calcul || null;
  }, [recap, currentUser?.membreId]);

  // Next upcoming seance
  const prochaineSeance = useMemo(() => {
    if (!seances || seances.length === 0) return null;
    const today = new Date().toISOString().slice(0, 10);
    const futures = seances
      .filter(s => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    return futures.length > 0 ? futures[0] : null;
  }, [seances]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper to look up seance date by seance_id
  const getSeanceDate = (seanceId) => {
    if (!seances || !seanceId) return '--';
    const s = seances.find(sc => sc.id === seanceId);
    return s ? formatDate(s.date) : '--';
  };

  // Helper to look up member name by id
  const getMembreNom = (membreId) => {
    if (!membres || !membreId) return '--';
    const mb = membres.find(x => x.id === membreId);
    return mb ? `${mb.prenom || ''} ${mb.nom || ''}`.trim() : '--';
  };

  const sauvegarder = () => {
    mettreAJourProfil(currentUser.id, { nom, email, telephone });
    setShowEdit(false);
    Alert.alert('Profil mis a jour');
  };

  const majMotDePasse = () => {
    if (newPwd.length < 6) { Alert.alert('Trop court', 'Min. 6 caracteres'); return; }
    if (newPwd !== confPwd) { Alert.alert('Erreur', 'Mots de passe differents'); return; }
    changerMotDePasse(currentUser.id, newPwd);
    setShowPwd(false);
    setNewPwd('');
    setConfPwd('');
    Alert.alert('Mot de passe mis a jour');
  };

  const intEstime = montantAnn ? Math.round(parseInt(montantAnn) * 0.075) : 0;

  const prochaineSeanceLabel = prochaineSeance
    ? formatDate(prochaineSeance.date)
    : '--';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 80 }, webStyle()]}
    >
      {/* En-tete */}
      <Card style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
        <MemberAvatar member={{ ...currentUser, name: currentUser?.nom }} size={80} />
        <Text style={{
          fontSize: 22, fontWeight: '800', color: COLORS.darkGray, marginTop: SPACING.sm,
        }}>
          {currentUser?.nom}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.secondary, marginTop: 2 }}>
          {ROLE_LABEL[currentUser?.role]}
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>@{currentUser?.login}</Text>
        <View style={{ width: isDesktop ? '40%' : '80%', marginTop: SPACING.md }}>
          <CreditScoreBar score={currentUser?.creditScore || 50} />
        </View>
        <View style={{
          flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md,
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <TouchableOpacity style={st.btnSec} onPress={() => setShowEdit(true)}>
            <Text style={st.btnSecT}>Modifier profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.btnSec} onPress={() => setShowPwd(true)}>
            <Text style={st.btnSecT}>Mot de passe</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Coordonnees */}
      <Card style={{ marginTop: SPACING.sm }}>
        {[['Email', currentUser?.email], ['Telephone', currentUser?.telephone]].map(([k, v], i) => (
          <View key={i} style={st.row}>
            <Text style={st.lbl}>{k}</Text>
            <Text style={st.val}>{v || '--'}</Text>
          </View>
        ))}
      </Card>

      {/* Situation */}
      <Text style={st.sec}>📊 Ma situation</Text>
      <Card>
        {[
          ['Epargne versee', formatMontant(monCalcul?.totalEpargne || 0) + ' FCFA'],
          ['Interets', formatMontant(monCalcul?.interetNet || 0) + ' FCFA'],
          ['Mon solde', formatMontant(monCalcul?.solde || 0) + ' FCFA'],
        ].map(([k, v], i) => (
          <View key={i} style={st.row}>
            <Text style={st.lbl}>{k}</Text>
            <Text style={[st.val, i === 2 && { fontWeight: '800', color: COLORS.primary, fontSize: 14 }]}>
              {v}
            </Text>
          </View>
        ))}
      </Card>

      {/* Pret en cours */}
      {monPret && (
        <Card style={{ borderLeftWidth: 4, borderLeftColor: COLORS.danger, marginTop: SPACING.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.danger, marginBottom: 6 }}>
            ⚠️ Mon pret en cours
          </Text>
          <View style={st.row}>
            <Text style={st.lbl}>Capital</Text>
            <Text style={st.val}>{formatMontant(monPret.montant)} FCFA</Text>
          </View>
          <View style={st.row}>
            <Text style={st.lbl}>Interets</Text>
            <Text style={st.val}>{formatMontant(monPret.interet)} FCFA</Text>
          </View>
          <View style={[st.row, {
            borderTopWidth: 1, borderTopColor: COLORS.border,
            marginTop: 4, paddingTop: 6,
          }]}>
            <Text style={[st.lbl, { fontWeight: '700' }]}>A rembourser</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.danger }}>
              {formatMontant(monPret.montant_a_rembourser)} FCFA
            </Text>
          </View>
        </Card>
      )}

      {/* Annonce pret */}
      <TouchableOpacity style={st.announce} onPress={() => setShowAnnonce(true)}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>
          💬 Annoncer mon besoin de pret
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
          Prochaine seance : {prochaineSeanceLabel}
        </Text>
      </TouchableOpacity>

      {/* Historique */}
      <Text style={st.sec}>📋 Mes versements</Text>
      {mesDepots.length === 0
        ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: 'center' }}>Aucun versement.</Text>
          </Card>
        )
        : mesDepots.map(d => (
          <Card key={d.id} style={{ flexDirection: 'row', paddingVertical: SPACING.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: COLORS.darkGray }}>Seance {getSeanceDate(d.seance_id)}</Text>
              <Text style={{ fontSize: 10, color: COLORS.gray }}>{d.type || 'Epargne'} - {d.annee}</Text>
            </View>
            <Text style={{ fontWeight: '700', color: COLORS.primary }}>
              +{formatMontant(d.montant || 0)} F
            </Text>
          </Card>
        ))
      }

      {/* PV / Rapports */}
      <Text style={st.sec}>📄 Rapports & PV</Text>
      {(rapports || []).map(r => (
        <Card key={r.id} style={{ paddingVertical: SPACING.sm }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.darkGray }}>{r.titre}</Text>
          <Text style={{ fontSize: 10, color: COLORS.gray }}>📅 {formatDate(r.created_at)} - {getMembreNom(r.auteur_id)}</Text>
        </Card>
      ))}

      {/* Deconnexion */}
      <TouchableOpacity
        style={st.btnLogout}
        onPress={() =>
          Alert.alert('Deconnexion', 'Confirmer ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Oui', onPress: logout },
          ])
        }
      >
        <Text style={st.btnLogoutT}>Se deconnecter</Text>
      </TouchableOpacity>

      {/* Modal profil */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.modal, isDesktop && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
            <Text style={st.mTitre}>Modifier mon profil</Text>
            {[
              ['Nom complet', nom, setNom, 'words'],
              ['Email', email, setEmail, 'email-address'],
              ['Telephone', telephone, setTelephone, 'phone-pad'],
            ].map(([ph, val, set, kbT], i) => (
              <TextInput
                key={i}
                style={st.inp}
                placeholder={ph}
                value={val}
                onChangeText={set}
                autoCapitalize={kbT === 'words' ? 'words' : 'none'}
                keyboardType={kbT !== 'words' ? kbT : 'default'}
              />
            ))}
            <TouchableOpacity style={st.btnPri} onPress={sauvegarder}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text style={st.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal mot de passe */}
      <Modal visible={showPwd} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.modal, isDesktop && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
            <Text style={st.mTitre}>Changer le mot de passe</Text>
            <TextInput
              style={st.inp}
              placeholder="Nouveau mot de passe"
              secureTextEntry
              value={newPwd}
              onChangeText={setNewPwd}
            />
            <TextInput
              style={st.inp}
              placeholder="Confirmer"
              secureTextEntry
              value={confPwd}
              onChangeText={setConfPwd}
            />
            <TouchableOpacity style={st.btnPri} onPress={majMotDePasse}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Mettre a jour</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPwd(false)}>
              <Text style={st.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal annonce */}
      <Modal visible={showAnnonce} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.modal, isDesktop && { maxWidth: 440, alignSelf: 'center', width: '100%' }]}>
            <Text style={st.mTitre}>💬 Mon besoin de pret</Text>
            <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: SPACING.sm }}>
              Seance du {prochaineSeanceLabel}
            </Text>
            <TextInput
              style={st.inp}
              placeholder="Montant souhaite (FCFA)"
              keyboardType="numeric"
              value={montantAnn}
              onChangeText={setMontantAnn}
            />
            {parseInt(montantAnn) > 0 && (
              <View style={{ backgroundColor: '#FFF3CD', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#856404' }}>
                  Interets (7,5%/trim.) : {formatMontant(intEstime)} FCFA{'\n'}
                  Total : {formatMontant(parseInt(montantAnn) + intEstime)} FCFA
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={st.btnPri}
              onPress={() => {
                Alert.alert('Annonce enregistree', 'Votre demande a ete transmise au bureau.');
                setShowAnnonce(false);
                setMontantAnn('');
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Envoyer l'annonce</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAnnonce(false)}>
              <Text style={st.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  sec: {
    fontSize: 14, fontWeight: '700', color: COLORS.darkGray,
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  lbl: { fontSize: 12, color: COLORS.gray },
  val: { fontSize: 12, color: COLORS.darkGray },
  btnSec: {
    backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  btnSecT: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  announce: {
    backgroundColor: '#EAF4FF', borderRadius: 12, padding: SPACING.md,
    marginTop: SPACING.sm, borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  btnLogout: {
    marginTop: SPACING.xl, backgroundColor: '#FFF0F0', borderRadius: 10,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.danger,
  },
  btnLogoutT: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  mTitre: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.md },
  inp: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 13, fontSize: 14, marginBottom: 10,
  },
  btnPri: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  cancel: { textAlign: 'center', marginTop: 14, color: COLORS.gray },
});
