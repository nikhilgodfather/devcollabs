export enum UserRole {
    OWNER = 'OWNER',
    COLLABORATOR = 'COLLABORATOR',
    VIEWER = 'VIEWER'
}

export interface UserPayload {
    userId: string
    email: string
    username: string
}

export interface AuthResponse {
    user: {
        id: string
        username: string
        email: string
        avatarUrl?: string
    }
    accessToken: string
    refreshToken: string
}
