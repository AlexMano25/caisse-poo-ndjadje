import React,{useState} from 'react';
import {View,Text,ScrollView,StyleSheet,TouchableOpacity,
  TextInput,Modal,Alert} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useApp }  from '../../context/AppContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import CreditScoreBar from '../../components/common/CreditScoreBar';
import { COLORS, SPACING } from '../../utils/theme';

const ROLE_LABEL = {
  superadmin:'⚡ Super Admin', president:'👑 Présidente',
  tresorier:'💼 Trésorier', secretaire:'📝 Secrétaire', membre:'👤 Membre'
};

export default function ProfilScreen() {
  const { currentUser, logout, mettreAJourProfil, changerMotDePasse } = useAuth();
  const { membres, historique, prets, rapports, tontine } = useApp();

  const [showEdit,    setShowEdit]    = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [showAnnonce, setShowAnnonce] = useState(false);
  const [nom,         setNom]         = useState(currentUser?.nom       || '');
  const [email,       setEmail]       = useState(currentUser?.email     || '');
  const [telephone,   setTelephone]   = useState(currentUser?.telephone || '');
  const [newPwd,      setNewPwd]      = useState('');
  const [confPwd,     setConfPwd]     = useState('');
  const [montantAnn,  setMontantAnn]  = useState('');

  const m = (membres||[]).find(x => x.id === currentUser?.membreId) || {};
  const mesDepots = (historique||[]).filter(h => h.membreId === currentUser?.membreId);
  const monPret   = (prets||[]).find(p => p.membreId === currentUser?.membreId && p.statut==='en_cours');

  const sauvegarder = () => {
    mettreAJourProfil(currentUser.id, {nom, email, telephone});
    setShowEdit(false);
    Alert.alert('✅','Profil mis à jour.');
  };

  const majMotDePasse = () => {
    if (newPwd.length < 6) { Alert.alert('Trop court','Min. 6 caractères'); return; }
    if (newPwd !== confPwd) { Alert.alert('Erreur','Mots de passe différents'); return; }
    changerMotDePasse(currentUser.id, newPwd);
    setShowPwd(false); setNewPwd(''); setConfPwd('');
    Alert.alert('✅','Mot de passe mis à jour.');
  };

  const intEstime = montantAnn ? Math.round(parseInt(montantAnn)*0.075) : 0;

  return (
    <ScrollView style={{flex:1,backgroundColor:COLORS.bg}}
      contentContainerStyle={{padding:SPACING.md,paddingBottom:80}}>

      {/* En-tête */}
      <Card style={{alignItems:'center',paddingVertical:SPACING.lg}}>
        <MemberAvatar member={{...currentUser,name:currentUser?.nom}} size={80}/>
        <Text style={{fontSize:22,fontWeight:'800',color:COLORS.darkGray,marginTop:SPACING.sm}}>
          {currentUser?.nom}
        </Text>
        <Text style={{fontSize:13,color:COLORS.secondary,marginTop:2}}>
          {ROLE_LABEL[currentUser?.role]}
        </Text>
        <Text style={{fontSize:11,color:COLORS.gray,marginTop:2}}>@{currentUser?.login}</Text>
        <View style={{width:'80%',marginTop:SPACING.md}}>
          <CreditScoreBar score={currentUser?.creditScore||50}/>
        </View>
        <View style={{flexDirection:'row',gap:SPACING.sm,marginTop:SPACING.md,flexWrap:'wrap',justifyContent:'center'}}>
          <TouchableOpacity style={s.btnSec} onPress={()=>setShowEdit(true)}>
            <Text style={s.btnSecT}>✏️ Modifier profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnSec} onPress={()=>setShowPwd(true)}>
            <Text style={s.btnSecT}>🔐 Mot de passe</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Coordonnées */}
      <Card style={{marginTop:SPACING.sm}}>
        {[['Email',currentUser?.email],['Téléphone',currentUser?.telephone]].map(([k,v],i)=>(
          <View key={i} style={s.row}>
            <Text style={s.lbl}>{k}</Text>
            <Text style={s.val}>{v||'—'}</Text>
          </View>
        ))}
      </Card>

      {/* Situation */}
      <Text style={s.sec}>📊 Ma situation</Text>
      <Card>
        {[
          ['Épargne versée',   ((m.epargne2025||m.totalEpargne)||0).toLocaleString('fr-FR')+' FCFA'],
          ['Intérêts (27,4%)', ((m.interets2025||m.interets)||0).toLocaleString('fr-FR')+' FCFA'],
          ['Mon solde',        ((m.solde2025||m.solde)||0).toLocaleString('fr-FR')+' FCFA'],
        ].map(([k,v],i)=>(
          <View key={i} style={s.row}>
            <Text style={s.lbl}>{k}</Text>
            <Text style={[s.val,i===2&&{fontWeight:'800',color:COLORS.primary,fontSize:14}]}>{v}</Text>
          </View>
        ))}
      </Card>

      {/* Prêt en cours */}
      {monPret && (
        <Card style={{borderLeftWidth:4,borderLeftColor:'#E63946',marginTop:SPACING.sm}}>
          <Text style={{fontSize:13,fontWeight:'700',color:'#E63946',marginBottom:6}}>⚠️ Mon prêt en cours</Text>
          <View style={s.row}><Text style={s.lbl}>Capital</Text>
            <Text style={s.val}>{monPret.montant.toLocaleString('fr-FR')} FCFA</Text></View>
          <View style={s.row}><Text style={s.lbl}>Intérêts</Text>
            <Text style={s.val}>{monPret.interet.toLocaleString('fr-FR')} FCFA</Text></View>
          <View style={[s.row,{borderTopWidth:1,borderTopColor:COLORS.border,marginTop:4,paddingTop:6}]}>
            <Text style={[s.lbl,{fontWeight:'700'}]}>À rembourser</Text>
            <Text style={{fontSize:14,fontWeight:'800',color:'#E63946'}}>
              {monPret.aRembourser.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </Card>
      )}

      {/* Annonce prêt */}
      <TouchableOpacity style={s.announce} onPress={()=>setShowAnnonce(true)}>
        <Text style={{fontSize:13,fontWeight:'700',color:COLORS.primary}}>
          💬 Annoncer mon besoin de prêt
        </Text>
        <Text style={{fontSize:11,color:COLORS.gray,marginTop:2}}>
          Prochaine séance : {tontine?.nextMeetingDate||'28/02/2026'}
        </Text>
      </TouchableOpacity>

      {/* Historique */}
      <Text style={s.sec}>📋 Mes versements</Text>
      {mesDepots.length===0
        ? <Card><Text style={{color:COLORS.gray,textAlign:'center'}}>Aucun versement.</Text></Card>
        : mesDepots.map(d=>(
          <Card key={d.id} style={{flexDirection:'row',paddingVertical:SPACING.sm}}>
            <View style={{flex:1}}>
              <Text style={{fontSize:12,color:COLORS.darkGray}}>Séance {d.seance}</Text>
              <Text style={{fontSize:10,color:COLORS.gray}}>{d.type||'Épargne'} · {d.annee}</Text>
            </View>
            <Text style={{fontWeight:'700',color:COLORS.primary}}>
              +{(d.montant||0).toLocaleString('fr-FR')} F
            </Text>
          </Card>
        ))
      }

      {/* PV / Rapports */}
      <Text style={s.sec}>📄 Rapports & PV</Text>
      {(rapports||[]).map(r=>(
        <Card key={r.id} style={{paddingVertical:SPACING.sm}}>
          <Text style={{fontSize:12,fontWeight:'600',color:COLORS.darkGray}}>{r.title}</Text>
          <Text style={{fontSize:10,color:COLORS.gray}}>📅 {r.date} · ✍️ {r.author}</Text>
        </Card>
      ))}

      {/* Déconnexion */}
      <TouchableOpacity style={s.btnLogout} onPress={()=>
        Alert.alert('Déconnexion','Confirmer ?',[
          {text:'Annuler',style:'cancel'},
          {text:'Oui',onPress:logout}
        ])}>
        <Text style={s.btnLogoutT}>🚪 Se déconnecter</Text>
      </TouchableOpacity>

      {/* Modal profil */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitre}>✏️ Modifier mon profil</Text>
            {[['Nom complet',nom,setNom,'words'],
              ['Email',email,setEmail,'email-address'],
              ['Téléphone',telephone,setTelephone,'phone-pad']
            ].map(([ph,val,set,kbT],i)=>(
              <TextInput key={i} style={s.inp} placeholder={ph} value={val}
                onChangeText={set} autoCapitalize={kbT==='words'?'words':'none'}
                keyboardType={kbT!=='words'?kbT:'default'}/>
            ))}
            <TouchableOpacity style={s.btnPri} onPress={sauvegarder}>
              <Text style={{color:'#fff',fontWeight:'700'}}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowEdit(false)}>
              <Text style={s.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal mot de passe */}
      <Modal visible={showPwd} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitre}>🔐 Changer le mot de passe</Text>
            <TextInput style={s.inp} placeholder="Nouveau mot de passe" secureTextEntry
              value={newPwd} onChangeText={setNewPwd}/>
            <TextInput style={s.inp} placeholder="Confirmer" secureTextEntry
              value={confPwd} onChangeText={setConfPwd}/>
            <TouchableOpacity style={s.btnPri} onPress={majMotDePasse}>
              <Text style={{color:'#fff',fontWeight:'700'}}>Mettre à jour</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowPwd(false)}>
              <Text style={s.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal annonce */}
      <Modal visible={showAnnonce} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitre}>💬 Mon besoin de prêt</Text>
            <Text style={{fontSize:11,color:COLORS.gray,marginBottom:SPACING.sm}}>
              Séance du {tontine?.nextMeetingDate||'28/02/2026'}
            </Text>
            <TextInput style={s.inp} placeholder="Montant souhaité (FCFA)"
              keyboardType="numeric" value={montantAnn} onChangeText={setMontantAnn}/>
            {parseInt(montantAnn)>0 && (
              <View style={{backgroundColor:'#FFF3CD',borderRadius:8,padding:10,marginBottom:10}}>
                <Text style={{fontSize:11,color:'#856404'}}>
                  Intérêts (7,5%/trim.) : {intEstime.toLocaleString('fr-FR')} FCFA{"\n"}
                  Total : {(parseInt(montantAnn)+intEstime).toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}
            <TouchableOpacity style={s.btnPri} onPress={()=>{
              Alert.alert('✅ Annonce enregistrée',
                'Votre demande a été transmise au bureau.');
              setShowAnnonce(false); setMontantAnn('');
            }}>
              <Text style={{color:'#fff',fontWeight:'700'}}>Envoyer l’annonce</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowAnnonce(false)}>
              <Text style={s.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  sec:       {fontSize:14,fontWeight:'700',color:COLORS.darkGray,
              marginTop:SPACING.md,marginBottom:SPACING.xs},
  row:       {flexDirection:'row',justifyContent:'space-between',
              paddingVertical:6,borderBottomWidth:1,borderBottomColor:COLORS.border},
  lbl:       {fontSize:12,color:COLORS.gray},
  val:       {fontSize:12,color:COLORS.darkGray},
  btnSec:    {backgroundColor:COLORS.bg,borderWidth:1.5,borderColor:COLORS.primary,
              borderRadius:8,paddingHorizontal:12,paddingVertical:8},
  btnSecT:   {fontSize:12,color:COLORS.primary,fontWeight:'600'},
  announce:  {backgroundColor:'#EAF4FF',borderRadius:12,padding:SPACING.md,
              marginTop:SPACING.sm,borderLeftWidth:4,borderLeftColor:COLORS.primary},
  btnLogout: {marginTop:SPACING.xl,backgroundColor:'#FFF0F0',borderRadius:10,
              padding:16,alignItems:'center',borderWidth:1,borderColor:'#E63946'},
  btnLogoutT:{color:'#E63946',fontWeight:'700',fontSize:15},
  overlay:   {flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modal:     {backgroundColor:'#fff',borderTopLeftRadius:20,borderTopRightRadius:20,padding:24},
  mTitre:    {fontSize:18,fontWeight:'700',color:COLORS.primary,marginBottom:SPACING.md},
  inp:       {borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:13,fontSize:14,marginBottom:10},
  btnPri:    {backgroundColor:COLORS.primary,borderRadius:8,padding:14,alignItems:'center'},
  cancel:    {textAlign:'center',marginTop:14,color:COLORS.gray},
});
