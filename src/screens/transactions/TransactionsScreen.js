import React,{useState} from 'react';
import { View,Text,ScrollView,StyleSheet,TouchableOpacity,Modal,TextInput,Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
const TI = { cotisation:'💳', cotisation_cash:'💵', sequestre:'🔒', penalite:'⚠️' };
const TL = { cotisation:'Cotisation (digital)', cotisation_cash:'Cotisation Cash', sequestre:'Séquestre', penalite:'Pénalité' };
export default function TransactionsScreen() {
  const { transactions,validateCashPayment,declareCashPayment,addSequestreDeposit,releaseSequestre,sequestre,currentUser,tontine } = useApp();
  const [tab,setTab]=useState('all');
  const [showCash,setShowCash]=useState(false);
  const [showSeq,setShowSeq]=useState(false);
  const [cashNote,setCashNote]=useState('');
  const [seqAmt,setSeqAmt]=useState('');
  const isBureau=['president','tresorier','secretaire'].includes(currentUser.role);
  const filtered=transactions.filter(t=>tab==='pending'?t.status==='pending':tab==='sequestre'?t.type==='sequestre':true);
  const seqPct=Math.min((sequestre.accumulated/sequestre.target)*100,100);
  const handleValidate=(txn)=>{
    if(!isBureau){Alert.alert('Accès refusé','Seul le bureau peut valider.');return;}
    if(txn.validatedBy.includes(currentUser.id)){Alert.alert('Déjà validé','Vous avez déjà validé cette transaction.');return;}
    validateCashPayment(txn.id,currentUser.id);
    Alert.alert('✅ Validé',txn.validatedBy.length+1>=2?'Transaction inscrite au journal.':'1 validation supplémentaire requise.');
  };
  const handleCash=()=>{
    if(!cashNote.trim()){Alert.alert('Erreur','Ajoutez une note.');return;}
    declareCashPayment(tontine.cotisationAmount,cashNote);
    setCashNote('');setShowCash(false);
    Alert.alert('✅ Déclaré','En attente de validation par 2 membres du bureau.');
  };
  const handleSeq=()=>{
    const amt=parseInt(seqAmt,10);
    if(!amt||amt<=0){Alert.alert('Erreur','Montant invalide.');return;}
    addSequestreDeposit(amt,'orange_money');
    setSeqAmt('');setShowSeq(false);
    Alert.alert('✅ Versé',amt.toLocaleString()+' FCFA ajoutés à votre séquestre.');
  };
  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <View style={s.tabs}>
        {[['all','Toutes'],['pending','En attente'],['sequestre','Séquestre']].map(([k,l])=>(
          <TouchableOpacity key={k} style={[s.tab,tab===k&&s.tabA]} onPress={()=>setTab(k)}>
            <Text style={[s.tabT,tab===k&&s.tabTA]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab==='sequestre'&&(
        <Card style={{margin:SPACING.md,backgroundColor:'#EAF4FF'}}>
          <Text style={{fontSize:18,fontWeight:'700',color:COLORS.darkGray}}>🔒 Mon Séquestre</Text>
          <Text style={{fontSize:13,color:COLORS.gray,marginBottom:SPACING.sm}}>Objectif : {sequestre.target.toLocaleString()} FCFA</Text>
          <View style={{height:10,backgroundColor:COLORS.border,borderRadius:5,overflow:'hidden',marginBottom:6}}>
            <View style={{height:'100%',width:`${seqPct}%`,backgroundColor:COLORS.primary,borderRadius:5}}/>
          </View>
          <Text style={{fontSize:13,color:COLORS.primary,fontWeight:'700',marginBottom:SPACING.sm}}>
            {sequestre.accumulated.toLocaleString()} / {sequestre.target.toLocaleString()} FCFA ({Math.round(seqPct)}%)
          </Text>
          <View style={{flexDirection:'row',gap:SPACING.sm}}>
            <TouchableOpacity style={s.btnSec} onPress={()=>setShowSeq(true)}><Text style={{color:COLORS.primary,fontWeight:'700'}}>+ Verser</Text></TouchableOpacity>
            {sequestre.accumulated>=sequestre.target&&(
              <TouchableOpacity style={s.btnPri} onPress={()=>{releaseSequestre();Alert.alert('🎉 Libéré','Séquestre transformé en cotisation!');}}>
                <Text style={{color:'#fff',fontWeight:'700'}}>Libérer → Cotisation</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}
      <ScrollView contentContainerStyle={{paddingBottom:100,paddingHorizontal:SPACING.md}}>
        {filtered.map(txn=>(
          <Card key={txn.id}>
            <View style={{flexDirection:'row',alignItems:'flex-start',gap:SPACING.sm}}>
              <Text style={{fontSize:24}}>{TI[txn.type]||'💰'}</Text>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'600',color:COLORS.darkGray}}>{txn.memberName}</Text>
                <Text style={{fontSize:11,color:COLORS.gray}}>{TL[txn.type]} · {txn.date}</Text>
                {txn.note?<Text style={{fontSize:11,color:COLORS.secondary,fontStyle:'italic',marginTop:2}}>{txn.note}</Text>:null}
              </View>
              <View style={{alignItems:'flex-end',gap:4}}>
                <Text style={{fontSize:15,fontWeight:'700',color:txn.type==='penalite'?'#E63946':'#52B788'}}>
                  {txn.type==='penalite'?'-':'+'}{txn.amount.toLocaleString()} F
                </Text>
                <StatusBadge status={txn.status}/>
              </View>
            </View>
            {txn.status==='pending'&&txn.type==='cotisation_cash'&&isBureau&&(
              <View style={s.valBox}>
                <Text style={{fontSize:11,color:'#856404'}}>{txn.validatedBy.length}/2 validation(s)</Text>
                <TouchableOpacity style={s.btnVal} onPress={()=>handleValidate(txn)}>
                  <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>✔ Valider</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
      <TouchableOpacity style={s.fab} onPress={()=>setShowCash(true)}>
        <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>💵 Déclarer un paiement Cash</Text>
      </TouchableOpacity>
      <Modal visible={showCash} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitle}>💵 Déclarer un paiement cash</Text>
            <Text style={{fontSize:13,color:COLORS.secondary,marginBottom:SPACING.md}}>Montant : {tontine.cotisationAmount.toLocaleString()} {tontine.currency}</Text>
            <TextInput style={s.input} placeholder="Note (ex: remis au trésorier le 26/02)" value={cashNote} onChangeText={setCashNote}/>
            <TouchableOpacity style={s.btnPri} onPress={handleCash}><Text style={{color:'#fff',fontWeight:'700'}}>Envoyer la déclaration</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowCash(false)}><Text style={s.cancel}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showSeq} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitle}>🔒 Verser dans le séquestre</Text>
            <TextInput style={s.input} placeholder="Montant en FCFA" keyboardType="numeric" value={seqAmt} onChangeText={setSeqAmt}/>
            <TouchableOpacity style={s.btnPri} onPress={handleSeq}><Text style={{color:'#fff',fontWeight:'700'}}>Verser via Mobile Money</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowSeq(false)}><Text style={s.cancel}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s=StyleSheet.create({
  tabs:{flexDirection:'row',backgroundColor:'#fff',borderBottomWidth:1,borderColor:'#DEE2E6'},
  tab:{flex:1,paddingVertical:12,alignItems:'center'},
  tabA:{borderBottomWidth:2,borderColor:'#1B4332'},
  tabT:{fontSize:13,color:'#6C757D'},
  tabTA:{color:'#1B4332',fontWeight:'700'},
  valBox:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',
    marginTop:8,backgroundColor:'#FFF3CD',borderRadius:8,padding:8},
  btnVal:{backgroundColor:'#52B788',paddingHorizontal:14,paddingVertical:6,borderRadius:6},
  fab:{position:'absolute',bottom:16,left:16,right:16,backgroundColor:'#F4A261',borderRadius:12,padding:16,alignItems:'center'},
  btnPri:{backgroundColor:'#1B4332',borderRadius:8,padding:8,alignItems:'center',flex:1},
  btnSec:{borderWidth:1.5,borderColor:'#1B4332',borderRadius:8,padding:8,alignItems:'center',flex:1},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modal:{backgroundColor:'#fff',borderTopLeftRadius:20,borderTopRightRadius:20,padding:32},
  mTitle:{fontSize:18,fontWeight:'700',marginBottom:4},
  input:{borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:16,marginBottom:16,fontSize:15},
  cancel:{textAlign:'center',marginTop:16,color:'#6C757D'},
});
