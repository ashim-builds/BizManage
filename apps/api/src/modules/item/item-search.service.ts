/**
 * Smart Product Search Service
 * Provides token-based normalization, typo tolerance, unit/dimension normalization,
 * and multi-field relevance scoring for ERP inventory items.
 */

// Common hardware/retail typo dictionary & stemming equivalents
const TYPO_SYNONYMS: Record<string, string> = {
  shild: 'shield',
  sheild: 'shield',
  berge: 'berger',
  berg: 'berger',
  skrew: 'screw',
  scre: 'screw',
  basen: 'basin',
  basine: 'basin',
  colour: 'color',
  pipe: 'pipe',
  pvc: 'pvc',
  cpvc: 'cpvc',
  upvc: 'upvc',
  pcr: 'pvc',
  tank: 'tank',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  ltr: 'l',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  gram: 'g',
  grams: 'g',
  gm: 'g',
  foot: 'ft',
  feet: 'ft',
  inch: 'in',
  inches: 'in',
  meter: 'm',
  meters: 'm',
  paint: 'paint',
  asian: 'asian',
  weater: 'weather',
  weath: 'weather',
  coat: 'coat',
};

/**
 * Normalizes input text by:
 * - Lowercasing and trimming
 * - Replacing multiplication signs (× -> x)
 * - Normalizing fractions (e.g. 1(1/4) -> 1 1/4)
 * - Normalizing dimensions (e.g. 13 x 18 -> 13x18)
 * - Normalizing units (e.g. 20 L / 20-L / 20ltr -> 20l)
 * - Normalizing quotes (1" -> 1 in)
 * - Removing brackets () [] {} and excessive symbols
 */
