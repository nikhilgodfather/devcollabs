import { Queue } from 'bullmq'
import { redisClient, isRedisConnected } from '../db/redis'

const QUEUE_NAME = 'devcollab-jobs'

export let jobQueue: Queue | null = null

// Initialize queue called after Redis connects
export const initQueue = () => {
    if (isRedisConnected && redisClient) {
        jobQueue = new Queue(QUEUE_NAME, {
            connection: redisClient as any,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                },
                removeOnComplete: {
                    age: 24 * 3600,
                    count: 1000
                },
                removeOnFail: {
                    age: 7 * 24 * 3600
                }
            }
        })
        console.log("✅ Job Queue initialized")
    } else {
        console.warn("⚠️ Job Queue skipped: Redis not connected")
    }
}

export { QUEUE_NAME }
