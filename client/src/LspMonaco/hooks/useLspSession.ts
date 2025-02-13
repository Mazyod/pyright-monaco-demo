import { useEffect, useState } from 'react';
import { Diagnostic } from 'vscode-languageserver-types';
import { LspSession, type LspSettings } from '@/LspMonaco/services/LspSession';

interface UseLspSessionProps {
    initialCode: string;
    settings: LspSettings;
}

export function useLspSession({ initialCode, settings }: UseLspSessionProps) {
    const [lspSession, setLspSession] = useState<LspSession>(
        () => new LspSession(initialCode, settings)
    );
    const [isWaitingForDiagnostics, setIsWaitingForDiagnostics] = useState(false);
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const session = new LspSession(initialCode, settings, {
            onWaitingForDiagnostics: setIsWaitingForDiagnostics,
            onDiagnostics: setDiagnostics,
            onError: setError,
        });
        setLspSession(session);

        return () => {
            session.shutdown();
        };
    }, [initialCode, settings]);

    return {
        lspSession,
        isWaitingForDiagnostics,
        diagnostics,
        error,
    };
}
