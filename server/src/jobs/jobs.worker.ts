import { Worker, Job } from 'bullmq'
import { redisClient, isRedisConnected } from '../db/redis'
import { QUEUE_NAME } from './jobs.queue'
import { JobsService } from './jobs.service'
import { JobType, JobStatus } from './jobs.types'
import { handleCodeExecution } from './handlers/code-execution.handler'
import { handleProjectExport } from './handlers/project-export.handler'
import { handleSendNotification } from './handlers/notification.handler'

/**
 * Execute job based on type
 */
async function executeJob(job: Job) {
    const { jobId, type, payload } = job.data

    console.log(`[Worker] Processing job ${jobId} (${type})`)

    // Update status to PROCESSING
    await JobsService.updateJobStatus(jobId, JobStatus.PROCESSING)

    try {
        let result
        
        // Route to appropriate handler
        switch (type) {
            case JobType.CODE_EXECUTION:
                result = await handleCodeExecution(payload)
                break
            case JobType.PROJECT_EXPORT:
                result = await handleProjectExport(payload)
                break
            case JobType.SEND_NOTIFICATION:
                result = await handleSendNotification(payload)
                break
            default:
                throw new Error(`Unknown job type: ${type}`)
        }

        // Update with result
        await JobsService.updateJobResult(jobId, result)
        console.log(`[Worker] Job ${jobId} completed successfully`)
        
        return result
    } catch (error: any) {
        const attempts = job.attemptsMade + 1
        console.error(`[Worker] Job ${jobId} failed (attempt ${attempts}):`, error.message)
        
        // Update failure in DB
        await JobsService.updateJobFailure(jobId, error.message, attempts)
        
        // Re-throw to let BullMQ handle retry
        throw error
    }
}

/**
 * Initialize and start the worker
 */
export function startWorker() {
    if (!isRedisConnected || !redisClient) {
        console.warn("⚠️  Worker not started: Redis unavailable")
        return null
    }

    const worker = new Worker(QUEUE_NAME, executeJob, {
        connection: redisClient as any,
        concurrency: 5, // Process up to 5 jobs concurrently
        limiter: {
            max: 10, // Max 10 jobs
            duration: 1000 // per second
        }
    })

    worker.on('completed', (job) => {
        console.log(`[Worker] ✅ Job ${job.id} completed`)
    })

    worker.on('failed', (job, err) => {
        console.log(`[Worker] ❌ Job ${job?.id} failed:`, err.message)
    })

    worker.on('error', (err) => {
        console.error('[Worker] Error:', err)
    })

    console.log('✅ Worker started and listening for jobs')
    
    return worker
}

// Auto-start worker if this file is run directly
if (require.main === module) {
    startWorker()
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Worker shutting down...')
        process.exit(0)
    })
}
