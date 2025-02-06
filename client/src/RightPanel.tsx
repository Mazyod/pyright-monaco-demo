/*
 * Copyright (c) Eric Traut
 * Collapsible panel that appears on the right side of the window.
 */

import { Box, Typography } from '@mui/material';
import { SettingsPanel } from './SettingsPanel';
import { PlaygroundSettings } from './PlaygroundSettings';

export interface RightPanelProps {
    settings: PlaygroundSettings;
    onUpdateSettings: (settings: PlaygroundSettings) => void;
    latestPyrightVersion?: string;
    supportedPyrightVersions?: string[];
    code: string;
}

const rightPanelWidth = 320;

export function RightPanel(props: RightPanelProps) {
    return (
        <Box sx={styles.container}>
            <Typography sx={styles.headerTitleText}>Playground Settings</Typography>
            <Box sx={styles.contentContainer}>
                <SettingsPanel
                    settings={props.settings}
                    onUpdateSettings={props.onUpdateSettings}
                    latestPyrightVersion={props.latestPyrightVersion}
                    supportedPyrightVersions={props.supportedPyrightVersions}
                />
            </Box>
        </Box>
    );
}

const styles = {
    container: {
        width: rightPanelWidth,
        alignSelf: 'stretch',
        bgcolor: '#f8f8ff',
    },
    contentContainer: {
        flexGrow: 1,
        flexShrink: 0,
        flexBasis: 0,
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'stretch',
        overflow: 'auto',
    },
    headerTitleText: {
        p: 1,
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
    },
};
