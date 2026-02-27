import React,{useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,
  KeyboardAvoidingView,Platform,ScrollView,ActivityIndicator,Alert} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../utils/theme';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse,  setMotDePasse]  = useState('');
  const [showPwd,     setShowPwd]     = useState(false);

  const handleLogin = () => {
    if (!identifiant.trim() || !motDePasse.trim()) {
      Alert.alert('Champs requis','Entrez votre identifiant et mot de passe.');
      return;
    }
    login(identifiant.trim(), motDePasse);
  };

  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        <View style={s.logoBox}>
          <Text style={s.logoEmoji}>💰</Text>
          <Text style={s.appName}>Caisse POO NDJADJE</Text>
          <Text style={s.appSub}>Djangui Numérique</Text>
        </View>

        <View style={s.card}>
          <Text style={s.titre}>Connexion</Text>
          <Text style={s.sous}>Prénom · Email · Téléphone</Text>

          <Text style={s.label}>Identifiant</Text>
          <TextInput
            style={s.input}
            placeholder="Ex: gamaliel"
            autoCapitalize="none"
            autoCorrect={false}
            value={identifiant}
            onChangeText={setIdentifiant}
          />

          <Text style={s.label}>Mot de passe</Text>
          <View style={s.pwdRow}>
            <TextInput
              style={[s.input,{flex:1,marginBottom:0}]}
              placeholder="••••••"
              secureTextEntry={!showPwd}
              value={motDePasse}
              onChangeText={setMotDePasse}
            />
            <TouchableOpacity onPress={()=>setShowPwd(p=>!p)} style={s.eyeBtn}>
              <Text style={{fontSize:20}}>{showPwd?'🙈':'👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.btnLogin} onPress={handleLogin} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color="#fff"/>
              : <Text style={s.btnLoginT}>Se connecter →</Text>
            }
          </TouchableOpacity>

          <Text style={s.hint}>
            Mot de passe par défaut : 123456{"\n"}
            À changer obligatoirement à la première connexion.
          </Text>
        </View>

        <Text style={s.footer}>v1.0 · Diaspo-Djangui MVP</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:   {flexGrow:1,backgroundColor:COLORS.primary,justifyContent:'center',padding:SPACING.lg},
  logoBox:     {alignItems:'center',marginBottom:SPACING.xl},
  logoEmoji:   {fontSize:56},
  appName:     {fontSize:24,fontWeight:'800',color:'#fff',marginTop:8},
  appSub:      {fontSize:14,color:'rgba(255,255,255,0.7)',marginTop:4},
  card:        {backgroundColor:'#fff',borderRadius:20,padding:SPACING.lg,
                shadowColor:'#000',shadowOffset:{width:0,height:4},
                shadowOpacity:0.15,shadowRadius:12,elevation:8},
  titre:       {fontSize:22,fontWeight:'800',color:COLORS.darkGray,marginBottom:2},
  sous:        {fontSize:12,color:COLORS.gray,marginBottom:SPACING.md},
  label:       {fontSize:12,fontWeight:'600',color:COLORS.gray,marginBottom:4,marginTop:SPACING.sm},
  input:       {borderWidth:1.5,borderColor:'#DEE2E6',borderRadius:10,padding:14,
                fontSize:15,marginBottom:4,backgroundColor:'#FAFAFA'},
  pwdRow:      {flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  eyeBtn:      {padding:10},
  btnLogin:    {backgroundColor:COLORS.primary,borderRadius:10,padding:16,
                alignItems:'center',marginTop:SPACING.md},
  btnLoginT:   {color:'#fff',fontWeight:'800',fontSize:16},
  hint:        {fontSize:11,color:COLORS.gray,textAlign:'center',marginTop:SPACING.md,lineHeight:18},
  footer:      {color:'rgba(255,255,255,0.5)',textAlign:'center',marginTop:SPACING.lg,fontSize:11},
});
