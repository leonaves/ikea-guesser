export interface IkeaProduct {
  id: string;
  name: string;
  typeName: string;
  mainImageUrl: string;
  mainImageAlt?: string;
  price: {
    currentPrice: number;
    currency: string;
    isRange: boolean;
  };
  ratingValue?: number;
  ratingCount?: number;
  contextualImageUrl?: string;
  pipUrl: string;
}

export interface IkeaSearchResult {
  searchResultPage: {
    products: {
      main: {
        items: IkeaProductItem[];
      };
    };
  };
}

export interface IkeaProductItem {
  product: {
    id: string;
    name: string;
    typeName: string;
    mainImageUrl: string;
    mainImageAlt?: string;
    salesPrice: {
      current: {
        prefix?: string;
        wholeNumber: string;
        separator?: string;
        decimals?: string;
        suffix?: string;
        isRegularCurrency?: boolean;
      };
      currency: string;
      isRange?: boolean;
    };
    ratingValue?: number;
    ratingCount?: number;
    contextualImageUrl?: string;
    pipUrl: string;
    gprDescription?: {
      numberOfVariants?: number;
    };
  };
}

export function parseIkeaProduct(item: IkeaProductItem): IkeaProduct | null {
  try {
    const { product } = item;
    const priceInfo = product.salesPrice;

    // Parse the price from the IKEA format
    let priceValue = 0;
    if (priceInfo?.current?.wholeNumber) {
      const wholeNumber = priceInfo.current.wholeNumber.replace(/[^0-9]/g, '');
      const decimals = priceInfo.current.decimals || '00';
      priceValue = parseFloat(`${wholeNumber}.${decimals}`);
    }

    // Skip products without valid prices or images
    if (!priceValue || priceValue <= 0 || !product.mainImageUrl) {
      return null;
    }

    return {
      id: product.id,
      name: product.name,
      typeName: product.typeName || '',
      mainImageUrl: product.mainImageUrl,
      mainImageAlt: product.mainImageAlt,
      price: {
        currentPrice: priceValue,
        currency: priceInfo.currency || 'USD',
        isRange: priceInfo.isRange || false,
      },
      ratingValue: product.ratingValue,
      ratingCount: product.ratingCount,
      contextualImageUrl: product.contextualImageUrl,
      pipUrl: product.pipUrl,
    };
  } catch {
    return null;
  }
}
