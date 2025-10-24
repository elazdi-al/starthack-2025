export interface ParsedEventMetadata {
  imageUrl: string | null;
  categories: string[];
}

/**
 * Parse event metadata - now just returns the imageURL as-is
 * Categories come from the smart contract's categories field
 */
export function parseEventMetadata(imageURL: string | null | undefined): ParsedEventMetadata {
  return {
    imageUrl: imageURL || null,
    categories: [], // Categories now come from the contract's categories array
  };
}

/**
 * Parse categories from a comma-separated string returned by the smart contract
 * @param categoriesString Comma-separated categories like "Gaming,Crypto,Networking"
 * @returns Array of category strings
 */
export function parseCategoriesString(categoriesString: string | null | undefined): string[] {
  if (!categoriesString || categoriesString.trim().length === 0) {
    return [];
  }

  return categoriesString
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
}

/**
 * This is no longer used - categories are passed separately to createEvent
 * Kept for backwards compatibility during migration
 */
export function buildEventMetadataString(input: {
  imageUrl: string;
  imageCid?: string | null;
  categories?: string[];
}) {
  // Just return the imageUrl - categories are now handled separately
  return input.imageUrl;
}
