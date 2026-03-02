import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Dimensions,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import SimpleBarChart from '../../components/common/SimpleBarChart';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';
import { webSafeInfo } from '../../utils/alert';

const ROLE_LABEL = {
  superadmin: 'Super Admin', president: 'Presidente',
  tresorier: 'Tresorier', secretaire: 'Secretaire', membre: 'Membre',
};
const TYPE_COLOR = { info: '#EAF4FF', urgent: '#FFF0F0', rapport: '#F0FFF4' };
const TYPE_ICON = { info: '📢', urgent: '⚠️', rapport: '📄' };

export default function DashboardScreen({ navigation }) {
  const { currentUser } = useAuth();
  const {
    membres, config, prets, recap, messages, seances,
    versements, remboursements,
    envoyerMessage, marquerLu,
  } = useApp();

  const [showCompose, setShowCompose] = useState(false);
  const [showMsg, setShowMsg] = useState(null);
  const [titreMsg, setTitreMsg] = useState('');
  const [contenuMsg, setContenuMsg] = useState('');
  const [typeMsg, setTypeMsg] = useState('info');

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  const pretsEnCours = (prets || []).filter(p => p.statut === 'en_cours');
  const totalPrets = pretsEnCours.reduce((s, p) => s + (p.montant_a_rembourser || 0), 0);

  // Count active members from recap
  const membresActifs = useMemo(() => {
    return (recap?.membresCalcul || []).filter(m => {
      const c = m.calcul || {};
      return (c.totalEpargne || 0) > 0 || (c.solde || 0) > 0;
    });
  }, [recap]);

  // Top epargnants from recap
  const topEpargnants = useMemo(() => {
    return (recap?.membresCalcul || [])
      .filter(m => (m.calcul?.solde || 0) > 0)
      .sort((a, b) => (b.calcul?.solde || 0) - (a.calcul?.solde || 0))
      .slice(0, 5);
  }, [recap]);

  // Next seance
  const prochaineSeance = useMemo(() => {
    const today = new Date().toISOString();
    const futures = (seances || []).filter(s => s.date >= today);
    return futures.length > 0 ? futures[0] : null;
  }, [seances]);

  // ── MON COMPTE ────────────────────────────────────────────────────────
  const monCalcul = useMemo(() => {
    if (!recap?.membresCalcul || !currentUser?.membreId) return null;
    return recap.membresCalcul.find(mc => mc.id === currentUser.membreId)?.calcul || null;
  }, [recap, currentUser?.membreId]);

  // Mes versements (10 derniers)
  const mesVersements = useMemo(() => {
    return (versements || [])
      .filter(v => v.membre_id === currentUser?.membreId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10);
  }, [versements, currentUser?.membreId]);

  // Mon pret en cours
  const monPret = useMemo(() => {
    return (prets || []).find(
      p => p.membre_id === currentUser?.membreId && p.statut === 'en_cours'
    ) || null;
  }, [prets, currentUser?.membreId]);

  // Total rembourse pour mon pret
  const monTotalRembourse = useMemo(() => {
    if (!monPret) return 0;
    return (remboursements || [])
      .filter(r => r.pret_id === monPret.id)
      .reduce((s, r) => s + (r.montant || 0), 0);
  }, [monPret, remboursements]);

  // Previsions fin d'annee
  const previsions = useMemo(() => {
    const annee = config?.annee_courante || new Date().getFullYear();
    const seancesAnnee = (seances || []).filter(s => s.annee === annee);
    const totalSeances = seancesAnnee.length || 4;
    const today = new Date().toISOString().slice(0, 10);
    const seancesPassees = seancesAnnee.filter(s => s.date <= today).length || 1;
    const seancesRestantes = Math.max(totalSeances - seancesPassees, 0);

    const totalEpargne = monCalcul?.totalEpargne || 0;
    const moyenneParSeance = seancesPassees > 0 ? totalEpargne / seancesPassees : 0;
    const projectionFinAnnee = Math.round(moyenneParSeance * totalSeances);

    return {
      totalSeances,
      seancesPassees,
      seancesRestantes,
      moyenneParSeance: Math.round(moyenneParSeance),
      projectionFinAnnee,
    };
  }, [seances, config, monCalcul]);

  // Donnees graphique epargne par seance
  const graphData = useMemo(() => {
    if (!currentUser?.membreId) return [];
    const annee = config?.annee_courante || new Date().getFullYear();
    const seancesAnnee = (seances || []).filter(s => s.annee === annee)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return seancesAnnee.map(s => {
      const total = (versements || [])
        .filter(v => v.membre_id === currentUser.membreId && v.seance_id === s.id)
        .reduce((acc, v) => acc + (v.montant || 0), 0);
      let lbl = s.date;
      try { lbl = new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); } catch {}
      return { label: lbl, value: total };
    }).filter(d => d.value > 0);
  }, [versements, seances, config, currentUser?.membreId]);

  // ── FIN MON COMPTE ────────────────────────────────────────────────────

  const canSendMessage = ['superadmin', 'president'].includes(currentUser?.role);
  const nonLus = (messages || []).filter(m => {
    const lus = Array.isArray(m.lus) ? m.lus : [];
    return !lus.includes(currentUser?.id);
  });

  const handleEnvoyer = () => {
    if (!titreMsg.trim() || !contenuMsg.trim()) {
      webSafeInfo('Champs requis', 'Titre et message sont obligatoires.');
      return;
    }
    envoyerMessage(titreMsg.trim(), contenuMsg.trim(), typeMsg);
    setShowCompose(false);
    setTitreMsg('');
    setContenuMsg('');
    setTypeMsg('info');
    webSafeInfo('Envoye', 'Votre message a ete envoye a tous les membres.');
  };

  const ouvrirMessage = (msg) => {
    setShowMsg(msg);
    marquerLu(msg.id, currentUser?.id);
  };

  const formatDate = (d) => {
    if (!d) return '--';
    try { return new Date(d).toLocaleDateString('fr-FR'); }
    catch { return d; }
  };

  const getSeanceDate = (seanceId) => {
    if (!seanceId) return '--';
    const s = (seances || []).find(sc => sc.id === seanceId);
    return s ? formatDate(s.date) : '--';
  };

  const typeLabel = (t) => {
    if (t === 'epargne' || !t) return 'Epargne';
    if (t === 'caisse_projet') return 'C. Projet';
    if (t === 'contribution') return 'Cotisation';
    return t;
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={[{ paddingBottom: 32 }, webStyle()]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.welcome}>
            Bonjour, {currentUser?.prenom || currentUser?.nom?.split(' ')[0]} 👋
          </Text>
          <Text style={s.role}>
            {ROLE_LABEL[currentUser?.role] || 'Membre'} - {config?.nom_caisse || 'Caisse POO NDJADJE'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {canSendMessage && (
            <TouchableOpacity style={s.composeFab} onPress={() => setShowCompose(true)}>
              <Text style={{ color: '#fff', fontSize: 18 }}>+💬</Text>
            </TouchableOpacity>
          )}
          <View style={{ position: 'relative' }}>
            <MemberAvatar member={{ ...currentUser, name: currentUser?.nom }} size={50} />
            {nonLus.length > 0 && (
              <View style={s.badge}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                  {nonLus.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION : MON COMPTE                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Text style={[s.secTitle, { marginBottom: 6 }]}>👤 Mon Compte</Text>

      {/* Ma situation financiere */}
      <Card style={{ backgroundColor: COLORS.primary }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 8 }}>
          💰 Ma situation - {recap?.annee || 2025}
        </Text>
        {[
          ['Epargne versee', formatMontant(monCalcul?.totalEpargne || 0) + ' F'],
          ['Interets nets', formatMontant(monCalcul?.interetNet || 0) + ' F'],
        ].map(([k, v], i) => (
          <View key={i} style={s.tRow}>
            <Text style={s.tLabel}>{k}</Text>
            <Text style={s.tVal}>{v}</Text>
          </View>
        ))}
        <View style={[s.tRow, {
          borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
          marginTop: 6, paddingTop: 6,
        }]}>
          <Text style={[s.tLabel, { fontWeight: '700', color: '#fff' }]}>MON SOLDE</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>
            {formatMontant(monCalcul?.solde || 0)} FCFA
          </Text>
        </View>
      </Card>

      {/* Engagements & Credits */}
      {monPret ? (
        <Card style={{ borderLeftWidth: 4, borderLeftColor: COLORS.danger, marginTop: SPACING.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.danger, marginBottom: 6 }}>
            💳 Mon credit en cours
          </Text>
          {[
            ['Capital emprunte', formatMontant(monPret.montant || 0) + ' F'],
            ['Interet (' + (monPret.taux || 7.5) + '%)', formatMontant(monPret.interet || 0) + ' F'],
            ['Total a rembourser', formatMontant(monPret.montant_a_rembourser || 0) + ' F'],
            ['Deja rembourse', formatMontant(monTotalRembourse) + ' F'],
          ].map(([k, v], i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>{k}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.darkGray }}>{v}</Text>
            </View>
          ))}
          <View style={{
            borderTopWidth: 1, borderTopColor: COLORS.border,
            marginTop: 6, paddingTop: 6,
            flexDirection: 'row', justifyContent: 'space-between',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.danger }}>Reste a payer</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.danger }}>
              {formatMontant(Math.max((monPret.montant_a_rembourser || 0) - monTotalRembourse, 0))} F
            </Text>
          </View>
        </Card>
      ) : (
        <Card style={{ marginTop: SPACING.sm, borderLeftWidth: 4, borderLeftColor: COLORS.secondary }}>
          <Text style={{ fontSize: 13, color: COLORS.secondary, fontWeight: '600' }}>
            ✅ Aucun credit en cours
          </Text>
        </Card>
      )}

      {/* Previsions fin d'annee */}
      <Card style={{ marginTop: SPACING.sm }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkGray, marginBottom: 8 }}>
          🔮 Previsions fin d'annee
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
          <View style={s.miniKpi}>
            <Text style={s.miniKpiV}>{formatMontant(previsions.moyenneParSeance)}</Text>
            <Text style={s.miniKpiL}>Moy. / seance</Text>
          </View>
          <View style={s.miniKpi}>
            <Text style={[s.miniKpiV, { color: COLORS.secondary }]}>
              {formatMontant(previsions.projectionFinAnnee)}
            </Text>
            <Text style={s.miniKpiL}>Projection annee</Text>
          </View>
          <View style={s.miniKpi}>
            <Text style={[s.miniKpiV, { color: COLORS.accent }]}>{previsions.seancesRestantes}</Text>
            <Text style={s.miniKpiL}>Seances restantes</Text>
          </View>
        </View>
      </Card>

      {/* Evolution epargne par seance */}
      {graphData.length > 0 && (
        <Card style={{ marginTop: SPACING.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.darkGray, marginBottom: 6 }}>
            📈 Mes versements par seance
          </Text>
          <SimpleBarChart data={graphData} color={COLORS.secondary} />
        </Card>
      )}

      {/* Historique des versements */}
      {mesVersements.length > 0 && (
        <>
          <Text style={[s.secTitle, { marginTop: SPACING.md }]}>📊 Mes derniers versements</Text>
          {mesVersements.map(d => (
            <Card key={d.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.darkGray, fontWeight: '600' }}>
                  {typeLabel(d.type)}
                </Text>
                <Text style={{ fontSize: 10, color: COLORS.gray }}>
                  Seance {getSeanceDate(d.seance_id)} - {d.annee}
                </Text>
              </View>
              <Text style={{ fontWeight: '700', color: COLORS.primary, fontSize: 14 }}>
                +{formatMontant(d.montant || 0)} F
              </Text>
            </Card>
          ))}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION : VUE GLOBALE                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={{
        borderTopWidth: 2, borderTopColor: COLORS.border,
        marginTop: SPACING.lg, paddingTop: SPACING.md,
      }}>
        <Text style={[s.secTitle, { marginBottom: 6 }]}>🏦 Vue globale de la caisse</Text>
      </View>

      {/* Carte recap financier */}
      <Card style={s.tCard}>
        <Text style={s.tName}>📊 Recap {recap?.annee || 2025}</Text>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Epargne totale</Text>
          <Text style={s.tVal}>{formatMontant(recap?.totalEpargne || 0)} FCFA</Text>
        </View>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Interets epargne</Text>
          <Text style={[s.tVal, { color: '#A8D5BA' }]}>
            {formatMontant(recap?.totalInterets || 0)} FCFA
          </Text>
        </View>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Retenues ({config?.taux_retenue_epargne || 1.5}%)</Text>
          <Text style={[s.tVal, { color: '#ffc8a0' }]}>
            {formatMontant(recap?.totalRetenues || 0)} FCFA
          </Text>
        </View>
        <View style={[s.tRow, {
          borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
          marginTop: 8, paddingTop: 8,
        }]}>
          <Text style={[s.tLabel, { fontWeight: '700', color: '#fff' }]}>SOLDE TOTAL</Text>
          <Text style={[s.tVal, { fontSize: 18, fontWeight: '800', color: '#fff' }]}>
            {formatMontant(recap?.totalSoldes || 0)} FCFA
          </Text>
        </View>
      </Card>

      {/* KPIs */}
      <View style={[s.kpiRow, isDesktop && { flexDirection: 'row' }]}>
        <Card style={[s.kpi, !isDesktop && { width: '100%' }]}>
          <Text style={s.kpiV}>{membresActifs.length}</Text>
          <Text style={s.kpiL}>Membres actifs</Text>
        </Card>
        <Card style={[s.kpi, !isDesktop && { width: '100%' }]}>
          <Text style={[s.kpiV, { color: COLORS.danger }]}>{pretsEnCours.length}</Text>
          <Text style={s.kpiL}>Prets en cours</Text>
        </Card>
        <Card style={[s.kpi, !isDesktop && { width: '100%' }]}>
          <Text style={[s.kpiV, { color: COLORS.accent, fontSize: 14 }]}>
            {formatMontant(totalPrets)}
          </Text>
          <Text style={s.kpiL}>F a rembourser</Text>
        </Card>
      </View>

      {/* Prochaine seance */}
      <TouchableOpacity style={s.nextSeance}>
        <Text style={s.nextT}>📅 Prochaine seance</Text>
        <Text style={s.nextD}>
          {prochaineSeance ? formatDate(prochaineSeance.date) : 'Non programmee'}
        </Text>
        <Text style={[s.nextT, { fontSize: 12, marginTop: 4, opacity: 0.8 }]}>
          Taux epargne : {config?.taux_interet_epargne_brut || 7.5}% - Pret : {config?.taux_interet_pret || 7.5}% - Retenue : {config?.taux_retenue_epargne || 1.5}%
        </Text>
      </TouchableOpacity>

      {/* Top epargnants */}
      <Text style={s.secTitle}>🏆 Top epargnants {recap?.annee || 2025}</Text>
      {topEpargnants.map((m, i) => (
        <Card
          key={m.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm }}
        >
          <Text style={{ fontSize: 18, width: 28, textAlign: 'center' }}>
            {['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}
          </Text>
          <MemberAvatar member={{ ...m, name: m.nom }} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={s.mName}>{m.nom}</Text>
            <Text style={{ fontSize: 11, color: COLORS.secondary }}>
              Epargne: {formatMontant(m.calcul?.totalEpargne || 0)} - Interets: {formatMontant(m.calcul?.interetNet || 0)} FCFA
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>
            {formatMontant(m.calcul?.solde || 0)}
          </Text>
        </Card>
      ))}

      {/* Alerte prets */}
      {pretsEnCours.length > 0 && (
        <TouchableOpacity style={s.alert} onPress={() => navigation && navigation.navigate('Prets')}>
          <Text style={s.alertT}>
            ⚠️  {pretsEnCours.length} pret(s) en cours - {formatMontant(recap?.totalARembourser || 0)} FCFA
          </Text>
          <Text style={s.alertC}>Voir</Text>
        </TouchableOpacity>
      )}

      {/* Messages du bureau */}
      {(messages || []).length > 0 && (
        <>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.xs,
          }}>
            <Text style={s.secTitle}>📬 Messages du bureau</Text>
            {nonLus.length > 0 && (
              <View style={{
                backgroundColor: COLORS.primary, borderRadius: 10,
                paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  {nonLus.length} non lu{nonLus.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          {(messages || []).slice(0, 5).map(msg => {
            const lus = Array.isArray(msg.lus) ? msg.lus : [];
            const lu = lus.includes(currentUser?.id);
            return (
              <TouchableOpacity
                key={msg.id}
                style={[
                  s.msgCard,
                  { backgroundColor: TYPE_COLOR[msg.type] || '#EAF4FF' },
                  !lu && { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
                ]}
                onPress={() => ouvrirMessage(msg)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
                  <Text style={{ fontSize: 22 }}>{TYPE_ICON[msg.type] || '📢'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13, fontWeight: lu ? '500' : '800',
                        color: COLORS.darkGray,
                      }}
                      numberOfLines={1}
                    >
                      {msg.titre}
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}
                      numberOfLines={2}
                    >
                      {msg.contenu}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray, marginTop: 4 }}>
                      {formatDate(msg.created_at)} {lu ? '- Lu' : '- Non lu'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Modal lecture message */}
      <Modal visible={!!showMsg} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
            <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>
              {TYPE_ICON[showMsg?.type] || '📢'}
            </Text>
            <Text style={{
              fontSize: 16, fontWeight: '800', color: COLORS.darkGray,
              marginBottom: 4, textAlign: 'center',
            }}>
              {showMsg?.titre}
            </Text>
            <Text style={{
              fontSize: 11, color: COLORS.secondary, textAlign: 'center',
              marginBottom: SPACING.md,
            }}>
              {formatDate(showMsg?.created_at)}
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={{ fontSize: 14, color: COLORS.darkGray, lineHeight: 22 }}>
                {showMsg?.contenu}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primary, borderRadius: 8,
                padding: 14, alignItems: 'center', marginTop: SPACING.md,
              }}
              onPress={() => setShowMsg(null)}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal composer message */}
      <Modal visible={showCompose} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView
            contentContainerStyle={[
              s.modal,
              isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' },
            ]}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm }}>
              💬 Envoyer un message
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: SPACING.md }}>
              Visible par tous les membres des la prochaine connexion.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 4 }}>
              Type de message
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.sm }}>
              {[['info', '📢 Info'], ['urgent', '⚠️ Urgent'], ['rapport', '📄 Rapport']].map(([t, l]) => (
                <TouchableOpacity
                  key={t}
                  style={{
                    flex: 1, padding: 8, borderRadius: 8, alignItems: 'center',
                    backgroundColor: typeMsg === t ? COLORS.primary : '#F8F9FA',
                    borderWidth: 1, borderColor: typeMsg === t ? COLORS.primary : COLORS.border,
                  }}
                  onPress={() => setTypeMsg(t)}
                >
                  <Text style={{
                    fontSize: 11, fontWeight: '600',
                    color: typeMsg === t ? '#fff' : COLORS.darkGray,
                  }}>
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 4 }}>
              Titre *
            </Text>
            <TextInput
              style={s.inp}
              placeholder="Ex: Prochaine seance confirmee"
              value={titreMsg}
              onChangeText={setTitreMsg}
              maxLength={80}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 4, marginTop: 8 }}>
              Message *
            </Text>
            <TextInput
              style={[s.inp, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Redigez votre message..."
              value={contenuMsg}
              onChangeText={setContenuMsg}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primary, borderRadius: 8,
                padding: 14, alignItems: 'center', marginTop: SPACING.md,
              }}
              onPress={handleEnvoyer}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                📤 Envoyer a tous
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCompose(false)}>
              <Text style={{ textAlign: 'center', marginTop: 14, color: COLORS.gray }}>
                Annuler
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.md,
  },
  welcome: { fontSize: 22, fontWeight: '700', color: COLORS.darkGray },
  role: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  tCard: { backgroundColor: COLORS.primary, marginBottom: SPACING.sm },
  tName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: SPACING.sm },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  tLabel: { fontSize: 12, color: '#A8D5BA' },
  tVal: { fontSize: 13, fontWeight: '600', color: '#fff' },
  kpiRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  kpi: { flex: 1, minWidth: 100, alignItems: 'center', paddingVertical: SPACING.md },
  kpiV: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  kpiL: { fontSize: 10, color: COLORS.gray, textAlign: 'center', marginTop: 2 },
  miniKpi: {
    flex: 1, minWidth: 90, backgroundColor: '#F8FAF9', borderRadius: 10,
    padding: SPACING.sm, alignItems: 'center',
  },
  miniKpiV: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  miniKpiL: { fontSize: 9, color: COLORS.gray, textAlign: 'center', marginTop: 2 },
  nextSeance: {
    backgroundColor: '#EAF4FF', borderRadius: 12, padding: SPACING.md,
    marginBottom: SPACING.md, borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  nextT: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  nextD: { fontSize: 20, fontWeight: '800', color: COLORS.darkGray, marginTop: 2 },
  secTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.darkGray,
    marginBottom: SPACING.xs,
  },
  mName: { fontSize: 14, fontWeight: '600', color: COLORS.darkGray },
  alert: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF3CD', borderRadius: 10, padding: SPACING.md,
    marginTop: SPACING.md, borderLeftWidth: 4, borderLeftColor: '#FFC107',
  },
  alertT: { fontSize: 12, color: '#856404', flex: 1 },
  alertC: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  composeFab: {
    backgroundColor: COLORS.primary, borderRadius: 20, width: 38, height: 38,
    justifyContent: 'center', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.danger,
    borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 3,
  },
  msgCard: {
    borderRadius: 12, padding: SPACING.sm, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, elevation: 2,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: SPACING.md,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 20, padding: SPACING.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, elevation: 16,
  },
  inp: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 13, fontSize: 14, marginBottom: 4,
  },
});
