/**
 * Moteur de calcul financier - Caisse POO NDJADJE
 * Intérêts composés trimestriels avec taux configurables
 */

/**
 * Calcule les intérêts d'épargne trimestriels composés
 * @param {Array} versements - [{montant, date}] triés par date
 * @param {number} tauxBrut - Taux brut par trimestre (ex: 7.5)
 * @param {number} tauxNet - Taux net par trimestre (ex: 6.0)
 * @param {number} annee - Année de calcul
 * @returns {Object} {totalEpargne, interetBrut, interetNet, retenue, solde, detailMensuel}
 */
export function calculerInteretsEpargne(versements, tauxBrut = 7.5, tauxNet = 6.0, annee) {
  if (!versements || versements.length === 0) {
    return { totalEpargne: 0, interetBrut: 0, interetNet: 0, retenue: 0, solde: 0, detailMensuel: [] };
  }

  const rBrut = tauxBrut / 100;
  const rNet = tauxNet / 100;

  // Build monthly timeline (Nov year-1 to Nov year = 13 months, quarterly interest)
  // Interest is accrued every 3 months: Feb, May, Aug, Nov
  const startYear = annee - 1;
  const months = [];
  for (let i = 0; i < 13; i++) {
    const m = ((10 + i) % 12) + 1; // Nov=11, Dec=12, Jan=1, ..., Nov=11
    const y = i < 2 ? startYear : annee; // Nov,Dec = previous year
    months.push({ month: m, year: y, index: i });
  }

  let balanceBrut = 0;
  let balanceNet = 0;
  let totalInteretBrut = 0;
  let totalInteretNet = 0;
  let totalEpargne = 0;
  const detailMensuel = [];

  const MONTH_NAMES = ['', 'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
    'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];

  for (let i = 0; i < months.length; i++) {
    const { month, year } = months[i];

    // Find deposits in this month
    const depositsThisMonth = versements.filter(v => {
      const d = new Date(v.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const depositAmount = depositsThisMonth.reduce((s, v) => s + (v.montant || 0), 0);
    if (depositAmount > 0) {
      balanceBrut += depositAmount;
      balanceNet += depositAmount;
      totalEpargne += depositAmount;
    }

    // Quarterly interest (every 3 months: index 3=Feb, 6=May, 9=Aug, 12=Nov)
    let interetBrut = 0;
    let interetNet = 0;
    if ((i + 1) % 3 === 0 && i > 0) {
      interetBrut = balanceBrut * rBrut;
      interetNet = balanceNet * rNet;
      balanceBrut += interetBrut;
      balanceNet += interetNet;
      totalInteretBrut += interetBrut;
      totalInteretNet += interetNet;
    }

    detailMensuel.push({
      mois: MONTH_NAMES[month],
      annee: year,
      epargne: depositAmount,
      interetBrut: Math.round(interetBrut * 100) / 100,
      interetNet: Math.round(interetNet * 100) / 100,
      soldeBrut: Math.round(balanceBrut * 100) / 100,
      soldeNet: Math.round(balanceNet * 100) / 100,
    });
  }

  const retenue = totalInteretBrut - totalInteretNet;

  return {
    totalEpargne: Math.round(totalEpargne),
    interetBrut: Math.round(totalInteretBrut * 100) / 100,
    interetNet: Math.round(totalInteretNet * 100) / 100,
    retenue: Math.round(retenue * 100) / 100,
    solde: Math.round((totalEpargne + totalInteretNet) * 100) / 100,
    soldeBrut: Math.round((totalEpargne + totalInteretBrut) * 100) / 100,
    detailMensuel,
  };
}

/**
 * Calcule l'intérêt sur un prêt
 * @param {number} montant - Montant du prêt
 * @param {number} taux - Taux d'intérêt (ex: 7.5%)
 * @returns {Object} {interet, montantARembourser}
 */
export function calculerInteretPret(montant, taux = 7.5) {
  const interet = montant * taux / 100;
  return {
    interet: Math.round(interet),
    montantARembourser: Math.round(montant + interet),
  };
}

/**
 * Calcule la retenue chantier sur un prêt
 * @param {number} montant - Montant du prêt
 * @param {number} tauxChantier - Taux de retenue chantier (ex: 2%)
 * @returns {number} Montant de la retenue
 */
export function calculerRetenueChantier(montant, tauxChantier = 0) {
  return Math.round(montant * tauxChantier / 100);
}

/**
 * Calcule le récapitulatif annuel complet pour tous les membres
 * @param {Array} membres - Liste des membres
 * @param {Array} versements - Tous les versements
 * @param {Array} prets - Tous les prêts
 * @param {Object} config - Configuration (taux)
 * @param {number} annee - Année
 * @returns {Object} Récapitulatif complet
 */
export function calculerRecapAnnuel(membres, versements, prets, config, annee) {
  const tauxBrut = config?.taux_interet_epargne_brut || 7.5;
  const tauxNet = config?.taux_interet_epargne_net || 6.0;

  let totalEpargne = 0;
  let totalInterets = 0;
  let totalRetenues = 0;
  let totalSoldes = 0;
  let totalAdhesions = 0;
  const membresCalcul = [];

  for (const m of membres) {
    const versementsMembre = versements.filter(v => v.membre_id === m.id);
    const calcul = calculerInteretsEpargne(versementsMembre, tauxBrut, tauxNet, annee);

    totalEpargne += calcul.totalEpargne;
    totalInterets += calcul.interetNet;
    totalRetenues += calcul.retenue;
    totalSoldes += calcul.solde;
    totalAdhesions += (m.adhesion || 0);

    membresCalcul.push({ ...m, calcul });
  }

  const pretsEnCours = prets.filter(p => p.statut === 'en_cours');
  const totalPrets = pretsEnCours.reduce((s, p) => s + (p.montant || 0), 0);
  const totalInteretsPrets = pretsEnCours.reduce((s, p) => s + (p.interet || 0), 0);
  const totalARembourser = pretsEnCours.reduce((s, p) => s + (p.montant_a_rembourser || 0), 0);

  return {
    annee,
    totalEpargne: Math.round(totalEpargne),
    totalInterets: Math.round(totalInterets),
    totalRetenues: Math.round(totalRetenues),
    totalSoldes: Math.round(totalSoldes),
    totalAdhesions: Math.round(totalAdhesions),
    totalPrets: Math.round(totalPrets),
    totalInteretsPrets: Math.round(totalInteretsPrets),
    totalARembourser: Math.round(totalARembourser),
    fondDeCaisse: Math.round(totalRetenues + totalAdhesions),
    membresCalcul,
  };
}

/**
 * Format montant en FCFA
 */
export function formatMontant(n) {
  if (n == null || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('fr-FR');
}
