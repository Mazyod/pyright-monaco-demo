import { useEffect, useState } from "react";
import type { Diagnostic } from "vscode-languageserver-types";
import { type LspConfig, LspSession } from "../services/LspSession";

type UseLspSessionProps = LspConfig;

export function useLspSession(lspConfig: UseLspSessionProps) {
  const [lspSession, setLspSession] = useState<LspSession>(() => new LspSession(lspConfig));
  const [isWaitingForDiagnostics, setIsWaitingForDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = new LspSession(lspConfig, {
      onWaitingForDiagnostics: setIsWaitingForDiagnostics,
      onDiagnostics: setDiagnostics,
      onError: setError,
    });
    setLspSession(session);

    return () => {
      session.shutdown();
    };
  }, [lspConfig]); // NOTE: lspConfig must be a stable reference!

  return {
    lspSession,
    isWaitingForDiagnostics,
    diagnostics,
    error,
  };
}
