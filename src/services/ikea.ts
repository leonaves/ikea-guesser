import type { IkeaProduct, IkeaSearchResult } from '../types/ikea';
import { parseIkeaProduct } from '../types/ikea';

const SEARCH_TERMS = [
  'lamp', 'chair', 'table', 'shelf', 'sofa', 'bed', 'desk', 'mirror',
  'rug', 'curtain', 'plant', 'vase', 'clock', 'frame', 'basket',
  'storage', 'box', 'hook', 'candle', 'cushion', 'blanket', 'towel',
  'pan', 'pot', 'plate', 'bowl', 'glass', 'mug', 'knife', 'cutting',
  'trash', 'bin', 'organizer', 'drawer', 'rack', 'stand', 'stool',
  'bookcase', 'wardrobe', 'dresser', 'nightstand', 'cabinet', 'trolley',
  'outdoor', 'garden', 'kids', 'baby', 'toy', 'game', 'office', 'bathroom'
];

// IKEA country codes mapped from common country codes
const COUNTRY_CONFIG: Record<string, { country: string; language: string; currency: string; locale: string }> = {
  'us': { country: 'us', language: 'en', currency: 'USD', locale: 'en-US' },
  'gb': { country: 'gb', language: 'en', currency: 'GBP', locale: 'en-GB' },
  'de': { country: 'de', language: 'de', currency: 'EUR', locale: 'de-DE' },
  'fr': { country: 'fr', language: 'fr', currency: 'EUR', locale: 'fr-FR' },
  'es': { country: 'es', language: 'es', currency: 'EUR', locale: 'es-ES' },
  'it': { country: 'it', language: 'it', currency: 'EUR', locale: 'it-IT' },
  'nl': { country: 'nl', language: 'nl', currency: 'EUR', locale: 'nl-NL' },
  'se': { country: 'se', language: 'sv', currency: 'SEK', locale: 'sv-SE' },
  'no': { country: 'no', language: 'no', currency: 'NOK', locale: 'nb-NO' },
  'dk': { country: 'dk', language: 'da', currency: 'DKK', locale: 'da-DK' },
  'fi': { country: 'fi', language: 'fi', currency: 'EUR', locale: 'fi-FI' },
  'pl': { country: 'pl', language: 'pl', currency: 'PLN', locale: 'pl-PL' },
  'au': { country: 'au', language: 'en', currency: 'AUD', locale: 'en-AU' },
  'ca': { country: 'ca', language: 'en', currency: 'CAD', locale: 'en-CA' },
  'jp': { country: 'jp', language: 'ja', currency: 'JPY', locale: 'ja-JP' },
  'at': { country: 'at', language: 'de', currency: 'EUR', locale: 'de-AT' },
  'ch': { country: 'ch', language: 'de', currency: 'CHF', locale: 'de-CH' },
  'be': { country: 'be', language: 'fr', currency: 'EUR', locale: 'fr-BE' },
  'ie': { country: 'ie', language: 'en', currency: 'EUR', locale: 'en-IE' },
  'pt': { country: 'pt', language: 'pt', currency: 'EUR', locale: 'pt-PT' },
};

export const ROUNDS_PER_DAY = 5;

