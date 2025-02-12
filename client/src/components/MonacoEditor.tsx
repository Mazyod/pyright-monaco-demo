/*
 * Copyright (c) Eric Traut
 * Wrapper interface around the monaco editor component. This class
 * handles language server interactions, the display of errors, etc.
 */

import Editor, { useMonaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
    CompletionItem,
    CompletionItemKind,
    Diagnostic,
    DiagnosticSeverity,
    InsertReplaceEdit,
    Range,
    TextDocumentEdit,
} from 'vscode-languageserver-types';
import { LspSession, LspSettings } from '@/services/LspSession';

interface ExtendedCompletionItem extends monaco.languages.CompletionItem {
    originalLspItem: CompletionItem;
    sourceModel: monaco.editor.ITextModel;
}

function isExtendedCompletionItem(
    item: monaco.languages.CompletionItem
): item is ExtendedCompletionItem {
    return 'originalLspItem' in item && 'sourceModel' in item;
}

const options: monaco.editor.IStandaloneEditorConstructionOptions = {
    selectOnLineNumbers: true,
    minimap: { enabled: false },
    fixedOverflowWidgets: true,
    tabCompletion: 'on',
    hover: { enabled: true },
    scrollBeyondLastLine: false,
    autoClosingOvertype: 'always',
    autoIndent: 'full',
    // The default settings prefer "Menlo", but "Monaco" looks better
    // for our purposes. Swap the order so Monaco is used if available.
    fontFamily: 'Monaco, Menlo, "Courier New", monospace',
    showUnused: true,
    wordBasedSuggestions: 'off',
    overviewRulerLanes: 0,
    renderWhitespace: 'none',
    guides: {
        indentation: false,
    },
    renderLineHighlight: 'none',
};

interface RegisteredModel {
    model: monaco.editor.ITextModel;
    lspSession: LspSession;
}

export interface MonacoEditorProps {
    initialCode: string;
    settings: LspSettings;

    // callbacks
    onUpdateCode: (code: string) => void;
    onWaitingForDiagnostics: (isWaiting: boolean) => void;
    onDiagnostics: (diagnostics: Diagnostic[]) => void;
    onError: (message: string) => void;
}

export interface MonacoEditorRef {
    focus: () => void;
    selectRange: (range: Range) => void;
}

