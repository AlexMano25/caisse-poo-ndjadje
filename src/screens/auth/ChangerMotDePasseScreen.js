import React,{useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,
  Alert,KeyboardAvoidingView,Platform} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../utils/theme';

export default function ChangerMotDePasseScreen() {
  const { currentUser, changerMotDePasse } = useAuth();
  const [nouveau,   setNouveau]   = useState('');
  const [confirmer, setConfirmer] = useState('');
  const [showN,     setShowN]     = useState(false);
  const [showC,     setShowC]     = useState(false);

  const handleChange = () => {
    if (nouveau.length < 6) {
      Alert.alert('Trop court','Minimum 6 caractères.'); return;
    }
    if (nouveau !== confirmer) {
      Alert.alert('Erreur','Les mots de passe ne correspondent pas.'); return;
    }
    changerMotDePasse(currentUser.id, nouveau);
    Alert.alert('✅ Succès', 'Mot de passe mis à jour. Bienvenue !',
      [{text:'OK'}]);
  };

  return (
    <KeyboardAvoidingView style={s.container}
      behavior={Platform.OS==='ios'?'padding':'height'}>
      <View style={s.card}>
        <Text style={s.emoji}>🔐</Text>
        <Text style={s.titre}>Nouveau mot de passe</Text>
        <Text style={s.sous}>
          Bonjour {currentUser?.prenom} ! C’est votre première connexion.{"\n"}
          Choisissez un mot de passe personnel (min. 6 caractères).
        </Text>

        <Text style={s.label}>Nouveau mot de passe</Text>
        <View style={s.row}>
          <TextInput style={[s.input,{flex:1}]} placeholder="••••••••"
            secureTextEntry={!showN} value={nouveau} onChangeText={setNouveau}/>
          <TouchableOpacity onPress={()=>setShowN(p=>!p)} style={s.eye}>
            <Text>{showN?'🙈':'👁️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Confirmer</Text>
        <View style={s.row}>
          <TextInput style={[s.input,{flex:1}]} placeholder="••••••••"
            secureTextEntry={!showC} value={confirmer} onChangeText={setConfirmer}/>
          <TouchableOpacity onPress={()=>setShowC(p=>!p)} style={s.eye}>
            <Text>{showC?'🙈':'👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.btn} onPress={handleChange}>
          <Text style={s.btnT}>Enregistrer et continuer →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.primary,justifyContent:'center',padding:SPACING.lg},
  card:     {backgroundColor:'#fff',borderRadius:20,padding:SPACING.lg},
  emoji:    {fontSize:48,textAlign:'center',marginBottom:SPACING.sm},
  titre:    {fontSize:22,fontWeight:'800',color:COLORS.darkGray,textAlign:'center'},
  sous:     {fontSize:12,color:COLORS.gray,textAlign:'center',marginTop:4,
             marginBottom:SPACING.md,lineHeight:18},
  label:    {fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:4,marginTop:SPACING.sm},
  row:      {flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  input:    {borderWidth:1.5,borderColor:'#DEE2E6',borderRadius:10,padding:14,fontSize:15},
  eye:      {padding:10},
  btn:      {backgroundColor:COLORS.primary,borderRadius:10,padding:16,
             alignItems:'center',marginTop:SPACING.md},
  btnT:     {color:'#fff',fontWeight:'800',fontSize:15},
});
