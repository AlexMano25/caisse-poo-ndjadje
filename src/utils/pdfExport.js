import { Platform } from 'react-native';
import { formatMontant } from './calculations';

/**
 * Generates an HTML report for printing / PDF export.
 * Uses window.print() on web.
 */
export function exporterRapportAnnuel({
  config,
  recap,
  prets,
  remboursements,
  versements,
  membres,
  fonds,
}) {
  if (Platform.OS !== 'web') {
    return; // Only works on web
  }

  const annee = config?.annee_courante || new Date().getFullYear();
  const nomCaisse = config?.nom_caisse || 'Caisse POO NDJADJE';

  // Prets en cours
  const pretsEnCours = (prets || []).filter(p => p.statut === 'en_cours');
  const pretsRows = pretsEnCours.map(p => {
    const m = (membres || []).find(mb => mb.id === p.membre_id);
    const totalRemb = (remboursements || [])
      .filter(r => r.pret_id === p.id)
      .reduce((s, r) => s + (r.montant || 0), 0);
    const reste = Math.max((p.montant_a_rembourser || 0) - totalRemb, 0);
    return `<tr>
      <td>${m?.nom || '--'}</td>
      <td style="text-align:right">${formatMontant(p.montant || 0)}</td>
      <td style="text-align:right">${formatMontant(p.interet || 0)}</td>
      <td style="text-align:right">${formatMontant(totalRemb)}</td>
      <td style="text-align:right;font-weight:700;color:#E63946">${formatMontant(reste)}</td>
    </tr>`;
  }).join('');

  // Membres recap
  const membresRows = (recap?.membresCalcul || [])
    .filter(m => m.actif !== false && (m.calcul?.totalEpargne || 0) > 0)
    .sort((a, b) => (b.calcul?.solde || 0) - (a.calcul?.solde || 0))
    .map(m => `<tr>
      <td>${m.nom || '--'}</td>
      <td style="text-align:right">${formatMontant(m.calcul?.totalEpargne || 0)}</td>
      <td style="text-align:right">${formatMontant(m.calcul?.interetNet || 0)}</td>
      <td style="text-align:right">${formatMontant(m.calcul?.retenue || 0)}</td>
      <td style="text-align:right;font-weight:700;color:#1B4332">${formatMontant(m.calcul?.solde || 0)}</td>
    </tr>`).join('');

  // Caisse projet
  const caisseProjet = (versements || [])
    .filter(v => v.type === 'caisse_projet')
    .reduce((s, v) => s + (v.montant || 0), 0);

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Rapport Annuel ${annee} - ${nomCaisse}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #333; }
  h1 { color: #1B4332; border-bottom: 3px solid #1B4332; padding-bottom: 8px; }
  h2 { color: #40916C; margin-top: 32px; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #1B4332; color: #fff; padding: 8px 12px; text-align: left; font-size: 12px; }
  td { padding: 6px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
  tr:nth-child(even) { background: #f8faf9; }
  .kpi-row { display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 150px; background: #f0f4f1; border-radius: 10px; padding: 16px; text-align: center; }
  .kpi-val { font-size: 22px; font-weight: 800; color: #1B4332; }
  .kpi-label { font-size: 11px; color: #6c757d; margin-top: 4px; }
  .footer { margin-top: 40px; text-align: center; color: #adb5bd; font-size: 11px; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style></head><body>
<h1>📊 Rapport Annuel ${annee}</h1>
<p><strong>${nomCaisse}</strong> — Genere le ${new Date().toLocaleDateString('fr-FR')}</p>

<div class="kpi-row">
  <div class="kpi">
    <div class="kpi-val">${formatMontant(recap?.totalEpargne || 0)} F</div>
    <div class="kpi-label">Epargne Totale</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${formatMontant(recap?.totalInterets || 0)} F</div>
    <div class="kpi-label">Interets Nets</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${formatMontant(recap?.totalRetenues || 0)} F</div>
    <div class="kpi-label">Retenues</div>
  </div>
  <div class="kpi">
    <div class="kpi-val" style="color:#1B4332">${formatMontant(recap?.totalSoldes || 0)} F</div>
    <div class="kpi-label">Solde Total Membres</div>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi">
    <div class="kpi-val">${formatMontant(caisseProjet)} F</div>
    <div class="kpi-label">Caisse Projet</div>
  </div>
  <div class="kpi">
    <div class="kpi-val" style="color:#E63946">${formatMontant(recap?.totalARembourser || 0)} F</div>
    <div class="kpi-label">Credits a Rembourser</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${(recap?.membresCalcul || []).filter(m => m.actif !== false).length}</div>
    <div class="kpi-label">Membres</div>
  </div>
</div>

<h2>📋 Detail par Membre</h2>
<table>
  <thead><tr><th>Membre</th><th style="text-align:right">Epargne</th><th style="text-align:right">Interets</th><th style="text-align:right">Retenue</th><th style="text-align:right">Solde</th></tr></thead>
  <tbody>${membresRows}</tbody>
</table>

${pretsEnCours.length > 0 ? `
<h2>⚠️ Credits Non Soldes</h2>
<table>
  <thead><tr><th>Membre</th><th style="text-align:right">Capital</th><th style="text-align:right">Interet</th><th style="text-align:right">Rembourse</th><th style="text-align:right">Reste</th></tr></thead>
  <tbody>${pretsRows}</tbody>
</table>
` : '<h2>✅ Aucun credit non solde</h2>'}

<div class="footer">
  ${nomCaisse} — Rapport genere automatiquement — ${new Date().toLocaleDateString('fr-FR')}
</div>
</body></html>`;

  // Open in new window and trigger print
  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}
