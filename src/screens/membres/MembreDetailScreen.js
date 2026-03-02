import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';
import { formatMontant } from '../../utils/calculations';

const ROLE = {
  president: 'Presidente', tresorier: 'Tresorier',
  secretaire: 'Secretaire', membre: 'Membre',
};

export default function MembreDetailScreen({ route }) {
  const { membreId } = route.params;
  const { membres, versements, prets, seances, recap } = useApp();
  const m = (membres || []).find(x => x.id === membreId);

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  // Look up this member's financial data from recap.membresCalcul
  const membreCalcul = useMemo(() => {
    if (!recap || !recap.membresCalcul) return null;
    return recap.membresCalcul.find(mc => mc.id === membreId) || null;
  }, [recap, membreId]);

  const calcul = membreCalcul?.calcul;

  // Filter versements for this member (snake_case: membre_id)
  const depots = useMemo(() => {
    return (versements || []).filter(h => h.membre_id === membreId);
  }, [versements, membreId]);

  // Filter prets for this member (snake_case: membre_id)
  const pretsMembre = useMemo(() => {
    return (prets || []).filter(p => p.membre_id === membreId);
  }, [prets, membreId]);

  // Build a seance lookup map for displaying seance dates
  const seanceMap = useMemo(() => {
    const map = {};
    (seances || []).forEach(s => { map[s.id] = s; });
    return map;
  }, [seances]);

  if (!m) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: COLORS.gray }}>Membre non trouve</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 40 }, webStyle()]}
    >
      {/* Entete membre */}
      <Card style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
        <MemberAvatar member={{ ...m, name: m.nom }} size={72} />
        <Text style={{
          fontSize: 20, fontWeight: '800', color: COLORS.darkGray, marginTop: SPACING.sm,
        }}>
          {m.prenom} {m.nom}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.secondary, marginTop: 4 }}>
          {ROLE[m.role] || 'Membre'}
        </Text>
        <View style={{ width: isDesktop ? '50%' : '80%', marginTop: SPACING.md }}>
          <CreditScoreBar score={m.credit_score} />
        </View>
      </Card>

      {/* Bilan financier from recap.membresCalcul */}
      <Text style={s.sec}>Bilan {recap?.annee || new Date().getFullYear()}</Text>
      <Card>
        {[
          ['Epargne versee', calcul?.totalEpargne],
          ['Interets bruts', calcul?.interetBrut],
          ['Interets nets', calcul?.interetNet],
          ['Retenue', calcul?.retenue],
          ['Solde', calcul?.solde],
        ].map(([label, val], i) => (
          <View key={i} style={s.row}>
            <Text style={s.label}>{label}</Text>
            <Text style={[
              s.val,
              i === 4 && { fontWeight: '800', color: COLORS.primary, fontSize: 15 },
            ]}>
              {formatMontant(val || 0)} FCFA
            </Text>
          </View>
        ))}
      </Card>

      {/* Pret en cours */}
      {pretsMembre.filter(p => p.statut === 'en_cours').map(p => (
        <Card key={p.id} style={{ borderLeftWidth: 4, borderLeftColor: COLORS.danger }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.danger, marginBottom: SPACING.sm }}>
            Pret en cours
          </Text>
          <View style={s.row}>
            <Text style={s.label}>Capital emprunte</Text>
            <Text style={s.val}>{formatMontant(p.montant)} FCFA</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Interets ({((p.taux || 0) * 100).toFixed(1)}%)</Text>
            <Text style={s.val}>{formatMontant(p.interet)} FCFA</Text>
          </View>
          <View style={[s.row, {
            borderTopWidth: 1, borderTopColor: COLORS.border,
            marginTop: 4, paddingTop: 4,
          }]}>
            <Text style={[s.label, { fontWeight: '700' }]}>A rembourser</Text>
            <Text style={[s.val, { fontWeight: '800', color: COLORS.danger, fontSize: 15 }]}>
              {formatMontant(p.montant_a_rembourser)} FCFA
            </Text>
          </View>
        </Card>
      ))}

      {/* Historique versements */}
      {depots.length > 0 && (
        <>
          <Text style={s.sec}>Historique des versements</Text>
          {depots.map(d => {
            const seance = seanceMap[d.seance_id];
            const seanceLabel = seance
              ? new Date(seance.date).toLocaleDateString('fr-FR')
              : `Seance #${d.seance_id}`;
            return (
              <Card key={d.id} style={{ flexDirection: 'row', paddingVertical: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: COLORS.darkGray }}>Seance : {seanceLabel}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.gray }}>Annee {d.annee}</Text>
                </View>
                <Text style={{
                  fontSize: 14, fontWeight: '700',
                  color: (d.montant || 0) >= 0 ? COLORS.primary : COLORS.danger,
                }}>
                  {(d.montant || 0) >= 0 ? '+' : ''}{formatMontant(d.montant || 0)} F
                </Text>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  sec: {
    fontSize: 15, fontWeight: '700', color: COLORS.darkGray,
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  label: { fontSize: 13, color: COLORS.gray },
  val: { fontSize: 13, color: COLORS.darkGray },
  desktopRow: { flexDirection: 'row', gap: SPACING.md },
});
