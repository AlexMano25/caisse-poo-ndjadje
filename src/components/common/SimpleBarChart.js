import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../utils/theme';

/**
 * SimpleBarChart – horizontal bar chart using only View + Text.
 *
 * Props:
 *   data      - Array of { label: string, value: number }
 *   color     - Bar fill colour (default: COLORS.primary)
 *   maxHeight - Max container height (optional)
 *   suffix    - Text appended after value (default: ' F')
 *   formatFn  - Custom formatter for value labels
 */
export default function SimpleBarChart({
  data = [],
  color = COLORS.primary,
  maxHeight,
  suffix = ' F',
  formatFn,
}) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucune donnee</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.abs(d.value || 0)), 1);

  const format = (v) => {
    if (formatFn) return formatFn(v);
    return (v || 0).toLocaleString('fr-FR') + suffix;
  };

  return (
    <View style={[styles.container, maxHeight ? { maxHeight } : undefined]}>
      {data.map((item, idx) => {
        const pct = Math.max((Math.abs(item.value || 0) / maxVal) * 100, 2);
        return (
          <View key={idx} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${pct}%`,
                    backgroundColor: item.color || color,
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>{format(item.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    width: 70,
    fontSize: 10,
    color: COLORS.darkGray,
    marginRight: 6,
  },
  barWrap: {
    flex: 1,
    height: 14,
    backgroundColor: '#EEF2EF',
    borderRadius: 7,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 7,
    minWidth: 4,
  },
  value: {
    width: 72,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.darkGray,
    textAlign: 'right',
    marginLeft: 6,
  },
  empty: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 12,
  },
});
