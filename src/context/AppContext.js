import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { calculerRecapAnnuel } from '../utils/calculations';

const AppContext = createContext();

// ---------------------------------------------------------------------------
// Helper: safe Supabase query with error handling
// ---------------------------------------------------------------------------
async function query(table, options = {}) {
  let q = supabase.from(table).select(options.select || '*');
  if (options.order) {
    q = q.order(options.order.column, { ascending: options.order.ascending ?? false });
  }
  if (options.eq) {
    for (const [col, val] of Object.entries(options.eq)) {
      q = q.eq(col, val);
    }
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const AppProvider = ({ children }) => {
  const { currentUser } = useAuth();

  // ── State ────────────────────────────────────────────────────────────────
  const [config, setConfig]               = useState(null);
  const [membres, setMembres]             = useState([]);
  const [seances, setSeances]             = useState([]);
  const [versements, setVersements]       = useState([]);
  const [prets, setPrets]                 = useState([]);
  const [remboursements, setRemboursements] = useState([]);
  const [messages, setMessages]           = useState([]);
  const [rapports, setRapports]           = useState([]);
  const [sanctions, setSanctions]         = useState([]);
  const [fonds, setFonds]                 = useState([]);
  const [isLoading, setIsLoading]         = useState(true);

  // ── Derived: recap (memoised, recomputed when deps change) ──────────────
  const recap = useMemo(() => {
    if (!config || membres.length === 0) {
      return {
        annee: config?.annee_courante || new Date().getFullYear(),
        totalEpargne: 0,
        totalInterets: 0,
        totalRetenues: 0,
        totalSoldes: 0,
        totalAdhesions: 0,
        totalPrets: 0,
        totalInteretsPrets: 0,
        totalARembourser: 0,
        fondDeCaisse: 0,
        membresCalcul: [],
      };
    }
    return calculerRecapAnnuel(
      membres,
      versements,
      prets,
      config,
      config.annee_courante,
    );
  }, [membres, versements, prets, config]);

  // ── Data loading ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        configRows,
        membresData,
        seancesData,
        versementsData,
        pretsData,
        remboursementsData,
        messagesData,
        rapportsData,
        sanctionsData,
        fondsData,
      ] = await Promise.all([
        query('djangui_config'),
        query('djangui_membres', { order: { column: 'nom', ascending: true } }),
        query('djangui_seances', { order: { column: 'date', ascending: true } }),
        query('djangui_versements', { order: { column: 'date', ascending: false } }),
        query('djangui_prets', { order: { column: 'created_at', ascending: false } }),
        query('djangui_remboursements', { order: { column: 'created_at', ascending: false } }),
        query('djangui_messages', { order: { column: 'created_at', ascending: false } }),
        query('djangui_rapports', { order: { column: 'created_at', ascending: false } }),
        query('djangui_sanctions', { order: { column: 'created_at', ascending: false } }),
        query('djangui_fonds', { order: { column: 'date', ascending: false } }),
      ]);

      // Config is a single-row table; take the first row
      setConfig(configRows.length > 0 ? configRows[0] : null);
      setMembres(membresData);
      setSeances(seancesData);
      setVersements(versementsData);
      setPrets(pretsData);
      setRemboursements(remboursementsData);
      setMessages(messagesData);
      setRapports(rapportsData);
      setSanctions(sanctionsData);
      setFonds(fondsData);
    } catch (err) {
      console.error('[AppContext] fetchAll error:', err);
      Alert.alert('Erreur de chargement', err.message || 'Impossible de charger les donnees.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── refreshAll (public) ─────────────────────────────────────────────────
  const refreshAll = useCallback(() => fetchAll(), [fetchAll]);

  // ── updateConfig ────────────────────────────────────────────────────────
  const updateConfig = useCallback(async (data) => {
    try {
      if (!config?.id) {
        Alert.alert('Erreur', 'Configuration introuvable.');
        return;
      }
      const { error } = await supabase
        .from('djangui_config')
        .update(data)
        .eq('id', config.id);
      if (error) throw error;
      setConfig((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error('[AppContext] updateConfig error:', err);
      Alert.alert('Erreur', err.message || 'Echec de mise a jour de la configuration.');
    }
  }, [config]);

  // ── ajouterVersement ────────────────────────────────────────────────────
  const ajouterVersement = useCallback(async (membreId, seanceId, montant, type, annee) => {
    try {
      const { error } = await supabase.from('djangui_versements').insert({
        membre_id: membreId,
        seance_id: seanceId,
        montant,
        type: type || 'epargne',
        annee: annee || config?.annee_courante || new Date().getFullYear(),
        date: new Date().toISOString(),
      });
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] ajouterVersement error:', err);
      Alert.alert('Erreur', err.message || 'Echec de l\'enregistrement du versement.');
    }
  }, [config, refreshAll]);

  // ── modifierVersement ───────────────────────────────────────────────────
  const modifierVersement = useCallback(async (id, data) => {
    try {
      const { error } = await supabase
        .from('djangui_versements')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] modifierVersement error:', err);
      Alert.alert('Erreur', err.message || 'Echec de la modification du versement.');
    }
  }, [refreshAll]);

  // ── supprimerVersement ──────────────────────────────────────────────────
  const supprimerVersement = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('djangui_versements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] supprimerVersement error:', err);
      Alert.alert('Erreur', err.message || 'Echec de la suppression du versement.');
    }
  }, [refreshAll]);

  // ── accorderPret ────────────────────────────────────────────────────────
  const accorderPret = useCallback(async (membreId, montant, taux, dateOctroi) => {
    try {
      const tauxEffectif = taux || config?.taux_interet_pret || 7.5;
      const interet = Math.round(montant * tauxEffectif / 100);
      const montantARembourser = montant + interet;

      const { error } = await supabase.from('djangui_prets').insert({
        membre_id: membreId,
        montant,
        taux: tauxEffectif,
        interet,
        montant_a_rembourser: montantARembourser,
        statut: 'en_cours',
        date_octroi: dateOctroi || new Date().toISOString(),
      });
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] accorderPret error:', err);
      Alert.alert('Erreur', err.message || 'Echec de l\'accord du pret.');
    }
  }, [config, refreshAll]);

  // ── rembourserPret ──────────────────────────────────────────────────────
  const rembourserPret = useCallback(async (pretId, montant) => {
    try {
      // Insert remboursement record
      const pret = prets.find((p) => p.id === pretId);
      const { error: rembError } = await supabase.from('djangui_remboursements').insert({
        pret_id: pretId,
        membre_id: pret?.membre_id || null,
        montant,
        date: new Date().toISOString(),
      });
      if (rembError) throw rembError;

      // Check total remboursements for this pret
      if (pret) {
        const { data: rembData } = await supabase
          .from('djangui_remboursements')
          .select('montant')
          .eq('pret_id', pretId);
        const totalRembourse = (rembData || []).reduce((s, r) => s + (r.montant || 0), 0);

        // If fully repaid, mark pret as rembourse
        if (totalRembourse >= (pret.montant_a_rembourser || pret.montant + pret.interet)) {
          await supabase
            .from('djangui_prets')
            .update({ statut: 'rembourse' })
            .eq('id', pretId);
        }
      }

      await refreshAll();
    } catch (err) {
      console.error('[AppContext] rembourserPret error:', err);
      Alert.alert('Erreur', err.message || 'Echec du remboursement.');
    }
  }, [prets, refreshAll]);

  // ── envoyerMessage ──────────────────────────────────────────────────────
  const envoyerMessage = useCallback(async (titre, contenu, type) => {
    try {
      const { error } = await supabase.from('djangui_messages').insert({
        titre,
        contenu,
        type: type || 'info',
        auteur_id: currentUser?.id || null,
        lus: [],
      });
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] envoyerMessage error:', err);
      Alert.alert('Erreur', err.message || 'Echec de l\'envoi du message.');
    }
  }, [currentUser, refreshAll]);

  // ── marquerLu ───────────────────────────────────────────────────────────
  const marquerLu = useCallback(async (msgId, userId) => {
    try {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg) return;
      const lus = Array.isArray(msg.lus) ? msg.lus : [];
      if (lus.includes(userId)) return; // already read

      const newLus = [...lus, userId];
      const { error } = await supabase
        .from('djangui_messages')
        .update({ lus: newLus })
        .eq('id', msgId);
      if (error) throw error;

      // Optimistic local update
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, lus: newLus } : m)),
      );
    } catch (err) {
      console.error('[AppContext] marquerLu error:', err);
      // Silent failure for read receipts - don't bother the user
    }
  }, [messages]);

  // ── publierRapport ──────────────────────────────────────────────────────
  const publierRapport = useCallback(async (titre, contenu, seanceId) => {
    try {
      const { error } = await supabase.from('djangui_rapports').insert({
        titre,
        contenu,
        seance_id: seanceId || null,
        auteur_id: currentUser?.id || null,
      });
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] publierRapport error:', err);
      Alert.alert('Erreur', err.message || 'Echec de la publication du rapport.');
    }
  }, [currentUser, refreshAll]);

  // ── appliquerSanction ───────────────────────────────────────────────────
  const appliquerSanction = useCallback(async (membreId, montant, motif) => {
    try {
      const { error } = await supabase.from('djangui_sanctions').insert({
        membre_id: membreId,
        montant,
        motif,
      });
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] appliquerSanction error:', err);
      Alert.alert('Erreur', err.message || 'Echec de l\'application de la sanction.');
    }
  }, [refreshAll]);

  // ── ajouterSeance ───────────────────────────────────────────────────────
  const ajouterSeance = useCallback(async (date, annee, description) => {
    try {
      const { error } = await supabase.from('djangui_seances').insert({
        date,
        annee: annee || config?.annee_courante || new Date().getFullYear(),
        description: description || null,
      });
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] ajouterSeance error:', err);
      Alert.alert('Erreur', err.message || 'Echec de l\'ajout de la seance.');
    }
  }, [config, refreshAll]);

  // ── creerMembre ─────────────────────────────────────────────────────────
  const creerMembre = useCallback(async (data) => {
    try {
      const { data: inserted, error } = await supabase
        .from('djangui_membres')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      await refreshAll();
      return inserted;
    } catch (err) {
      console.error('[AppContext] creerMembre error:', err);
      Alert.alert('Erreur', err.message || 'Echec de la creation du membre.');
      return null;
    }
  }, [refreshAll]);

  // ── modifierMembre ──────────────────────────────────────────────────────
  const modifierMembre = useCallback(async (id, data) => {
    try {
      const { error } = await supabase
        .from('djangui_membres')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] modifierMembre error:', err);
      Alert.alert('Erreur', err.message || 'Echec de la modification du membre.');
    }
  }, [refreshAll]);

  // ── ajouterFonds (credit ou debit sur un compte special) ────────────────
  const ajouterFonds = useCallback(async (type, operation, montant, description, seanceId) => {
    try {
      const { error } = await supabase.from('djangui_fonds').insert({
        type,
        operation,
        montant,
        description: description || null,
        seance_id: seanceId || null,
        date: new Date().toISOString(),
      });
      if (error) throw error;
      await refreshAll();
    } catch (err) {
      console.error('[AppContext] ajouterFonds error:', err);
    }
  }, [refreshAll]);

  // ── Context value (memoised to prevent unnecessary re-renders) ──────────
  const value = useMemo(() => ({
    // State
    config,
    membres,
    seances,
    versements,
    prets,
    remboursements,
    messages,
    rapports,
    sanctions,
    fonds,
    recap,
    isLoading,

    // Methods
    refreshAll,
    updateConfig,
    ajouterVersement,
    modifierVersement,
    supprimerVersement,
    accorderPret,
    rembourserPret,
    envoyerMessage,
    marquerLu,
    publierRapport,
    appliquerSanction,
    ajouterSeance,
    creerMembre,
    modifierMembre,
    ajouterFonds,
  }), [
    config, membres, seances, versements, prets, remboursements,
    messages, rapports, sanctions, fonds, recap, isLoading,
    refreshAll, updateConfig, ajouterVersement, modifierVersement,
    supprimerVersement, accorderPret, rembourserPret, envoyerMessage,
    marquerLu, publierRapport, appliquerSanction, ajouterSeance,
    creerMembre, modifierMembre, ajouterFonds,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
