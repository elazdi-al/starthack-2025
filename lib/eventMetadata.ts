import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface EventImageMetadata {
  eventId: number;
  imageCid: string;
  imageUrl: string;
  pinnedAt: number;
}

const DATA_DIR = join(process.cwd(), ".data");
const EVENT_IMAGE_FILE = join(DATA_DIR, "event-images.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadEventImages(): Record<string, EventImageMetadata> {
  ensureDataDir();

  if (existsSync(EVENT_IMAGE_FILE)) {
    try {
      const raw = readFileSync(EVENT_IMAGE_FILE, "utf-8");
      return JSON.parse(raw) as Record<string, EventImageMetadata>;
    } catch (error) {
      console.error("Failed to load event images metadata:", error);
    }
  }

  return {};
}

function saveEventImagesToDisk(store: Record<string, EventImageMetadata>) {
  ensureDataDir();
  try {
    writeFileSync(EVENT_IMAGE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to persist event images metadata:", error);
  }
}

export function saveEventImage(options: { eventId: number; imageCid: string; imageUrl: string }) {
  const { eventId, imageCid, imageUrl } = options;
  const store = loadEventImages();

  store[String(eventId)] = {
    eventId,
    imageCid,
    imageUrl,
    pinnedAt: Math.floor(Date.now() / 1000),
  };

  saveEventImagesToDisk(store);
}

export function getEventImage(eventId: number): EventImageMetadata | undefined {
  const store = loadEventImages();
  return store[String(eventId)];
}

export function getAllEventImages(): EventImageMetadata[] {
  const store = loadEventImages();
  return Object.values(store);
}
