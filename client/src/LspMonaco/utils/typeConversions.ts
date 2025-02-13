import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {
    CompletionItem,
    CompletionItemKind,
    Diagnostic,
    DiagnosticSeverity,
    InsertReplaceEdit,
    Range,
} from 'vscode-languageserver-types';

export interface ExtendedCompletionItem extends monaco.languages.CompletionItem {
    originalLspItem: CompletionItem;
    sourceModel: monaco.editor.ITextModel;
}

export function isExtendedCompletionItem(
    item: monaco.languages.CompletionItem
): item is ExtendedCompletionItem {
    return 'originalLspItem' in item && 'sourceModel' in item;
}

export function convertDiagnostics(diagnostics: Diagnostic[]): monaco.editor.IMarkerData[] {
    return diagnostics.map((diag) => {
        return {
            ...convertRange(diag.range),
            severity: convertSeverity(diag.severity ?? DiagnosticSeverity.Error),
            message: diag.message,
            tags: diag.tags,
        };
    });
}

export function convertSeverity(severity: DiagnosticSeverity): monaco.MarkerSeverity {
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

export function convertRange(range: Range): monaco.IRange {
    return {
        startLineNumber: range.start.line + 1,
        startColumn: range.start.character + 1,
        endLineNumber: range.end.line + 1,
        endColumn: range.end.character + 1,
    };
}

export function convertCompletionItem(
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

export function convertCompletionItemKind(
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
