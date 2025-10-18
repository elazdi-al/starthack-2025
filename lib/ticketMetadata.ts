// Ticket Metadata Storage
// In production, this should be stored in a database or IPFS

export interface TicketMetadata {
  tokenId: string;
  eventId: number;
  eventName: string;
  eventLocation: string;
  eventDate: number;
  eventVenue: string;
  ticketType: string;
  holder: string;
  purchaseDate: number;
  qrData: string;
}

// In-memory storage (replace with database in production)
const metadataStore = new Map<string, TicketMetadata>();

export function saveTicketMetadata(metadata: TicketMetadata): void {
  metadataStore.set(metadata.tokenId, metadata);
}

export function getTicketMetadata(tokenId: string): TicketMetadata | undefined {
  return metadataStore.get(tokenId);
}

export function getAllMetadata(): TicketMetadata[] {
  return Array.from(metadataStore.values());
}

export function generateTicketMetadata(
  tokenId: string,
  eventId: number,
  eventName: string,
  eventLocation: string,
  eventDate: number,
  holder: string
): TicketMetadata {
  const metadata: TicketMetadata = {
    tokenId,
    eventId,
    eventName,
    eventLocation,
    eventDate,
    eventVenue: eventLocation,
    ticketType: 'General Admission',
    holder,
    purchaseDate: Math.floor(Date.now() / 1000),
    qrData: `${tokenId}-${eventId}-${holder}-${eventName}`,
  };

  saveTicketMetadata(metadata);
  return metadata;
}

// Generate JSON metadata for NFT (follows OpenSea standard)
export function generateNFTMetadata(metadata: TicketMetadata): string {
  const json = {
    name: `${metadata.eventName} - Ticket #${metadata.tokenId}`,
    description: `Event ticket for ${metadata.eventName} at ${metadata.eventLocation}`,
    image: `https://api.dicebear.com/7.x/shapes/svg?seed=${metadata.tokenId}`, // Placeholder image
    attributes: [
      {
        trait_type: 'Event',
        value: metadata.eventName,
      },
      {
        trait_type: 'Location',
        value: metadata.eventLocation,
      },
      {
        trait_type: 'Event Date',
        display_type: 'date',
        value: metadata.eventDate,
      },
      {
        trait_type: 'Ticket Type',
        value: metadata.ticketType,
      },
      {
        trait_type: 'Purchase Date',
        display_type: 'date',
        value: metadata.purchaseDate,
      },
    ],
  };

  return JSON.stringify(json, null, 2);
}

