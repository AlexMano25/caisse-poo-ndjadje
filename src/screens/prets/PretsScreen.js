import React,{useState} from 'react';
import {View,Text,ScrollView,StyleSheet,TouchableOpacity,Modal,TextInput,Alert} from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import { COLORS, SPACING } from '../../utils/theme';

export default function PretsScreen() {
  const { prets, membres, accorderPret, rembourserPret, currentUser, tontine } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selMembre, setSelMembre] = useState('');
  const [montant, setMontant]     = useState('');
  const [nbTrim, setNbTrim]       = useState(1);
  const isBureau = ['president','tresorier'].includes(currentUser.role);

  const pretsEnCours    = (prets||[]).filter(p => p.statut === 'en_cours');
  const pretsRembourses = (prets||[]).filter(p => p.statut === 'rembourse');

  // 7.5% PAR TRIMESTRE de 90 jours
  const simuler = (m, t) => {
    const mt = parseInt(m)||0;
    const interets = Math.round(mt * 0.075 * (t||1));
    return {interets, total: mt + interets};
  };
  const sim = simuler(montant, nbTrim);

  const handleAccorder = () => {
    if (!selMembre || !montant || parseInt(montant) <= 0) {
      Alert.alert('Erreur','Sélectionnez un membre et un montant.'); return;
    }
    Alert.alert(
      'Confirmer le prêt',
      `Prêt de ${parseInt(montant).toLocaleString('fr-FR')} FCFA\nDurée: ${nbTrim} trimestre(s)\nIntérêts (7.5%×${nbTrim}): ${sim.interets.toLocaleString('fr-FR')} FCFA\nTotal à rembourser: ${sim.total.toLocaleString('fr-FR')} FCFA`,
      [
        {text:'Annuler',style:'cancel'},
        {text:'Accorder',onPress:() => {
          accorderPret(selMembre, parseInt(montant), nbTrim);
          setShowForm(false); setMontant(''); setSelMembre(''); setNbTrim(1);
          Alert.alert('Prêt accordé','Enregistré dans le journal.');
        }}
      ]
    );
  };

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScrollView contentContainerStyle={{padding:SPACING.md,paddingBottom:100}}>

        {/* Totaux */}
        <Card style={{backgroundColor:COLORS.primary}}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:16,marginBottom:SPACING.sm}}>
            📊 Prêts en cours
          </Text>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
            <Text style={{color:'#A8D5BA',fontSize:12}}>Capital prêté</Text>
            <Text style={{color:'#fff',fontWeight:'600'}}>{pretsEnCours.reduce((s,p)=>s+p.montant,0).toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
            <Text style={{color:'#A8D5BA',fontSize:12}}>Intérêts (7.5%)</Text>
            <Text style={{color:'#A8D5BA',fontWeight:'600'}}>{pretsEnCours.reduce((s,p)=>s+p.interet,0).toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'rgba(255,255,255,0.2)',marginTop:8,paddingTop:8}}>
            <Text style={{color:'#fff',fontWeight:'700'}}>Total à rembourser</Text>
            <Text style={{color:'#fff',fontWeight:'800',fontSize:16}}>{pretsEnCours.reduce((s,p)=>s+p.aRembourser,0).toLocaleString('fr-FR')} FCFA</Text>
          </View>
        </Card>

        <Text style={s.titre}>Prêts en cours ({pretsEnCours.length})</Text>
        {pretsEnCours.map(p => (
          <Card key={p.id}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.darkGray}}>{p.nom}</Text>
                <Text style={{fontSize:12,color:COLORS.gray,marginTop:2}}>
                  Capital: {p.montant.toLocaleString('fr-FR')} · Intérêts: {p.interet.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={{fontSize:15,fontWeight:'800',color:'#E63946'}}>
                  {p.aRembourser.toLocaleString('fr-FR')} F
                </Text>
                <View style={{backgroundColor:'#FFF3CD',borderRadius:8,paddingHorizontal:8,paddingVertical:2,marginTop:4}}>
                  <Text style={{fontSize:10,color:'#856404',fontWeight:'600'}}>EN COURS</Text>
                </View>
              </View>
            </View>
            {isBureau && (
              <TouchableOpacity
                style={{marginTop:SPACING.sm,backgroundColor:'#F0FFF4',borderRadius:8,
                  padding:SPACING.sm,alignItems:'center',borderWidth:1,borderColor:COLORS.secondary}}
                onPress={() => {
                  Alert.alert('Rembourser ?',`Confirmer le remboursement de ${p.nom} ?`,
                    [{text:'Non',style:'cancel'},{text:'Oui',onPress:()=>rembourserPret(p.id)}]);
                }}>
                <Text style={{color:COLORS.secondary,fontWeight:'700'}}>✅ Marquer remboursé</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))}

        {pretsRembourses.length > 0 && (
          <Text style={[s.titre,{marginTop:SPACING.lg,color:COLORS.secondary}]}>
            ✅ Remboursés ({pretsRembourses.length})
          </Text>
        )}
        {pretsRembourses.map(p => (
          <Card key={p.id} style={{opacity:0.6}}>
            <Text style={{fontSize:14,fontWeight:'600',color:COLORS.gray}}>{p.nom}</Text>
            <Text style={{fontSize:12,color:COLORS.gray}}>{p.aRembourser.toLocaleString('fr-FR')} FCFA remboursé</Text>
          </Card>
        ))}
      </ScrollView>

      {isBureau && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>+ Accorder un prêt</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitre}>💳 Nouveau prêt</Text>
            <Text style={{fontSize:11,color:COLORS.gray,marginBottom:SPACING.md}}>
              Taux : {tontine.tauxPret}% (intérêt fixe)
            </Text>

            <Text style={s.label}>Bénéficiaire</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:SPACING.sm}}>
              {(membres||[]).filter(m=>m.id!=='mbr-13').map(m=>(
                <TouchableOpacity key={m.id} style={[s.chip,selMembre===m.id&&s.chipA]}
                  onPress={()=>setSelMembre(m.id)}>
                  <Text style={{fontSize:11,color:selMembre===m.id?'#fff':COLORS.darkGray}} numberOfLines={1}>
                    {m.nom.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Montant (FCFA)</Text>
            <TextInput style={s.input} placeholder="ex: 500000" keyboardType="numeric"
              value={montant} onChangeText={setMontant}/>

                <Text style={s.label}>Durée (trimestres à 90 j)</Text>
            <View style={{flexDirection:'row',gap:8,marginBottom:SPACING.sm}}>
              {[1,2,3,4].map(t => (
                <TouchableOpacity key={t} style={[s.chip,nbTrim===t&&s.chipA]} onPress={()=>setNbTrim(t)}>
                  <Text style={{fontSize:12,fontWeight:'700',color:nbTrim===t?'#fff':COLORS.darkGray}}>
                    {t}T{t>1?'s':''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {parseInt(montant) > 0 && (
              <View style={{backgroundColor:'#F0FFF4',borderRadius:8,padding:SPACING.sm,marginBottom:SPACING.md}}>
                <Text style={{fontSize:11,color:COLORS.secondary}}>
                  7,5% × {nbTrim} trimestre(s) = {(7.5*nbTrim).toFixed(1)}%
                </Text>
                <Text style={{fontSize:12,color:COLORS.secondary,marginTop:2}}>
                  Intérêts : {sim.interets.toLocaleString('fr-FR')} FCFA
                </Text>
                <Text style={{fontSize:15,fontWeight:'800',color:COLORS.primary,marginTop:4}}>
                  Total à rembourser : {sim.total.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}

            <TouchableOpacity style={s.btnPri} onPress={handleAccorder}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Accorder le prêt</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowForm(false)}>
              <Text style={s.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  titre:{fontSize:15,fontWeight:'700',color:COLORS.darkGray,marginTop:SPACING.md,marginBottom:SPACING.xs},
  fab:{position:'absolute',bottom:16,left:16,right:16,backgroundColor:'#E63946',borderRadius:12,padding:16,alignItems:'center'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modal:{backgroundColor:'#fff',borderTopLeftRadius:20,borderTopRightRadius:20,padding:24},
  mTitre:{fontSize:18,fontWeight:'700',color:COLORS.primary,marginBottom:4},
  label:{fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:6},
  chip:{paddingHorizontal:12,paddingVertical:6,borderRadius:20,borderWidth:1,
    borderColor:COLORS.border,marginRight:8,backgroundColor:'#fff'},
  chipA:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  input:{borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:14,fontSize:16,marginBottom:SPACING.sm},
  btnPri:{backgroundColor:COLORS.primary,borderRadius:8,padding:16,alignItems:'center'},
  cancel:{textAlign:'center',marginTop:16,color:COLORS.gray},
});
