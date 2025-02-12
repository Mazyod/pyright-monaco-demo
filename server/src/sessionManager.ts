/*
 * Copyright (c) Eric Traut
 * Manages a collection of playground sessions. It tracks the set of active
 * sessions and manages their lifetimes.
 */

import * as fs from 'fs';
import { fork } from 'node:child_process';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { LspClient } from './lspClient';
import { Session, SessionId, SessionOptions } from './session';
import { logger } from './logging';

// Map of active sessions indexed by ID
const activeSessions = new Map<SessionId, Session>();

// List of inactive sessions that can be reused.
const inactiveSessions: Session[] = [];

// Maximum time a session can be idle before it is closed.
const maxSessionLifetime = 1 * 60 * 1000; // 1 minute

// If the caller doesn't specify the pythonVersion or pythonPlatform,
// default to these. Otherwise the language server will pick these
// based on whatever version of Python happens to be installed in
// the container it's running in.
const defaultPythonVersion = '3.13';
const defaultPythonPlatform = 'All';

// Active lifetime timer for harvesting old sessions.
let lifetimeTimer: NodeJS.Timeout | undefined;

const maxInactiveSessionCount = 64;

export function getSessionById(id: SessionId) {
    const session = activeSessions.get(id);

    if (session) {
        session.lastAccessTime = Date.now();
    }

    return session;
}

// Allocate a new session and return its ID.
export async function createSession(
    sessionOptions: SessionOptions | undefined
): Promise<SessionId> {
    scheduleSessionLifetimeTimer();

    // See if there are any inactive sessions that can be reused.
    const inactiveSession = getCompatibleInactiveSession(sessionOptions);
    if (inactiveSession) {
        return restartSession(inactiveSession, sessionOptions);
    }

    return startSession('', sessionOptions);
}

// Places an existing session into an inactive pool that can be used
// for future requests.
export function recycleSession(sessionId: SessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) {
        return;
    }

    session.langClient?.cancelRequests();

    activeSessions.delete(sessionId);
    inactiveSessions.push(session);

    if (inactiveSessions.length > maxInactiveSessionCount) {
        const session = inactiveSessions.shift();
        if (session) {
            terminateSession(session);
        }
    }

    logger.info(`Recycling session (currently ${inactiveSessions.length} in inactive queue)`);
}

function startSession(binaryDirPath: string, sessionOptions?: SessionOptions): Promise<SessionId> {
    return new Promise<SessionId>((resolve, reject) => {
        // Launch a new instance of the language server in another process.
        logger.info(`Spawning new pyright language server from ${binaryDirPath}`);
        const binaryPath = path.join(
            process.cwd(),
            binaryDirPath,
            './node_modules/pyright/langserver.index.js'
        );

        // Create a temp directory where we can store a synthesized config file.
        const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'pyright_playground'));

        // Synthesize a "pyrightconfig.json" file from the session options and write
        // it to the temp directory so the language server can find it.
        synthesizePyrightConfigFile(tempDirPath, sessionOptions);

        // Synthesize an empty venv directory so that pyright doesn't try to
        // resolve imports using the default Python environment installed on
        // the server's docker container.
        synthesizeVenvDirectory(tempDirPath);

        const env = { ...process.env };

        const langServerProcess = fork(
            binaryPath,
            ['--node-ipc', `--clientProcessId=${process.pid.toString()}`],
            {
                cwd: tempDirPath,
                silent: true,
                env,
            }
        );

        // Create a new UUID for a session ID.
        const sessionId = uuid();

        // Create a new session object.
        const session: Session = {
            id: sessionId,
            lastAccessTime: Date.now(),
            tempDirPath,
            options: sessionOptions,
        };

        // Start tracking the session.
        activeSessions.set(sessionId, session);

        langServerProcess.on('spawn', () => {
            logger.info(`Pyright language server started`);
            session.langServerProcess = langServerProcess;
            session.langClient = new LspClient(langServerProcess);

            session.langClient
                .initialize(tempDirPath, sessionOptions)
                .then(() => {
                    if (sessionOptions?.code !== undefined) {
                        if (session.langClient) {
                            // Warm up the service by sending it an empty file.
                            logger.info('Sending initial code to warm up service');

                            session.langClient
                                .getDiagnostics(sessionOptions.code)
                                .then(() => {
                                    // Throw away results.
                                    logger.info('Received diagnostics from warm up');
                                })
                                .catch((err) => {
                                    // Throw away error;
                                });
                        }
                    }

                    resolve(sessionId);
                })
                .catch((err) => {
                    reject(`Failed to start pyright language server connection`);
                    closeSession(sessionId);
                });
        });

        langServerProcess.on('error', (err) => {
            // Errors can be reported for a variety of reasons even after
            // the language server has been started.
            if (!session.langServerProcess) {
                logger.error(`Pyright language server failed to start: ${err.message}`);
                reject(`Failed to spawn pyright language server instance`);
            }

            closeSession(sessionId);
        });

        langServerProcess.on('exit', (code) => {
            logger.info(`Pyright language server exited with code ${code}`);
            closeSession(sessionId);
        });

        langServerProcess.on('close', (code) => {
            logger.info(`Pyright language server closed with code ${code}`);
            closeSession(sessionId);
        });
    });
}

