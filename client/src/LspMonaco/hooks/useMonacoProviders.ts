import { useEffect } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { TextDocumentEdit } from "vscode-languageserver-types";
import type { LspSession } from "../services/LspSession";
import {
  convertCompletionItem,
  convertRange,
  isExtendedCompletionItem,
} from "../utils/typeConversions";
import { useMonaco } from "@monaco-editor/react";

const handleHoverRequest =
  (lspSession: LspSession) =>
  async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): Promise<monaco.languages.Hover | null> => {
    try {
      const hoverInfo = await lspSession.getHoverForPosition(model.getValue(), {
        line: position.lineNumber - 1,
        character: position.column - 1,
      });

      return {
        contents: [{ value: hoverInfo.contents.value }],
        range: convertRange(hoverInfo.range),
      };
    } catch {
      return null;
    }
  };

const handleSemanticTokensRequest = (lspSession: LspSession) => ({
  getLegend: () => ({
    tokenTypes: [
      "variable",
      "parameter",
      "function",
      "class",
      "type",
      "decorator",
      "enum",
      "interface",
      "typeParameter",
      "namespace",
    ],
    tokenModifiers: ["definition", "async", "readonly", "static", "local"],
  }),
  provideDocumentSemanticTokens: async (model: monaco.editor.ITextModel) => {
    try {
      const tokens = await lspSession.getSemanticTokens(model.getValue());
      return {
        data: new Uint32Array(tokens.data),
        resultId: tokens.resultId,
      };
    } catch (error) {
      console.error("Failed to get semantic tokens:", error);
      return null;
    }
  },
  releaseDocumentSemanticTokens: () => {},
});

const handleRenameRequest =
  (lspSession: LspSession) =>
  async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    newName: string,
  ): Promise<monaco.languages.WorkspaceEdit | null> => {
    try {
      const renameEdits = await lspSession.getRenameEditsForPosition(
        model.getValue(),
        {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
        newName,
      );

      const edits: monaco.languages.IWorkspaceTextEdit[] =
        renameEdits?.documentChanges
          ?.filter(TextDocumentEdit.is)
          .flatMap((docChange) => docChange.edits)
          .map((textEdit) => ({
            resource: model.uri,
            versionId: undefined,
            textEdit: {
              range: convertRange(textEdit.range),
              text: textEdit.newText,
            },
          })) ?? [];

      return { edits };
    } catch {
      return null;
    }
  };

const handleSignatureHelpRequest =
  (lspSession: LspSession) =>
  async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): Promise<monaco.languages.SignatureHelpResult | null> => {
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
  };

const handleProvideCompletionRequest =
  (lspSession: LspSession) =>
  async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): Promise<monaco.languages.CompletionList | null> => {
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
  };

const handleResolveCompletionRequest =
  (lspSession: LspSession) =>
  async (
    item: monaco.languages.CompletionItem,
  ): Promise<monaco.languages.CompletionItem | null> => {
    if (!isExtendedCompletionItem(item)) {
      return null;
    }

    try {
      const result = await lspSession.resolveCompletionItem(item.originalLspItem);
      return convertCompletionItem(result, item.sourceModel);
    } catch {
      return null;
    }
  };

interface UseMonacoProvidersProps {
  model: monaco.editor.ITextModel | null;
  lspSession: LspSession;
}

export function useMonacoProviders({ model, lspSession }: UseMonacoProvidersProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco || !model) {
      return;
    }

    const disposables: monaco.IDisposable[] = [];
    disposables.push(
      monaco.languages.registerHoverProvider("python", {
        provideHover: handleHoverRequest(lspSession),
      }),
      monaco.languages.registerSignatureHelpProvider("python", {
        provideSignatureHelp: handleSignatureHelpRequest(lspSession),
        signatureHelpTriggerCharacters: ["(", ","],
      }),
      monaco.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: handleProvideCompletionRequest(lspSession),
        resolveCompletionItem: handleResolveCompletionRequest(lspSession),
        triggerCharacters: [".", "[", '"', "'"],
      }),
      monaco.languages.registerRenameProvider("python", {
        provideRenameEdits: handleRenameRequest(lspSession),
      }),
      monaco.languages.registerDocumentSemanticTokensProvider(
        "python",
        handleSemanticTokensRequest(lspSession),
      ),
    );

    return () => disposables.forEach((d) => d.dispose());
  }, [monaco, model, lspSession]);
}
