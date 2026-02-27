import React,{useState} from 'react';
import {View,Text,ScrollView,TouchableOpacity,Modal,StyleSheet} from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';

const ROLE_LABEL = {president:'Présidente',tresorier:'Trésorier',secretaire:'Secrétaire',membre:'Membre'};

function FicheModal({ membreId, onClose }) {
  const { membres, historique, prets } = useApp();
  const m = (membres||[]).find(x => x.id === membreId);
  if (!m) return null;
  const depots = (historique||[]).filter(h => h.membreId === membreId);
  const pretActif = (prets||[]).find(p => p.membreId === membreId && p.statut === 'en_cours');

  return (
    <Modal visible={!!membreId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={{flexDirection:'row',alignItems:'center',marginBottom:SPACING.md}}>
            <MemberAvatar member={{...m,name:m.nom}} size={52}/>
            <View style={{flex:1,marginLeft:SPACING.sm}}>
              <Text style={{fontSize:18,fontWeight:'800',color:COLORS.darkGray}}>{m.nom}</Text>
              <Text style={{fontSize:12,color:COLORS.secondary}}>{ROLE_LABEL[m.role]||'Membre'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={{fontSize:18,color:COLORS.gray}}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{marginBottom:SPACING.sm}}>
            <CreditScoreBar score={m.creditScore}/>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Bilan 2024 */}
            <Text style={s.sec}>Bilan 2024</Text>
            <Card style={{padding:SPACING.sm}}>
              {[['Épargne',m.epargne2024],['Intérêts',m.interets2024],['Retenue',m.retenue2024],['Solde',m.solde2024]].map(([l,v],i)=>(
                <View key={i} style={s.row}>
                  <Text style={s.lbl}>{l}</Text>
                  <Text style={[s.val,i===3&&{fontWeight:'800',color:COLORS.primary}]}>{(v||0).toLocaleString('fr-FR')} F</Text>
                </View>
              ))}
            </Card>

            {/* Bilan 2025 */}
            <Text style={s.sec}>Bilan 2025</Text>
            <Card style={{padding:SPACING.sm}}>
              {[['Épargne',m.epargne2025],['Intérêts',m.interets2025],['Retenue',m.retenue2025],['Solde',m.solde2025]].map(([l,v],i)=>(
                <View key={i} style={s.row}>
                  <Text style={s.lbl}>{l}</Text>
                  <Text style={[s.val,i===3&&{fontWeight:'800',color:COLORS.primary,fontSize:15}]}>{(v||0).toLocaleString('fr-FR')} F</Text>
                </View>
              ))}
            </Card>

            {/* Prêt en cours */}
            {pretActif && (
              <Card style={{borderLeftWidth:4,borderLeftColor:'#E63946',padding:SPACING.sm,marginTop:SPACING.sm}}>
                <Text style={{fontSize:13,fontWeight:'700',color:'#E63946',marginBottom:6}}>⚠️ Prêt en cours</Text>
                {[['Capital',pretActif.montant],['Intérêts',pretActif.interet],['A rembourser',pretActif.aRembourser]].map(([l,v],i)=>(
                  <View key={i} style={s.row}>
                    <Text style={s.lbl}>{l}</Text>
                    <Text style={[s.val,i===2&&{fontWeight:'800',color:'#E63946',fontSize:14}]}>{(v||0).toLocaleString('fr-FR')} F</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Historique */}
            {depots.length > 0 && (
              <>
                <Text style={s.sec}>Historique versements</Text>
                {depots.map(d=>(
                  <View key={d.id} style={[s.row,{paddingHorizontal:4,paddingVertical:6,borderBottomWidth:1,borderBottomColor:COLORS.border}]}>
                    <Text style={{fontSize:12,color:COLORS.gray}}>{d.seance} · {d.annee}</Text>
                    <Text style={{fontSize:13,fontWeight:'600',color:d.montant>=0?COLORS.primary:'#E63946'}}>
                      {d.montant>=0?'+':''}{(d.montant||0).toLocaleString('fr-FR')} F
                    </Text>
                  </View>
                ))}
              </>
            )}
            <View style={{height:24}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function MembresScreen() {
  const { membres, prets } = useApp();
  const [selId, setSelId] = useState(null);

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScrollView contentContainerStyle={{padding:SPACING.md,paddingBottom:32}}>
        <Text style={s.titre}>Membres ({(membres||[]).length})</Text>
        {(membres||[]).map(m => {
          const pretActif = (prets||[]).find(p => p.membreId === m.id && p.statut === 'en_cours');
          return (
            <TouchableOpacity key={m.id} onPress={() => setSelId(m.id)}>
              <Card>
                <View style={{flexDirection:'row',gap:SPACING.sm,alignItems:'center'}}>
                  <MemberAvatar member={{...m,name:m.nom}} size={46}/>
                  <View style={{flex:1}}>
                    <Text style={s.nom}>{m.nom}</Text>
                    <Text style={s.roleT}>{ROLE_LABEL[m.role]||'Membre'}</Text>
                    <View style={{marginTop:6}}><CreditScoreBar score={m.creditScore}/></View>
                  </View>
                  <View style={{alignItems:'flex-end',gap:4}}>
                    <Text style={{fontSize:13,fontWeight:'700',color:COLORS.primary}}>
                      {(m.solde2025||0).toLocaleString('fr-FR')}
                    </Text>
                    <Text style={{fontSize:9,color:COLORS.gray}}>FCFA</Text>
                    {pretActif && (
                      <View style={{backgroundColor:'#FFEBEE',borderRadius:6,paddingHorizontal:6,paddingVertical:2}}>
                        <Text style={{fontSize:9,color:'#E63946',fontWeight:'700'}}>PRÊT</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FicheModal membreId={selId} onClose={() => setSelId(null)}/>
    </View>
  );
}

const s = StyleSheet.create({
  titre:{fontSize:16,fontWeight:'700',color:COLORS.darkGray,marginBottom:SPACING.sm},
  nom:{fontSize:15,fontWeight:'700',color:COLORS.darkGray},
  roleT:{fontSize:11,color:COLORS.secondary,marginTop:2},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'flex-end'},
  sheet:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,
    padding:SPACING.lg,maxHeight:'88%'},
  closeBtn:{padding:8},
  sec:{fontSize:13,fontWeight:'700',color:COLORS.darkGray,marginTop:SPACING.sm,marginBottom:4},
  row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:4,
    borderBottomWidth:1,borderBottomColor:COLORS.border},
  lbl:{fontSize:12,color:COLORS.gray},
  val:{fontSize:12,color:COLORS.darkGray},
});
