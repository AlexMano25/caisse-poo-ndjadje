import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Dimensions, Platform,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import SimpleBarChart from '../../components/common/SimpleBarChart';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';
import { webSafeInfo } from '../../utils/alert';
import { exporterRapportAnnuel } from '../../utils/pdfExport';

const formatDate = (d) => {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('fr-FR'); }
  catch { return '--'; }
};

export default function ReportsScreen() {
  const { currentUser, peutFaire } = useAuth();
  const {
    rapports, publierRapport, membres, seances,
    config, recap, prets, remboursements, versements, fonds,
  } = useApp();

  const canWrite = peutFaire('publierRapport');
  const reports = rapports || [];

  const [activeTab, setActiveTab] = useState('synthese');
  const [selRpt, setSelRpt] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  // ── Analytics data ──────────────────────────────────────────────────
  const pretsEnCours = useMemo(() => {
    return (prets || []).filter(p => p.statut === 'en_cours');
  }, [prets]);

  const creditsDetail = useMemo(() => {
    return pretsEnCours.map(p => {
      const m = (membres || []).find(mb => mb.id === p.membre_id);
      const totalRemb = (remboursements || [])
        .filter(r => r.pret_id === p.id)
        .reduce((s, r) => s + (r.montant || 0), 0);
      const reste = Math.max((p.montant_a_rembourser || 0) - totalRemb, 0);
      return { ...p, membreNom: m?.nom || '--', totalRembourse: totalRemb, reste };
    });
  }, [pretsEnCours, remboursements, membres]);

  const caisseProjetTotal = useMemo(() => {
    return (versements || [])
      .filter(v => v.type === 'caisse_projet')
      .reduce((s, v) => s + (v.montant || 0), 0);
  }, [versements]);

  // Top 10 epargnants for chart
  const topMembresChart = useMemo(() => {
    return (recap?.membresCalcul || [])
      .filter(m => m.actif !== false && (m.calcul?.solde || 0) > 0)
      .sort((a, b) => (b.calcul?.solde || 0) - (a.calcul?.solde || 0))
      .slice(0, 10)
      .map(m => ({
        label: (m.nom || '').split(' ')[0],
        value: m.calcul?.solde || 0,
      }));
  }, [recap]);

  // ── Helpers ─────────────────────────────────────────────────────────
  const getAuthorName = useCallback((auteurId) => {
    if (!auteurId) return '--';
    const membre = (membres || []).find(m => m.id === auteurId);
    if (membre) return `${membre.prenom || ''} ${membre.nom || ''}`.trim();
    return '--';
  }, [membres]);

  const getSessionNumber = useCallback((rpt, index) => {
    if (rpt.seance_id && seances) {
      const seanceIndex = seances.findIndex(s => s.id === rpt.seance_id);
      if (seanceIndex !== -1) return seanceIndex + 1;
    }
    return index + 1;
  }, [seances]);

  const handlePublish = () => {
    if (!title.trim() || !content.trim()) {
      webSafeInfo('Erreur', 'Titre et contenu requis.');
      return;
    }
    publierRapport(title, content);
    setShowNew(false);
    setTitle('');
    setContent('');
    webSafeInfo('Archive', 'Rapport publie et visible par tous les membres.');
  };

  const handleExportPDF = () => {
    if (Platform.OS !== 'web') {
      webSafeInfo('Info', 'Export PDF disponible uniquement sur la version web.');
      return;
    }
    exporterRapportAnnuel({ config, recap, prets, remboursements, versements, membres, fonds });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 100 }, webStyle()]}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.primary }}>
          Rapports & Syntheses
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: SPACING.sm }}>
          Annee {config?.annee_courante || 2025}
        </Text>

        {/* Tabs */}
        <View style={st.tabRow}>
          {[['synthese', '📊 Synthese'], ['archives', '📄 Archives']].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[st.tab, activeTab === key && st.tabActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[st.tabT, activeTab === key && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ TAB: SYNTHESE ═══ */}
        {activeTab === 'synthese' && (
          <>
            {/* KPI row */}
            <View style={st.kpiRow}>
              <Card style={st.kpiCard}>
                <Text style={st.kpiVal}>{formatMontant(recap?.totalEpargne || 0)}</Text>
                <Text style={st.kpiLbl}>Epargne totale</Text>
              </Card>
              <Card style={st.kpiCard}>
                <Text style={[st.kpiVal, { color: COLORS.secondary }]}>
                  {formatMontant(recap?.totalInterets || 0)}
                </Text>
                <Text style={st.kpiLbl}>Interets nets</Text>
              </Card>
              <Card style={st.kpiCard}>
                <Text style={[st.kpiVal, { fontSize: 16 }]}>
                  {formatMontant(recap?.totalSoldes || 0)}
                </Text>
                <Text style={st.kpiLbl}>Solde total</Text>
              </Card>
            </View>

            <View style={st.kpiRow}>
              <Card style={st.kpiCard}>
                <Text style={[st.kpiVal, { color: COLORS.accent }]}>
                  {formatMontant(recap?.totalRetenues || 0)}
                </Text>
                <Text style={st.kpiLbl}>Retenues</Text>
              </Card>
              <Card style={st.kpiCard}>
                <Text style={[st.kpiVal, { color: COLORS.primary }]}>
                  {formatMontant(caisseProjetTotal)}
                </Text>
                <Text style={st.kpiLbl}>Caisse Projet</Text>
              </Card>
              <Card style={st.kpiCard}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>
                  {(recap?.membresCalcul || []).filter(m => m.actif !== false).length}
                </Text>
                <Text style={st.kpiLbl}>Cotisants</Text>
              </Card>
            </View>

            {/* Top 10 epargne chart */}
            <Card style={{ marginTop: SPACING.sm }}>
              <Text style={st.cardTitle}>🏆 Top 10 - Solde par membre</Text>
              <SimpleBarChart data={topMembresChart} color={COLORS.primary} />
            </Card>

            {/* Credits non soldes */}
            <Card style={{ marginTop: SPACING.sm }}>
              <Text style={st.cardTitle}>
                ⚠️ Credits non soldes ({creditsDetail.length})
              </Text>
              {creditsDetail.length === 0 ? (
                <Text style={{ color: COLORS.secondary, fontSize: 13, fontWeight: '600' }}>
                  ✅ Aucun credit en cours
                </Text>
              ) : (
                <>
                  {/* Header */}
                  <View style={[st.tableRow, { backgroundColor: COLORS.primary }]}>
                    <Text style={[st.tableCell, st.tableHdr, { flex: 2 }]}>Membre</Text>
                    <Text style={[st.tableCell, st.tableHdr]}>Capital</Text>
                    <Text style={[st.tableCell, st.tableHdr]}>Remb.</Text>
                    <Text style={[st.tableCell, st.tableHdr]}>Reste</Text>
                  </View>
                  {creditsDetail.map((c, i) => (
                    <View key={c.id} style={[st.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#F8FAF9' }]}>
                      <Text style={[st.tableCell, { flex: 2, fontSize: 11 }]} numberOfLines={1}>
                        {c.membreNom}
                      </Text>
                      <Text style={[st.tableCell, { fontSize: 10 }]}>
                        {formatMontant(c.montant || 0)}
                      </Text>
                      <Text style={[st.tableCell, { fontSize: 10, color: COLORS.secondary }]}>
                        {formatMontant(c.totalRembourse)}
                      </Text>
                      <Text style={[st.tableCell, { fontSize: 11, fontWeight: '700', color: COLORS.danger }]}>
                        {formatMontant(c.reste)}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </Card>

            {/* Export PDF button */}
            <TouchableOpacity style={st.exportBtn} onPress={handleExportPDF}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                📥 Telecharger le rapport annuel (PDF)
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ═══ TAB: ARCHIVES ═══ */}
        {activeTab === 'archives' && (
          <>
            <View style={isDesktop ? st.gridDesktop : null}>
              {reports.length === 0 ? (
                <Card>
                  <Text style={{ textAlign: 'center', color: COLORS.gray }}>
                    Aucun rapport archive pour le moment.
                  </Text>
                </Card>
              ) : (
                reports.map((rpt, index) => (
                  <Card key={rpt.id} style={isDesktop ? { width: '48%' } : null}>
                    <TouchableOpacity onPress={() => setSelRpt(rpt)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                        <View style={{
                          width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                            #{getSessionNumber(rpt, index)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkGray }}>
                            {rpt.titre}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>
                            📅 {formatDate(rpt.created_at)} - {getAuthorName(rpt.auteur_id)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 22, color: COLORS.gray }}>{'>'}</Text>
                      </View>
                      <View style={{
                        marginTop: 8, backgroundColor: '#F0FFF4', borderRadius: 6,
                        paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
                      }}>
                        <Text style={{ fontSize: 11, color: COLORS.secondary, fontWeight: '600' }}>
                          Archive & Publie
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Card>
                ))
              )}
            </View>

            {canWrite && (
              <TouchableOpacity
                style={[st.exportBtn, { marginTop: SPACING.md }]}
                onPress={() => setShowNew(true)}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  + Nouveau Rapport
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal lecture rapport */}
      <Modal visible={!!selRpt} transparent animationType="fade">
        <View style={st.overlay}>
          <View style={[st.box, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
            <ScrollView>
              <Text style={st.mTitle}>{selRpt?.titre}</Text>
              <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: SPACING.sm }}>
                📅 {formatDate(selRpt?.created_at)} - {selRpt ? getAuthorName(selRpt.auteur_id) : '--'}
              </Text>
              <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm }} />
              <Text style={{ fontSize: 13, color: COLORS.darkGray, lineHeight: 22 }}>
                {selRpt?.contenu}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{
                marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 8,
                padding: SPACING.sm, alignItems: 'center',
              }}
              onPress={() => setSelRpt(null)}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal nouveau rapport */}
      <Modal visible={showNew} transparent animationType="slide">
        <View style={st.overlay}>
          <View style={[st.box, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
            <Text style={st.mTitle}>📝 Nouveau Rapport de Seance</Text>
            <TextInput
              style={st.input}
              placeholder="Titre du rapport"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[st.input, { height: 160, textAlignVertical: 'top' }]}
              placeholder="Contenu (decisions, presents, montants...)"
              multiline
              value={content}
              onChangeText={setContent}
            />
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, borderRadius: 8, padding: 16, alignItems: 'center' }}
              onPress={handlePublish}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                Publier & Archiver
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <Text style={{ textAlign: 'center', marginTop: 16, color: COLORS.gray }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: SPACING.md,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabT: { fontSize: 13, fontWeight: '700', color: COLORS.darkGray },
  kpiRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xs,
  },
  kpiCard: {
    flex: 1, minWidth: 90, alignItems: 'center', paddingVertical: SPACING.sm,
  },
  kpiVal: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  kpiLbl: { fontSize: 9, color: COLORS.gray, textAlign: 'center', marginTop: 2 },
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.darkGray, marginBottom: SPACING.sm,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderColor: '#f0f0f0',
  },
  tableCell: {
    flex: 1, padding: 8, textAlign: 'right', color: COLORS.darkGray,
  },
  tableHdr: {
    color: '#fff', fontWeight: '700', fontSize: 10, textAlign: 'center',
  },
  exportBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: SPACING.md,
  },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', padding: 16,
  },
  box: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32, maxHeight: '90%',
  },
  mTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 16, marginBottom: 8, fontSize: 13,
  },
});
