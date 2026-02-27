import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import LoginScreen             from '../screens/auth/LoginScreen';
import ChangerMotDePasseScreen from '../screens/auth/ChangerMotDePasseScreen';
import DashboardScreen         from '../screens/dashboard/DashboardScreen';
import EpargneScreen           from '../screens/epargne/EpargneScreen';
import PretsScreen             from '../screens/prets/PretsScreen';
import MembresScreen           from '../screens/membres/MembresScreen';
import GovernanceScreen        from '../screens/governance/GovernanceScreen';
import ReportsScreen           from '../screens/reports/ReportsScreen';
import ProfilScreen            from '../screens/profil/ProfilScreen';
import AdminScreen             from '../screens/admin/AdminScreen';

const Tab = createBottomTabNavigator();
const ICONS = {
  Accueil:  ['home',             'home-outline'],
  Epargne:  ['trending-up',      'trending-up-outline'],
  Prets:    ['cash',             'cash-outline'],
  Membres:  ['people',           'people-outline'],
  Bureau:   ['shield-checkmark', 'shield-checkmark-outline'],
  Rapports: ['document-text',    'document-text-outline'],
  Profil:   ['person-circle',    'person-circle-outline'],
  Admin:    ['settings',         'settings-outline'],
};
const Ico = ({route,focused,color,size}) => {
  const k = ICONS[route.name] || ['ellipse','ellipse-outline'];
  return <Ionicons name={k[focused?0:1]} size={size} color={color}/>;
};

export default function AppNavigator() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  if (!currentUser)
    return <NavigationContainer><LoginScreen/></NavigationContainer>;

  if (currentUser.mustChangePassword)
    return <NavigationContainer><ChangerMotDePasseScreen/></NavigationContainer>;

  const isBureau = ['president','tresorier','secretaire','superadmin'].includes(role);
  const isAdmin  = role === 'superadmin';

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={({route}) => ({
        tabBarIcon: (props) => <Ico route={route} {...props}/>,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#6C757D',
        tabBarStyle: {height:62,paddingBottom:8,borderTopWidth:1,borderTopColor:'#DEE2E6'},
        tabBarLabelStyle: {fontSize:10,fontWeight:'600'},
        headerStyle: {backgroundColor:COLORS.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight:'800'},
      })}>
        <Tab.Screen name="Accueil"  component={DashboardScreen}  options={{title:'Accueil'}}/>
        <Tab.Screen name="Epargne"  component={EpargneScreen}    options={{title:'Épargne'}}/>
        <Tab.Screen name="Prets"    component={PretsScreen}      options={{title:'Prêts'}}/>
        <Tab.Screen name="Membres"  component={MembresScreen}    options={{title:'Membres'}}/>
        {isBureau && <Tab.Screen name="Bureau"   component={GovernanceScreen} options={{title:'Bureau'}}/>}
        {isBureau && <Tab.Screen name="Rapports" component={ReportsScreen}    options={{title:'Rapports'}}/>}
        <Tab.Screen name="Profil"   component={ProfilScreen}     options={{title:'Profil'}}/>
        {isAdmin   && <Tab.Screen name="Admin"   component={AdminScreen}      options={{title:'⚡ Admin'}}/>}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

