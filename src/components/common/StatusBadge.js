import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const STATUS_COLORS = {
  validated: '#52B788',
  pending: '#FFC107',
  refused: '#E63946',
  en_cours: '#F4A261',
  rembourse: '#52B788',
  actif: '#52B788',
  inactif: '#E63946',
};

const STATUS_LABELS = {
  validated: 'Valide',
  pending: 'En attente',
  refused: 'Refuse',
  en_cours: 'En cours',
  rembourse: 'Rembourse',
  actif: 'Actif',
  inactif: 'Inactif',
};

export default function StatusBadge({ status, label }) {
  const bgColor = STATUS_COLORS[status] || '#6C757D';
  const displayLabel = label || STATUS_LABELS[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
