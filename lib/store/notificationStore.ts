// Upstash Redis store for notification tokens
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface NotificationDetails {
  url: string;
  token: string;
}

interface UserNotificationData {
  fid: number;
  appFid: number;
  notificationDetails: NotificationDetails;
  createdAt: number;
  updatedAt: number;
}

// Redis key prefixes
const NOTIFICATION_PREFIX = "notification:";
const ADDRESS_TO_FID_PREFIX = "addr2fid:";
const FID_TO_ADDRESS_PREFIX = "fid2addr:";

function getNotificationKey(fid: number, appFid: number): string {
  return `${NOTIFICATION_PREFIX}${fid}-${appFid}`;
}

function getAddressToFidKey(address: string): string {
  return `${ADDRESS_TO_FID_PREFIX}${address.toLowerCase()}`;
}

function getFidToAddressKey(fid: number): string {
  return `${FID_TO_ADDRESS_PREFIX}${fid}`;
}

export const notificationDB = {
  // Save or update notification details for a user
  setUserNotificationDetails: async (
    fid: number,
    appFid: number,
    notificationDetails: NotificationDetails
  ): Promise<void> => {
    const key = getNotificationKey(fid, appFid);
    const now = Date.now();

    // Get existing data to preserve createdAt
    const existing = await redis.get<UserNotificationData>(key);

    const data: UserNotificationData = {
      fid,
      appFid,
      notificationDetails,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await redis.set(key, data);
  },

  // Get notification details for a specific user
  getUserNotificationDetails: async (
    fid: number,
    appFid: number
  ): Promise<NotificationDetails | null> => {
    const key = getNotificationKey(fid, appFid);
    const data = await redis.get<UserNotificationData>(key);
    return data?.notificationDetails ?? null;
  },

  // Delete notification details when user disables notifications
  deleteUserNotificationDetails: async (fid: number, appFid: number): Promise<boolean> => {
    const key = getNotificationKey(fid, appFid);
    const result = await redis.del(key);
    return result > 0;
  },

  // Get notification details by wallet address (for event creators)
  getNotificationDetailsByAddress: async (
    address: string,
    appFid: number = 309857 // Base app FID
  ): Promise<NotificationDetails | null> => {
    const fid = await fidAddressMapping.getFidByAddress(address);
    if (!fid) {
      return null;
    }
    return notificationDB.getUserNotificationDetails(fid, appFid);
  },

  // Get all notification keys (for debugging)
  getAllNotificationKeys: async (): Promise<string[]> => {
    const keys = await redis.keys(`${NOTIFICATION_PREFIX}*`);
    return keys;
  },

  // Clear all notification data (for testing)
  clearAll: async (): Promise<void> => {
    const keys = await redis.keys(`${NOTIFICATION_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Store FID to address mappings
export const fidAddressMapping = {
  setMapping: async (fid: number, address: string): Promise<void> => {
    const normalizedAddress = address.toLowerCase();
    await Promise.all([
      redis.set(getAddressToFidKey(normalizedAddress), fid),
      redis.set(getFidToAddressKey(fid), normalizedAddress),
    ]);
  },

  getAddress: async (fid: number): Promise<string | null> => {
    const address = await redis.get<string>(getFidToAddressKey(fid));
    return address;
  },

  getFidByAddress: async (address: string): Promise<number | null> => {
    const fid = await redis.get<number>(getAddressToFidKey(address.toLowerCase()));
    return fid;
  },

  clearAll: async (): Promise<void> => {
    const keys = await redis.keys(`${ADDRESS_TO_FID_PREFIX}*`);
    const keys2 = await redis.keys(`${FID_TO_ADDRESS_PREFIX}*`);
    const allKeys = [...keys, ...keys2];
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
  },
};
