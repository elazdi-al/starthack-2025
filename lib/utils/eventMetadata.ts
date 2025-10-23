export interface ParsedEventMetadata {
  imageUrl: string | null;
  imageCid: string | null;
  categories: string[];
}

interface EventMetadataV1 {
  version?: number;
  imageUrl?: unknown;
  image?: unknown;
  imageCid?: unknown;
  cid?: unknown;
  categories?: unknown;
}

export function parseEventMetadata(raw: string | null | undefined): ParsedEventMetadata {
  if (!raw) {
    return { imageUrl: null, imageCid: null, categories: [] };
  }

  const trimmed = raw.trim();

  if (!trimmed.startsWith("{")) {
    return {
      imageUrl: raw,
      imageCid: null,
      categories: [],
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as EventMetadataV1;

    const imageCandidate = parsed.imageUrl ?? parsed.image;
    const imageUrl =
      typeof imageCandidate === "string" && imageCandidate.trim().length > 0
        ? imageCandidate
        : null;

    const imageCidCandidate = parsed.imageCid ?? parsed.cid;
    const imageCid =
      typeof imageCidCandidate === "string" && imageCidCandidate.trim().length > 0
        ? imageCidCandidate
        : null;

    const categories =
      Array.isArray(parsed.categories)
        ? parsed.categories.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [];

    return {
      imageUrl,
      imageCid,
      categories,
    };
  } catch {
    return {
      imageUrl: raw,
      imageCid: null,
      categories: [],
    };
  }
}

export function buildEventMetadataString(input: {
  imageUrl: string;
  imageCid?: string | null;
  categories?: string[];
}) {
  const payload = {
    version: 1,
    imageUrl: input.imageUrl,
    imageCid: input.imageCid ?? null,
    categories: Array.isArray(input.categories) ? input.categories.slice(0, 3) : [],
  };

  return JSON.stringify(payload);
}
