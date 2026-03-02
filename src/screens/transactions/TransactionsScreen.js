import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Dimensions,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

const TYPE_ICON = {
  epargne: '💰', sanction: '⚠️', pret: '💳', remboursement: '✅',
};
const TYPE_LABEL = {
  epargne: 'Epargne', sanction: 'Sanction', pret: 'Pret', remboursement: 'Remboursement',
};

const formatDate = (d) => {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('fr-FR');
  } catch {
    return '--';
  }
};

export default function TransactionsScreen() {
  const { currentUser } = useAuth();
  const { versements, prets, remboursements, sanctions, membres, seances } = useApp();

  const [filterMembre, setFilterMembre] = useState('');
  const [filterType, setFilterType] = useState('all');

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  const getMembreName = (membreId) =>
    (membres || []).find(m => m.id === membreId)?.nom || '--';

  const getSeanceDate = (seanceId) => {
    const seance = (seances || []).find(s => s.id === seanceId);
    return seance ? seance.date : null;
  };

  // Combine all transactions
  const allTransactions = useMemo(() => {
    const txns = [];

    // Versements -> epargne
    (versements || []).forEach(v => {
      txns.push({
        id: `v-${v.id}`,
        type: 'epargne',
        nom: getMembreName(v.membre_id),
        membreId: v.membre_id,
        montant: v.montant || 0,
        date: v.date || getSeanceDate(v.seance_id) || null,
        annee: v.annee || null,
        motif: null,
      });
    });

    // Prets
    (prets || []).forEach(p => {
      txns.push({
        id: `p-${p.id}`,
        type: 'pret',
        nom: getMembreName(p.membre_id),
        membreId: p.membre_id,
        montant: -(p.montant || 0),
        date: p.date_octroi || null,
        annee: null,
        detail: `Int: ${formatMontant(p.interet)} - Total: ${formatMontant(p.montant_a_rembourser)} F`,
        statut: p.statut,
      });
    });

    // Remboursements
    (remboursements || []).forEach(r => {
      // Look up the pret to find the membre_id
      const pret = (prets || []).find(p => p.id === r.pret_id);
      const membreId = pret ? pret.membre_id : null;
      txns.push({
        id: `r-${r.id}`,
        type: 'remboursement',
        nom: membreId ? getMembreName(membreId) : '--',
        membreId: membreId,
        montant: r.montant || 0,
        date: r.date || r.created_at || null,
        annee: null,
      });
    });

    // Sanctions
    (sanctions || []).forEach(sa => {
      txns.push({
        id: `s-${sa.id}`,
        type: 'sanction',
        nom: getMembreName(sa.membre_id),
        membreId: sa.membre_id,
        montant: -(sa.montant || 0),
        date: sa.created_at || null,
        annee: null,
        motif: sa.motif || null,
      });
    });

    // Sort by date descending
    txns.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    return txns;
  }, [versements, prets, remboursements, sanctions, membres, seances]);

  // Filter
  const filtered = useMemo(() => {
    let result = allTransactions;
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }
    if (filterMembre.trim()) {
      const q = filterMembre.toLowerCase();
      result = result.filter(t => (t.nom || '').toLowerCase().includes(q));
    }
    return result;
  }, [allTransactions, filterType, filterMembre]);

  // Summaries
  const totalEpargne = filtered
    .filter(t => t.type === 'epargne' && t.montant > 0)
    .reduce((s, t) => s + t.montant, 0);
  const totalSanctions = filtered
    .filter(t => t.type === 'sanction')
    .reduce((s, t) => s + Math.abs(t.montant), 0);
  const totalPrets = filtered
    .filter(t => t.type === 'pret')
    .reduce((s, t) => s + Math.abs(t.montant), 0);
  const totalRemb = filtered
    .filter(t => t.type === 'remboursement')
    .reduce((s, t) => s + t.montant, 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 40 }, webStyle()]}>
        <Text style={st.titre}>Transactions financieres</Text>
        <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: SPACING.md }}>
          Vue combinee de tous les mouvements
        </Text>

        {/* Summaries */}
        <View style={[st.summaryRow, isDesktop && { flexDirection: 'row' }]}>
          <Card style={[st.summaryCard, { borderLeftColor: COLORS.primary }]}>
            <Text style={st.summaryLabel}>Epargne</Text>
            <Text style={[st.summaryVal, { color: COLORS.primary }]}>
              +{formatMontant(totalEpargne)} F
            </Text>
          </Card>
          <Card style={[st.summaryCard, { borderLeftColor: COLORS.danger }]}>
            <Text style={st.summaryLabel}>Sanctions</Text>
            <Text style={[st.summaryVal, { color: COLORS.danger }]}>
              -{formatMontant(totalSanctions)} F
            </Text>
          </Card>
          <Card style={[st.summaryCard, { borderLeftColor: COLORS.accent }]}>
            <Text style={st.summaryLabel}>Prets</Text>
            <Text style={[st.summaryVal, { color: COLORS.accent }]}>
              {formatMontant(totalPrets)} F
            </Text>
          </Card>
          <Card style={[st.summaryCard, { borderLeftColor: COLORS.success }]}>
            <Text style={st.summaryLabel}>Remboursements</Text>
            <Text style={[st.summaryVal, { color: COLORS.success }]}>
              +{formatMontant(totalRemb)} F
            </Text>
          </Card>
        </View>

        {/* Filters */}
        <View style={st.filterContainer}>
          <TextInput
            style={st.searchInput}
            placeholder="Filtrer par nom..."
            value={filterMembre}
            onChangeText={setFilterMembre}
            placeholderTextColor={COLORS.gray}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
            {[
              ['all', 'Toutes'],
              ['epargne', '💰 Epargne'],
              ['sanction', '⚠️ Sanctions'],
              ['pret', '💳 Prets'],
              ['remboursement', '✅ Remb.'],
            ].map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[st.filterBtn, filterType === key && st.filterBtnActive]}
                onPress={() => setFilterType(key)}
              >
                <Text style={[st.filterBtnT, filterType === key && { color: '#fff' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Transaction list */}
        <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: SPACING.sm }}>
          {filtered.length} transaction(s)
        </Text>
        {filtered.length === 0 ? (
          <Card>
            <Text style={{ textAlign: 'center', color: COLORS.gray }}>
              Aucune transaction trouvee.
            </Text>
          </Card>
        ) : (
          filtered.map(txn => (
            <Card key={txn.id}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
                <Text style={{ fontSize: 24 }}>{TYPE_ICON[txn.type] || '💰'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkGray }}>
                    {txn.nom}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.gray }}>
                    {TYPE_LABEL[txn.type] || txn.type} - {formatDate(txn.date)}
                    {txn.annee ? ` - ${txn.annee}` : ''}
                  </Text>
                  {txn.motif && (
                    <Text style={{ fontSize: 11, color: COLORS.danger, fontStyle: 'italic', marginTop: 2 }}>
                      {txn.motif}
                    </Text>
                  )}
                  {txn.detail && (
                    <Text style={{ fontSize: 11, color: COLORS.secondary, marginTop: 2 }}>
                      {txn.detail}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{
                    fontSize: 15, fontWeight: '700',
                    color: txn.montant >= 0 ? COLORS.success : COLORS.danger,
                  }}>
                    {txn.montant >= 0 ? '+' : ''}{formatMontant(txn.montant)} F
                  </Text>
                  {txn.statut && <StatusBadge status={txn.statut} />}
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  titre: { fontSize: 18, fontWeight: '700', color: COLORS.darkGray },
  summaryRow: { flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  summaryCard: {
    flex: 1, minWidth: 140, borderLeftWidth: 4,
    paddingVertical: SPACING.sm,
  },
  summaryLabel: { fontSize: 11, color: COLORS.gray },
  summaryVal: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  filterContainer: { marginBottom: SPACING.sm },
  searchInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: SPACING.sm, backgroundColor: '#fff',
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: '#fff',
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBtnT: { fontSize: 12, fontWeight: '600', color: COLORS.darkGray },
});
