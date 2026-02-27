import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import { COLORS, SPACING } from '../../utils/theme';

const ROLE_LABEL = {president:'Présidente',tresorier:'Trésorier',secretaire:'Secrétaire',membre:'Membre'};

export default function DashboardScreen({ navigation }) {
  const { currentUser, membres, tontine, prets, recap } = useApp();

  const pretsEnCours   = (prets||[]).filter(p => p.statut === 'en_cours');
  const totalPrets     = pretsEnCours.reduce((s,p) => s + p.aRembourser, 0);
  const membresActifs  = (membres||[]).filter(m => m.epargne2025 > 0 || m.solde2025 > 0);
  const progress       = Math.round((recap.totalEpargneVersee / (recap.totalEpargneVersee + recap.totalPretsEnCours)) * 100);

  return (
    <ScrollView style={s.container} contentContainerStyle={{paddingBottom:32}}>
      {/* Header */}
      <View style={s.header}>
        <View style={{flex:1}}>
          <Text style={s.welcome}>Bonjour, {currentUser.nom.split(' ')[0]} 👋</Text>
          <Text style={s.role}>{ROLE_LABEL[currentUser.role]} · {tontine.name}</Text>
        </View>
        <MemberAvatar member={{...currentUser, name:currentUser.nom}} size={50}/>
      </View>

      {/* Carte tontine */}
      <Card style={s.tCard}>
        <Text style={s.tName}>📊 Récap {recap.annee}</Text>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Épargne totale</Text>
          <Text style={s.tVal}>{recap.totalEpargneVersee.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Intérêts épargne</Text>
          <Text style={[s.tVal,{color:'#A8D5BA'}]}>{recap.totalInteretsEpargne.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={s.tRow}>
          <Text style={s.tLabel}>Retenues (1,5%)</Text>
          <Text style={[s.tVal,{color:'#ffc8a0'}]}>{recap.totalRetenues.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <View style={[s.tRow,{borderTopWidth:1,borderTopColor:'rgba(255,255,255,0.2)',marginTop:8,paddingTop:8}]}>
          <Text style={[s.tLabel,{fontWeight:'700',color:'#fff'}]}>SOLDE TOTAL</Text>
          <Text style={[s.tVal,{fontSize:18,fontWeight:'800',color:'#fff'}]}>{recap.totalSoldeMembres.toLocaleString('fr-FR')} FCFA</Text>
        </View>
      </Card>

      {/* KPIs */}
      <View style={s.kpiRow}>
        <Card style={s.kpi}>
          <Text style={s.kpiV}>{membresActifs.length}</Text>
          <Text style={s.kpiL}>Membres actifs</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={[s.kpiV,{color:'#E63946'}]}>{pretsEnCours.length}</Text>
          <Text style={s.kpiL}>Prêts en cours</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={[s.kpiV,{color:'#F4A261',fontSize:14}]}>{totalPrets.toLocaleString('fr-FR')}</Text>
          <Text style={s.kpiL}>F à rembourser</Text>
        </Card>
      </View>

      {/* Prochaine séance */}
      <TouchableOpacity style={s.nextSeance}>
        <Text style={s.nextT}>📅 Prochaine séance</Text>
        <Text style={s.nextD}>{tontine.nextMeetingDate}</Text>
        <Text style={[s.nextT,{fontSize:12,marginTop:4,opacity:0.8}]}>
          Taux épargne : {tontine.tauxInteretEpargne}% · Prêt : {tontine.tauxPret}% · Retenue : {tontine.tauxRetenue}%
        </Text>
      </TouchableOpacity>

      {/* Top épargnants */}
      <Text style={s.secTitle}>🏆 Top épargnants 2025</Text>
      {(membres||[])
        .filter(m => m.solde2025 > 0)
        .sort((a,b) => b.solde2025 - a.solde2025)
        .slice(0,5)
        .map((m,i) => (
          <Card key={m.id} style={{flexDirection:'row',alignItems:'center',gap:SPACING.sm,paddingVertical:SPACING.sm}}>
            <Text style={{fontSize:18,width:28,textAlign:'center'}}>
              {['🥇','🥈','🥉','4️⃣','5️⃣'][i]}
            </Text>
            <MemberAvatar member={{...m, name:m.nom}} size={38}/>
            <View style={{flex:1}}>
              <Text style={s.mName}>{m.nom}</Text>
              <Text style={{fontSize:11,color:COLORS.secondary}}>
                Épargne: {(m.epargne2025||0).toLocaleString('fr-FR')} · Intérêts: {(m.interets2025||0).toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            <Text style={{fontSize:14,fontWeight:'700',color:COLORS.primary}}>
              {(m.solde2025||0).toLocaleString('fr-FR')}
            </Text>
          </Card>
        ))}

      {/* Alerte prêts */}
      {pretsEnCours.length > 0 && (
        <TouchableOpacity style={s.alert} onPress={() => navigation.navigate('Prêts')}>
          <Text style={s.alertT}>⚠️  {pretsEnCours.length} prêt(s) en cours · {recap.totalARembourser.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={s.alertC}>Voir →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.bg,padding:SPACING.md},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:SPACING.md},
  welcome:{fontSize:22,fontWeight:'700',color:COLORS.darkGray},
  role:{fontSize:12,color:COLORS.secondary,marginTop:2},
  tCard:{backgroundColor:COLORS.primary,marginBottom:SPACING.sm},
  tName:{fontSize:16,fontWeight:'700',color:'#fff',marginBottom:SPACING.sm},
  tRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:3},
  tLabel:{fontSize:12,color:'#A8D5BA'},
  tVal:{fontSize:13,fontWeight:'600',color:'#fff'},
  kpiRow:{flexDirection:'row',gap:SPACING.sm,marginBottom:SPACING.sm},
  kpi:{flex:1,alignItems:'center',paddingVertical:SPACING.md},
  kpiV:{fontSize:18,fontWeight:'800',color:COLORS.primary},
  kpiL:{fontSize:10,color:COLORS.gray,textAlign:'center',marginTop:2},
  nextSeance:{backgroundColor:'#EAF4FF',borderRadius:12,padding:SPACING.md,marginBottom:SPACING.md,
    borderLeftWidth:4,borderLeftColor:COLORS.primary},
  nextT:{fontSize:13,fontWeight:'600',color:COLORS.primary},
  nextD:{fontSize:20,fontWeight:'800',color:COLORS.darkGray,marginTop:2},
  secTitle:{fontSize:15,fontWeight:'700',color:COLORS.darkGray,marginBottom:SPACING.xs},
  mName:{fontSize:14,fontWeight:'600',color:COLORS.darkGray},
  alert:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',
    backgroundColor:'#FFF3CD',borderRadius:10,padding:SPACING.md,marginTop:SPACING.md,
    borderLeftWidth:4,borderLeftColor:'#FFC107'},
  alertT:{fontSize:12,color:'#856404',flex:1},
  alertC:{fontSize:13,fontWeight:'700',color:COLORS.primary},
});
