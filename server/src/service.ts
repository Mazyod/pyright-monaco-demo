/*
 * Copyright (c) Eric Traut
 * Implements primary API endpoints for the seb service.
 */

import { Request, Response } from 'express';
import * as SessionManager from './sessionManager';
import { Session, SessionOptions } from './session';
import { CompletionItem } from 'vscode-languageserver';
import { logger } from './logging';
import { z } from 'zod';

// Zod schemas for validation
const positionSchema = z.object({
    line: z.number(),
    character: z.number(),
});

const codeWithOptionsSchema = z.object({
    code: z.string(),
    position: positionSchema.optional(),
    newName: z.string().optional(),
});

const sessionOptionsSchema = z.object({
    typeCheckingMode: z.literal('strict').optional(),
    configOverrides: z.record(z.boolean()).optional(),
    code: z.string().optional(),
});

const completionItemSchema = z.object({
    completionItem: z
        .object({
            label: z.string(),
        })
        .passthrough(),
});

type CodeWithOptions = z.infer<typeof codeWithOptionsSchema>;

// Creates a new language server session and returns its ID.
export function createSession(req: Request, res: Response) {
    const sessionOptions = validateSessionOptions(req, res);
    if (!sessionOptions) {
        return;
    }

    SessionManager.createSession(sessionOptions)
        .then((sessionId) => {
            res.status(200).json({ sessionId });
        })
        .catch((err) => {
            logger.error(`createNewSession returning a 500: ${err}`);
            res.status(500).json({ message: err || 'An unexpected error occurred' });
        });
}

export function closeSession(req: Request, res: Response) {
    const session = validateSession(req, res);
    if (!session) {
        return;
    }

    SessionManager.recycleSession(session.id);
    res.status(200).json({});
}

// Given some Python code and associated options, returns
// a list of diagnostics.
export function getDiagnostics(req: Request, res: Response) {
    const session = validateSession(req, res);
    const langClient = session?.langClient;
    if (!langClient) {
        return;
    }

    const codeWithOptions = validateCodeWithOptions(req, res);
    if (!codeWithOptions) {
        return;
    }

    langClient
        .getDiagnostics(codeWithOptions.code)
        .then((diagnostics) => {
            res.status(200).json({ diagnostics });
        })
        .catch((err) => {
            logger.error(`getDiagnostics returning a 500: ${err}`);
            res.status(500).json({ message: err || 'An unexpected error occurred' });
        });
}

// Given some Python code and a position within that code,
// returns hover information.
export function getHoverInfo(req: Request, res: Response) {
    const session = validateSession(req, res);
    const langClient = session?.langClient;
    if (!langClient) {
        return;
    }

    const codeWithOptions = validateCodeWithOptions(req, res, ['position']);
    if (!codeWithOptions) {
        return;
    }

    langClient
        .getHoverInfo(codeWithOptions.code, codeWithOptions.position!)
        .then((hover) => {
            res.status(200).json(hover);
        })
        .catch((err) => {
            logger.error(`getHoverInfo returning a 500: ${err}`);
            res.status(500).json({ message: err || 'An unexpected error occurred' });
        });
}

// Given some Python code and a position within that code and a new name,
// returns a list of edits to effect a semantic rename.
export function getRenameEdits(req: Request, res: Response) {
    const session = validateSession(req, res);
    const langClient = session?.langClient;
    if (!langClient) {
        return;
    }

    const codeWithOptions = validateCodeWithOptions(req, res, ['position', 'newName']);
    if (!codeWithOptions) {
        return;
    }

    langClient
        .getRenameEdits(
            codeWithOptions.code,
            codeWithOptions.position!,
            codeWithOptions.newName ?? ''
        )
        .then((edits) => {
            res.status(200).json(edits);
        })
        .catch((err) => {
            logger.error(`getRenameEdits returning a 500: ${err}`);
            res.status(500).json({ message: err || 'An unexpected error occurred' });
        });
}

export function getSignatureHelp(req: Request, res: Response) {
    const session = validateSession(req, res);
    const langClient = session?.langClient;
    if (!langClient) {
        return;
    }

    const codeWithOptions = validateCodeWithOptions(req, res, ['position']);
    if (!codeWithOptions) {
        return;
    }

    langClient
        .getSignatureHelp(codeWithOptions.code, codeWithOptions.position!)
        .then((signatureHelp) => {
            res.status(200).json(signatureHelp);
        })
        .catch((err) => {
            logger.error(`getSignatureHelp returning a 500: ${err}`);
            res.status(500).json({ message: err || 'An unexpected error occurred' });
        });
}

export function getCompletion(req: Request, res: Response) {
    const session = validateSession(req, res);
    const langClient = session?.langClient;
    if (!langClient) {
        return;
    }

    const codeWithOptions = validateCodeWithOptions(req, res, ['position']);
    if (!codeWithOptions) {
        return;
    }

    langClient
        .getCompletion(codeWithOptions.code, codeWithOptions.position!)
        .then((completionList) => {
            res.status(200).json(completionList);
        })
        .catch((err) => {
            logger.error(`getCompletion returning a 500: ${err}`);
            res.status(500).json({ message: err || 'An unexpected error occurred' });
        });
}

export function resolveCompletion(req: Request, res: Response) {
    const session = validateSession(req, res);
    const langClient = session?.langClient;
    if (!langClient) {
        return;
    }

    const result = completionItemSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ message: result.error.message });
        return;
    }

    const completionItem: CompletionItem = result.data.completionItem;
    langClient
        .resolveCompletion(completionItem)
        .then((completionItem) => {
            res.status(200).json(completionItem);
        })
        .catch((err) => {
            logger.error(`resolveCompletion returning a 500: ${err}`);
            res.status(500).json({ message: err || 'An unexpected error occurred' });
        });
}

function validateSessionOptions(req: Request, res: Response): SessionOptions | undefined {
    const result = sessionOptionsSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ message: result.error.message });
        return undefined;
    }

    return result.data;
}

function validateCodeWithOptions(
    req: Request,
    res: Response,
    requiredOptions: ('position' | 'newName')[] = []
): CodeWithOptions | undefined {
    const result = codeWithOptionsSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ message: result.error.message });
        return undefined;
    }

    // Check required options after parsing
    const missingFields = requiredOptions.filter((option) => {
        if (option === 'position') return !result.data.position;
        if (option === 'newName') return !result.data.newName;
        return false;
    });

    if (missingFields.length > 0) {
        res.status(400).json({
            message: `Missing required fields: ${missingFields.join(', ')}`,
        });
        return undefined;
    }

    return result.data;
}

function validateSession(req: Request, res: Response): Session | undefined {
    const sessionId = req.params.sid;
    if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ message: 'Invalid session ID' });
        return undefined;
    }

    const session = SessionManager.getSessionById(sessionId);
    if (!session?.langClient) {
        res.status(400).json({ message: 'Unknown session ID' });
        return undefined;
    }

    return session;
}
