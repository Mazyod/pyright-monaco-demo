/*
 * Copyright (c) Eric Traut
 * Main UI for Pyright Playground web app.
 */

import { useEffect, useMemo, useState } from 'react';
import { Box, SxProps } from '@mui/material';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { HeaderPanel } from '@/components/HeaderPanel';
import {
    getInitialStateFromLocalStorage,
    setStateToLocalStorage,
} from '@/services/LocalStorageUtils';
import { ProblemsPanel } from '@/components/ProblemsPanel';
import { RightPanel } from '@/components/RightPanel';
import type { LspSettings } from '@/LspMonaco/services/LspSession';
import { Editor } from '@monaco-editor/react';
import { editorOptions, useMonacoLsp } from './LspMonaco';

const initialState = getInitialStateFromLocalStorage();

export default function App() {
    const [lspSettings, setLspSettings] = useState<LspSettings>(initialState.settings);

    // #region - Monaco LSP

    const apiAddressPrefix = 'http://localhost:8080/lsp/';

    const {
        code,
        isWaitingForDiagnostics,
        diagnostics,
        error,
        editorRef,
        handleEditorDidMount,
        handleCodeChange,
    } = useMonacoLsp({
        initialCode: initialState.code,
        lspConfig: {
            settings: lspSettings,
            apiAddressPrefix,
        },
    });

    const sessionError = useMemo<Diagnostic[] | null>(() => {
        if (!error) {
            return null;
        }

        // Map the session error to a diagnostic.
        const message = `An error occurred when attempting to contact the pyright web service\n    ${error}`;
        return [
            {
                message,
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
            },
        ];
    }, [error]);

    // #endregion

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
        setStateToLocalStorage({ code: code, settings: lspSettings });
    }, [code, lspSettings]);

    return (
        <Box sx={styles.container}>
            <HeaderPanel />
            <Box sx={styles.middlePanelContainer}>
                <Editor
                    options={editorOptions}
                    language={'python'}
                    defaultValue={initialState.code}
                    theme="light"
                    onChange={handleCodeChange}
                    onMount={handleEditorDidMount}
                />
                <RightPanel
                    settings={lspSettings}
                    onUpdateSettings={(settings: LspSettings) => {
                        setLspSettings(settings);
                    }}
                />
            </Box>
            <ProblemsPanel
                diagnostics={sessionError ?? diagnostics}
                onSelectRange={(range) => {
                    editorRef.selectRange(range);
                }}
                displayActivityIndicator={isWaitingForDiagnostics}
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
