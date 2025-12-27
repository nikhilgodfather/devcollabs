import { Link, useParams } from "react-router-dom"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { useState } from "react"

const ProjectEditorPage = () => {
    const { projectId } = useParams<{ projectId: string }>()
    const [code, setCode] = useState("// Welcome to your Solo Scratchpad\n// Code here is NOT saved to the server.\n\nfunction hello() {\n  console.log('Hello World');\n}")

    return (
        <div className="flex flex-col h-screen bg-dark text-white">
            {/* Header */}
            <nav className="flex items-center justify-between border-b border-darkHover bg-darkHover px-4 py-2 text-sm">
                <div className="flex items-center gap-4">
                     <Link to="/" className="text-gray-400 hover:text-white">← Dashboard</Link>
                     <span className="h-4 w-[1px] bg-gray-600"></span>
                     <span className="font-bold">Project #{projectId}</span>
                </div>
                <div className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded text-xs font-bold border border-yellow-500/30">
                    ⚠ SCRATCHPAD MODE: CHANGES NOT SAVED
                </div>
            </nav>

            {/* Editor */}
            <div className="flex-grow overflow-hidden">
                <CodeMirror
                    value={code}
                    height="100%"
                    theme={vscodeDark}
                    extensions={[javascript({ jsx: true })]}
                    onChange={(value) => setCode(value)}
                    className="h-full text-base"
                />
            </div>
        </div>
    )
}

export default ProjectEditorPage