// Seeded random number generator (mulberry32)
function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Get today's date as a seed number
export function getTodaySeed(): number {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get today's date string for storage key
export function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// Detect user's country from browser
export function detectUserCountry(): string {
  try {
    // Try to get from browser language/locale
    const locale = navigator.language || 'en-US';
    const parts = locale.split('-');
    const countryCode = (parts[1] || parts[0]).toLowerCase();

    if (COUNTRY_CONFIG[countryCode]) {
      return countryCode;
    }

    // Try timezone-based detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Europe/London')) return 'gb';
    if (timezone.includes('Europe/Berlin') || timezone.includes('Europe/Vienna')) return 'de';
    if (timezone.includes('Europe/Paris')) return 'fr';
    if (timezone.includes('Europe/Madrid')) return 'es';
    if (timezone.includes('Europe/Rome')) return 'it';
    if (timezone.includes('Europe/Amsterdam')) return 'nl';
    if (timezone.includes('Europe/Stockholm')) return 'se';
    if (timezone.includes('Europe/Oslo')) return 'no';
    if (timezone.includes('Europe/Copenhagen')) return 'dk';
    if (timezone.includes('Europe/Helsinki')) return 'fi';
    if (timezone.includes('Europe/Warsaw')) return 'pl';
    if (timezone.includes('Australia')) return 'au';
    if (timezone.includes('America/Toronto') || timezone.includes('America/Vancouver')) return 'ca';
    if (timezone.includes('Asia/Tokyo')) return 'jp';
  } catch {
    // Fallback to US
  }
  return 'us';
}

export function getCountryConfig(countryCode: string) {
  return COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG['us'];
}

// Shuffle array with seeded random
function shuffleWithSeed<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fetch all 5 daily products at once
export async function fetchDailyProducts(countryCode: string): Promise<IkeaProduct[]> {
  const config = getCountryConfig(countryCode);
  const seed = getTodaySeed();
  const random = seededRandom(seed);

  // Shuffle search terms with today's seed
  const shuffledTerms = shuffleWithSeed(SEARCH_TERMS, random);

  const products: IkeaProduct[] = [];
  const usedProductIds = new Set<string>();

  // Try different search terms until we have 5 unique products
  for (const searchTerm of shuffledTerms) {
    if (products.length >= ROUNDS_PER_DAY) break;

    try {
      const apiUrl = import.meta.env.DEV
        ? `https://sik.search.blue.cdtapps.com/${config.country}/${config.language}/search-result-page?q=${encodeURIComponent(searchTerm)}&size=50&types=PRODUCT&autocorrect=true&subcategories-style=tree-navigation&c=sr&v=20210322`
        : `/api/ikea-search?q=${encodeURIComponent(searchTerm)}&country=${config.country}&language=${config.language}`;

      const response = await fetch(apiUrl);

      if (!response.ok) continue;

      const data: IkeaSearchResult = await response.json();
      const items = data?.searchResultPage?.products?.main?.items || [];

      // Parse and filter products
      const validProducts = items
        .map(parseIkeaProduct)
        .filter((p): p is IkeaProduct => p !== null)
        .filter(p => p.price.currentPrice >= 1 && p.price.currentPrice <= 2000 && !p.price.isRange)
        .filter(p => !usedProductIds.has(p.id));

      if (validProducts.length > 0) {
        // Use seeded random to pick a product
        const shuffledProducts = shuffleWithSeed(validProducts, seededRandom(seed + products.length));
        const selected = shuffledProducts[0];
        products.push({
          ...selected,
          price: {
            ...selected.price,
            currency: config.currency,
          }
        });
        usedProductIds.add(selected.id);
      }
    } catch (error) {
      console.error(`Failed to fetch products for term "${searchTerm}":`, error);
    }
  }

  if (products.length < ROUNDS_PER_DAY) {
    throw new Error(`Only found ${products.length} products, need ${ROUNDS_PER_DAY}`);
  }

  return products;
}

export function formatPrice(price: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(price);
}

export function calculateAccuracy(guess: number, actual: number): number {
  const difference = Math.abs(guess - actual);
  const percentageOff = (difference / actual) * 100;
  return Math.max(0, 100 - percentageOff);
}

export function getAccuracyMessage(accuracy: number): { message: string; emoji: string } {
  if (accuracy >= 95) return { message: "Perfect!", emoji: "🎯" };
  if (accuracy >= 85) return { message: "Excellent!", emoji: "🌟" };
  if (accuracy >= 70) return { message: "Great job!", emoji: "👏" };
  if (accuracy >= 50) return { message: "Not bad!", emoji: "👍" };
  if (accuracy >= 30) return { message: "Keep trying!", emoji: "💪" };
  return { message: "Way off!", emoji: "😅" };
}

// Generate share text
export function generateShareText(scores: number[], totalScore: number): string {
  const todayKey = getTodayKey();
  const emojis = scores.map(score => {
    if (score >= 95) return '🎯';
    if (score >= 85) return '🌟';
    if (score >= 70) return '👏';
    if (score >= 50) return '👍';
    if (score >= 30) return '💪';
    return '😅';
  }).join(' ');

  return `IKEA Price Guesser ${todayKey}\n${emojis}\nScore: ${totalScore}/${ROUNDS_PER_DAY * 100}\n\nPlay at: ${window.location.origin}`;
}
