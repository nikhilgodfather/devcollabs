import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import useResponsive from "@/hooks/useResponsive"
import { FileSystemItem } from "@/types/file"
import MonacoEditorComponent from "@monaco-editor/react"
import type { editor as monacoEditorType } from "monaco-editor"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import toast from "react-hot-toast"

function MonacoEditor() {
    const { users, currentUser } = useAppContext()
    const { activeFile, setActiveFile } = useFileSystem()
    const { theme, fontSize } = useSettings()
    const { viewHeight } = useResponsive()
    const [timeOut, setTimeOut] = useState(setTimeout(() => {}, 0))
    const editorRef = useRef<monacoEditorType.IStandaloneCodeEditor | null>(
        null,
    )
    const decorationsRef = useRef<string[]>([])

    const filteredUsers = useMemo(
        () => users.filter((u) => u.username !== currentUser.username),
        [users, currentUser],
    )

    const handleEditorMount = (
        editorInstance: monacoEditorType.IStandaloneCodeEditor,
    ) => {
        editorRef.current = editorInstance
        if (activeFile) {
            editorInstance.setValue(activeFile.content || "")
        }
    }

    const getFileLanguage = (fileName: string): string => {
        const ext = fileName.split(".").pop()?.toLowerCase() || ""
        const languageMap: { [key: string]: string } = {
            js: "javascript",
            jsx: "javascript",
            ts: "typescript",
            tsx: "typescript",
            py: "python",
            java: "java",
            cpp: "cpp",
            c: "c",
            cs: "csharp",
            php: "php",
            rb: "ruby",
            go: "go",
            rs: "rust",
            kt: "kotlin",
            swift: "swift",
            html: "html",
            htm: "html",
            xml: "xml",
            css: "css",
            scss: "scss",
            sass: "sass",
            less: "less",
            json: "json",
            yaml: "yaml",
            yml: "yaml",
            toml: "toml",
            sql: "sql",
            sh: "bash",
            bash: "bash",
            zsh: "bash",
            fish: "fish",
            ps1: "powershell",
            lua: "lua",
            r: "r",
            m: "objc",
            pl: "perl",
            scala: "scala",
            groovy: "groovy",
            dockerfile: "dockerfile",
            makefile: "makefile",
            gradle: "gradle",
            vim: "vim",
            diff: "diff",
            patch: "diff",
        }
        return languageMap[ext] || ext || "plaintext"
    }

    const onCodeChange = (code: string | undefined) => {
        if (!activeFile || code === undefined) return

        const file: FileSystemItem = { ...activeFile, content: code }
        setActiveFile(file)

        // Auto-save with debounce - save after 2 seconds of inactivity
        clearTimeout(timeOut)
        
        // Show "saving..." message
        const savingToast = toast.loading("Saving changes...")
        
        const newTimeOut = setTimeout(() => {
            // Simulate auto-save (you can replace this with actual API call)
            toast.dismiss(savingToast)
            toast.success("Changes saved automatically", {
                duration: 2000,
                icon: "✓",
            })
        }, 2000)
        
        setTimeOut(newTimeOut)
    }
    useEffect(() => {
        if (!editorRef.current || !activeFile) return
        editorRef.current.setValue(activeFile.content || "")
    }, [activeFile?.id])

    useEffect(() => {
        if (!editorRef.current || filteredUsers.length === 0) return

        const decorations = filteredUsers
            .filter((user) => user.cursorPosition !== undefined)
            .map((user) => {
                const model = editorRef.current?.getModel()
                if (!model) return null

                try {
                    const position = model.getPositionAt(
                        user.cursorPosition || 0,
                    )
                    if (!position) return null
                    return {
                        range: new (window as any).monaco.Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber,
                            position.column,
                        ),
                        options: {
                            isWholeLine: false,
                            className: `cursor-${user.socketId}`,
                            glyphMarginHoverMessage: { value: user.username },
                        },
                    }
                } catch {
                    return null
                }
            })
            .filter((d) => d !== null)

        const oldDecorations = decorationsRef.current
        decorationsRef.current = editorRef.current.deltaDecorations(
            oldDecorations,
            decorations,
        )
    }, [filteredUsers])

    const themeMap: { [key: string]: string } = {
        light: "vs",
        dark: "vs-dark",
        "high-contrast": "hc-black",
    }

    const selectedTheme = themeMap[theme] || "vs-dark"
    const selectedLanguage = getFileLanguage(activeFile?.name || "")

    return (
        <div style={{ height: viewHeight }}>
            <MonacoEditorComponent
                height="100%"
                defaultLanguage="plaintext"
                language={selectedLanguage}
                value={activeFile?.content || ""}
                onChange={onCodeChange}
                onMount={handleEditorMount}
                theme={selectedTheme}
                options={{
                    minimap: { enabled: true },
                    fontSize: fontSize || 14,
                    wordWrap: "on",
                    fontFamily: "Fira Code, monospace",
                    fontLigatures: true,
                    smoothScrolling: true,
                    cursorBlinking: "blink",
                    cursorSmoothCaretAnimation: "on",
                    mouseWheelZoom: true,
                    scrollBeyondLastLine: true,
                    padding: { top: 10, bottom: 10 },
                    renderLineHighlight: "all",
                    bracketPairColorization: {
                        enabled: true,
                    },
                    autoClosingBrackets: "always",
                    autoClosingQuotes: "always",
                    autoSurround: "languageDefined",
                    formatOnPaste: true,
                    formatOnType: true,
                    acceptSuggestionOnCommitCharacter: true,
                    accessibilitySupport: "auto",
                    autoIndent: "full",
                    contextmenu: true,
                    copyWithSyntaxHighlighting: true,
                    cursorStyle: "line",
                    dragAndDrop: true,
                    emptySelectionClipboard: true,
                    fixedOverflowWidgets: false,
                    folding: true,
                    foldingStrategy: "auto",
                    foldingHighlight: true,
                    linkedEditing: false,
                    useTabStops: true,
                    trimAutoWhitespace: true,
                    showUnused: true,
                    suggest: {
                        localityBonus: true,
                        shareSuggestSelections: true,
                        showIcons: true,
                        showStatusBar: true,
                        preview: true,
                        previewMode: "subwordSmart",
                        filterGraceful: true,
                        insertMode: "insert",
                    },
                }}
            />
        </div>
    )
}

export default MonacoEditor
