import apiClient from "./axios"

export interface Project {
    id: string
    name: string
    description?: string
    createdAt: string
    ownerId: string
    // Add other fields as per backend (e.g. members etc)
}

export const getProjects = async (): Promise<Project[]> => {
    const response = await apiClient.get("/api/v1/projects")
    return response.data
}

export const getProject = async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/api/v1/projects/${id}`)
    return response.data
}

export const createProject = async (name: string, description?: string): Promise<Project> => {
    const response = await apiClient.post("/api/v1/projects", { name, description })
    return response.data
}

export const updateProject = async (id: string, name: string, description?: string): Promise<Project> => {
    const response = await apiClient.put(`/api/v1/projects/${id}`, { name, description })
    return response.data
}

export const deleteProject = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/projects/${id}`)
}
