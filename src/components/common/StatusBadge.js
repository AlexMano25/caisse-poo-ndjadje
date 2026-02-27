import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../utils/theme';
const SC = { validated:'#52B788', pending:'#FFC107', refused:'#E63946', en_cours:'#F4A261' };
const SL = { validated:'Validé', pending:'En attente', refused:'Refusé', en_cours:'En cours' };
export default function StatusBadge({ status }) {
  return (
    <View style={[styles.b,{backgroundColor:SC[status]||COLORS.gray}]}>
      <Text style={styles.t}>{SL[status]||status}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  b:{ paddingHorizontal:10, paddingVertical:3, borderRadius:20 },
  t:{ color:'#fff', fontSize:11, fontWeight:'700' },
});
