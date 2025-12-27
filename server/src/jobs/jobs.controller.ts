import { Request, Response } from "express"
import { z } from "zod"
import { JobsService } from "./jobs.service"
import { JobType, JobPayload } from "./jobs.types"

const createJobSchema = z.object({
    type: z.nativeEnum(JobType),
    payload: z.unknown().optional().default({})
})

export class JobsController {
    /**
     * Create a new job
     */
    static async createJob(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.userId
            const { type, payload } = createJobSchema.parse(req.body)
            
            const job = await JobsService.createJob(type, payload as JobPayload, userId)
            
            res.status(201).json({
                id: job.id,
                type: job.type,
                status: job.status,
                createdAt: job.created_at
            })
        } catch (error: any) {
            res.status(400).json({ error: error.message || "Failed to create job" })
        }
    }

    /**
     * Get job status
     */
    static async getJob(req: Request, res: Response) {
        try {
            const jobId = req.params.id
            const job = await JobsService.getJobById(jobId)
            
            if (!job) {
                return res.status(404).json({ error: "Job not found" })
            }

            res.json({
                id: job.id,
                type: job.type,
                status: job.status,
                payload: job.payload,
                result: job.result,
                attempts: job.attempts,
                maxAttempts: job.max_attempts,
                errorMessage: job.error_message,
                createdAt: job.created_at,
                processedAt: job.processed_at
            })
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch job" })
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user?.userId
            const jobs = await JobsService.getAllJobs(userId)
            res.json(jobs)
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch jobs history" })
        }
    }
}
