import axios from "axios"

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000"

const apiClient = axios.create({
    baseURL,
    withCredentials: true, // For http-only cookies if used
    headers: {
        "Content-Type": "application/json",
    },
})

// Track refresh token request to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
    config: any
}> = []

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            // Retry the original request with new token
            prom.config.headers.Authorization = `Bearer ${token}`
            apiClient(prom.config)
                .then(response => prom.resolve(response))
                .catch(err => prom.reject(err))
        }
    })
    failedQueue = []
}

// Request interceptor to add token if we switch to localStorage
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken")
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor for handling token expiry
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        
        // Don't retry login, register, or refresh endpoints
        const isAuthEndpoint = originalRequest.url?.includes("/auth/login") || 
                               originalRequest.url?.includes("/auth/register") ||
                               originalRequest.url?.includes("/auth/refresh")
        
        // If error is 401 and we haven't retried yet, and it's not an auth endpoint
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            const refreshToken = localStorage.getItem("refreshToken")
            const isMeEndpoint = originalRequest.url?.includes("/auth/me")
            
            // If refresh is already in progress, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject, config: originalRequest })
                })
            }
            
            originalRequest._retry = true
            
            // Only try to refresh if we have a refresh token
            if (refreshToken) {
                isRefreshing = true
                
                try {
                    // Try to refresh token - create a new request without interceptors to avoid infinite loop
                    const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, { refreshToken }, {
                        headers: { "Content-Type": "application/json" }
                    })
                    
                    if (refreshResponse.data.accessToken && refreshResponse.data.refreshToken) {
                        localStorage.setItem("accessToken", refreshResponse.data.accessToken)
                        localStorage.setItem("refreshToken", refreshResponse.data.refreshToken)
                        
                        // Process queued requests
                        processQueue(null, refreshResponse.data.accessToken)
                        isRefreshing = false
                        
                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`
                        // Retry the original request with new token
                        return apiClient(originalRequest)
                    } else {
                        throw new Error("Invalid refresh response")
                    }
                } catch (refreshError) {
                    // If refresh fails, clear tokens
                    localStorage.removeItem("accessToken")
                    localStorage.removeItem("refreshToken")
                    isRefreshing = false
                    processQueue(refreshError, null)
                    
                    // For /auth/me, let the error propagate so AuthContext can handle it
                    // For other endpoints, redirect to login
                    if (!isMeEndpoint) {
                        window.location.href = "/login"
                    }
                    return Promise.reject(refreshError)
                }
            } else {
                // No refresh token available, clear access token
                localStorage.removeItem("accessToken")
                
                // For /auth/me, let the error propagate so AuthContext can handle it
                // For other endpoints, redirect to login
                if (!isMeEndpoint) {
                    window.location.href = "/login"
                }
            }
        }
        return Promise.reject(error)
    }
)

export default apiClient
