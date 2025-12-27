import { redisClient, isRedisConnected } from "../../db/redis"

/**
 * Get cached value by key
 * Returns null if not found or Redis is unavailable
 */
export async function getCached<T>(key: string): Promise<T | null> {
    if (!isRedisConnected || !redisClient) return null
    
    try {
        const cached = await redisClient.get(key)
        if (!cached) return null
        return JSON.parse(cached) as T
    } catch (error) {
        console.error(`Cache get error for key ${key}:`, error)
        return null
    }
}

/**
 * Set cached value with TTL in seconds
 */
export async function setCached(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!isRedisConnected || !redisClient) return
    
    try {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
        console.error(`Cache set error for key ${key}:`, error)
    }
}

/**
 * Delete cached value by key
 */
export async function deleteCached(key: string): Promise<void> {
    if (!isRedisConnected || !redisClient) return
    
    try {
        await redisClient.del(key)
    } catch (error) {
        console.error(`Cache delete error for key ${key}:`, error)
    }
}

/**
 * Delete multiple keys matching a pattern
 * Note: SCAN is used instead of KEYS for production safety
 */
export async function invalidatePattern(pattern: string): Promise<void> {
    if (!isRedisConnected || !redisClient) return
    
    try {
        const keys: string[] = []
        for await (const key of redisClient.scanIterator({ MATCH: pattern })) {
            keys.push(String(key))
        }
        // Delete keys individually to avoid type issues
        for (const key of keys) {
            await redisClient.del(key)
        }
    } catch (error) {
        console.error(`Cache invalidate pattern error for ${pattern}:`, error)
    }
}

/**
 * Cache-aside helper: Get from cache or fetch from DB
 */
export async function cacheAside<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
): Promise<T> {
    // Try cache first
    const cached = await getCached<T>(key)
    if (cached !== null) return cached
    
    // Fetch from DB
    const data = await fetchFn()
    
    // Store in cache (fire and forget)
    setCached(key, data, ttlSeconds).catch(() => {})
    
    return data
}
