import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Permissions par role
// ---------------------------------------------------------------------------
const PERMISSIONS = {
  superadmin: {
    creerMembre: true, supprimerMembre: true, modifierMembre: true, configurerTaux: true,
    publierCharte: true, publierRapport: true, voirTout: true, elireBureau: true,
    modifierMontants: true, saisirVersements: true, accordePret: true,
    genererRapport: true, ordreJour: true, calendrierPot: true, gererFonds: true,
  },
  president: {
    publierCharte: true, publierRapport: true, voirTout: true, elireBureau: true,
    saisirVersements: true, accordePret: true, genererRapport: true,
    ordreJour: true, calendrierPot: true, gererFonds: true,
  },
  tresorier: {
    voirTout: true, modifierMontants: true, saisirVersements: true, accordePret: true, gererFonds: true,
  },
  caissier: {
    voirTout: true, saisirVersements: true, gererFonds: true,
  },
  secretaire: {
    publierRapport: true, voirTout: true, genererRapport: true, calendrierPot: true,
  },
  membre: {},
};

const can = (role, permission) => !!(PERMISSIONS[role] && PERMISSIONS[role][permission]);

// ---------------------------------------------------------------------------
// Fallback admin (mock) -- utilise uniquement si Supabase est inaccessible
// ---------------------------------------------------------------------------
const FALLBACK_ADMIN = {
  id: 'usr-00',
  membreId: null,
  login: 'admin',
  prenom: 'Admin',
  nom: 'Super Administrateur',
  email: 'admin@poo-ndjadje.cm',
  telephone: '699000000',
  mustChangePassword: false,
  role: 'superadmin',
  actif: true,
  avatar: 'SA',
  creditScore: 100,
};

