import { createClient } from "redis"
import { config } from "../config"

export let isRedisConnected = false
export let redisClient: ReturnType<typeof createClient> | null = null
export let subClient: ReturnType<typeof createClient> | null = null

export const initRedis = async () => {
    try {
        redisClient = createClient({
            url: config.REDIS_URL,
            socket: {
                connectTimeout: 2000,
                reconnectStrategy: false // Disable auto-reconnect
            }
        })

        subClient = redisClient.duplicate()

        // Only log errors if we're trying to stay connected
        redisClient.on("error", () => {}) // Suppress errors
        subClient.on("error", () => {}) // Suppress errors

        await redisClient.connect()
        await subClient.connect()
        isRedisConnected = true
        console.log("✅ Redis connected")
    } catch (error) {
        console.warn("⚠️  Redis unavailable: Server will run in single-instance mode (No Pub/Sub)")
        isRedisConnected = false
        redisClient = null
        subClient = null
    }
}
