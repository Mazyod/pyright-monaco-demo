/*
 * Copyright (c) Eric Traut
 * Utility routines for reading and updating the URL in the browser.
 */

import * as lzString from 'lz-string';
import { PlaygroundState } from './PlaygroundSettings';
import { configSettingsMap } from './PyrightConfigSettings';

export function getStateFromUrl(): PlaygroundState | undefined {
    const url = new URL(window.location.href);

    const compressedCode = url.searchParams.get('code');
    if (!compressedCode) {
        return undefined;
    }
    const code = lzString.decompressFromEncodedURIComponent(compressedCode);
    if (!code) {
        return undefined;
    }

    const state: PlaygroundState = {
        code,
        settings: {
            configOverrides: {},
        },
    };

    url.searchParams.forEach((value, key) => {
        switch (key) {
            case 'strict': {
                if (Boolean(value)) {
                    state.settings.strictMode = true;
                }
                break;
            }

            case 'pyrightVersion': {
                state.settings.pyrightVersion = value;
                break;
            }

            case 'pythonVersion': {
                state.settings.pythonVersion = value;
                break;
            }

            case 'pythonPlatform': {
                state.settings.pythonPlatform = value;
                break;
            }

            case 'locale': {
                state.settings.locale = value;
                break;
            }

            default: {
                if (configSettingsMap.has(key)) {
                    state.settings.configOverrides[key] = Boolean(value);
                }
            }
        }
    });

    return state;
}
