import React,{useState} from 'react';
import { View,Text,ScrollView,StyleSheet,TouchableOpacity,Modal,TextInput,Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import Card from '../../components/common/Card';
import { COLORS, SPACING } from '../../utils/theme';
export default function ReportsScreen() {
  const { rapports,publierRapport,currentUser } = useApp();
  const canWrite = ['secretaire','president'].includes(currentUser.role);
  const reports   = rapports || [];
  const [selRpt,setSelRpt]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [title,setTitle]=useState('');
  const [content,setContent]=useState('');
  const handlePublish=()=>{
    if(!title.trim()||!content.trim()){Alert.alert('Erreur','Titre et contenu requis.');return;}
    publierRapport(title,content);
    setShowNew(false);setTitle('');setContent('');
    Alert.alert('🔒 Archivé','Rapport publié et visible par tous les membres.');
  };
  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScrollView contentContainerStyle={{padding:SPACING.md,paddingBottom:100}}>
        <Text style={{fontSize:22,fontWeight:'800',color:COLORS.primary}}>Journal des Séances</Text>
        <Text style={{fontSize:13,color:COLORS.gray,marginBottom:SPACING.md}}>Archives immuables</Text>
        {reports.map(rpt=>(
          <Card key={rpt.id}>
            <TouchableOpacity onPress={()=>setSelRpt(rpt)}>
              <View style={{flexDirection:'row',alignItems:'center',gap:SPACING.sm}}>
                <View style={{width:40,height:40,borderRadius:20,backgroundColor:COLORS.primary,justifyContent:'center',alignItems:'center'}}>
                  <Text style={{color:'#fff',fontWeight:'800',fontSize:13}}>#{rpt.sessionNumber}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:15,fontWeight:'600',color:COLORS.darkGray}}>{rpt.title}</Text>
                  <Text style={{fontSize:11,color:COLORS.gray}}>📅 {rpt.date} · ✍️ {rpt.author}</Text>
                </View>
                <Text style={{fontSize:22,color:COLORS.gray}}>›</Text>
              </View>
              {rpt.isPublished&&(
                <View style={{marginTop:8,backgroundColor:'#F0FFF4',borderRadius:6,paddingHorizontal:10,paddingVertical:4,alignSelf:'flex-start'}}>
                  <Text style={{fontSize:11,color:'#52B788',fontWeight:'600'}}>🔒 Archivé & Publié</Text>
                </View>
              )}
            </TouchableOpacity>
          </Card>
        ))}
      </ScrollView>
      {canWrite&&(
        <TouchableOpacity style={s.fab} onPress={()=>setShowNew(true)}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>+ Nouveau Rapport</Text>
        </TouchableOpacity>
      )}
      <Modal visible={!!selRpt} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.box}>
            <ScrollView>
              <Text style={s.mTitle}>{selRpt?.title}</Text>
              <Text style={{fontSize:11,color:COLORS.gray,marginBottom:SPACING.sm}}>📅 {selRpt?.date} · ✍️ {selRpt?.author}</Text>
              <View style={{height:1,backgroundColor:COLORS.border,marginVertical:SPACING.sm}}/>
              <Text style={{fontSize:13,color:COLORS.darkGray,lineHeight:22}}>{selRpt?.content}</Text>
            </ScrollView>
            <TouchableOpacity style={{marginTop:16,backgroundColor:COLORS.primary,borderRadius:8,padding:SPACING.sm,alignItems:'center'}} onPress={()=>setSelRpt(null)}>
              <Text style={{color:'#fff',fontWeight:'700'}}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showNew} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.box}>
            <Text style={s.mTitle}>📝 Nouveau Rapport de Séance</Text>
            <TextInput style={s.input} placeholder="Titre du rapport" value={title} onChangeText={setTitle}/>
            <TextInput style={[s.input,{height:160,textAlignVertical:'top'}]} placeholder="Contenu (décisions, présents, montants...)" multiline value={content} onChangeText={setContent}/>
            <TouchableOpacity style={{backgroundColor:COLORS.primary,borderRadius:8,padding:16,alignItems:'center'}} onPress={handlePublish}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>🔒 Publier & Archiver</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowNew(false)}><Text style={{textAlign:'center',marginTop:16,color:'#6C757D'}}>Annuler</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s=StyleSheet.create({
  fab:{position:'absolute',bottom:20,left:20,right:20,backgroundColor:COLORS.primary,borderRadius:12,padding:16,alignItems:'center'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',padding:16},
  box:{backgroundColor:'#fff',borderRadius:16,padding:32,maxHeight:'90%'},
  mTitle:{fontSize:18,fontWeight:'800',color:COLORS.primary,marginBottom:4},
  input:{borderWidth:1,borderColor:'#DEE2E6',borderRadius:8,padding:16,marginBottom:8,fontSize:13},
});
