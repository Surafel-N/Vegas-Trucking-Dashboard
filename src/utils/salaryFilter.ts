/**
 * salaryFilter.ts
 * Module central de détection et d'isolation des dépenses salariales vs frais de maintenance.
 * Règle d'or : Tout ce qui relève des salaires (chauffeurs, mécaniciens, apprentis, staff)
 * ne doit JAMAIS entrer dans les frais de maintenance mais doit être imputé aux frais salariaux.
 */

export const SALARY_PATTERNS: RegExp[] = [
  /\bsalaires?\b/i,
  /\bsalary\b/i,
  /\bsalaries\b/i,
  /\bsalarial\b/i,
  /\bsalariale\b/i,
  /\bsalariales\b/i,
  /\bsalariaux\b/i,
  /\bpaie\b/i,
  /\bpaye\b/i,
  /\bpayroll\b/i,
  /\br[eé]mun[eé]ration\b/i,
  /\br[eé]mun[eé]rations\b/i,
  /\bwages?\b/i,
  /\bavance\s*sur\s*salaire\b/i,
  /\bacompte\s*salaire\b/i,
  /\bhelpers?\s*salary\b/i,
  /\bdrivers?\s*salary\b/i,
  /\bsurafel\s*salary\b/i,
  /\bdrivers?\s*payment\b/i,
  /\bhelpers?\s*payment\b/i,
  /\bhalf\s*salary\b/i,
  /\bmonth\s*salary\b/i,
  /\bunpayed.*salary\b/i,
  /\bunpaid.*salary\b/i,
  /\bchauffeur\s*salaire\b/i,
  /\bsalaire\s*chauffeur\b/i,
  /\bprimes?\s*chauffeur\b/i
];

/**
 * Détecte si un enregistrement ou un texte correspond à une dépense salariale
 */
export function isSalaryRecord(record: any): boolean {
  if (!record) return false;

  // 1. Vérification par catégorie déclarée
  const category = String(record.category || record.subCategory || "").toLowerCase();
  if (
    category.includes("salaire") ||
    category.includes("salary") ||
    category.includes("salarial") ||
    category.includes("paie") ||
    category.includes("paye") ||
    category.includes("payroll") ||
    category.includes("remuneration") ||
    category.includes("rémunération")
  ) {
    return true;
  }

  // 2. Vérification par analyse textuelle multi-champs
  const text = String(
    `${record.description || ''} ${record.comment || ''} ${record.repairType || ''} ${record.title || ''} ${record.notes || ''} ${record.rawText || ''}`
  );

  return SALARY_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Mots-clés stricts de maintenance / mécanique
 */
export const MAINTENANCE_KEYWORDS = [
  'tire', 'oil', 'repair', 'rod', 'maint', 'spare', 'garage', 'mechanic', 'mecanic',
  'frein', 'brake', 'tube', 'filter', 'battery', 'bearing', 'suspension', 'clutch', 'joint',
  'gasket', 'alternator', 'starter', 'belt', 'pump', 'radiator', 'shock', 'rim', 'pneu', 'vidange',
  'moteur', 'batterie', 'roulement', 'amortisseur', 'embrayage', 'boite', 'pont', 'transmission',
  'alternateur', 'demarreur', 'courroie', 'pompe', 'radiateur', 'huil', 'entretien', 'révision',
  'revision', 'pièce', 'mecanicien', 'lavage', 'graissage', 'parallélisme', 'équilibrage',
  'valve', 'durite', 'soufflet', 'disque', 'plaquette', 'étrier', 'injecteur'
];
