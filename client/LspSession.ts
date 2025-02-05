/*
 * Copyright (c) Eric Traut
 * Handles the state associated with a remote language server session.
 */

import {
    CompletionItem,
    CompletionList,
    Diagnostic,
    Position,
    Range,
    SignatureHelp,
    WorkspaceEdit,
} from 'vscode-languageserver-types';
import { endpointRequest } from './EndpointUtils';
import { PlaygroundSettings } from './PlaygroundSettings';

export interface HoverInfo {
    contents: {
        kind: string;
        value: string;
    };
    range: Range;
}

export interface ServerStatus {
    pyrightVersions: string[];
}

// Number of attempts to create a new session before giving up.
const maxErrorCount = 4;

let appServerApiAddressPrefix = 'https://pyright-playground.azurewebsites.net/api/';

// TODO - this is for local debugging in the browser. Remove for
// React Native code.
const currentUrl = new URL(window.location.href);
if (currentUrl.hostname === 'localhost') {
    appServerApiAddressPrefix = 'http://localhost:3000/api/';
}

export class LspSession {
    private _sessionId: string | undefined;
    private _settings: PlaygroundSettings | undefined;
    private _initialCode = '';

    updateSettings(settings: PlaygroundSettings) {
        this._settings = settings;

        // Force the current session to close so we can
        // create a new one with the updated settings.
        this._closeSession();
    }

    updateInitialCode(text: string) {
        // When creating a new session, we can send the initial
        // code to the server to speed up initialization.
        this._initialCode = text;
    }

    static async getPyrightServiceStatus(): Promise<ServerStatus> {
        const endpoint = appServerApiAddressPrefix + `status`;
        const data = await endpointRequest('GET', endpoint);
        return { pyrightVersions: data.pyrightVersions };
    }

    async getDiagnostics(code: string): Promise<Diagnostic[]> {
        return this._doWithSession<Diagnostic[]>(async (sessionId) => {
            const endpoint = appServerApiAddressPrefix + `session/${sessionId}/diagnostics`;
            const data = await endpointRequest('POST', endpoint, { code });
            return data.diagnostics;
        });
    }

    async getHoverForPosition(code: string, position: Position): Promise<HoverInfo | undefined> {
        return this._doWithSession<HoverInfo>(async (sessionId) => {
            const endpoint = appServerApiAddressPrefix + `session/${sessionId}/hover`;
            const data = await endpointRequest('POST', endpoint, { code, position });
            return data.hover;
        });
    }

    async getRenameEditsForPosition(
        code: string,
        position: Position,
        newName: string
    ): Promise<WorkspaceEdit | undefined> {
        return this._doWithSession<WorkspaceEdit>(async (sessionId) => {
            const endpoint = appServerApiAddressPrefix + `session/${sessionId}/rename`;
            const data = await endpointRequest('POST', endpoint, { code, position, newName });
            return data.edits;
        });
    }

    async getSignatureHelpForPosition(
        code: string,
        position: Position
    ): Promise<SignatureHelp | undefined> {
        return this._doWithSession<SignatureHelp>(async (sessionId) => {
            const endpoint = appServerApiAddressPrefix + `session/${sessionId}/signature`;
            const data = await endpointRequest('POST', endpoint, { code, position });
            return data.signatureHelp;
        });
    }

    async getCompletionForPosition(
        code: string,
        position: Position
    ): Promise<CompletionList | undefined> {
        return this._doWithSession<CompletionList>(async (sessionId) => {
            const endpoint = appServerApiAddressPrefix + `session/${sessionId}/completion`;
            const data = await endpointRequest('POST', endpoint, { code, position });
            return data.completionList;
        });
    }

    async resolveCompletionItem(item: CompletionItem): Promise<CompletionItem | undefined> {
        return this._doWithSession<CompletionItem>(async (sessionId) => {
            const endpoint = appServerApiAddressPrefix + `session/${sessionId}/completionresolve`;
            const data = await endpointRequest('POST', endpoint, { completionItem: item });
            return data.completionItem;
        });
    }

    // Establishes a session if necessary and calls the callback to perform some
    // work. If the session cannot be established or the call fails, an attempt
    // is made to retry the operation with exponential backoff.
    private async _doWithSession<T>(callback: (sessionId: string) => Promise<T>): Promise<T> {
        let errorCount = 0;
        let backoffDelay = 100;

        while (true) {
            if (errorCount > maxErrorCount) {
                throw new Error('Could not connect to service');
            }

            try {
                const sessionId = await this._createSession();
                const result = await callback(sessionId);

                return result;
            } catch (err) {
                // Throw away the current session.
                this._sessionId = undefined;
                errorCount++;
            }

            await this._sleep(backoffDelay);

            // Exponentially back off.
            backoffDelay *= 2;
        }
    }

    private _sleep(sleepTimeInMs: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, sleepTimeInMs));
    }

    private async _createSession(): Promise<string> {
        // If there's already a valid session ID, use it.
        if (this._sessionId) {
            return Promise.resolve(this._sessionId);
        }

        const sessionOptions: any = {};
        if (this._settings) {
            if (this._settings.pyrightVersion) {
                sessionOptions.pyrightVersion = this._settings.pyrightVersion;
            }

            if (this._settings.pythonVersion) {
                sessionOptions.pythonVersion = this._settings.pythonVersion;
            }

            if (this._settings.pythonPlatform) {
                sessionOptions.pythonPlatform = this._settings.pythonPlatform;
            }

            if (this._settings.strictMode) {
                sessionOptions.typeCheckingMode = 'strict';
            }

            sessionOptions.code = this._initialCode;
            sessionOptions.configOverrides = { ...this._settings.configOverrides };
            sessionOptions.locale = this._settings.locale ?? navigator.language;
        }

        const endpoint = appServerApiAddressPrefix + `session`;
        const data = await endpointRequest('POST', endpoint, sessionOptions);
        this._sessionId = data.sessionId;
        return data.sessionId;
    }

    private async _closeSession(): Promise<void> {
        const sessionId = this._sessionId;
        if (!sessionId) {
            return;
        }

        // Immediately discard the old session ID.
        this._sessionId = undefined;

        const endpoint = appServerApiAddressPrefix + `session/${sessionId}`;
        await endpointRequest('DELETE', endpoint);
    }
}
