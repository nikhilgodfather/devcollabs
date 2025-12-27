import apiClient from "./axios"
import { User } from "@/types/user"

export const login = async (email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post("/auth/login", { email, password })
    return response.data
}

export const register = async (username: string, email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post("/auth/register", { username, email, password })
    return response.data
}

export const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem("refreshToken")
    if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken })
    }
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
}

export const getMe = async (): Promise<{ user: User }> => {
    const response = await apiClient.get("/auth/me")
    // Server returns user object directly, wrap it for consistency
    return { user: response.data }
}
