import React,{useState} from 'react';
import { View,Text,ScrollView,StyleSheet,TouchableOpacity,Modal,TextInput,Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';
const RL = { president:'👑 Présidente', tresorier:'💼 Trésorier', secretaire:'📝 Secrétaire', membre:'👤 Membre' };
const BUREAU_COULEURS = { president:'#7B2D8B', tresorier:'#1B4332', secretaire:'#0D3B66', membre:'#6C757D' };

export default function GovernanceScreen() {
  const { membres, currentUser, appliquerSanction, tontine } = useApp();
  const isBureau = ['president','tresorier','secretaire'].includes(currentUser.role);
  const [sel, setSel]         = useState(null);
  const [showPen, setShowPen] = useState(false);
  const [penAmt, setPenAmt]   = useState('');
  const [penReason, setPenReason] = useState('');

  const handleSanction = () => {
    const amt = parseInt(penAmt, 10);
    if (!amt || !penReason.trim()) { Alert.alert('Erreur','Montant et motif requis.'); return; }
    appliquerSanction(sel.id, amt, penReason);
    setShowPen(false); setPenAmt(''); setPenReason('');
    Alert.alert('✅ Sanction appliquée', amt.toLocaleString('fr-FR') + ' FCFA imputés à ' + sel.nom + '.');
  };

  const bureau  = (membres||[]).filter(m => ['president','tresorier','secretaire'].includes(m.role));
  const simples = (membres||[]).filter(m => m.role === 'membre');

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScrollView contentContainerStyle={{padding:SPACING.md,paddingBottom:80}}>

        {/* ── Bureau élu ── */}
        <Text style={s.sec}>🏛️ Bureau de la Caisse</Text>
        {bureau.map(m => (
          <Card key={m.id} style={{borderLeftWidth:4,borderLeftColor:BUREAU_COULEURS[m.role]}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:SPACING.sm}}>
              <MemberAvatar member={{...m,name:m.nom}} size={48}/>
              <View style={{flex:1}}>
                <Text style={{fontSize:16,fontWeight:'800',color:COLORS.darkGray}}>{m.nom}</Text>
                <Text style={{fontSize:13,fontWeight:'600',color:BUREAU_COULEURS[m.role]}}>{RL[m.role]}</Text>
              </View>
              <View style={{backgroundColor:BUREAU_COULEURS[m.role],borderRadius:20,paddingHorizontal:10,paddingVertical:4}}>
                <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>{m.creditScore}/100</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* ── Règles & Charte ── */}
        <Text style={s.sec}>📜 Règlement intérieur</Text>
        <Card style={{backgroundColor:'#F0FFF4'}}>
          {[
            ['Adhésion',        '50 000 FCFA'],
            ['Taux épargne',    '27,4% / an (prorata)'],
            ['Taux prêt',       '7,5% / trimestre (90 j)'],
            ['Retenue',         '1,5% sur intérêts épargne'],
            ['Périodicité',     tontine.periodicity],
            ['Prochaine séance',tontine.nextMeetingDate],
          ].map(([k,v],i) => (
            <View key={i} style={{flexDirection:'row',justifyContent:'space-between',
              paddingVertical:8,borderBottomWidth:1,borderColor:COLORS.border}}>
              <Text style={{fontSize:13,color:COLORS.gray}}>{k}</Text>
              <Text style={{fontSize:13,fontWeight:'700',color:COLORS.darkGray}}>{v}</Text>
            </View>
          ))}
        </Card>

        {/* ── Liste membres ── */}
        <Text style={s.sec}>👥 Membres ({simples.length})</Text>
        {simples.map(m => (
          <Card key={m.id}>
            <View style={{flexDirection:'row',gap:SPACING.sm,alignItems:'center'}}>
              <MemberAvatar member={{...m,name:m.nom}} size={42}/>
              <View style={{flex:1}}>
                <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkGray}}>{m.nom}</Text>
                <CreditScoreBar score={m.creditScore}/>
              </View>
              {isBureau && (
                <TouchableOpacity
                  style={{backgroundColor:'#FFF0F0',borderRadius:8,paddingHorizontal:10,
                    paddingVertical:6,borderWidth:1,borderColor:'#E63946'}}
                  onPress={() => { setSel(m); setShowPen(true); }}>
                  <Text style={{color:'#E63946',fontSize:11,fontWeight:'700'}}>⚠️ Sanction</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Modal sanction */}
      <Modal visible={showPen} transparent animationType="slide">
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:'#fff',borderTopLeftRadius:20,borderTopRightRadius:20,padding:28}}>
            <Text style={{fontSize:18,fontWeight:'800',color:'#E63946',marginBottom:SPACING.md}}>
              ⚠️ Sanction — {sel?.nom}
            </Text>
            <TextInput style={s.input} placeholder="Montant FCFA" keyboardType="numeric"
              value={penAmt} onChangeText={setPenAmt}/>
            <TextInput style={[s.input,{height:80,textAlignVertical:'top'}]}
              placeholder="Motif (ex: absence séance du 26/02/2026)" multiline
              value={penReason} onChangeText={setPenReason}/>
            <TouchableOpacity style={{backgroundColor:'#E63946',borderRadius:8,padding:16,alignItems:'center'}}
              onPress={handleSanction}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Appliquer la sanction</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPen(false)}>
              <Text style={{textAlign:'center',marginTop:14,color:COLORS.gray}}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  sec:  {fontSize:15,fontWeight:'700',color:COLORS.darkGray,marginTop:SPACING.md,marginBottom:SPACING.xs},
  input:{borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:14,marginBottom:10,fontSize:15},
});
