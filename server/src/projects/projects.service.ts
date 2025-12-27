import { pool } from "../db"
import { z } from "zod"
import { cacheAside, deleteCached, invalidatePattern } from "../common/cache/cache.service"

export class ProjectsService {
    private static mapToCamelCase(row: any) {
        if (!row) return null
        return {
            id: row.id,
            ownerId: row.owner_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    static async createProject(ownerId: string, name: string, description?: string) {
        const result = await pool.query(
            "INSERT INTO projects (owner_id, name, description) VALUES ($1, $2, $3) RETURNING *",
            [ownerId, name, description]
        )
        // Invalidate list cache
        await deleteCached(`devcollab:cache:user:${ownerId}:projects`)
        return this.mapToCamelCase(result.rows[0])
    }

    static async getProjects(userId: string) {
        return cacheAside(
            `devcollab:cache:user:${userId}:projects`,
            1800, // 30 minutes
            async () => {
                // Get projects where user is OWNER OR a member of any workspace in the project
                const query = `
                    SELECT DISTINCT p.* 
                    FROM projects p
                    LEFT JOIN workspaces w ON w.project_id = p.id
                    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
                    WHERE p.owner_id = $1 OR wm.user_id = $1
                    ORDER BY p.created_at DESC
                `
                const result = await pool.query(query, [userId])
                return result.rows.map(this.mapToCamelCase)
            }
        )
    }

    static async getProjectById(projectId: string) {
        const result = await cacheAside(
            `devcollab:cache:project:${projectId}`,
            3600, // 1 hour
            async () => {
                const result = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId])
                return result.rows[0]
            }
        )
        return this.mapToCamelCase(result)
    }

    static async updateProject(projectId: string, name?: string, description?: string) {
        const result = await pool.query(
            "UPDATE projects SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = NOW() WHERE id = $1 RETURNING *",
            [projectId, name, description]
        )
        const project = result.rows[0]
        if (project) {
            // Invalidate item and all associated data (workspaces, etc)
            await invalidatePattern(`devcollab:cache:project:${projectId}*`)
            // Invalidate all users' project lists since membership is complex
            // A simpler way is to invalidate pattern for all user projects
            await invalidatePattern("devcollab:cache:user:*:projects")
        }
        return this.mapToCamelCase(project)
    }

    static async deleteProject(projectId: string) {
        await pool.query("DELETE FROM projects WHERE id = $1", [projectId])
        
        // Invalidate item and all associated data
        await invalidatePattern(`devcollab:cache:project:${projectId}*`)
        // Invalidate all users' project lists
        await invalidatePattern("devcollab:cache:user:*:projects")
    }
}