function restartSession(session: Session, sessionOptions?: SessionOptions): SessionId {
    logger.info(`Restarting inactive session ${session.id}`);

    session.lastAccessTime = Date.now();
    session.options = sessionOptions;

    // Start tracking the session.
    activeSessions.set(session.id, session);

    if (session.langClient && sessionOptions?.code) {
        // Send the initial code to warm up the service.
        session.langClient.getDiagnostics(sessionOptions.code).catch((err) => {
            // Throw away error;
        });
    }

    return session.id;
}

// Attempts to close the session and cleans up its resources. It
// silently fails if it cannot.
function closeSession(sessionId: SessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) {
        return;
    }

    session.langClient?.cancelRequests();

    activeSessions.delete(sessionId);

    terminateSession(session);
}

function terminateInactiveSessions() {
    // Pop all inactive sessions and terminate them.
    while (true) {
        const session = inactiveSessions.pop();
        if (!session) {
            break;
        }

        terminateSession(session);
    }
}

function terminateSession(session: Session) {
    // If the process exists, attempt to kill it.
    if (session.langServerProcess) {
        session.langServerProcess.kill();
    }

    session.langServerProcess = undefined;
    // Dispose of the temporary directory.
    try {
        fs.rmSync(session.tempDirPath, { recursive: true });
    } catch (e) {
        // Ignore error.
    }
}

function getCompatibleInactiveSession(sessionOptions?: SessionOptions): Session | undefined {
    logger.info(`Looking for compatible inactive session`);

    const sessionIndex = inactiveSessions.findIndex((session) => {
        if (
            sessionOptions?.pythonVersion !== session.options?.pythonVersion ||
            sessionOptions?.pythonPlatform !== session.options?.pythonPlatform ||
            sessionOptions?.typeCheckingMode !== session.options?.typeCheckingMode
        ) {
            return false;
        }

        const requestedOverrides = sessionOptions?.configOverrides || {};
        const existingOverrides = session.options?.configOverrides || {};

        if (requestedOverrides.length !== existingOverrides.length) {
            return false;
        }

        for (const key of Object.keys(requestedOverrides)) {
            if (requestedOverrides[key] !== existingOverrides[key]) {
                return false;
            }
        }

        return true;
    });

    if (sessionIndex < 0) {
        return undefined;
    }

    logger.info(`Found compatible inactive session`);
    return inactiveSessions.splice(sessionIndex, 1)[0];
}

function synthesizeVenvDirectory(tempDirPath: string) {
    const venvPath = path.join(tempDirPath, 'venv', 'lib', 'site-packages');
    fs.mkdirSync(venvPath, { recursive: true });
}

function synthesizePyrightConfigFile(tempDirPath: string, sessionOptions?: SessionOptions) {
    const configFilePath = path.join(tempDirPath, 'pyrightconfig.json');
    const config: any = {};

    if (sessionOptions?.pythonVersion) {
        config.pythonVersion = sessionOptions.pythonVersion;
    } else {
        config.pythonVersion = defaultPythonVersion;
    }

    if (sessionOptions?.pythonPlatform) {
        config.pythonPlatform = sessionOptions.pythonPlatform;
    } else {
        config.pythonPlatform = defaultPythonPlatform;
    }

    if (sessionOptions?.typeCheckingMode === 'strict') {
        config.typeCheckingMode = 'strict';
    }

    // Set the venvPath to a synthesized venv to prevent pyright from
    // trying to resolve imports using the default Python environment
    // installed on the server's docker container.
    config.venvPath = '.';
    config.venv = 'venv';

    // Indicate that we don't want to resolve native libraries. This is
    // expensive, and we know there will be no native libraries in the
    // playground.
    config.skipNativeLibraries = true;

    if (sessionOptions?.configOverrides) {
        Object.keys(sessionOptions.configOverrides).forEach((key) => {
            config[key] = sessionOptions.configOverrides![key];
        });
    }

    const configJson = JSON.stringify(config);
    fs.writeFileSync(configFilePath, configJson);
}

// If there is no session lifetime timer, schedule one.
function scheduleSessionLifetimeTimer() {
    if (lifetimeTimer) {
        return;
    }

    const lifetimeTimerFrequency = 1 * 60 * 1000; // 1 minute

    lifetimeTimer = setTimeout(() => {
        lifetimeTimer = undefined;

        const curTime = Date.now();

        activeSessions.forEach((session, sessionId) => {
            if (curTime - session.lastAccessTime > maxSessionLifetime) {
                logger.info(`Session ${sessionId} timed out; recycling`);
                recycleSession(sessionId);
                activeSessions.delete(sessionId);
            }
        });

        if (activeSessions.size === 0) {
            scheduleSessionLifetimeTimer();
        }
    }, lifetimeTimerFrequency);
}
