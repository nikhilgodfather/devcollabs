export enum JobType {
    CODE_EXECUTION = 'CODE_EXECUTION',
    PROJECT_EXPORT = 'PROJECT_EXPORT',
    SEND_NOTIFICATION = 'SEND_NOTIFICATION'
}

export enum JobStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export interface JobPayload {
    [key: string]: any
}

export interface JobResult {
    success: boolean
    data?: any
    error?: string
}
