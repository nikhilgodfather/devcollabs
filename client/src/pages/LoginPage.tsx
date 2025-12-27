import { useAuth } from "@/context/AuthContext"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Link, useNavigate } from "react-router-dom"
import logo from "@/assets/devcollab-logo.svg"

const LoginPage = () => {
    const { login, isAuthenticated, isLoading } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            toast.error("Please fill in all fields")
            return
        }
        setIsSubmitting(true)
        try {
            await login(email, password)
            navigate("/")
        } catch (error) {
            // Error handled in context
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/google`
    }

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/", { replace: true })
        }
    }, [isAuthenticated, isLoading, navigate])

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-white">
                <div>Loading...</div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] text-white">
            <div className="flex w-full max-w-[500px] flex-col gap-6 rounded-xl bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border)]">
                <div className="flex flex-col items-center gap-4">
                    <img src={logo} alt="DevCollab Logo" className="h-12 w-auto" />
                    <h2 className="text-3xl font-bold">Welcome Back</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-md p-3"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-md p-3"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div className="flex items-center gap-4 text-[var(--text-muted)]">
                    <div className="h-[1px] w-full bg-[var(--border)]"></div>
                    <span>OR</span>
                    <div className="h-[1px] w-full bg-[var(--border)]"></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="btn-secondary w-full"
                >
                     Login with Google
                </button>

                <p className="text-center text-[var(--text-muted)]">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-[var(--primary)] hover:underline font-medium">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default LoginPage
