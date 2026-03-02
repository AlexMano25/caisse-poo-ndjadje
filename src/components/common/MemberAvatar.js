import React from 'react';
import { View, Text } from 'react-native';

const ROLE_COLORS = {
  superadmin: '#E63946',
  president: '#7B2D8B',
  tresorier: '#1B4332',
  secretaire: '#0D3B66',
  membre: '#6C757D',
};

export default function MemberAvatar({ member, size = 44 }) {
  const bgColor = ROLE_COLORS[member?.role] || '#6C757D';
  const initials = member?.avatar
    || (member?.name || member?.nom || '??').slice(0, 2).toUpperCase();

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bgColor,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{
        color: '#fff',
        fontWeight: '700',
        fontSize: size * 0.35,
      }}>
        {initials}
      </Text>
    </View>
  );
}
