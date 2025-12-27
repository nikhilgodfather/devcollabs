import apiClient from "./axios"

export interface UserSearchResult {
    id: string
    username: string
    email: string
    avatarUrl?: string
}

export const searchUsers = async (q: string): Promise<UserSearchResult[]> => {
    const response = await apiClient.get(`/api/v1/users/search`, { params: { q } })
    return response.data
}

