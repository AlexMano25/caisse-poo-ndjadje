import React,{useState} from 'react';
import { View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import { COLORS, SPACING } from '../../utils/theme';

const ROLE_LABEL = {
  superadmin:'Super Admin', president:'Présidente',
  tresorier:'Trésorier', secretaire:'Secrétaire', membre:'Membre'
};
const TYPE_COLOR = { info:'#EAF4FF', urgent:'#FFF0F0', rapport:'#F0FFF4' };
const TYPE_ICON  = { info:'📢', urgent:'⚠️', rapport:'📄' };

export default function DashboardScreen({ navigation }) {
  const { currentUser } = useAuth();
  const { membres, tontine, prets, recap, messages, envoyerMessage, marquerLu } = useApp();

  const [showCompose, setShowCompose] = useState(false);
  const [showMsg,     setShowMsg]     = useState(null);
  const [titreMsg,    setTitreMsg]    = useState('');
  const [contenuMsg,  setContenuMsg]  = useState('');
  const [typeMsg,     setTypeMsg]     = useState('info');

  const pretsEnCours  = (prets||[]).filter(p => p.statut === 'en_cours');
  const totalPrets    = pretsEnCours.reduce((s,p) => s + p.aRembourser, 0);
  const membresActifs = (membres||[]).filter(m => m.epargne2025 > 0 || m.solde2025 > 0);

  const canSendMessage = ['superadmin','president'].includes(currentUser?.role);
  const nonLus = (messages||[]).filter(m => !m.lus.includes(currentUser?.id));

  const handleEnvoyer = () => {
    if (!titreMsg.trim() || !contenuMsg.trim()) {
      Alert.alert('Champs requis','Titre et message sont obligatoires.'); return;
    }
    envoyerMessage(titreMsg.trim(), contenuMsg.trim(), typeMsg);
    setShowCompose(false); setTitreMsg(''); setContenuMsg(''); setTypeMsg('info');
    Alert.alert('✅ Envoyé','Votre message a été envoyé à tous les membres.');
  };

  const ouvrirMessage = (msg) => {
    setShowMsg(msg);
    marquerLu(msg.id, currentUser?.id);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{paddingBottom:32}}>
      {/* Header */}
      <View style={s.header}>
        <View style={{flex:1}}>
          <Text style={s.welcome}>Bonjour, {currentUser?.prenom || currentUser?.nom?.split(' ')[0]} 👋</Text>
          <Text style={s.role}>{ROLE_LABEL[currentUser?.role] || 'Membre'} · {tontine?.name}</Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          {canSendMessage && (
            <TouchableOpacity style={s.composeFab} onPress={()=>setShowCompose(true)}>
              <Text style={{color:'#fff',fontSize:18}}>+💬</Text>
            </TouchableOpacity>
          )}
          <View style={{position:'relative'}}>
            <MemberAvatar member={{...currentUser, name:currentUser?.nom}} size={50}/>
            {nonLus.length > 0 && (
              <View style={s.badge}>
                <Text style={{color:'#fff',fontSize:9,fontWeight:'800'}}>{nonLus.length}</Text>
              </View>
            )}
          </View>
        </View>
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
        <TouchableOpacity style={s.alert} onPress={() => navigation.navigate('Prets')}>
          <Text style={s.alertT}>⚠️  {pretsEnCours.length} prêt(s) en cours · {recap.totalARembourser.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={s.alertC}>Voir →</Text>
        </TouchableOpacity>
      )}

      {/* 📬 Messages du bureau */}
      {(messages||[]).length > 0 && (
        <>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:SPACING.md,marginBottom:SPACING.xs}}>
            <Text style={s.secTitle}>📬 Messages du bureau</Text>
            {nonLus.length > 0 && (
              <View style={{backgroundColor:COLORS.primary,borderRadius:10,paddingHorizontal:8,paddingVertical:2}}>
                <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>{nonLus.length} non lu{nonLus.length>1?'s':''}</Text>
              </View>
            )}
          </View>
          {(messages||[]).slice(0,5).map(msg => {
            const lu = msg.lus.includes(currentUser?.id);
            return (
              <TouchableOpacity key={msg.id}
                style={[s.msgCard, {backgroundColor: TYPE_COLOR[msg.type]||'#EAF4FF'},
                  !lu && {borderLeftWidth:4, borderLeftColor:COLORS.primary}]}
                onPress={()=>ouvrirMessage(msg)}>
                <View style={{flexDirection:'row',alignItems:'flex-start',gap:SPACING.sm}}>
                  <Text style={{fontSize:22}}>{TYPE_ICON[msg.type]||'📢'}</Text>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,fontWeight: lu ? '500':'800',color:COLORS.darkGray}} numberOfLines={1}>{msg.titre}</Text>
                    <Text style={{fontSize:11,color:COLORS.gray,marginTop:2}} numberOfLines={2}>{msg.contenu}</Text>
                    <Text style={{fontSize:10,color:COLORS.gray,marginTop:4}}>
                      {msg.auteur} · {msg.date} {lu ? '• Lu':'• 🔵 Non lu'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Modal lecture message */}
      <Modal visible={!!showMsg} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={{fontSize:28,textAlign:'center',marginBottom:8}}>{TYPE_ICON[showMsg?.type]||'📢'}</Text>
            <Text style={{fontSize:16,fontWeight:'800',color:COLORS.darkGray,marginBottom:4,textAlign:'center'}}>{showMsg?.titre}</Text>
            <Text style={{fontSize:11,color:COLORS.secondary,textAlign:'center',marginBottom:SPACING.md}}>
              {showMsg?.auteur} · {showMsg?.date}
            </Text>
            <ScrollView style={{maxHeight:300}}>
              <Text style={{fontSize:14,color:COLORS.darkGray,lineHeight:22}}>{showMsg?.contenu}</Text>
            </ScrollView>
            <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:8,padding:14,alignItems:'center',marginTop:SPACING.md}}
              onPress={()=>setShowMsg(null)}>
              <Text style={{color:'#fff',fontWeight:'700'}}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal composer message */}
      <Modal visible={showCompose} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modal}>
            <Text style={{fontSize:18,fontWeight:'700',color:COLORS.primary,marginBottom:SPACING.sm}}>💬 Envoyer un message</Text>
            <Text style={{fontSize:11,color:COLORS.gray,marginBottom:SPACING.md}}>Visible par tous les membres dès la prochaine connexion.</Text>

            <Text style={{fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:4}}>Type de message</Text>
            <View style={{flexDirection:'row',gap:8,marginBottom:SPACING.sm}}>
              {[['info','📢 Info'],['urgent','⚠️ Urgent'],['rapport','📄 Rapport']].map(([t,l])=>(
                <TouchableOpacity key={t}
                  style={{flex:1,padding:8,borderRadius:8,alignItems:'center',
                    backgroundColor:typeMsg===t?COLORS.primary:'#F8F9FA',
                    borderWidth:1,borderColor:typeMsg===t?COLORS.primary:'#DEE2E6'}}
                  onPress={()=>setTypeMsg(t)}>
                  <Text style={{fontSize:11,fontWeight:'600',color:typeMsg===t?'#fff':COLORS.darkGray}}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:4}}>Titre *</Text>
            <TextInput style={s.inp} placeholder="Ex: Prochaine séance confirmée"
              value={titreMsg} onChangeText={setTitreMsg} maxLength={80}/>

            <Text style={{fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:4,marginTop:8}}>Message *</Text>
            <TextInput style={[s.inp,{height:120,textAlignVertical:'top'}]}
              placeholder="Rédigez votre message…"
              value={contenuMsg} onChangeText={setContenuMsg}
              multiline numberOfLines={5}/>

            <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:8,padding:14,alignItems:'center',marginTop:SPACING.md}}
              onPress={handleEnvoyer}>
              <Text style={{color:'#fff',fontWeight:'800',fontSize:15}}>📤 Envoyer à tous</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowCompose(false)}>
              <Text style={{textAlign:'center',marginTop:14,color:COLORS.gray}}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  composeFab:{backgroundColor:COLORS.primary,borderRadius:20,width:38,height:38,
    justifyContent:'center',alignItems:'center'},
  badge:{position:'absolute',top:-4,right:-4,backgroundColor:'#E63946',
    borderRadius:8,minWidth:16,height:16,justifyContent:'center',alignItems:'center',paddingHorizontal:3},
  msgCard:{borderRadius:12,padding:SPACING.sm,marginBottom:6,
    shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.06,elevation:2},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',padding:SPACING.md},
  modal:{backgroundColor:'#fff',borderRadius:20,padding:SPACING.lg,
    shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,elevation:16},
  inp:{borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:13,fontSize:14,marginBottom:4},
});
