import React from 'react';
import {View,Text,ScrollView,StyleSheet} from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';

export default function MembreDetailScreen({ route }) {
  const { membreId } = route.params;
  const { membres, historique, prets } = useApp();
  const m = (membres||[]).find(x => x.id === membreId);
  if (!m) return <View><Text>Membre non trouvé</Text></View>;

  const depots = (historique||[]).filter(h => h.membreId === membreId);
  const pretsMembre = (prets||[]).filter(p => p.membreId === membreId);
  const ROLE = {president:'Présidente',tresorier:'Trésorier',secretaire:'Secrétaire',membre:'Membre'};

  return (
    <ScrollView style={{flex:1,backgroundColor:COLORS.bg}} contentContainerStyle={{padding:SPACING.md,paddingBottom:40}}>
      {/* Entête membre */}
      <Card style={{alignItems:'center',paddingVertical:SPACING.lg}}>
        <MemberAvatar member={{...m,name:m.nom}} size={72}/>
        <Text style={{fontSize:20,fontWeight:'800',color:COLORS.darkGray,marginTop:SPACING.sm}}>{m.nom}</Text>
        <Text style={{fontSize:13,color:COLORS.secondary,marginTop:4}}>{ROLE[m.role]||'Membre'}</Text>
        <View style={{width:'80%',marginTop:SPACING.md}}>
          <CreditScoreBar score={m.creditScore}/>
        </View>
      </Card>

      {/* Fiche financière 2024 */}
      <Text style={s.sec}>📊 Bilan 2024</Text>
      <Card>
        {[
          ['Épargne versée', m.epargne2024],
          ['Intérêts (27.4%)', m.interets2024],
          ['Retenue (1.5%)', m.retenue2024],
          ['Solde fin 2024', m.solde2024],
        ].map(([label,val],i) => (
          <View key={i} style={s.row}>
            <Text style={s.label}>{label}</Text>
            <Text style={[s.val,i===3&&{fontWeight:'800',color:COLORS.primary,fontSize:15}]}>
              {(val||0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        ))}
      </Card>

      {/* Fiche financière 2025 */}
      <Text style={s.sec}>📊 Bilan 2025</Text>
      <Card>
        {[
          ['Épargne versée', m.epargne2025],
          ['Intérêts (27.4%)', m.interets2025],
          ['Retenue (1.5%)', m.retenue2025],
          ['Solde fin 2025', m.solde2025],
        ].map(([label,val],i) => (
          <View key={i} style={s.row}>
            <Text style={s.label}>{label}</Text>
            <Text style={[s.val,i===3&&{fontWeight:'800',color:COLORS.primary,fontSize:15}]}>
              {(val||0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        ))}
      </Card>

      {/* Prêt en cours */}
      {pretsMembre.filter(p=>p.statut==='en_cours').map(p => (
        <Card key={p.id} style={{borderLeftWidth:4,borderLeftColor:'#E63946'}}>
          <Text style={{fontSize:14,fontWeight:'700',color:'#E63946',marginBottom:SPACING.sm}}>⚠️ Prêt en cours</Text>
          <View style={s.row}><Text style={s.label}>Capital emprunté</Text><Text style={s.val}>{p.montant.toLocaleString('fr-FR')} FCFA</Text></View>
          <View style={s.row}><Text style={s.label}>Intérêts (7.5%)</Text><Text style={s.val}>{p.interet.toLocaleString('fr-FR')} FCFA</Text></View>
          <View style={[s.row,{borderTopWidth:1,borderTopColor:COLORS.border,marginTop:4,paddingTop:4}]}>
            <Text style={[s.label,{fontWeight:'700'}]}>À rembourser</Text>
            <Text style={[s.val,{fontWeight:'800',color:'#E63946',fontSize:15}]}>{p.aRembourser.toLocaleString('fr-FR')} FCFA</Text>
          </View>
        </Card>
      ))}

      {/* Historique versements */}
      {depots.length > 0 && (
        <>
          <Text style={s.sec}>📋 Historique des versements</Text>
          {depots.map(d => (
            <Card key={d.id} style={{flexDirection:'row',paddingVertical:SPACING.sm}}>
              <View style={{flex:1}}>
                <Text style={{fontSize:13,color:COLORS.darkGray}}>Séance : {d.seance}</Text>
                <Text style={{fontSize:11,color:COLORS.gray}}>Année {d.annee}</Text>
              </View>
              <Text style={{fontSize:14,fontWeight:'700',color:d.montant>=0?COLORS.primary:'#E63946'}}>
                {d.montant>=0?'+':''}{(d.montant||0).toLocaleString('fr-FR')} F
              </Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  sec:{fontSize:15,fontWeight:'700',color:COLORS.darkGray,marginTop:SPACING.md,marginBottom:SPACING.xs},
  row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:5,
    borderBottomWidth:1,borderBottomColor:COLORS.border},
  label:{fontSize:13,color:COLORS.gray},
  val:{fontSize:13,color:COLORS.darkGray},
});
