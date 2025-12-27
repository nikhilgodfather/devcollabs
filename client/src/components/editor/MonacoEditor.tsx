import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import { useSocket } from "@/context/SocketContext"
import usePageEvents from "@/hooks/usePageEvents"
import useResponsive from "@/hooks/useResponsive"
import { FileSystemItem } from "@/types/file"
import { SocketEvent } from "@/types/socket"
import Editor, { BeforeMount, OnMount } from "@monaco-editor/react"
import { editor } from "monaco-editor"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import {
    collaborativeHighlighting,
    updateRemoteUsers,
} from "./collaborativeHighlighting"

function MonacoEditor() {
    const { users, currentUser } = useAppContext()
    const { activeFile, setActiveFile } = useFileSystem()
    const { theme, language, fontSize } = useSettings()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()
    const [timeOut, setTimeOut] = useState(setTimeout(() => {}, 0))
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const decorationsRef = useRef<string[]>([])
    const [lastCursorPosition, setLastCursorPosition] = useState<number>(0)
    const [lastSelection, setLastSelection] = useState<{
        start?: number
        end?: number
    }>({})
    const cursorMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isRemoteChangeRef = useRef(false)

    const filteredUsers = useMemo(
        () => users.filter((u) => u.username !== currentUser.username),
        [users, currentUser],
    )

    const handleEditorMount: OnMount = (editorInstance) => {
        editorRef.current = editorInstance

        // Set initial content
        if (activeFile) {
            editorInstance.setValue(activeFile.content || "")
        }

        // Set up cursor/selection change listener
        editorInstance.onDidChangeCursorSelection(() => {
            handleSelectionChange()
        })
    }

    const handleBeforeMount: BeforeMount = (monaco) => {
        // Optional: Define custom themes or additional setup
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
            maven: "maven",
            vim: "vim",
            diff: "diff",
            patch: "diff",
        }
        return languageMap[ext] || ext || "plaintext"
    }

    const onCodeChange = (code: string | undefined) => {
        if (!activeFile || code === undefined) return

        // If this change is from a remote user, don't emit it back
        if (isRemoteChangeRef.current) {
            isRemoteChangeRef.current = false
            return
        }

        const file: FileSystemItem = { ...activeFile, content: code }
        setActiveFile(file)

        // Get cursor position
        if (editorRef.current) {
            const position = editorRef.current.getPosition()
            if (position) {
                const model = editorRef.current.getModel()
                if (model) {
                    const offset = model.getOffsetAt(position)
                    socket.emit(SocketEvent.TYPING_START, {
                        cursorPosition: offset,
                        selectionStart: undefined,
                        selectionEnd: undefined,
                    })
                }
            }
        }

        socket.emit(SocketEvent.FILE_UPDATED, {
            fileId: activeFile.id,
            newContent: code,
        })

        clearTimeout(timeOut)
        const newTimeOut = setTimeout(
            () => socket.emit(SocketEvent.TYPING_PAUSE),
            1000,
        )
        setTimeOut(newTimeOut)
    }

    const handleSelectionChange = useCallback(() => {
        if (!editorRef.current) return

        const position = editorRef.current.getPosition()
        const selections = editorRef.current.getSelections()

        if (position && selections && selections.length > 0) {
            const selection = selections[0]
            const model = editorRef.current.getModel()
            if (model) {
                const cursorOffset = model.getOffsetAt(position)
                const selectionStart = model.getOffsetAt({
                    lineNumber: selection.startLineNumber,
                    column: selection.startColumn,
                })
                const selectionEnd = model.getOffsetAt({
                    lineNumber: selection.endLineNumber,
                    column: selection.endColumn,
                })

                const cursorChanged = cursorOffset !== lastCursorPosition
                const selectionChanged =
                    selectionStart !== lastSelection.start ||
                    selectionEnd !== lastSelection.end

                if (cursorChanged || selectionChanged) {
                    setLastCursorPosition(cursorOffset)
                    setLastSelection({
                        start: selectionStart,
                        end: selectionEnd,
                    })

                    if (cursorMoveTimeoutRef.current) {
                        clearTimeout(cursorMoveTimeoutRef.current)
                    }

                    cursorMoveTimeoutRef.current = setTimeout(() => {
                        socket.emit(SocketEvent.CURSOR_MOVE, {
                            cursorPosition: cursorOffset,
                            selectionStart,
                            selectionEnd,
                        })
                    }, 100)
                }
            }
        }
    }, [lastCursorPosition, lastSelection, socket])

    useEffect(() => {
        if (!editorRef.current || !activeFile) return

        isRemoteChangeRef.current = true
        editorRef.current.setValue(activeFile.content || "")
        editorRef.current.getModel()?.setEOL(0) // LF line ending
    }, [activeFile?.id])

    // Listen for file updates from other users
    useEffect(() => {
        const handleFileUpdated = ({ fileId, newContent }: { fileId: string; newContent: string }) => {
            // Only update if this is the active file
            if (activeFile?.id === fileId && editorRef.current) {
                const editor = editorRef.current
                const model = editor.getModel()
                
                if (model && model.getValue() !== newContent) {
                    // Save current cursor position
                    const position = editor.getPosition()
                    const scrollTop = editor.getScrollTop()
                    
                    // Mark as remote change to prevent echo
                    isRemoteChangeRef.current = true
                    
                    // Update the file content in context
                    setActiveFile({ ...activeFile, content: newContent })
                    
                    // Update editor value
                    model.setValue(newContent)
                    
                    // Restore cursor position if possible
                    if (position) {
                        try {
                            editor.setPosition(position)
                            editor.setScrollTop(scrollTop)
                        } catch (e) {
                            // Position might be invalid after content change
                            console.warn("Could not restore cursor position", e)
                        }
                    }
                }
            }
        }

        socket.on(SocketEvent.FILE_UPDATED, handleFileUpdated)

        return () => {
            socket.off(SocketEvent.FILE_UPDATED, handleFileUpdated)
        }
    }, [activeFile, socket, setActiveFile])

    // Handle remote users' cursors
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

                    const decoration: editor.IModelDeltaDecoration = {
                        range: new (window as any).monaco.Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber,
                            position.column,
                        ),
                        options: {
                            isWholeLine: false,
                            glyphMarginClassName:
                                "codicon codicon-debug-breakpoint",
                            glyphMarginHoverMessage: { value: user.username },
                            className: `cursor-${user.socketId}`,
                        },
                    }
                    return decoration
                } catch {
                    return null
                }
            })
            .filter((d) => d !== null) as editor.IModelDeltaDecoration[]

        const oldDecorations = decorationsRef.current
        decorationsRef.current = editorRef.current.deltaDecorations(
            oldDecorations,
            decorations,
        )
    }, [filteredUsers])

    usePageEvents()

    const themeMap: { [key: string]: string } = {
        light: "vs",
        dark: "vs-dark",
        "high-contrast": "hc-black",
    }

    const selectedTheme = themeMap[theme] || "vs-dark"
    const selectedLanguage = getFileLanguage(activeFile?.name || "")

    return (
        <div style={{ height: viewHeight }}>
            <Editor
                height="100%"
                defaultLanguage="plaintext"
                language={selectedLanguage}
                value={activeFile?.content || ""}
                onChange={onCodeChange}
                onMount={handleEditorMount}
                beforeMount={handleBeforeMount}
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
                }}
            />
        </div>
    )
}

export default MonacoEditor
