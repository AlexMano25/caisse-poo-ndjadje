import React from 'react';
import { View, Text } from 'react-native';
const RC = { president:'#7B2D8B', tresorier:'#1B4332', secretaire:'#0D3B66', membre:'#6C757D' };
export default function MemberAvatar({ member, size=44 }) {
  return (
    <View style={{width:size,height:size,borderRadius:size/2,
      backgroundColor:RC[member.role]||'#6C757D',justifyContent:'center',alignItems:'center'}}>
      <Text style={{color:'#fff',fontWeight:'700',fontSize:size*0.35}}>
        {member.avatar||member.name.slice(0,2).toUpperCase()}
      </Text>
    </View>
  );
}
