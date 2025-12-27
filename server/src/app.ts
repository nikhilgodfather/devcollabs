import express, { Request, Response } from "express"
import cors from "cors"
import path from "path"
import swaggerUi from "swagger-ui-express"
import swaggerJsdoc from "swagger-jsdoc"
import { rateLimit } from "express-rate-limit"

import authRoutes from "./auth/auth.routes"
import projectRoutes from "./projects/projects.routes"
import workspaceRoutes from "./workspaces/workspaces.routes"
import jobRoutes from "./jobs/jobs.routes"
import notificationRoutes from "./notifications/notifications.routes"
import userRoutes from "./users/users.routes"

const app = express()

const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) 

app.use(express.json())

// Rate Limiting Middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        status: 429,
        error: "Too many requests, please try again later."
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Apply the rate limiting middleware to all requests
app.use(limiter)

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Code-Sync API",
            version: "1.0.0",
            description: `
API documentation for Code-Sync real-time collaboration platform.

### Step-by-Step API Usage:

1. **Authentication**:
   - Register a new account via \`POST /auth/register\`.
   - Login via \`POST /auth/login\` to receive a JWT.
   - Use the JWT in the \`Authorization: Bearer <token>\` header for all protected routes.
   - Refresh tokens via \`POST /auth/refresh\` as needed.

2. **Collaboration Setup**:
   - Create a project via \`POST /api/v1/projects\`.
   - Organize your work with workspaces: \`POST /api/v1/projects/{id}/workspaces\`.
   - Invite collaborators: \`POST /api/v1/workspaces/{id}/invite\`.
   - Manage roles (OWNER, COLLABORATOR, VIEWER) via \`PUT /api/v1/workspaces/{id}/members/{userId}\`.

3. **Asynchronous Jobs**:
   - Submit jobs (like code execution) via \`POST /api/v1/jobs\`.
   - Track status and retrieve results via \`GET /api/v1/jobs/{id}\`.

### Real-Time Events (WebSockets):
Real-time collaboration is powered by Socket.io. Key events include:
- \`USER_JOINED\` / \`USER_LEFT\`
- \`FILE_CREATED\` / \`FILE_UPDATED\` / \`FILE_DELETED\`
- \`CURSOR_POSITION\`
- \`CHAT_MESSAGE\`
`,
        },
        servers: [
            {
                url: "https://devcollabs-gten.onrender.com",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: [
        path.join(__dirname, "./**/*.ts"),
        path.join(__dirname, "./**/*.js")
    ],
}

const swaggerDocs = swaggerJsdoc(swaggerOptions)
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs))

app.use(express.static(path.join(__dirname, "..", "public")))

app.use("/auth", authRoutes)
app.use("/api/v1/projects", projectRoutes)
app.use("/api/v1/workspaces", workspaceRoutes)
app.use("/api/v1/jobs", jobRoutes)
app.use("/api/v1/notifications", notificationRoutes)
app.use("/api/v1/users", userRoutes)

app.get("/", (req: Request, res: Response) => {
	res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

export { app }