export const MonacoEditor = forwardRef(function MonacoEditor(
    props: MonacoEditorProps,
    ref: ForwardedRef<MonacoEditorRef>
) {
    const { initialCode, settings, ...callbacks } = props;

    const monaco = useMonaco();
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

    const [lspSession, setLspSession] = useState<LspSession>(
        () => new LspSession(initialCode, settings)
    );
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

    // establish an LspSession
    useEffect(() => {
        const session = new LspSession(initialCode, settings, {
            onWaitingForDiagnostics: (isWaiting) => {
                callbacks.onWaitingForDiagnostics(isWaiting);
            },
            onDiagnostics: (diag) => {
                setDiagnostics(diag);
                callbacks.onDiagnostics(diag);
            },
            onError: (message) => {
                callbacks.onError(message);
            },
        });
        setLspSession(session);

        return () => {
            // can't await in a cleanup function
            session.shutdown();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCode, settings]);

    // Capture the editor and monaco instance on mount
    function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
        editorRef.current = editor;

        editor.focus();
    }

    // Expose imperative methods for editor interaction
    useImperativeHandle(ref, () => {
        return {
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
    });

    // Configure Monaco
    useEffect(() => {
        if (!monaco) {
            return;
        }

        const disposables: monaco.IDisposable[] = [];
        disposables.push(
            monaco.languages.registerHoverProvider('python', {
                provideHover: handleHoverRequest,
            }),
            monaco.languages.registerSignatureHelpProvider('python', {
                provideSignatureHelp: handleSignatureHelpRequest,
                signatureHelpTriggerCharacters: ['(', ','],
            }),
            monaco.languages.registerCompletionItemProvider('python', {
                provideCompletionItems: handleProvideCompletionRequest,
                resolveCompletionItem: handleResolveCompletionRequest,
                triggerCharacters: ['.', '[', '"', "'"],
            }),
            monaco.languages.registerRenameProvider('python', {
                provideRenameEdits: handleRenameRequest,
            })
        );

        return () => disposables.forEach((d) => d.dispose());
    }, [monaco]);

    useEffect(() => {
        if (monaco && editorRef?.current) {
            const model = editorRef.current.getModel();
            if (model) {
                const markers = convertDiagnostics(diagnostics);
                monaco.editor.setModelMarkers(model, 'pyright', markers);
                // Register the editor and the LSP Client so they can be accessed
                // by the hover provider, etc.
                registerModel(model, lspSession);
            }
        }
    }, [monaco, diagnostics, lspSession]);

    // TODO: useDebouncedCallback to avoid spamming the server
    const onCodeChange = (value?: string) => {
        lspSession.updateCode(value ?? '');
        return value && props.onUpdateCode(value);
    };

    return (
        <Editor
            options={options}
            language={'python'}
            defaultValue={initialCode}
            theme="light"
            onChange={onCodeChange}
            onMount={handleEditorDidMount}
        />
    );
});

// Register an instantiated text model (which backs a monaco editor
// instance and its associated LSP client. This is a bit of a hack,
// but it's required to support the various providers (e.g. hover).
const registeredModels: RegisteredModel[] = [];

function registerModel(model: monaco.editor.ITextModel, lspSession: LspSession) {
    if (!registeredModels.find((m) => m.model === model)) {
        registeredModels.push({ model, lspSession });
    }
}

function getLspClientForModel(model: monaco.editor.ITextModel): LspSession | undefined {
    return registeredModels.find((m) => m.model === model)?.lspSession;
}

// #region - Monaco Request Handlers

async function handleHoverRequest(
    model: monaco.editor.ITextModel,
    position: monaco.Position
): Promise<monaco.languages.Hover | null> {
    const lspSession = getLspClientForModel(model);
    if (!lspSession) {
        return null;
    }

    try {
        const hoverInfo = await lspSession.getHoverForPosition(model.getValue(), {
            line: position.lineNumber - 1,
            character: position.column - 1,
        });

        return {
            contents: [
                {
                    value: hoverInfo.contents.value,
                },
            ],
            range: convertRange(hoverInfo.range),
        };
    } catch {
        return null;
    }
}

async function handleRenameRequest(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    newName: string
): Promise<monaco.languages.WorkspaceEdit | null> {
    const lspSession = getLspClientForModel(model);
    if (!lspSession) {
        return null;
    }

    try {
        const renameEdits = await lspSession.getRenameEditsForPosition(
            model.getValue(),
            {
                line: position.lineNumber - 1,
                character: position.column - 1,
            },
            newName
        );

        const edits: monaco.languages.IWorkspaceTextEdit[] = [];

        if (renameEdits?.documentChanges) {
            for (const docChange of renameEdits.documentChanges) {
                if (TextDocumentEdit.is(docChange)) {
                    for (const textEdit of docChange.edits) {
                        edits.push({
                            resource: model.uri,
                            versionId: undefined,
                            textEdit: {
                                range: convertRange(textEdit.range),
                                text: textEdit.newText,
                            },
                        });
                    }
                }
            }
        }

        return { edits };
    } catch {
        return null;
    }
}

async function handleSignatureHelpRequest(
    model: monaco.editor.ITextModel,
    position: monaco.Position
): Promise<monaco.languages.SignatureHelpResult | null> {
    const lspSession = getLspClientForModel(model);
    if (!lspSession) {
        return null;
    }

    try {
        const sigInfo = await lspSession.getSignatureHelpForPosition(model.getValue(), {
            line: position.lineNumber - 1,
            character: position.column - 1,
        });

        return {
            value: {
                signatures: sigInfo.signatures.map((sig) => {
                    return {
                        label: sig.label,
                        documentation: sig.documentation,
                        parameters: sig.parameters ?? [],
                        activeParameter: sig.activeParameter,
                    };
                }),
                activeSignature: sigInfo.activeSignature ?? 0,
                activeParameter: sigInfo.activeParameter ?? 0,
            },
            dispose: () => {},
        };
    } catch {
        return null;
    }
}

async function handleProvideCompletionRequest(
    model: monaco.editor.ITextModel,
    position: monaco.Position
): Promise<monaco.languages.CompletionList | null> {
    const lspSession = getLspClientForModel(model);
    if (!lspSession) {
        return null;
    }

    try {
        const completionInfo = await lspSession.getCompletionForPosition(model.getValue(), {
            line: position.lineNumber - 1,
            character: position.column - 1,
        });

        return {
            suggestions: completionInfo.items.map((item) => {
                return convertCompletionItem(item, model);
            }),
            incomplete: completionInfo.isIncomplete,
            dispose: () => {},
        };
    } catch {
        return null;
    }
}

async function handleResolveCompletionRequest(
    item: monaco.languages.CompletionItem
): Promise<monaco.languages.CompletionItem | null> {
    if (!isExtendedCompletionItem(item)) {
        return null;
    }

    const lspSession = getLspClientForModel(item.sourceModel);
    if (!lspSession) {
        return null;
    }

    try {
        const result = await lspSession.resolveCompletionItem(item.originalLspItem);
        return convertCompletionItem(result, item.sourceModel);
    } catch {
        return null;
    }
}

// #endregion

// #region - Type Conversion

function convertDiagnostics(diagnostics: Diagnostic[]): monaco.editor.IMarkerData[] {
    return diagnostics.map((diag) => {
        return {
            ...convertRange(diag.range),
            severity: convertSeverity(diag.severity ?? DiagnosticSeverity.Error),
            message: diag.message,
            tags: diag.tags,
        };
    });
}

function convertSeverity(severity: DiagnosticSeverity): monaco.MarkerSeverity {
    switch (severity) {
        case DiagnosticSeverity.Error:
            return monaco.MarkerSeverity.Error;

        case DiagnosticSeverity.Warning:
            return monaco.MarkerSeverity.Warning;

        case DiagnosticSeverity.Information:
            return monaco.MarkerSeverity.Info;

        case DiagnosticSeverity.Hint:
            return monaco.MarkerSeverity.Hint;

        default:
            return monaco.MarkerSeverity.Error;
    }
}

function convertRange(range: Range): monaco.IRange {
    return {
        startLineNumber: range.start.line + 1,
        startColumn: range.start.character + 1,
        endLineNumber: range.end.line + 1,
        endColumn: range.end.character + 1,
    };
}

function convertCompletionItem(
    item: CompletionItem,
    model: monaco.editor.ITextModel
): ExtendedCompletionItem {
    let insertText = item.label;
    let range: monaco.IRange | monaco.languages.CompletionItemRanges | undefined;
    if (item.textEdit) {
        insertText = item.textEdit.newText;
        if (InsertReplaceEdit.is(item.textEdit)) {
            range = {
                insert: convertRange(item.textEdit.insert),
                replace: convertRange(item.textEdit.replace),
            };
        } else {
            range = convertRange(item.textEdit.range);
        }
    }

    let additionalTextEdits: { range: monaco.IRange; text: string }[] | undefined;
    if (item.additionalTextEdits) {
        additionalTextEdits = item.additionalTextEdits.map((edit) => {
            return {
                range: convertRange(edit.range),
                text: edit.newText,
            };
        });
    }

    const converted: monaco.languages.CompletionItem = {
        label: item.label,
        kind: convertCompletionItemKind(item.kind),
        tags: item.tags,
        detail: item.detail,
        documentation: item.documentation,
        sortText: item.sortText,
        filterText: item.filterText,
        preselect: item.preselect,
        insertText,
        additionalTextEdits,
        range: range!, // ! FIXME: figure out the default value
    };

    return {
        ...converted,
        originalLspItem: item,
        sourceModel: model,
    };
}

function convertCompletionItemKind(
    itemKind: CompletionItemKind | undefined
): monaco.languages.CompletionItemKind {
    switch (itemKind) {
        case CompletionItemKind.Constant:
            return monaco.languages.CompletionItemKind.Constant;

        case CompletionItemKind.Variable:
            return monaco.languages.CompletionItemKind.Variable;

        case CompletionItemKind.Function:
            return monaco.languages.CompletionItemKind.Function;

        case CompletionItemKind.Field:
            return monaco.languages.CompletionItemKind.Field;

        case CompletionItemKind.Keyword:
            return monaco.languages.CompletionItemKind.Keyword;

        default:
            return monaco.languages.CompletionItemKind.Reference;
    }
}

// #endregion
