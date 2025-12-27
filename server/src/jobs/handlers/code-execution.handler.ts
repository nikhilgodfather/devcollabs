import { JobPayload, JobResult } from "../jobs.types"

/**
 * Simulated code execution job
 * Waits 2-5 seconds and randomly succeeds or fails
 */
export async function handleCodeExecution(payload: JobPayload): Promise<JobResult> {
    const delay = Math.random() * 3000 + 2000 // 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // 80% success rate
    const success = Math.random() > 0.2
    
    if (success) {
        return {
            success: true,
            data: {
                executionTime: Math.round(delay),
                output: "Code executed successfully (simulated)",
                exitCode: 0
            }
        }
    } else {
        throw new Error("Simulated execution failure")
    }
}
