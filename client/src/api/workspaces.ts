import apiClient from "./axios"

export enum WorkspaceRole {
    OWNER = "OWNER",
    COLLABORATOR = "COLLABORATOR",
    VIEWER = "VIEWER",
}

export interface Workspace {
    id: string
    name: string
    projectId?: string
    createdAt?: string
    // DB/legacy fields (server returns snake_case today)
    project_id?: string | null
    created_at?: string
    user_role?: WorkspaceRole
}

export interface WorkspaceMember {
    userId: string
    role: WorkspaceRole
    // Include user details if populated
    user?: {
        name: string
        email: string
    }
}

export interface WorkspaceMemberRow {
    user_id: string
    role: WorkspaceRole
    joined_at: string
    username: string
    email: string
    avatar_url?: string
}

export interface WorkspaceInvite {
    id: string
    inviteeId: string
    role: WorkspaceRole
    createdAt: string
    invitee: {
        id: string
        username: string
        email: string
        avatarUrl?: string
    }
}

// Get all workspaces for the current user (independent of projects)
export const getAllWorkspaces = async (): Promise<Workspace[]> => {
    const response = await apiClient.get(`/api/v1/workspaces`)
    return response.data
}

// Get workspaces for a specific project (used in ProjectPage)
export const getWorkspaces = async (projectId: string): Promise<Workspace[]> => {
    const response = await apiClient.get(`/api/v1/projects/${projectId}/workspaces`)
    return response.data
}

// Create independent workspace (no project required)
export const createWorkspace = async (name: string, projectId?: string): Promise<Workspace> => {
    if (projectId) {
        // Legacy: create workspace under a project
        const response = await apiClient.post(`/api/v1/projects/${projectId}/workspaces`, { name })
        return response.data
    } else {
        // Create independent workspace
        const response = await apiClient.post(`/api/v1/workspaces`, { name })
        return response.data
    }
}

export const getWorkspace = async (id: string): Promise<Workspace> => {
    const response = await apiClient.get(`/api/v1/workspaces/${id}`)
    return response.data
}

// Check existing membership role (does not join)
export const joinWorkspace = async (workspaceId: string): Promise<{ role: WorkspaceRole }> => {
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/join`)
    return response.data
}

export const inviteToWorkspace = async (
    workspaceId: string,
    invitee: string,
    role: WorkspaceRole.COLLABORATOR | WorkspaceRole.VIEWER,
): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/v1/workspaces/${workspaceId}/invite`, { invitee, role })
    return response.data
}

export const getWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMemberRow[]> => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/members`)
    return response.data
}

export const getWorkspaceInvites = async (workspaceId: string): Promise<WorkspaceInvite[]> => {
    const response = await apiClient.get(`/api/v1/workspaces/${workspaceId}/invites`)
    return response.data
}

export const updateWorkspaceMemberRole = async (
    workspaceId: string,
    userId: string,
    role: WorkspaceRole.COLLABORATOR | WorkspaceRole.VIEWER,
): Promise<{ message: string }> => {
    const response = await apiClient.put(`/api/v1/workspaces/${workspaceId}/members/${userId}`, { role })
    return response.data
}

export const updateWorkspace = async (id: string, name: string): Promise<Workspace> => {
    const response = await apiClient.put(`/api/v1/workspaces/${id}`, { name })
    return response.data
}

export const deleteWorkspace = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/workspaces/${id}`)
}
