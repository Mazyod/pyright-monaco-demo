/*
 * Copyright (c) Eric Traut
 * Panel that displays a list of diagnostics.
 */

import { Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import { useRef } from 'react';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver-types';
import { useHover } from './HoverHook';
import { IconName, MuiIcon } from './MuiIcon';

export interface ProblemsPanelProps {
    diagnostics: Diagnostic[];
    onSelectRange: (range: Range) => void;
    displayActivityIndicator: boolean;
}

const problemsPanelHeight = 200;

export function ProblemsPanel(props: ProblemsPanelProps) {
    // We don't display hints in the problems panel.
    const filteredDiagnostics = props.diagnostics.filter(
        (diag) => diag.severity !== DiagnosticSeverity.Hint
    );

    const containerRef = useRef(null);

    return (
        <Box
            ref={containerRef}
            sx={{
                ...styles.animatedContainer,
                height: problemsPanelHeight,
                transition: 'height 250ms ease',
            }}
        >
            <Box sx={styles.container}>
                <Box sx={styles.header}>
                    <Box sx={styles.headerContents}>
                        <Typography sx={styles.problemText}>Problems</Typography>
                        <Box sx={styles.problemCountBubble}>
                            <Typography sx={styles.problemCountText}>
                                {filteredDiagnostics.length.toString()}
                            </Typography>
                        </Box>
                        {props.displayActivityIndicator && (
                            <Box sx={styles.activityContainer}>
                                <Typography sx={styles.waitingText}>Waiting for server</Typography>
                                <CircularProgress size={12} sx={{ color: '#fff' }} />
                            </Box>
                        )}
                    </Box>
                </Box>
                <Box sx={styles.scrollContainer}>
                    {filteredDiagnostics.length > 0 ? (
                        filteredDiagnostics.map((diag, index) => (
                            <ProblemItem
                                key={index}
                                diagnostic={diag}
                                onSelectRange={props.onSelectRange}
                            />
                        ))
                    ) : (
                        <Typography sx={styles.diagnosticText}>
                            No problems have been detected.
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

function ProblemItem(props: { diagnostic: Diagnostic; onSelectRange: (range: Range) => void }) {
    const [hoverRef, isHovered] = useHover();

    return (
        <ButtonBase
            ref={hoverRef}
            sx={[styles.diagnosticContainer, isHovered && styles.problemContainerHover]}
            onClick={() => {
                props.onSelectRange(props.diagnostic.range);
            }}
            title={props.diagnostic.message}
        >
            <Box sx={styles.diagnosticIconContainer}>
                <ProblemIcon severity={props.diagnostic.severity} />
            </Box>
            <Box sx={styles.diagnosticTextContainer}>
                <Typography sx={styles.diagnosticText}>
                    {props.diagnostic.message}
                    {props.diagnostic.code && (
                        <Typography component="span" sx={styles.diagnosticSourceText}>
                            {`  (${props.diagnostic.code})`}
                        </Typography>
                    )}
                </Typography>
            </Box>
        </ButtonBase>
    );
}

function ProblemIcon(props: { severity: DiagnosticSeverity | undefined }) {
    let iconName: IconName;
    let iconColor: string;

    if (props.severity === undefined || props.severity === DiagnosticSeverity.Error) {
        iconName = 'close-circle';
        iconColor = '#e51400';
    } else if (props.severity === DiagnosticSeverity.Warning) {
        iconName = 'warning';
        iconColor = '#b89500';
    } else {
        // Information
        iconName = 'info-circle';
        iconColor = 'blue';
    }

    return <MuiIcon name={iconName} size={14} color={iconColor} />;
}

const styles = {
    animatedContainer: {
        position: 'relative',
        alignSelf: 'stretch',
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: problemsPanelHeight,
        borderTop: '1px solid #ccc',
        alignSelf: 'stretch',
    },
    header: {
        height: 32,
        px: 1,
        bgcolor: '#336',
        display: 'flex',
        flexDirection: 'row',
        alignSelf: 'stretch',
        alignItems: 'center',
    },
    headerContents: {
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        alignSelf: 'stretch',
        alignItems: 'center',
    },
    problemText: {
        mb: 0.25,
        fontSize: 13,
        color: '#fff',
    },
    problemCountText: {
        fontSize: 9,
        color: 'black',
    },
    problemCountBubble: {
        ml: 0.75,
        px: 0.625,
        height: 16,
        borderRadius: 1,
        bgcolor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        mr: 0.5,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    waitingText: {
        fontSize: 12,
        color: '#fff',
        mr: 1,
    },
    scrollContainer: {
        flex: 1,
        overflow: 'auto',
    },
    diagnosticContainer: {
        p: 0.5,
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
    },
    problemContainerHover: {
        bgcolor: '#eee',
    },
    diagnosticIconContainer: {
        mt: 0.125,
        mr: 1,
    },
    diagnosticTextContainer: {
        display: 'flex',
        flexDirection: 'column',
    },
    diagnosticText: {
        m: 1,
        fontSize: 13,
        lineHeight: '16px',
    },
    diagnosticSourceText: {
        color: '#aaa',
        display: 'inline',
    },
};
