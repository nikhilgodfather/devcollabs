import { ReactNode } from "react"
import { AppContextProvider } from "./AppContext.js"
import { ChatContextProvider } from "./ChatContext.jsx"
import { FileContextProvider } from "./FileContext.jsx"
import { RunCodeContextProvider } from "./RunCodeContext.jsx"
import { SettingContextProvider } from "./SettingContext.jsx"
import { SocketProvider } from "./SocketContext.jsx"
import { ViewContextProvider } from "./ViewContext.js"
import { CopilotContextProvider } from "./CopilotContext.js"

function AppProvider({ children }: { children: ReactNode }) {
    return (
        <AppContextProvider>
            <ViewContextProvider>
                <SocketProvider>
                    <SettingContextProvider>
                        <FileContextProvider>
                            <CopilotContextProvider>
                                <RunCodeContextProvider>
                                    <ChatContextProvider>
                                        {children}
                                    </ChatContextProvider>
                                </RunCodeContextProvider>
                            </CopilotContextProvider>
                        </FileContextProvider>
                    </SettingContextProvider>
                </SocketProvider>
            </ViewContextProvider>
        </AppContextProvider>
    )
}

export default AppProvider
