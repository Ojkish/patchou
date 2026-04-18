// js/emailFormatter.js

/**
 * Génère un e-mail formaté aéré pour mobile avec listing par modèle et par univers.
 * @param {Array} patchResults - Données provenant du localStorage
 */
export function generatePlainTextEmail(patchResults) {
  if (!patchResults || patchResults.length === 0) return "Patch vide.";

  // Groupage par modèle pour le listing technique
  const modelGroups = patchResults.reduce((acc, item) => {
    const baseName = item.name.replace(/\s+\d+$/, '').trim();
    const key = `${baseName}_${item.channels}`;
    if (!acc[key]) acc[key] = { name: baseName, ch: item.channels, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  // Groupage par Univers pour la vue simplifiée
  const univGroups = patchResults.reduce((acc, item) => {
    if (!acc[item.universe]) acc[item.universe] = {};
    const baseName = item.name.replace(/\s+\d+$/, '').trim();
    const key = `${baseName}_${item.channels}`;
    if (!acc[item.universe][key]) acc[item.universe][key] = { name: baseName, ch: item.channels, items: [] };
    acc[item.universe][key].items.push(item);
    return acc;
  }, {});

  let lines = [];
  const divider = "============================================================";
  const subDivider = "------------------------------------------------------------";

  // Entête du mail
  lines.push(divider);
  lines.push("   PATCH DMX - RÉCAPITULATIF");
  lines.push(divider, "");

  // Listing technique aéré (Mode intégré au titre de groupe)
  for (const key in modelGroups) {
    const g = modelGroups[key];
    lines.push(`${g.name} mode ${g.ch} ch (x${g.items.length})`);
    
    g.items.forEach((r, idx) => {
      const id = String(idx + 1).padStart(2, '0');
      const addr = `${r.universe}.${String(r.address).padStart(3, '0')}`;
      const name = g.name.padEnd(25).substring(0, 25); // Aligne le nom sur 25 caractères
      const end = String(r.endAddress).includes('.') ? r.endAddress.split('.')[1] : r.endAddress;
      const endPart = `(-${String(end).padStart(3, '0')})`;
      
      // Structure : ID [5 espaces] ADDR [6 espaces] NOM [Aligné] (END)
      lines.push(`${id}     ${addr.padEnd(10)} ${name} ${endPart}`);
    });
    lines.push(""); // Espace entre les groupes de machines
  }

  // Vue par univers (Une machine par ligne)
  lines.push(divider);
  lines.push("   VUE PAR UNIVERS");
  lines.push(divider, "");

  const sortedUniverses = Object.keys(univGroups).sort((a, b) => a - b);
  sortedUniverses.forEach(u => {
    lines.push(`[ UNIVERS ${u} ]`);
    lines.push(subDivider);
    
    for (const key in univGroups[u]) {
      const g = univGroups[u][key];
      lines.push(`${g.name} (${g.ch}ch) :`);
      
      g.items.sort((a, b) => a.address - b.address).forEach((r, idx) => {
        const fixtureNum = `#${idx + 1}`.padEnd(6);
        const addr = `${r.universe}.${String(r.address).padStart(3, '0')}`;
        lines.push(`  ${fixtureNum} ${addr}`);
      });
      lines.push("");
    }
  });

  // Statistiques finales
  lines.push(divider);
  lines.push("   RÉCAPITULATIF FINAL");
  lines.push(divider);
  for (const key in modelGroups) {
    lines.push(`* ${modelGroups[key].name} : ${modelGroups[key].items.length} machines`);
  }
  const totalMachines = patchResults.length;
  const totalChannels = patchResults.reduce((sum, r) => sum + parseInt(r.channels), 0);
  lines.push(subDivider);
  lines.push(`TOTAL : ${totalMachines} machines | ${totalChannels} canaux | ${sortedUniverses.length} Univers utilisé(s)`);
  lines.push(divider);

  return lines.join('\n');
}// js/emailFormatter.js

/**
 * Génère un e-mail en texte brut formaté pour récapituler les résultats de patch DMX.
 * Utilise des caractères ASCII pour garantir la compatibilité avec tous les clients mail.
 * @param {Array<Object>} patchResults - Liste des résultats avec { name, universe, startAddress, endAddress, channels }
 * @returns {string} - Corps de l'email formaté
 */
export function generatePlainTextEmail(patchResults) {
  const H = {
    horizontal: '-',
    double: '=' ,
    bullet: '*',
    space: ' '
  };
  const SP = { indent: 2, colGap: 3, sectionGap: 2 };

  const repeat = (char, len) => char.repeat(len);
  const indent = (lvl) => H.space.repeat(SP.indent * lvl);
  const align = (text, width, alignType='left') => {
    const pad = width - text.length;
    if (alignType === 'right') return H.space.repeat(pad) + text;
    if (alignType === 'center') {
      const left = Math.floor(pad/2);
      return H.space.repeat(left) + text + H.space.repeat(pad-left);
    }
    return text + H.space.repeat(pad);
  };

  const widths = {
    name: Math.max(15, ...patchResults.map(r => r.name.length)),
    start: 8, // u.aaa
    end: 7,   // (-aaa)
    ch: 7     // (xxCh)
  };
  const totalW = Object.values(widths).reduce((a,b) => a+b, 0) + SP.colGap * (Object.keys(widths).length - 1);

  const date = new Date();
  const header = [];
  header.push(repeat(H.double, totalW));
  header.push(align('PATCH DMX - RÉCAPITULATIF', totalW, 'center'));
  header.push(align(date.toLocaleDateString('fr-FR') + ' - ' + date.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}), totalW, 'center'));
  header.push(repeat(H.double, totalW));
  header.push('');

  const hdrCols = [
    align('PROJECTEUR', widths.name),
    align('DÉBUT', widths.start),
    align('FIN', widths.end),
    align('CANAUX', widths.ch)
  ].join(H.space.repeat(SP.colGap));

  const lines = [ ...header, hdrCols, repeat(H.horizontal, totalW) ];

  // Trier par univers puis adresse
  const sorted = [...patchResults].sort((a,b) => a.universe - b.universe || a.startAddress - b.startAddress);
  let curUniv = null;
  sorted.forEach(r => {
    if (curUniv !== null && r.universe !== curUniv) lines.push(repeat(H.horizontal, totalW));
    curUniv = r.universe;
    const line = [
      align(r.name, widths.name),
      align(`${r.universe}.${String(r.startAddress).padStart(3,'0')}`, widths.start),
      align(`(-${String(r.endAddress).padStart(3,'0')})`, widths.end),
      align(`(${r.channels}Ch)`, widths.ch)
    ].join(H.space.repeat(SP.colGap));
    lines.push(line);
  });

  // Statistiques
  const totalProj = sorted.length;
  const totalChan = sorted.reduce((sum,r) => sum + r.channels, 0);
  const usedUnivs = new Set(sorted.map(r => r.universe)).size;

  lines.push('', repeat(H.double, totalW));
  lines.push(align('RÉCAPITULATIF', totalW, 'center'));
  lines.push(repeat(H.horizontal, totalW));
  lines.push(align(`${H.bullet} Total projecteurs : ${totalProj}`, totalW));
  lines.push(align(`${H.bullet} Total canaux     : ${totalChan}`, totalW));
  lines.push(align(`${H.bullet} Univers utilisés : ${usedUnivs}`, totalW));
  lines.push(repeat(H.double, totalW));

  return lines.join('\n');
}
