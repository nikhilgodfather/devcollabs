import { useAuth } from "@/context/AuthContext"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Link, useNavigate } from "react-router-dom"
import logo from "@/assets/devcollab-logo.svg"

const RegisterPage = () => {
    const { register, isAuthenticated, isLoading } = useAuth()
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username || !email || !password) {
            toast.error("Please fill in all fields")
            return
        }
        setIsSubmitting(true)
        try {
            await register(username, email, password)
            navigate("/")
        } catch (error) {
            // Error handled in context
        } finally {
            setIsSubmitting(false)
        }
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
                    <h2 className="text-3xl font-bold">Create Account</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Username</label>
                        <input
                            type="text"
                            placeholder="JohnDoe"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="rounded-md p-3"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-md p-3"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Password</label>
                        <input
                            type="password"
                            placeholder="Create a password"
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
                        {isSubmitting ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <p className="text-center text-[var(--text-muted)]">
                    Already have an account?{" "}
                    <Link to="/login" className="text-[var(--primary)] hover:underline font-medium">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default RegisterPage
