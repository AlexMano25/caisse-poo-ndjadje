import React,{createContext,useContext,useState} from 'react';
import { Alert } from 'react-native';
import { USERS_DB, can } from '../data/users';

const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [users,       setUsers]       = useState(USERS_DB);

  const login = (loginInput, password) => {
    setIsLoading(true);
    const input = (loginInput||'').toLowerCase().trim();
    const user  = users.find(u =>
      u.login === input ||
      u.email === input ||
      u.telephone === input
    );
    if (!user) {
      setIsLoading(false);
      Alert.alert('Erreur', 'Identifiant introuvable.');
      return false;
    }
    if (!user.actif) {
      setIsLoading(false);
      Alert.alert('Compte inactif', "Contactez l'administrateur.");
      return false;
    }
    if (user.password !== password) {
      setIsLoading(false);
      Alert.alert('Erreur', 'Mot de passe incorrect.');
      return false;
    }
    setIsLoading(false);
    setCurrentUser(user);
    return user;
  };

  const logout = () => setCurrentUser(null);

  const changerMotDePasse = (userId, newPassword) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? {...u, password:newPassword, mustChangePassword:false} : u
    ));
    setCurrentUser(prev => ({...prev, password:newPassword, mustChangePassword:false}));
  };

  const mettreAJourProfil = (userId, data) => {
    setUsers(prev => prev.map(u => u.id === userId ? {...u, ...data} : u));
    setCurrentUser(prev => ({...prev, ...data}));
  };

  const creerUtilisateur = (data) => {
    const loginGen = (data.prenom||'').toLowerCase().replace(/\s+/g,'');
    const newUser = {
      id: 'usr-' + Date.now(),
      membreId: 'mbr-' + Date.now(),
      login: loginGen,
      password: '123456',
      mustChangePassword: true,
      actif: true,
      role: 'membre',
      creditScore: 50,
      ...data,
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const elireBureau = (elections) => {
    setUsers(prev => prev.map(u => {
      if (u.id === elections.president)  return {...u, role:'president'};
      if (u.id === elections.tresorier)  return {...u, role:'tresorier'};
      if (u.id === elections.secretaire) return {...u, role:'secretaire'};
      if (['president','tresorier','secretaire'].includes(u.role) &&
          !Object.values(elections).includes(u.id)) return {...u, role:'membre'};
      return u;
    }));
    if (currentUser && ['president','tresorier','secretaire'].includes(currentUser.role) &&
        !Object.values(elections).includes(currentUser.id)) {
      setCurrentUser(prev => ({...prev, role:'membre'}));
    }
    Object.entries(elections).forEach(([poste, uid]) => {
      if (currentUser?.id === uid) setCurrentUser(prev => ({...prev, role:poste}));
    });
  };

  const peutFaire = (permission) => can(currentUser?.role, permission);

  return (
    <AuthContext.Provider value={{
      currentUser, isLoading, users,
      login, logout, changerMotDePasse, mettreAJourProfil,
      creerUtilisateur, elireBureau, peutFaire,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
