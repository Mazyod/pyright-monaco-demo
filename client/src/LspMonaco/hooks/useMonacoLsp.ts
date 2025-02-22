import { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useEffect, useRef, useState } from 'react';
import { Range } from 'vscode-languageserver-types';
import type { LspConfig } from '../services/LspSession';
import { convertDiagnostics, convertRange } from '../utils/typeConversions';
import { useLspSession } from './useLspSession';
import { useMonacoProviders } from './useMonacoProviders';
import useDebounce from './useDebounce';

interface UseMonacoLspProps {
    initialCode: string;
    theme?: string;
    lspConfig: LspConfig;
}

export interface MonacoEditorRef {
    focus: () => void;
    selectRange: (range: Range) => void;
}

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    selectOnLineNumbers: true,
    minimap: { enabled: false },
    fixedOverflowWidgets: true,
    tabCompletion: 'on',
    hover: { enabled: true },
    scrollBeyondLastLine: false,
    autoClosingOvertype: 'always',
    autoIndent: 'full',
    fontFamily: 'Monaco, Menlo, "Courier New", monospace',
    showUnused: true,
    wordBasedSuggestions: 'off',
    overviewRulerLanes: 0,
    renderWhitespace: 'none',
    guides: {
        indentation: false,
    },
    renderLineHighlight: 'none',
    'semanticHighlighting.enabled': true,
};

export function useMonacoLsp({ initialCode, theme, lspConfig }: UseMonacoLspProps) {
    const monacoRef = useRef<typeof monaco>();
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

    const [code, setCode] = useState(initialCode);

    const { lspSession, isWaitingForDiagnostics, diagnostics, error } = useLspSession(lspConfig);

    // Register providers when the editor is mounted
    useMonacoProviders({
        model: editorRef.current?.getModel() ?? null,
        lspSession,
    });

    // Trigger initial diagnostics and subsequent updates
    useEffect(() => {
        lspSession.updateCode(code);
    }, [lspSession, code]);

    // Render diagnostics
    useEffect(() => {
        if (!monacoRef.current || !editorRef.current) {
            return;
        }

        const model = editorRef.current.getModel();
        if (!model) {
            return;
        }

        const markers = convertDiagnostics(diagnostics);
        monacoRef.current.editor.setModelMarkers(model, 'pyright', markers);
    }, [diagnostics]);

    // Handle editor mount
    const handleEditorDidMount: OnMount = (
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco
    ) => {
        monacoRef.current = monacoInstance;
        editorRef.current = editor;
        editor.focus();

        if (theme) {
            monacoInstance.editor.defineTheme('custom-theme', JSON.parse(theme));
            monacoInstance.editor.setTheme('custom-theme');
        }
    };

    // Handle code changes
    const _handleCodeChange = (value?: string) => {
        if (value) {
            setCode(value);
        }
    };

    const handleCodeChange = useDebounce(_handleCodeChange, 500);

    // Expose imperative methods
    const publicEditorRef: MonacoEditorRef = {
        focus: () => {
            editorRef.current?.focus();
        },
        selectRange: (range: Range) => {
            const editor = editorRef.current;
            if (editor) {
                const monacoRange = convertRange(range);
                editor.setSelection(monacoRange);
                editor.revealLineInCenterIfOutsideViewport(monacoRange.startLineNumber);
            }
        },
    };

    return {
        code,
        editorOptions,
        isWaitingForDiagnostics,
        diagnostics,
        error,
        editorRef: publicEditorRef,
        handleEditorDidMount,
        handleCodeChange,
    };
}
