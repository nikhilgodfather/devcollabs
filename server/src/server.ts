import http from "http"
import { app } from "./app"
import { PORT } from "./config"
import { initSocket } from "./socket"
import { initRedis } from "./db/redis"

const startServer = async () => {
    await initRedis()
    
    // Initialize Jobs
    const { initQueue } = await import("./jobs/jobs.queue")
    const { startWorker } = await import("./jobs/jobs.worker")
    
    initQueue()
    startWorker()
    
    const server = http.createServer(app)
    initSocket(server)

    server.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`)
    })
}

startServer()
