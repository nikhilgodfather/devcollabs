import { getMe, login as loginApi, register as registerApi, logout as logoutApi } from "@/api/auth"
import { User } from "@/types/user"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { toast } from "react-hot-toast"

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (username: string, email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const checkAuth = async () => {
        const token = localStorage.getItem("accessToken")
        const refreshToken = localStorage.getItem("refreshToken")
        
        // If no tokens exist, we're not authenticated
        if (!token && !refreshToken) {
            setIsLoading(false)
            return
        }

        try {
            // Try to get user info - the axios interceptor will handle token refresh if needed
            const { user } = await getMe()
            setUser(user)
        } catch (error: any) {
            console.error("Auth check failed:", error)
            // If it's a 401/403 after refresh attempt, tokens are invalid
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                // Clear tokens - refresh either failed or wasn't possible
                localStorage.removeItem("accessToken")
                localStorage.removeItem("refreshToken")
                setUser(null)
            }
            // For network errors or other errors, keep tokens and let user retry
            // Don't clear user state on network errors
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAuth()
    }, [])

    const login = async (email: string, password: string) => {
        try {
            const { user, accessToken, refreshToken } = await loginApi(email, password)
            localStorage.setItem("accessToken", accessToken)
            localStorage.setItem("refreshToken", refreshToken)
            setUser(user)
            toast.success("Logged in successfully")
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Login failed")
            throw error
        }
    }

    const register = async (username: string, email: string, password: string) => {
        try {
            const { user, accessToken, refreshToken } = await registerApi(username, email, password)
            localStorage.setItem("accessToken", accessToken)
            localStorage.setItem("refreshToken", refreshToken)
            setUser(user)
            toast.success("Registered successfully")
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Registration failed")
            throw error
        }
    }

    const logout = async () => {
        try {
            await logoutApi()
            setUser(null)
            localStorage.removeItem("accessToken")
            localStorage.removeItem("refreshToken")
            toast.success("Logged out")
        } catch (error) {
            console.error("Logout error", error)
            // Clear tokens even if logout API call fails
            setUser(null)
            localStorage.removeItem("accessToken")
            localStorage.removeItem("refreshToken")
        }
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
