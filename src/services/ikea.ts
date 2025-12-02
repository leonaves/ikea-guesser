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

function getRandomSearchTerm(): string {
  return SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
}

export async function fetchRandomProduct(): Promise<IkeaProduct> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const searchTerm = getRandomSearchTerm();
      const apiUrl = import.meta.env.DEV
        ? `https://sik.search.blue.cdtapps.com/us/en/search-result-page?q=${encodeURIComponent(searchTerm)}&size=50&types=PRODUCT&autocorrect=true&subcategories-style=tree-navigation&c=sr&v=20210322`
        : `/api/ikea-search?q=${encodeURIComponent(searchTerm)}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: IkeaSearchResult = await response.json();
      const items = data?.searchResultPage?.products?.main?.items || [];

      // Parse all products and filter out invalid ones
      const validProducts = items
        .map(parseIkeaProduct)
        .filter((p): p is IkeaProduct => p !== null)
        // Filter for reasonable price range ($1 - $2000) and non-range prices
        .filter(p => p.price.currentPrice >= 1 && p.price.currentPrice <= 2000 && !p.price.isRange);

      if (validProducts.length > 0) {
        // Return a random product from the valid ones
        return validProducts[Math.floor(Math.random() * validProducts.length)];
      }
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
    }
  }

  throw new Error('Failed to fetch a valid product after multiple attempts');
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function calculateAccuracy(guess: number, actual: number): number {
  const difference = Math.abs(guess - actual);
  const percentageOff = (difference / actual) * 100;
  // Return accuracy as a percentage (100 = perfect, 0 = very far off)
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
