import { pool } from "../db"
import { jobQueue } from "./jobs.queue"
import { JobType, JobPayload, JobStatus } from "./jobs.types"

export class JobsService {
    /**
     * Create and enqueue a new job
     */
    static async createJob(type: JobType, payload: JobPayload, userId: string) {
        // Create job in database
        const result = await pool.query(
            `INSERT INTO jobs (type, status, payload, attempts, max_attempts) 
             VALUES ($1, $2, $3, 0, 3) 
             RETURNING *`,
            [type, JobStatus.PENDING, JSON.stringify(payload)]
        )
        const job = result.rows[0]

        // Enqueue in Redis if available
        if (jobQueue) {
            try {
                await jobQueue.add(type, {
                    jobId: job.id,
                    type,
                    payload,
                    userId
                }, {
                    jobId: job.id // Use DB ID as queue job ID for tracking
                })
            } catch (error) {
                console.error("Failed to enqueue job:", error)
                // Job is still in DB, worker can pick it up later
            }
        }

        return job
    }

    /**
     * Get job status and result
     */
    static async getJobById(jobId: string) {
        const result = await pool.query(
            "SELECT * FROM jobs WHERE id = $1",
            [jobId]
        )
        return result.rows[0]
    }

    /**
     * Update job status
     */
    static async updateJobStatus(jobId: string, status: JobStatus) {
        await pool.query(
            "UPDATE jobs SET status = $2, updated_at = NOW() WHERE id = $1",
            [jobId, status]
        )
    }

    /**
     * Update job with result
     */
    static async updateJobResult(jobId: string, result: any) {
        await pool.query(
            `UPDATE jobs SET 
                status = $2, 
                result = $3, 
                processed_at = NOW(), 
                updated_at = NOW() 
             WHERE id = $1`,
            [jobId, JobStatus.COMPLETED, JSON.stringify(result)]
        )
    }

    /**
     * Update job with failure
     */
    static async updateJobFailure(jobId: string, errorMessage: string, attempts: number) {
        const job = await this.getJobById(jobId)
        const status = attempts >= job.max_attempts ? JobStatus.FAILED : JobStatus.PENDING

        await pool.query(
            `UPDATE jobs SET 
                status = $2, 
                error_message = $3, 
                attempts = $4, 
                updated_at = NOW() 
             WHERE id = $1`,
            [jobId, status, errorMessage, attempts]
        )
    }

    static async getAllJobs(userId: string) {
        const result = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50")
        return result.rows
    }
}
