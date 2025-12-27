import apiClient from "@/api/axios"
import { Language, RunContext as RunContextType } from "@/types/run"
import langMap from "lang-map"
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react"
import toast from "react-hot-toast"
import { useFileSystem } from "./FileContext"

const RunCodeContext = createContext<RunContextType | null>(null)

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error(
            "useRunCode must be used within a RunCodeContextProvider",
        )
    }
    return context
}

const RunCodeContextProvider = ({ children }: { children: ReactNode }) => {
    const { activeFile } = useFileSystem()
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: "",
        version: "",
        aliases: [],
    })

    useEffect(() => {
        // Static list of supported languages to avoid /runtimes API call
        const staticLanguages: Language[] = [
            { language: "javascript", version: "18.15.0", aliases: ["js", "node"] },
            { language: "typescript", version: "5.0.3", aliases: ["ts"] },
            { language: "python", version: "3.10.0", aliases: ["py"] },
            { language: "java", version: "15.0.2", aliases: [] },
            { language: "c++", version: "10.2.0", aliases: ["cpp", "g++"] },
            { language: "c", version: "10.2.0", aliases: ["gcc"] },
        ]
        setSupportedLanguages(staticLanguages)
    }, [])

    // Set the selected language based on the file extension
    useEffect(() => {
        if (supportedLanguages.length === 0 || !activeFile?.name) return

        const extension = activeFile.name.split(".").pop()
        if (extension) {
            const languageName = langMap.languages(extension)
            const language = supportedLanguages.find(
                (lang) =>
                    lang.aliases.includes(extension) ||
                    languageName.includes(lang.language.toLowerCase()),
            )
            if (language) setSelectedLanguage(language)
        } else setSelectedLanguage({ language: "", version: "", aliases: [] })
    }, [activeFile?.name, supportedLanguages])

    const runCode = async () => {
        try {
            if (!selectedLanguage) {
                return toast.error("Please select a language to run the code")
            } else if (!activeFile) {
                return toast.error("Please open a file to run the code")
            } else {
                toast.loading("Queuing job...")
            }

            setIsRunning(true)
            const { language, version } = selectedLanguage

            // 1. Create Job
            // Using apiClient instead of pistonApi to hit our backend
            const { data: job } = await apiClient.post("/api/v1/jobs", {
                type: "RUN_CODE",
                payload: {
                    language,
                    version,
                    files: [{ name: activeFile.name, content: activeFile.content }],
                    stdin: input,
                }
            })

            const jobId = job.id
            toast.dismiss()
            toast.loading("Job processing...")

            // 2. Poll Job Status
            const pollInterval = setInterval(async () => {
                try {
                    const { data: pollData } = await apiClient.get(`/api/v1/jobs/${jobId}`)
                    
                    if (pollData.status === "COMPLETED") {
                        clearInterval(pollInterval)
                        setOutput(pollData.result?.output || "Job completed")
                        setIsRunning(false)
                        toast.dismiss()
                        toast.success("Run complete")
                    } else if (pollData.status === "FAILED") {
                        clearInterval(pollInterval)
                        setOutput(pollData.error || "Job failed")
                        setIsRunning(false)
                        toast.dismiss()
                        toast.error("Job failed")
                    } else {
                        // Still PENDING or PROCESSING
                    }
                } catch (err) {
                    clearInterval(pollInterval)
                    setIsRunning(false)
                    toast.error("Error polling job")
                }
            }, 2000)

        } catch (error: any) {
            console.error(error)
            setIsRunning(false)
            toast.dismiss()
            toast.error("Failed to start job")
        }
    }

    return (
        <RunCodeContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }
export default RunCodeContext
