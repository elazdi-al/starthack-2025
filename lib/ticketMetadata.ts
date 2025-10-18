import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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

const DATA_DIR = join(process.cwd(), '.data');
const METADATA_FILE = join(DATA_DIR, 'ticket-metadata.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load metadata from file
function loadMetadata(): Record<string, TicketMetadata> {
  ensureDataDir();
  if (existsSync(METADATA_FILE)) {
    try {
      const data = readFileSync(METADATA_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading ticket metadata:', error);
    }
  }
  return {};
}

// Save metadata to file
function saveMetadataToFile(metadata: Record<string, TicketMetadata>) {
  ensureDataDir();
  try {
    writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving ticket metadata:', error);
  }
}

export function saveTicketMetadata(metadata: TicketMetadata): void {
  const allMetadata = loadMetadata();
  allMetadata[metadata.tokenId] = metadata;
  saveMetadataToFile(allMetadata);
}

export function getTicketMetadata(tokenId: string): TicketMetadata | undefined {
  const allMetadata = loadMetadata();
  return allMetadata[tokenId];
}

export function getAllMetadata(): TicketMetadata[] {
  const allMetadata = loadMetadata();
  return Object.values(allMetadata);
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

