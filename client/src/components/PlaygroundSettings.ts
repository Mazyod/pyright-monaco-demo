/*
 * Copyright (c) Eric Traut
 * Interface that defines the settings for the pyright playground.
 */

import type { LspSettings } from "@/LspMonaco/services/LspSession";

export interface PlaygroundState {
  code: string;
  settings: LspSettings;
}
