import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import ChangerMotDePasseScreen from '../screens/auth/ChangerMotDePasseScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import EpargneScreen from '../screens/epargne/EpargneScreen';
import PretsScreen from '../screens/prets/PretsScreen';
import MembresScreen from '../screens/membres/MembresScreen';
import MembreDetailScreen from '../screens/membres/MembreDetailScreen';
import GovernanceScreen from '../screens/governance/GovernanceScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import ProfilScreen from '../screens/profil/ProfilScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

const ICONS = {
  Accueil: ['home', 'home-outline'],
  Epargne: ['trending-up', 'trending-up-outline'],
  Prets: ['cash', 'cash-outline'],
  Membres: ['people', 'people-outline'],
  Bureau: ['shield-checkmark', 'shield-checkmark-outline'],
  Rapports: ['document-text', 'document-text-outline'],
  Transactions: ['swap-horizontal', 'swap-horizontal-outline'],
  Profil: ['person-circle', 'person-circle-outline'],
  Admin: ['settings', 'settings-outline'],
};

function TabIcon({ route, focused, color, size }) {
  const iconPair = ICONS[route.name] || ['ellipse', 'ellipse-outline'];
  return <Ionicons name={iconPair[focused ? 0 : 1]} size={size} color={color} />;
}

// Stack navigator for Membres tab (MembresScreen -> MembreDetailScreen)
function MembresStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen
        name="MembresMain"
        component={MembresScreen}
        options={{ title: 'Membres', headerShown: false }}
      />
      <Stack.Screen
        name="MembreDetail"
        component={MembreDetailScreen}
        options={({ route }) => ({
          title: 'Fiche membre',
        })}
      />
    </Stack.Navigator>
  );
}

// Auth stack for login flow
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  // Not logged in: show auth flow
  if (!currentUser) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Must change password on first login
  if (currentUser.mustChangePassword) {
    return (
      <NavigationContainer>
        <ChangerMotDePasseScreen />
      </NavigationContainer>
    );
  }

  const isBureau = ['president', 'tresorier', 'secretaire', 'superadmin'].includes(role);
  const isAdmin = role === 'superadmin';

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: (props) => <TabIcon route={route} {...props} />,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: '#6C757D',
          tabBarStyle: {
            height: 62,
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: '#DEE2E6',
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
        })}
      >
        <Tab.Screen
          name="Accueil"
          component={DashboardScreen}
          options={{ title: 'Accueil' }}
        />
        <Tab.Screen
          name="Epargne"
          component={EpargneScreen}
          options={{ title: 'Epargne' }}
        />
        <Tab.Screen
          name="Prets"
          component={PretsScreen}
          options={{ title: 'Prets' }}
        />
        <Tab.Screen
          name="Membres"
          component={MembresStackNavigator}
          options={{ title: 'Membres', headerShown: false }}
        />
        {isBureau && (
          <Tab.Screen
            name="Bureau"
            component={GovernanceScreen}
            options={{ title: 'Bureau' }}
          />
        )}
        {isBureau && (
          <Tab.Screen
            name="Rapports"
            component={ReportsScreen}
            options={{ title: 'Rapports' }}
          />
        )}
        <Tab.Screen
          name="Profil"
          component={ProfilScreen}
          options={{ title: 'Profil' }}
        />
        {isAdmin && (
          <Tab.Screen
            name="Admin"
            component={AdminScreen}
            options={{ title: 'Admin' }}
          />
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
