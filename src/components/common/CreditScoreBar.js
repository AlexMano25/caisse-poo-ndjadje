import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../utils/theme';
export default function CreditScoreBar({ score }) {
  const color = score>=80?'#52B788':score>=60?'#FFC107':'#E63946';
  return (
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <Text style={{fontSize:11,color:COLORS.gray,width:52}}>Fiabilité</Text>
      <View style={{flex:1,height:7,backgroundColor:COLORS.border,borderRadius:4,overflow:'hidden'}}>
        <View style={{height:'100%',width:`${score}%`,backgroundColor:color,borderRadius:4}}/>
      </View>
      <Text style={{fontSize:11,fontWeight:'700',color,width:44,textAlign:'right'}}>{score}/100</Text>
    </View>
  );
}
