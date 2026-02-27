import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../utils/theme';
export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  card:{ backgroundColor:COLORS.white, borderRadius:12, padding:SPACING.md,
         marginVertical:SPACING.sm, shadowColor:'#000', shadowOffset:{width:0,height:2},
         shadowOpacity:0.08, shadowRadius:6, elevation:3 },
});
