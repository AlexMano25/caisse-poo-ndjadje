import React,{useState} from 'react';
import {View,Text,ScrollView,StyleSheet,TouchableOpacity,
  TextInput,Modal,Alert} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import MemberAvatar from '../../components/common/MemberAvatar';
import { COLORS, SPACING } from '../../utils/theme';

const RL = {president:'👑 Présidente',tresorier:'💼 Trésorier',
  secretaire:'📝 Secrétaire',membre:'👤 Membre',superadmin:'⚡ Admin'};

export default function AdminScreen() {
  const { users, creerUtilisateur, elireBureau } = useAuth();
  const [tab,       setTab]       = useState('membres');
  const [showNew,   setShowNew]   = useState(false);
  const [showElu,   setShowElu]   = useState(false);
  const [nPrenom,   setNPrenom]   = useState('');
  const [nNom,      setNNom]      = useState('');
  const [nEmail,    setNEmail]    = useState('');
  const [nTel,      setNTel]      = useState('');
  const [ePres,     setEPres]     = useState('');
  const [eTres,     setETres]     = useState('') ;
  const [eSec,      setESec]      = useState('');
  const [txEp,      setTxEp]      = useState('27.4');
  const [txPret,    setTxPret]    = useState('7.5');
  const [txRet,     setTxRet]     = useState('1.5');

  const handleCreer = () => {
    if (!nPrenom.trim()||!nNom.trim()) { Alert.alert('Erreur','Prénom et Nom requis.'); return; }
    const u = creerUtilisateur({
      prenom:nPrenom.trim(), nom:nNom.trim()+' '+nPrenom.trim(),
      email:nEmail.trim()||nPrenom.toLowerCase().trim()+'@poo-ndjadje.cm',
      telephone:nTel.trim(),
    });
    setShowNew(false); setNPrenom(''); setNNom(''); setNEmail(''); setNTel('');
    Alert.alert('✅ Membre créé',
      'Login : '+u.login+"\n"+'Mot de passe : 123456');
  };

  const handleElire = () => {
    if (!ePres||!eTres||!eSec) { Alert.alert('Erreur','Désignez les 3 postes.'); return; }
    if (new Set([ePres,eTres,eSec]).size < 3) {
      Alert.alert('Erreur','3 personnes différentes requises.'); return; }
    const nP = (users||[]).find(u=>u.id===ePres)?.nom;
    const nT = (users||[]).find(u=>u.id===eTres)?.nom;
    const nS = (users||[]).find(u=>u.id===eSec)?.nom;
    Alert.alert('Confirmer les élections',
      'Présidente : '+nP+"\nTrésorier : "+nT+"\nSecrétaire : "+nS,
      [{text:'Annuler',style:'cancel'},
       {text:'Valider',onPress:()=>{
         elireBureau({president:ePres,tresorier:eTres,secretaire:eSec});
         setShowElu(false);
         Alert.alert('🗳️ Bureau élu','Les droits ont été mis à jour.');
       }}
      ]);
  };

  const candidats = (users||[]).filter(u=>u.role!=='superadmin'&&u.actif);

  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <View style={s.tabs}>
        {[['membres','👥 Membres'],['bureau','🗳️ Bureau'],['config','⚙️ Config']]
          .map(([k,l])=>(
          <TouchableOpacity key={k} style={[s.tab,tab===k&&s.tabA]} onPress={()=>setTab(k)}>
            <Text style={[s.tabT,tab===k&&{color:COLORS.primary}]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{padding:SPACING.md,paddingBottom:120}}>

        {tab==='membres' && (
          <>
            <Text style={s.sec}>Tous les utilisateurs ({(users||[]).length})</Text>
            {(users||[]).map(u=>(
              <Card key={u.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:10}}>
                <MemberAvatar member={{...u,name:u.nom}} size={38}/>
                <View style={{flex:1,marginLeft:10}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:COLORS.darkGray}}>{u.nom}</Text>
                  <Text style={{fontSize:10,color:COLORS.secondary}}>
                    {RL[u.role]} · @{u.login}
                  </Text>
                </View>
                <View style={{alignItems:'flex-end',gap:3}}>
                  <View style={{backgroundColor:u.actif?'#D4EDDA':'#F8D7DA',
                    borderRadius:6,paddingHorizontal:6,paddingVertical:2}}>
                    <Text style={{fontSize:9,fontWeight:'700',
                      color:u.actif?'#155724':'#721C24'}}>
                      {u.actif?'ACTIF':'INACTIF'}
                    </Text>
                  </View>
                  {u.mustChangePassword&&(
                    <Text style={{fontSize:9,color:'#F4A261'}}>⚠️ mdp défaut</Text>
                  )}
                </View>
              </Card>
            ))}
          </>
        )}

        {tab==='bureau' && (
          <>
            <Text style={s.sec}>Bureau actuel</Text>
            {(users||[]).filter(u=>['president','tresorier','secretaire'].includes(u.role))
              .map(u=>(
                <Card key={u.id} style={{flexDirection:'row',alignItems:'center'}}>
                  <MemberAvatar member={{...u,name:u.nom}} size={44}/>
                  <View style={{flex:1,marginLeft:10}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:COLORS.darkGray}}>{u.nom}</Text>
                    <Text style={{fontSize:12,color:COLORS.secondary}}>{RL[u.role]}</Text>
                  </View>
                </Card>
              ))
            }
            <TouchableOpacity style={s.btnPri} onPress={()=>setShowElu(true)}>
              <Text style={{color:'#fff',fontWeight:'700'}}>🗳️ Élire un nouveau bureau</Text>
            </TouchableOpacity>
          </>
        )}

        {tab==='config' && (
          <>
            <Text style={s.sec}>⚙️ Configuration des taux</Text>
            <Card>
              {[['Taux épargne (%/an)',txEp,setTxEp],
                ['Taux prêt (%/trimestre)',txPret,setTxPret],
                ['Retenue (%/intérêts)',txRet,setTxRet]
              ].map(([l,v,s],i)=>(
                <View key={i} style={{marginBottom:12}}>
                  <Text style={{fontSize:12,color:COLORS.gray,marginBottom:4}}>{l}</Text>
                  <TextInput style={s2.inp} keyboardType="decimal-pad" value={v} onChangeText={s}/>
                </View>
              ))}
              <TouchableOpacity style={s.btnPri} onPress={()=>Alert.alert(
                '✅ Sauvegarder','Épargne: '+txEp+'%/an\nPrêt: '+txPret+'%/trim.\nRetenue: '+txRet+'%')}>
                <Text style={{color:'#fff',fontWeight:'700'}}>Enregistrer</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}
      </ScrollView>

      {tab==='membres' && (
        <TouchableOpacity style={s.fab} onPress={()=>setShowNew(true)}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:14}}>+ Nouveau membre</Text>
        </TouchableOpacity>
      )}

      {/* Modal nouveau membre */}
      <Modal visible={showNew} transparent animationType="slide">
        <View style={s2.overlay}>
          <View style={s2.modal}>
            <Text style={s2.mT}>➕ Nouveau membre</Text>
            {[['Prénom *',nPrenom,setNPrenom,'words'],
              ['Nom de famille *',nNom,setNNom,'words'],
              ['Email',nEmail,setNEmail,'email-address'],
              ['Téléphone',nTel,setNTel,'phone-pad']
            ].map(([ph,v,sv,kbT],i)=>(
              <TextInput key={i} style={s2.inp} placeholder={ph} value={v}
                onChangeText={sv} keyboardType={kbT!=='words'?kbT:'default'}
                autoCapitalize={kbT==='words'?'words':'none'}/>
            ))}
            <View style={{backgroundColor:'#FFF3CD',borderRadius:8,padding:10,marginBottom:12}}>
              <Text style={{fontSize:11,color:'#856404'}}>
                Login = prénom (minuscules) · Mot de passe par défaut : 123456
              </Text>
            </View>
            <TouchableOpacity style={s.btnPri} onPress={handleCreer}>
              <Text style={{color:'#fff',fontWeight:'700'}}>Créer le compte</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowNew(false)}>
              <Text style={s2.cancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal élections */}
      <Modal visible={showElu} transparent animationType="slide">
        <View style={s2.overlay}>
          <ScrollView contentContainerStyle={s2.modal}>
            <Text style={s2.mT}>🗳️ Élire le bureau</Text>
            {[
              ['👑 Présidente/Président', ePres, setEPres],
              ['💼 Trésorier(e)',          eTres, setETres],
              ['📝 Secrétaire',             eSec,  setESec ],
            ].map(([label,val,set],i)=>(
              <View key={i} style={{marginBottom:16}}>
                <Text style={{fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:6}}>{label}</Text>
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                  {candidats.map(u=>(
                    <TouchableOpacity key={u.id}
                      style={[s2.chip, val===u.id&&s2.chipA]}
                      onPress={()=>set(u.id)}>
                      <Text style={{fontSize:11,color:val===u.id?'#fff':COLORS.darkGray}}>
                        {u.prenom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.btnPri} onPress={handleElire}>
              <Text style={{color:'#fff',fontWeight:'700'}}>Valider les élections</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowElu(false)}>
              <Text style={s2.cancel}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  tabs:  {flexDirection:'row',backgroundColor:'#fff',
          borderBottomWidth:1,borderBottomColor:COLORS.border},
  tab:   {flex:1,padding:SPACING.sm,alignItems:'center'},
  tabA:  {borderBottomWidth:3,borderBottomColor:COLORS.primary},
  tabT:  {fontSize:11,color:COLORS.gray,fontWeight:'600'},
  sec:   {fontSize:14,fontWeight:'700',color:COLORS.darkGray,marginBottom:SPACING.xs},
  btnPri:{backgroundColor:COLORS.primary,borderRadius:8,padding:14,alignItems:'center',marginTop:8},
  fab:   {position:'absolute',bottom:16,left:16,right:16,backgroundColor:COLORS.primary,
          borderRadius:12,padding:16,alignItems:'center'},
});
const s2 = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modal:  {backgroundColor:'#fff',borderTopLeftRadius:20,borderTopRightRadius:20,padding:24},
  mT:     {fontSize:18,fontWeight:'700',color:COLORS.primary,marginBottom:SPACING.md},
  inp:    {borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:13,fontSize:14,marginBottom:8},
  chip:   {paddingHorizontal:10,paddingVertical:5,borderRadius:16,
           borderWidth:1,borderColor:COLORS.border,backgroundColor:'#fff'},
  chipA:  {backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  cancel: {textAlign:'center',marginTop:14,color:COLORS.gray},
});
