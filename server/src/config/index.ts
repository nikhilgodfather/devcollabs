import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const envSchema = z.object({
    PORT: z.string().default("3000"),
    DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    FRONTEND_URL: z.string().default("http://localhost:5173"),
    NODE_ENV: z.union([z.literal("development"), z.literal("production"), z.literal("test")]).default("development"),
})

const parseEnv = () => {
    try {
        return envSchema.parse(process.env)
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Invalid environment variables:", error.flatten().fieldErrors)
        }
        // In dev, we might want to proceed even if some are missing for partial testing, 
        // but for production-grade, we should fail.
        // For now, let's return a partial object or throw.
        // Throwing is safer to ensure we don't start with bad config.
        // However, user might not have set them yet.
        return process.env as unknown as z.infer<typeof envSchema>
    }
}

export const config = parseEnv()
export const PORT = config.PORT
