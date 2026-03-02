import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import { COLORS, SPACING } from '../../utils/theme';
import { webStyle } from '../../utils/responsive';

const formatDate = (d) => {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('fr-FR');
  } catch { return '--'; }
};

export default function ReportsScreen() {
  const { currentUser, peutFaire } = useAuth();
  const { rapports, publierRapport, membres, seances } = useApp();

  const canWrite = peutFaire('publierRapport');
  const reports = rapports || [];

  const [selRpt, setSelRpt] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const width = Dimensions.get('window').width;
  const isDesktop = width >= 768;

  // Look up author name from membres by auteur_id
  const getAuthorName = useCallback((auteurId) => {
    if (!auteurId) return '--';
    const membre = (membres || []).find(m => m.id === auteurId);
    if (membre) return `${membre.prenom || ''} ${membre.nom || ''}`.trim();
    return '--';
  }, [membres]);

  // Compute session number from seance_id by looking it up in seances, or fall back to report index
  const getSessionNumber = useCallback((rpt, index) => {
    if (rpt.seance_id && seances) {
      const seanceIndex = seances.findIndex(s => s.id === rpt.seance_id);
      if (seanceIndex !== -1) return seanceIndex + 1;
    }
    return index + 1;
  }, [seances]);

  const handlePublish = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Erreur', 'Titre et contenu requis.');
      return;
    }
    publierRapport(title, content);
    setShowNew(false);
    setTitle('');
    setContent('');
    Alert.alert('Archive', 'Rapport publie et visible par tous les membres.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[{ padding: SPACING.md, paddingBottom: 100 }, webStyle()]}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.primary }}>
          Journal des Seances
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: SPACING.md }}>
          Archives immuables
        </Text>

        <View style={isDesktop ? s.gridDesktop : null}>
          {reports.map((rpt, index) => (
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
                  <Text style={{ fontSize: 22, color: COLORS.gray }}>></Text>
                </View>
                <View style={{
                  marginTop: 8, backgroundColor: '#F0FFF4', borderRadius: 6,
                  paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
                }}>
                  <Text style={{ fontSize: 11, color: COLORS.success, fontWeight: '600' }}>
                    Archive & Publie
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      </ScrollView>

      {canWrite && (
        <TouchableOpacity style={s.fab} onPress={() => setShowNew(true)}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            + Nouveau Rapport
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal lecture rapport */}
      <Modal visible={!!selRpt} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.box, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
            <ScrollView>
              <Text style={s.mTitle}>{selRpt?.titre}</Text>
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
        <View style={s.overlay}>
          <View style={[s.box, isDesktop && { maxWidth: 600, alignSelf: 'center', width: '100%' }]}>
            <Text style={s.mTitle}>📝 Nouveau Rapport de Seance</Text>
            <TextInput
              style={s.input}
              placeholder="Titre du rapport"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[s.input, { height: 160, textAlignVertical: 'top' }]}
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

const s = StyleSheet.create({
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  fab: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center',
  },
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
