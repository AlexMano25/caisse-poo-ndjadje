import React,{useState} from 'react';
import {View,Text,ScrollView,StyleSheet,TouchableOpacity,Modal,TextInput,Alert} from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import { COLORS, SPACING } from '../../utils/theme';

const SEANCES = ['05/01/2025','26/04/2025','25/07/2025','15/11/2025','prochaine'];

export default function EpargneScreen() {
  const { membres, historique, ajouterEpargne, currentUser, tontine } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selMembre, setSelMembre] = useState('');
  const [montant, setMontant] = useState('');
  const [seance, setSeance] = useState(SEANCES[0]);
  const [annee] = useState(2025);
  const isBureau = ['president','tresorier','secretaire'].includes(currentUser.role);

  const handleAjouter = () => {
    if (!selMembre || !montant || isNaN(parseInt(montant))) {
      Alert.alert('Erreur','Sélectionnez un membre et entrez un montant valide.'); return;
    }
    ajouterEpargne(selMembre, parseInt(montant), seance, annee);
    setShowForm(false); setMontant(''); setSelMembre('');
    Alert.alert('Versement enregistré','Le dépôt a été ajouté au journal.');
  };

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScrollView contentContainerStyle={{padding:SPACING.md,paddingBottom:100}}>
        <Text style={s.titre}>Épargne membres — {annee}</Text>
        <Text style={s.sous}>Taux intérêt annuel : {tontine.tauxInteretEpargne}%  ·  Retenue : {tontine.tauxRetenue}% sur intérêts</Text>

        {/* Tableau récapitulatif */}
        <Card style={{padding:0,overflow:'hidden'}}>
          {/* Header */}
          <View style={[s.row,{backgroundColor:COLORS.primary}]}>
            <Text style={[s.cell,s.hdr,{flex:2}]}>Membre</Text>
            <Text style={[s.cell,s.hdr]}>Épargne</Text>
            <Text style={[s.cell,s.hdr]}>Intérêts</Text>
            <Text style={[s.cell,s.hdr]}>Solde</Text>
          </View>
          {(membres||[])
            .filter(m => m.id !== 'mbr-13')
            .sort((a,b) => (b.solde2025||0) - (a.solde2025||0))
            .map((m,i) => (
              <View key={m.id} style={[s.row,{backgroundColor:i%2===0?'#fff':'#F8FAF9'}]}>
                <View style={[s.cell,{flex:2,flexDirection:'row',alignItems:'center',gap:6}]}>
                  <MemberAvatar member={{...m,name:m.nom}} size={28}/>
                  <Text style={{fontSize:11,flex:1,color:COLORS.darkGray}} numberOfLines={1}>{m.nom.split(' ')[0]}</Text>
                </View>
                <Text style={[s.cell,{fontSize:11}]}>{(m.epargne2025||0).toLocaleString('fr-FR')}</Text>
                <Text style={[s.cell,{fontSize:11,color:COLORS.secondary}]}>{(m.interets2025||0).toLocaleString('fr-FR')}</Text>
                <Text style={[s.cell,{fontSize:12,fontWeight:'700',color:COLORS.primary}]}>{(m.solde2025||0).toLocaleString('fr-FR')}</Text>
              </View>
            ))}
        </Card>

        {/* Historique des versements */}
        <Text style={[s.titre,{marginTop:SPACING.lg}]}>📋 Historique des versements</Text>
        {(historique||[])
          .filter(h => h.annee === annee && !h.type)
          .sort((a,b) => b.id.localeCompare(a.id))
          .slice(0,20)
          .map(h => (
            <Card key={h.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:SPACING.sm}}>
              <View style={{flex:1}}>
                <Text style={{fontSize:14,fontWeight:'600',color:COLORS.darkGray}}>{h.nom}</Text>
                <Text style={{fontSize:11,color:COLORS.gray}}>Séance : {h.seance}</Text>
              </View>
              <Text style={{fontSize:15,fontWeight:'700',color:h.montant>=0?COLORS.primary:'#E63946'}}>
                {h.montant>=0?'+':''}{(h.montant||0).toLocaleString('fr-FR')} F
              </Text>
            </Card>
          ))}
      </ScrollView>

      {isBureau && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>+ Enregistrer un versement</Text>
        </TouchableOpacity>
      )}

      {/* Formulaire versement */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitre}>💰 Nouveau versement épargne</Text>

            <Text style={s.label}>Membre</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:SPACING.sm}}>
              {(membres||[]).filter(m=>m.id!=='mbr-13').map(m=>(
                <TouchableOpacity key={m.id}
                  style={[s.chip, selMembre===m.id && s.chipA]}
                  onPress={() => setSelMembre(m.id)}>
                  <Text style={{fontSize:11,color:selMembre===m.id?'#fff':COLORS.darkGray}} numberOfLines={1}>
                    {m.nom.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Séance</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:SPACING.sm}}>
              {SEANCES.map(sq=>(
                <TouchableOpacity key={sq} style={[s.chip,seance===sq&&s.chipA]} onPress={()=>setSeance(sq)}>
                  <Text style={{fontSize:11,color:seance===sq?'#fff':COLORS.darkGray}}>{sq}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Montant (FCFA)</Text>
            <TextInput style={s.input} placeholder="ex: 100000" keyboardType="numeric"
              value={montant} onChangeText={setMontant}/>

            <TouchableOpacity style={s.btnPri} onPress={handleAjouter}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={s.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  titre:{fontSize:16,fontWeight:'700',color:COLORS.darkGray,marginBottom:4},
  sous:{fontSize:11,color:COLORS.gray,marginBottom:SPACING.md},
  row:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:'#f0f0f0'},
  cell:{flex:1,padding:8,textAlign:'right',color:COLORS.darkGray},
  hdr:{color:'#fff',fontWeight:'700',fontSize:11,textAlign:'center'},
  fab:{position:'absolute',bottom:16,left:16,right:16,backgroundColor:COLORS.primary,
    borderRadius:12,padding:16,alignItems:'center'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modal:{backgroundColor:'#fff',borderTopLeftRadius:20,borderTopRightRadius:20,padding:24,maxHeight:'90%'},
  mTitre:{fontSize:18,fontWeight:'700',color:COLORS.primary,marginBottom:SPACING.md},
  label:{fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:6},
  chip:{paddingHorizontal:12,paddingVertical:6,borderRadius:20,borderWidth:1,
    borderColor:COLORS.border,marginRight:8,backgroundColor:'#fff'},
  chipA:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  input:{borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:14,
    fontSize:16,marginBottom:SPACING.md},
  btnPri:{backgroundColor:COLORS.primary,borderRadius:8,padding:16,alignItems:'center'},
  cancel:{textAlign:'center',marginTop:16,color:COLORS.gray},
});
