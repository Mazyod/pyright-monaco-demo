/*
 * Copyright (c) Eric Traut
 * Interface that defines the settings for the pyright playground.
 */

import type { PyrightSettings } from './MonacoEditor';

export interface PlaygroundState {
    code: string;
    settings: PyrightSettings;
}
