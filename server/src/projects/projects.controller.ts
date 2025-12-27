import { Request, Response } from "express"
import { z } from "zod"
import { ProjectsService } from "./projects.service"

const createProjectSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
})

const updateProjectSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
})

export class ProjectsController {
    static async create(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const { name, description } = createProjectSchema.parse(req.body)
            const project = await ProjectsService.createProject(userId, name, description)
            res.status(201).json(project)
        } catch (error: any) {
             res.status(400).json({ error: error.message || "Invalid input" })
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const projects = await ProjectsService.getProjects(userId)
            res.json(projects)
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch projects" })
        }
    }

    static async getOne(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const projectId = req.params.id
            const project = await ProjectsService.getProjectById(projectId)
            
            if (!project) return res.status(404).json({ error: "Project not found" })
            if (project.ownerId !== userId) return res.status(403).json({ error: "Forbidden" })

            res.json(project)
        } catch (error) {
             res.status(500).json({ error: "Server error" })
        }
    }

    static async update(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const projectId = req.params.id
            const { name, description } = updateProjectSchema.parse(req.body)

            const project = await ProjectsService.getProjectById(projectId)
            if (!project) return res.status(404).json({ error: "Project not found" })
            if (project.ownerId !== userId) return res.status(403).json({ error: "Forbidden" })

            const updated = await ProjectsService.updateProject(projectId, name, description)
            res.json(updated)
        } catch (error) {
            res.status(400).json({ error: "Update failed" })
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.userId
            const projectId = req.params.id

            const project = await ProjectsService.getProjectById(projectId)
            if (!project) return res.status(404).json({ error: "Project not found" })
            if (project.ownerId !== userId) return res.status(403).json({ error: "Forbidden" })

            await ProjectsService.deleteProject(projectId)
            res.status(204).send()
        } catch (error) {
            res.status(500).json({ error: "Delete failed" })
        }
    }
}
