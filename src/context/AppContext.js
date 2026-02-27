import React,{createContext,useContext,useState} from 'react';
import {
  MOCK_MEMBERS, MOCK_TONTINE, MOCK_HISTORIQUE_EPARGNE,
  MOCK_PRETS, MOCK_RECAPITULATIF, CURRENT_USER
} from '../data/mockData';

// Rapports initiaux de la Caisse POO NDJADJE
const RAPPORTS_INITIAUX = [
  { id:'rpt-001', sessionNumber:1, date:'04/11/2023', author:'Liale Gaetan',
    title:'PV Seance Inaugurale — Novembre 2023',
    content:'Seance d inauguration de la Caisse POO NDJADJE.\nPresents: tous les membres fondateurs.\nBureau elu:\n- Presidente: Djoubi Soline\n- Tresorier: Neutchedje Gamaliel\n- Secretaire: Liale Gaetan\nAdhesion: 50 000 FCFA par membre.\nRegles: Taux epargne 27.4%/an, Taux pret 7.5%/trimestre, Retenue 1.5% sur interets.\nTotal adhesions collectees: 750 000 FCFA.', isPublished:true },
  { id:'rpt-002', sessionNumber:2, date:'04/02/2024', author:'Liale Gaetan',
    title:'PV Seance — Fevrier 2024',
    content:'Seance du 04/02/2024.\nPresents: Motho J., Domche A., Liale G., Hako B., Teguem A., Djoubi S., Nono E.\nVersements epargne enregistres: 855 000 FCFA.\nPrets accordes: Kahoue Jair (400 000 F), Youte Priscille (1 050 000 F).\nSolde caisse: excedent verse a la banque.', isPublished:true },
  { id:'rpt-003', sessionNumber:3, date:'02/11/2024', author:'Liale Gaetan',
    title:'PV Seance — Novembre 2024 (Cloture annee)',
    content:'Seance de cloture 2024 du 02/11/2024.\nTotal epargne 2024: 2 650 000 FCFA.\nTotal interets epargne: 396 518 FCFA.\nRetenues (1.5%): 92 229 FCFA.\nSolde cumule membres: 3 046 518 FCFA.\nSanctions appliquees: 131 225 FCFA.\nReconduction du bureau pour 2025.', isPublished:true },
  { id:'rpt-004', sessionNumber:4, date:'15/11/2025', author:'Liale Gaetan',
    title:'PV Seance — Novembre 2025 (Bilan annuel)',
    content:'Seance annuelle du 15/11/2025.\nTotal epargne 2025: 6 270 793 FCFA.\nTotal interets epargne: 1 439 368 FCFA.\nRetenues (1.5%): 355 942 FCFA.\nSolde final membres: 7 710 161 FCFA.\nPrets en cours: 9 prets pour 9 556 200 FCFA.\nTotal a rembourser: 10 272 915 FCFA.\nDecisions: renouvellement bureau, prochaine seance 28/02/2026.', isPublished:true },
];

const AppContext = createContext();

export const AppProvider = ({children}) => {
  const [currentUser]    = useState(CURRENT_USER);
  const [membres, setMembres] = useState(MOCK_MEMBERS);
  const [tontine]        = useState(MOCK_TONTINE);
  const [historique, setHistorique] = useState(MOCK_HISTORIQUE_EPARGNE);
  const [prets, setPrets] = useState(MOCK_PRETS);
  const [recap]          = useState(MOCK_RECAPITULATIF);
  const [rapports, setRapports] = useState(RAPPORTS_INITIAUX);

  // Calculer intérêt épargne selon durée (taux annuel prorata)
  const calculerInteret = (montant, dateDepot, tauxAnnuel = 27.40) => {
    const debut = new Date(dateDepot.split('/').reverse().join('-'));
    const fin   = new Date();
    const jours = Math.max(0, (fin - debut) / (1000 * 60 * 60 * 24));
    return Math.round(montant * (tauxAnnuel / 100) * (jours / 365));
  };

  // Calculer intérêt prêt : 7.5% par trimestre (90 jours)
  const calculerInteretPret = (montant, nbTrimestres = 1) => {
    return Math.round(montant * 0.075 * nbTrimestres);
  };

  // Ajouter un versement épargne
  const ajouterEpargne = (membreId, montant, seance, annee) => {
    const m = membres.find(x => x.id === membreId);
    const dep = {
      id: 'dep-' + Date.now(),
      membreId, nom: m?.nom || '',
      seance, montant, annee
    };
    setHistorique(prev => [...prev, dep]);
  };

  // Accorder un prêt : 7.5% par trimestre
  const accorderPret = (membreId, montant, nbTrimestres = 1) => {
    const m = membres.find(x => x.id === membreId);
    const interet = Math.round(montant * 0.075 * nbTrimestres);
    const pret = {
      id: 'prt-' + Date.now(),
      membreId, nom: m?.nom || '',
      montant, interet, nbTrimestres,
      aRembourser: montant + interet,
      statut: 'en_cours', taux: 7.5,
      date: new Date().toISOString().split('T')[0],
    };
    setPrets(prev => [...prev, pret]);
  };

  // Publier un rapport de séance
  const publierRapport = (titre, contenu) => {
    const rpt = {
      id: 'rpt-' + Date.now(),
      sessionNumber: rapports.length + 1,
      date: new Date().toLocaleDateString('fr-FR'),
      author: currentUser.nom,
      title: titre, content: contenu,
      isPublished: true,
    };
    setRapports(prev => [rpt, ...prev]);
  };

  // Rembourser un prêt
  const rembourserPret = (pretId) => {
    setPrets(prev => prev.map(p =>
      p.id === pretId ? {...p, statut:'rembourse'} : p
    ));
  };

  // Appliquer une sanction
  const appliquerSanction = (membreId, montant, motif) => {
    const m = membres.find(x => x.id === membreId);
    const dep = {
      id: 'sanc-' + Date.now(),
      membreId, nom: m?.nom || '',
      seance: new Date().toLocaleDateString('fr-FR'),
      montant: -montant, annee: new Date().getFullYear(),
      type: 'sanction', motif
    };
    setHistorique(prev => [...prev, dep]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, membres, tontine, historique,
      prets, recap, rapports, calculerInteret, calculerInteretPret,
      ajouterEpargne, accorderPret, rembourserPret, appliquerSanction, publierRapport
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
