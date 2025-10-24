import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache keys
export const CACHE_KEYS = {
  conversationSummary: (eventId: number) => `event:${eventId}:conversation-summary`,
};

// Cache TTL (Time To Live) - 1 hour
export const CACHE_TTL = 60 * 60; // 1 hour in seconds

export interface ConversationSummaryCache {
  text: string;
  participants: Array<{
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
  }>;
  mentioned_profiles: Array<{
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
  }>;
  cachedAt: number;
}

/**
 * Get conversation summary from Redis cache
 */
export async function getCachedConversationSummary(
  eventId: number
): Promise<ConversationSummaryCache | null> {
  try {
    const key = CACHE_KEYS.conversationSummary(eventId);
    const cached = await redis.get<ConversationSummaryCache>(key);
    return cached;
  } catch (error) {
    console.error("[redis] Failed to get cached conversation summary:", error);
    return null;
  }
}

/**
 * Set conversation summary in Redis cache
 */
export async function setCachedConversationSummary(
  eventId: number,
  summary: Omit<ConversationSummaryCache, "cachedAt">
): Promise<void> {
  try {
    const key = CACHE_KEYS.conversationSummary(eventId);
    const cacheData: ConversationSummaryCache = {
      ...summary,
      cachedAt: Date.now(),
    };
    await redis.setex(key, CACHE_TTL, JSON.stringify(cacheData));
  } catch (error) {
    console.error("[redis] Failed to cache conversation summary:", error);
  }
}

/**
 * Invalidate conversation summary cache for an event
 */
export async function invalidateConversationSummary(
  eventId: number
): Promise<void> {
  try {
    const key = CACHE_KEYS.conversationSummary(eventId);
    await redis.del(key);
  } catch (error) {
    console.error(
      "[redis] Failed to invalidate conversation summary cache:",
      error
    );
  }
}

export default redis;
