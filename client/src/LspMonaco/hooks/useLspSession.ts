import { useEffect, useState } from 'react';
import { Diagnostic } from 'vscode-languageserver-types';
import { type LspConfig, LspSession } from '../services/LspSession';

type UseLspSessionProps = LspConfig;

export function useLspSession(props: UseLspSessionProps) {
    const [lspSession, setLspSession] = useState<LspSession>(() => new LspSession(props));
    const [isWaitingForDiagnostics, setIsWaitingForDiagnostics] = useState(false);
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const session = new LspSession(props, {
            onWaitingForDiagnostics: setIsWaitingForDiagnostics,
            onDiagnostics: setDiagnostics,
            onError: setError,
        });
        setLspSession(session);

        return () => {
            session.shutdown();
        };
    }, [props]); // NOTE: props are memoized, so this should be fine

    return {
        lspSession,
        isWaitingForDiagnostics,
        diagnostics,
        error,
    };
}
