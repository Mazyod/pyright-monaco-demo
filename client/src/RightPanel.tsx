/*
 * Copyright (c) Eric Traut
 * Collapsible panel that appears on the right side of the window.
 */

import * as icons from '@ant-design/icons-svg';
import { Box, Slide, Typography } from '@mui/material';
import { useRef } from 'react';
import IconButton from './IconButton';
import { SettingsPanel } from './SettingsPanel';
import { PlaygroundSettings } from './PlaygroundSettings';

export enum RightPanelType {
    Settings,
}

export interface RightPanelProps {
    isRightPanelDisplayed: boolean;
    rightPanelType: RightPanelType;
    onShowRightPanel: (rightPanelType?: RightPanelType) => void;
    settings: PlaygroundSettings;
    onUpdateSettings: (settings: PlaygroundSettings) => void;
    latestPyrightVersion?: string;
    supportedPyrightVersions?: string[];
    code: string;
}

const rightPanelWidth = 320;

export function RightPanel(props: RightPanelProps) {
    let panelContents: JSX.Element | undefined;
    let headerTitle = '';

    switch (props.rightPanelType) {
        case RightPanelType.Settings:
            panelContents = (
                <SettingsPanel
                    settings={props.settings}
                    onUpdateSettings={props.onUpdateSettings}
                    latestPyrightVersion={props.latestPyrightVersion}
                    supportedPyrightVersions={props.supportedPyrightVersions}
                />
            );
            headerTitle = 'Playground Settings';
            break;
    }

    const containerRef = useRef(null);

    return (
        <Slide
            direction="left"
            in={props.isRightPanelDisplayed}
            timeout={250}
            mountOnEnter
            unmountOnExit
        >
            <Box sx={styles.animatedContainer} ref={containerRef}>
                <Box sx={styles.container}>
                    <Box sx={styles.headerContainer}>
                        <Typography sx={styles.headerTitleText}>
                            {headerTitle}
                        </Typography>
                        <Box sx={styles.headerControlsContainer}>
                            <IconButton
                                iconDefinition={icons.CloseOutlined}
                                iconSize={14}
                                color={'#333'}
                                hoverColor={'#000'}
                                title={'Close panel'}
                                onPress={() => {
                                    props.onShowRightPanel();
                                }}
                            />
                        </Box>
                    </Box>
                    <Box sx={styles.contentContainer}>
                        {panelContents}
                    </Box>
                </Box>
            </Box>
        </Slide>
    );
}

const styles = {
    animatedContainer: {
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
        width: rightPanelWidth,
    },
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
    headerContainer: {
        display: 'flex',
        flexDirection: 'row',
        height: 36,
        alignItems: 'center',
        borderBottom: '1px solid #ddd',
        pl: 1.5,
        pr: 0.5,
    },
    headerTitleText: {
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerControlsContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'flex-end',
    },
};