// ---------------------------------------------------------------------------
// Helper : transformer une ligne djangui_membres en objet currentUser
// ---------------------------------------------------------------------------
const mapMembreToUser = (row) => {
  if (!row) return null;
  const prenom = row.prenom || row.login || '';
  const nom = row.nom || prenom;
  const initiales = nom
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3);

  return {
    id: row.id,
    membreId: row.membre_id || row.id,
    auth_id: row.auth_id || null,
    login: row.login || '',
    prenom,
    nom,
    email: row.email || '',
    telephone: row.telephone || '',
    mustChangePassword: !!row.must_change_password,
    role: row.role || 'membre',
    actif: row.actif !== false && row.actif !== 0,
    avatar: row.avatar || initiales,
    creditScore: row.credit_score ?? row.creditScore ?? 50,
  };
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // true while restoring session
  const isMounted = useRef(true);

  // ------------------------------------------------------------------
  // Charger tous les membres (pour l'admin, la vue membres, elections)
  // ------------------------------------------------------------------
  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('djangui_membres')
        .select('*')
        .order('nom', { ascending: true });

      if (error) {
        console.warn('[AuthContext] fetchAllUsers error:', error.message);
        return;
      }
      if (isMounted.current) {
        setUsers((data || []).map(mapMembreToUser));
      }
    } catch (err) {
      console.warn('[AuthContext] fetchAllUsers exception:', err.message);
    }
  }, []);

  // ------------------------------------------------------------------
  // Charger le profil du membre connecte depuis djangui_membres
  // ------------------------------------------------------------------
  const fetchProfile = useCallback(async (authId) => {
    if (!authId) return null;
    try {
      const { data, error } = await supabase
        .from('djangui_membres')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] fetchProfile error:', error.message);
        return null;
      }
      return data ? mapMembreToUser(data) : null;
    } catch (err) {
      console.warn('[AuthContext] fetchProfile exception:', err.message);
      return null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Restauration de session au demarrage + listener auth
  // ------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;

    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (isMounted.current) {
            setCurrentUser(profile);
            fetchAllUsers();
          }
        }
      } catch (err) {
        console.warn('[AuthContext] restoreSession:', err.message);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };

    restoreSession();

    // Ecouter les changements d'auth (token refresh, sign-out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;

        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setUsers([]);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (isMounted.current) {
              setCurrentUser(profile);
              fetchAllUsers();
            }
          }
        }

        if (event === 'PASSWORD_RECOVERY') {
          // L'utilisateur a clique sur le lien de reinitialisation
          // Le composant ChangePassword gerera la suite
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile, fetchAllUsers]);

  // ------------------------------------------------------------------
  // LOGIN – Auth locale (vérifie mot_de_passe dans djangui_membres)
  // ------------------------------------------------------------------
  const login = async (loginInput, password) => {
    if (!loginInput?.trim() || !password) {
      if (Platform.OS === 'web') {
        window.alert('Identifiant et mot de passe requis.');
      } else {
        Alert.alert('Erreur', 'Identifiant et mot de passe requis.');
      }
      return false;
    }

    setIsLoading(true);
    const input = loginInput.toLowerCase().trim();

    try {
      // 1. Rechercher le membre dans djangui_membres (par login, email ou telephone)
      const { data: membres, error: lookupError } = await supabase
        .from('djangui_membres')
        .select('*')
        .or(`login.eq.${input},email.eq.${input},telephone.eq.${input}`);

      if (lookupError) throw new Error(lookupError.message);

      const membre = membres && membres.length > 0 ? membres[0] : null;

      if (!membre) {
        // Verifier si c'est le login admin fallback avant de rejeter
        return handleFallbackLogin(input, password, 'not_found');
      }

      // Verifier que le compte est actif
      if (membre.actif === false || membre.actif === 0) {
        setIsLoading(false);
        const msg = 'Ce compte est inactif. Contactez l\'administrateur.';
        if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Compte inactif', msg); }
        return false;
      }

      // 2. Vérifier le mot de passe localement
      const storedPwd = membre.mot_de_passe || '123456';
      if (password !== storedPwd) {
        setIsLoading(false);
        const msg = 'Mot de passe incorrect.';
        if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Erreur', msg); }
        return false;
      }

      // 3. Construire l'objet utilisateur directement (pas de Supabase Auth)
      const userProfile = mapMembreToUser(membre);
      setCurrentUser(userProfile);
      await fetchAllUsers();
      setIsLoading(false);
      return userProfile;
    } catch (err) {
      console.warn('[AuthContext] login exception:', err.message);
      return handleFallbackLogin(input, password);
    }
  };

  // ------------------------------------------------------------------
  // FALLBACK : connexion locale admin uniquement (reseau HS ou membre non trouve)
  // ------------------------------------------------------------------
  const handleFallbackLogin = (input, password, reason) => {
    if (
      (input === 'admin' || input === 'admin@poo-ndjadje.cm' || input === '699000000') &&
      password === 'admin2026'
    ) {
      console.warn('[AuthContext] Mode hors-ligne : connexion admin locale.');
      setCurrentUser(FALLBACK_ADMIN);
      setUsers([FALLBACK_ADMIN]);
      setIsLoading(false);
      return FALLBACK_ADMIN;
    }

    setIsLoading(false);
    if (reason === 'not_found') {
      const msg = 'Identifiant introuvable. Verifiez votre login, email ou telephone.';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Erreur', msg); }
    } else {
      const msg = 'Impossible de joindre le serveur. Verifiez votre connexion internet.';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Erreur de connexion', msg); }
    }
    return false;
  };

  // ------------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------------
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] logout error:', err.message);
    }
    setCurrentUser(null);
    setUsers([]);
  };

  // ------------------------------------------------------------------
  // CHANGER MOT DE PASSE (pour le user connecte)
  // ------------------------------------------------------------------
  const changerMotDePasse = async (userId, newPassword) => {
    if (!newPassword || newPassword.length < 4) {
      const msg = 'Le mot de passe doit contenir au moins 4 caracteres.';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Erreur', msg); }
      return false;
    }

    try {
      // Mettre a jour le mot de passe dans djangui_membres
      const { error: dbError } = await supabase
        .from('djangui_membres')
        .update({ mot_de_passe: newPassword, must_change_password: false })
        .eq('id', userId);

      if (dbError) {
        console.warn('[AuthContext] changerMotDePasse DB error:', dbError.message);
        const msg = 'Impossible de mettre a jour le mot de passe.';
        if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Erreur', msg); }
        return false;
      }

      // Mettre a jour l'etat local
      setCurrentUser((prev) =>
        prev && prev.id === userId ? { ...prev, mustChangePassword: false } : prev
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, mustChangePassword: false } : u))
      );

      return true;
    } catch (err) {
      console.warn('[AuthContext] changerMotDePasse exception:', err.message);
      const msg = 'Impossible de mettre a jour le mot de passe.';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Erreur', msg); }
      return false;
    }
  };

  // ------------------------------------------------------------------
  // REINITIALISER MOT DE PASSE (forgot password - envoie un email)
  // ------------------------------------------------------------------
  const reinitialiserMotDePasse = async (email) => {
    if (!email?.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre email.');
      return false;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'poo-ndjadje://reset-password',
      });

      if (error) {
        Alert.alert('Erreur', error.message);
        return false;
      }

      Alert.alert(
        'Email envoye',
        'Un lien de reinitialisation a ete envoye a ' + email.trim() + '.'
      );
      return true;
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de reinitialisation.');
      return false;
    }
  };

  // ------------------------------------------------------------------
  // REINITIALISER MOT DE PASSE PAR L'ADMIN (direct DB update)
  // ------------------------------------------------------------------
  const adminResetPassword = async (membreId, newPassword) => {
    const pwd = newPassword || '123456';

    try {
      const { error } = await supabase
        .from('djangui_membres')
        .update({ mot_de_passe: pwd, must_change_password: true })
        .eq('id', membreId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === membreId ? { ...u, mustChangePassword: true } : u))
      );

      const msg = `Mot de passe reinitialise a "${pwd}".`;
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Succes', msg); }
      return true;
    } catch (err) {
      console.warn('[AuthContext] adminResetPassword error:', err.message);
      const msg = 'Impossible de reinitialiser le mot de passe.';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Erreur', msg); }
      return false;
    }
  };

  // ------------------------------------------------------------------
  // METTRE A JOUR LE PROFIL
  // ------------------------------------------------------------------
  const mettreAJourProfil = async (userId, data) => {
    try {
      // Preparer les champs DB (snake_case)
      const dbFields = {};
      if (data.nom !== undefined) dbFields.nom = data.nom;
      if (data.prenom !== undefined) dbFields.prenom = data.prenom;
      if (data.email !== undefined) dbFields.email = data.email;
      if (data.telephone !== undefined) dbFields.telephone = data.telephone;
      if (data.avatar !== undefined) dbFields.avatar = data.avatar;

      const { error } = await supabase
        .from('djangui_membres')
        .update(dbFields)
        .eq('id', userId);

      if (error) {
        console.warn('[AuthContext] mettreAJourProfil error:', error.message);
        Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
        return false;
      }

      // Mettre a jour l'etat local (camelCase pour la compatibilite)
      setCurrentUser((prev) => (prev && prev.id === userId ? { ...prev, ...data } : prev));
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
      return true;
    } catch (err) {
      console.warn('[AuthContext] mettreAJourProfil exception:', err.message);
      // Fallback local
      setCurrentUser((prev) => (prev ? { ...prev, ...data } : prev));
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)));
      return true;
    }
  };

  // ------------------------------------------------------------------
  // CREER UN UTILISATEUR / MEMBRE
  // ------------------------------------------------------------------
  const creerUtilisateur = async (data) => {
    const loginGen = (data.prenom || '').toLowerCase().replace(/\s+/g, '');
    const emailGen = data.email || loginGen + '@poo-ndjadje.cm';

    try {
      const newRow = {
        login: loginGen,
        prenom: data.prenom || '',
        nom: data.nom || (data.prenom || ''),
        email: emailGen,
        telephone: data.telephone || '',
        role: data.role || 'membre',
        actif: true,
        must_change_password: true,
        credit_score: 50,
        avatar: data.avatar || null,
      };

      const { data: inserted, error } = await supabase
        .from('djangui_membres')
        .insert(newRow)
        .select()
        .single();

      if (error) {
        console.warn('[AuthContext] creerUtilisateur error:', error.message);
        Alert.alert('Erreur', 'Impossible de creer le membre : ' + error.message);
        return null;
      }

      const newUser = mapMembreToUser(inserted);
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (err) {
      console.warn('[AuthContext] creerUtilisateur exception:', err.message);

      // Fallback local
      const fallbackUser = {
        id: 'usr-' + Date.now(),
        membreId: 'mbr-' + Date.now(),
        login: loginGen,
        prenom: data.prenom || '',
        nom: data.nom || data.prenom || '',
        email: emailGen,
        telephone: data.telephone || '',
        mustChangePassword: true,
        role: 'membre',
        actif: true,
        avatar: null,
        creditScore: 50,
        ...data,
      };
      setUsers((prev) => [...prev, fallbackUser]);
      return fallbackUser;
    }
  };

  // ------------------------------------------------------------------
  // ELIRE LE BUREAU (changer les roles)
  // ------------------------------------------------------------------
  const elireBureau = async (elections) => {
    // elections = { president: userId, tresorier: userId, secretaire: userId }
    const updates = [];

    try {
      // D'abord, remettre les anciens bureau en "membre"
      const { error: resetError } = await supabase
        .from('djangui_membres')
        .update({ role: 'membre' })
        .in('role', ['president', 'tresorier', 'secretaire']);

      if (resetError) {
        console.warn('[AuthContext] elireBureau reset error:', resetError.message);
      }

      // Assigner les nouveaux roles
      for (const [poste, userId] of Object.entries(elections)) {
        const { error } = await supabase
          .from('djangui_membres')
          .update({ role: poste })
          .eq('id', userId);

        if (error) {
          console.warn(`[AuthContext] elireBureau ${poste} error:`, error.message);
        }
        updates.push({ poste, userId });
      }

      // Mettre a jour l'etat local
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === elections.president) return { ...u, role: 'president' };
          if (u.id === elections.tresorier) return { ...u, role: 'tresorier' };
          if (u.id === elections.secretaire) return { ...u, role: 'secretaire' };
          if (['president', 'tresorier', 'secretaire'].includes(u.role) &&
            !Object.values(elections).includes(u.id)) {
            return { ...u, role: 'membre' };
          }
          return u;
        })
      );

      // Mettre a jour currentUser si concerne
      if (
        currentUser &&
        ['president', 'tresorier', 'secretaire'].includes(currentUser.role) &&
        !Object.values(elections).includes(currentUser.id)
      ) {
        setCurrentUser((prev) => ({ ...prev, role: 'membre' }));
      }
      Object.entries(elections).forEach(([poste, uid]) => {
        if (currentUser?.id === uid) {
          setCurrentUser((prev) => ({ ...prev, role: poste }));
        }
      });
    } catch (err) {
      console.warn('[AuthContext] elireBureau exception:', err.message);

      // Fallback local
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === elections.president) return { ...u, role: 'president' };
          if (u.id === elections.tresorier) return { ...u, role: 'tresorier' };
          if (u.id === elections.secretaire) return { ...u, role: 'secretaire' };
          if (['president', 'tresorier', 'secretaire'].includes(u.role) &&
            !Object.values(elections).includes(u.id)) {
            return { ...u, role: 'membre' };
          }
          return u;
        })
      );
      if (currentUser && ['president', 'tresorier', 'secretaire'].includes(currentUser.role) &&
        !Object.values(elections).includes(currentUser.id)) {
        setCurrentUser((prev) => ({ ...prev, role: 'membre' }));
      }
      Object.entries(elections).forEach(([poste, uid]) => {
        if (currentUser?.id === uid) {
          setCurrentUser((prev) => ({ ...prev, role: poste }));
        }
      });
    }
  };

  // ------------------------------------------------------------------
  // VERIFIER PERMISSION
  // ------------------------------------------------------------------
  const peutFaire = (permission) => can(currentUser?.role, permission);

  // ------------------------------------------------------------------
  // PROVIDER
  // ------------------------------------------------------------------
  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        users,
        login,
        logout,
        changerMotDePasse,
        mettreAJourProfil,
        creerUtilisateur,
        elireBureau,
        peutFaire,
        reinitialiserMotDePasse,
        adminResetPassword,
        fetchAllUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