export function normalizeSearchQuery(rawQuery: string): string {
  if (!rawQuery) return '';

  let text = rawQuery.toLowerCase().trim();

  // Normalize quotes to 'in' or 'inch'
  text = text.replace(/(\d+)\s*["”]/g, '$1 in ');

  // Normalize multiplication symbols (× -> x)
  text = text.replace(/[×✕]/g, ' x ');

  // Normalize fractions e.g. 1(1/4) -> 1 1/4
  text = text.replace(/(\d+)\s*\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g, '$1 $2/$3');

  // Strip brackets () [] {}
  text = text.replace(/[\(\)\[\]\{\}]/g, ' ');

  // Normalize common punctuation to space (keep alphanumeric, slashes, hyphens inside dimensions)
  text = text.replace(/[,;:\\|`~!@#$%^&*+=_?]/g, ' ');

  // Normalize dimensions like 13 x 18 -> 13x18
  text = text.replace(/(\d+)\s*x\s*(\d+)/g, '$1x$2');

  // Normalize units attached or detached: 20 ltr / 20 liter / 20 l -> 20l
  text = text.replace(/(\d+)\s*(l|ltr|liter|litre|litres|liters)\b/g, '$1l ');
  text = text.replace(/(\d+)\s*(kg|kgs|kilo|kilogram|kilograms)\b/g, '$1kg ');
  text = text.replace(/(\d+)\s*(g|gm|gram|grams)\b/g, '$1g ');
  text = text.replace(/(\d+)\s*(ml|milliliter|millilitre)\b/g, '$1ml ');
  text = text.replace(/(\d+)\s*(ft|feet|foot)\b/g, '$1ft ');
  text = text.replace(/(\d+)\s*(mm|cm|m|meter|meters)\b/g, '$1$2 ');

  // Normalize extra whitespace
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts searchable unique tokens and applies typo/synonym corrections
 */
export function extractSearchTokens(rawQuery: string): {
  primaryTokens: string[];
  allCandidateTokens: string[];
  cleanAlphaTokens: string[];
} {
  const normalized = normalizeSearchQuery(rawQuery);
  const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 0);

  const primarySet = new Set<string>();
  const candidateSet = new Set<string>();
  const cleanAlphaSet = new Set<string>();

  for (const token of rawTokens) {
    primarySet.add(token);
    candidateSet.add(token);

    // Check typo dictionary
    if (TYPO_SYNONYMS[token]) {
      candidateSet.add(TYPO_SYNONYMS[token]);
    }

    // Alpha-only version (e.g. '20l' -> '20', 'l', '20l')
    const alphaOnly = token.replace(/[^a-zA-Z0-9]/g, '');
    if (alphaOnly && alphaOnly !== token) {
      candidateSet.add(alphaOnly);
      cleanAlphaSet.add(alphaOnly);
    }

    // Dimension split (e.g. '13x18' -> '13', '18')
    const dimMatch = token.match(/^(\d+)x(\d+)$/);
    if (dimMatch && dimMatch[1] && dimMatch[2]) {
      candidateSet.add(dimMatch[1]);
      candidateSet.add(dimMatch[2]);
    }

    // Number + unit split (e.g. '20l' -> '20', 'l')
    const unitMatch = token.match(/^(\d+)([a-zA-Z]+)$/);
    if (unitMatch && unitMatch[1] && unitMatch[2]) {
      candidateSet.add(unitMatch[1]);
      candidateSet.add(unitMatch[2]);
    }
  }

  return {
    primaryTokens: Array.from(primarySet),
    allCandidateTokens: Array.from(candidateSet),
    cleanAlphaTokens: Array.from(cleanAlphaSet),
  };
}

/**
 * Computes a relevance score (0 - 1000+) for a product against a search query
 */
export function scoreItemRelevance(
  item: {
    name: string;
    code?: string | null;
    category?: { name?: string } | null;
    unit?: string | null;
    type?: string | null;
  },
  rawQuery: string,
  tokensInfo: { primaryTokens: string[]; allCandidateTokens: string[] }
): number {
  const normalizedQuery = normalizeSearchQuery(rawQuery);
  const normalizedItemName = normalizeSearchQuery(item.name || '');
  const normalizedCode = (item.code || '').toLowerCase().trim();
  const normalizedCategory = (item.category?.name || '').toLowerCase().trim();

  let score = 0;

  // 1. Exact Name Match (Highest Priority)
  if (normalizedItemName === normalizedQuery) {
    score += 1000;
  } else if (normalizedItemName.startsWith(normalizedQuery)) {
    score += 600;
  } else if (normalizedItemName.includes(normalizedQuery)) {
    score += 400;
  }

  // 2. Exact SKU / Code Match
  if (normalizedCode && (normalizedCode === normalizedQuery || normalizedCode === normalizedQuery.replace(/[^a-zA-Z0-9]/g, ''))) {
    score += 500;
  } else if (normalizedCode && normalizedCode.includes(normalizedQuery)) {
    score += 250;
  }

  // 3. Token-by-Token Matching
  const { primaryTokens, allCandidateTokens } = tokensInfo;
  let matchedPrimaryCount = 0;
  let matchedCandidateCount = 0;

  for (const token of primaryTokens) {
    if (normalizedItemName.includes(token)) {
      matchedPrimaryCount++;
      // Word boundary match bonus
      const wordRegex = new RegExp(`(^|\\s)${escapeRegex(token)}(\\s|$)`, 'i');
      if (wordRegex.test(normalizedItemName)) {
        score += 80;
      } else {
        score += 40;
      }
    } else if (normalizedCode.includes(token)) {
      matchedPrimaryCount++;
      score += 60;
    } else if (normalizedCategory.includes(token)) {
      matchedPrimaryCount++;
      score += 30;
    }
  }

  for (const token of allCandidateTokens) {
    if (!primaryTokens.includes(token)) {
      if (normalizedItemName.includes(token)) {
        matchedCandidateCount++;
        score += 25;
      }
    }
  }

  // 4. Bonus if ALL primary query tokens matched
  if (primaryTokens.length > 0 && matchedPrimaryCount === primaryTokens.length) {
    score += 300;
  } else if (primaryTokens.length > 1 && matchedPrimaryCount >= Math.ceil(primaryTokens.length * 0.75)) {
    score += 150;
  }

  // 5. Ratio of primary matched tokens
  if (primaryTokens.length > 0) {
    const ratio = matchedPrimaryCount / primaryTokens.length;
    score += Math.round(ratio * 100);
  }

  return score;
}

function escapeRegex(string: string): string {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}
