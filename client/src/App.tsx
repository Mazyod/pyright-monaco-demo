/*
 * Copyright (c) Eric Traut
 * Main UI for Pyright Playground web app.
 */

import { useEffect, useRef, useState } from 'react';
import { Box, SxProps } from '@mui/material';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { HeaderPanel } from './HeaderPanel';
import { getInitialStateFromLocalStorage, setStateToLocalStorage } from './LocalStorageUtils';
import { LspClient } from './LspClient';
import { MonacoEditor, MonacoEditorRef } from './MonacoEditor';
import { PlaygroundSettings } from './PlaygroundSettings';
import { ProblemsPanel } from './ProblemsPanel';
import { RightPanel } from './RightPanel';

const lspClient = new LspClient();

export interface AppState {
    gotInitialState: boolean;
    code: string;
    diagnostics: Diagnostic[];
    settings: PlaygroundSettings;

    isWaitingForResponse: boolean;
}

const initialState = getInitialStateFromLocalStorage();

export default function App() {
    const editorRef = useRef<MonacoEditorRef>(null);
    const [appState, setAppState] = useState<AppState>({
        gotInitialState: false,
        code: '',
        settings: {
            configOverrides: {},
        },
        diagnostics: [],
        isWaitingForResponse: false,
    });

    useEffect(() => {
        if (!appState.gotInitialState) {
            if (initialState.code !== '') {
                lspClient.updateCode(initialState.code);
            }

            setAppState((prevState) => ({
                ...prevState,
                gotInitialState: true,
                code: initialState.code,
                settings: initialState.settings,
            }));
        }
    }, [appState.gotInitialState]);

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            // Swallow command-s or ctrl-s to prevent browser save.
            if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    useEffect(() => {
        setStateToLocalStorage({ code: appState.code, settings: appState.settings });
    }, [appState.code, appState.settings]);

    useEffect(() => {
        lspClient.updateSettings(appState.settings);
    }, [appState.settings]);

    lspClient.requestNotification({
        onDiagnostics: (diagnostics: Diagnostic[]) => {
            setAppState((prevState) => ({
                ...prevState,
                diagnostics,
            }));
        },
        onError: (message: string) => {
            setAppState((prevState) => ({
                ...prevState,
                diagnostics: [
                    {
                        message: `An error occurred when attempting to contact the pyright web service\n    ${message}`,
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 0 },
                        },
                    },
                ],
            }));
        },
        onWaitingForDiagnostics: (isWaiting) => {
            setAppState((prevState) => ({
                ...prevState,
                isWaitingForResponse: isWaiting,
            }));
        },
    });

    return (
        <Box sx={styles.container}>
            <HeaderPanel />
            <Box sx={styles.middlePanelContainer}>
                <MonacoEditor
                    ref={editorRef}
                    lspClient={lspClient}
                    code={appState.code}
                    diagnostics={appState.diagnostics}
                    onUpdateCode={(code: string) => {
                        // Tell the LSP client about the code change.
                        lspClient.updateCode(code);

                        setAppState((prevState) => ({
                            ...prevState,
                            code,
                            isProblemsPanelDisplayed: true,
                        }));
                    }}
                />
                <RightPanel
                    settings={appState.settings}
                    onUpdateSettings={(settings: PlaygroundSettings) => {
                        setAppState((prevState) => ({
                            ...prevState,
                            settings,
                        }));
                    }}
                    code={appState.code}
                />
            </Box>
            <ProblemsPanel
                diagnostics={appState.diagnostics}
                onSelectRange={(range) => {
                    if (editorRef.current) {
                        editorRef.current.selectRange(range);
                    }
                }}
                displayActivityIndicator={appState.isWaitingForResponse}
            />
        </Box>
    );
}

const styles: Record<string, SxProps> = {
    container: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flex: 1,
    },
    middlePanelContainer: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
    },
};
