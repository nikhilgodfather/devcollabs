import { JobPayload, JobResult } from "../jobs.types"

/**
 * Simulated notification sending job
 */
export async function handleSendNotification(payload: JobPayload): Promise<JobResult> {
    const delay = Math.random() * 1000 + 500 // 0.5-1.5 seconds
    await new Promise(resolve => setTimeout(resolve, delay))
    
    return {
        success: true,
        data: {
            notificationId: `notif_${Date.now()}`,
            recipient: payload.email || "user@example.com",
            sentAt: new Date().toISOString()
        }
    }
}
