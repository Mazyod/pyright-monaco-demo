/*
 * Copyright (c) Eric Traut
 * Header bar with embedded controls for the playground.
 */

import * as icons from '@ant-design/icons-svg';
import { Box, Typography } from '@mui/material';
import { Link } from '@mui/material';
import IconButton from './IconButton';
import { RightPanelType } from './RightPanel';

const headerIconButtonSize = 20;

export interface HeaderPanelProps {
    isRightPanelDisplayed: boolean;
    rightPanelType: RightPanelType;
    onShowRightPanel: (rightPanelType?: RightPanelType) => void;
}

export function HeaderPanel(props: HeaderPanelProps) {
    const image = <Box sx={styles.pyrightIcon} />;

    return (
        <Box sx={styles.container}>
            <Link
                href="https://github.com/microsoft/pyright"
                target="_blank"
                rel="noopener"
                sx={{ display: 'flex' }}
            >
                {image}
            </Link>
            <Typography sx={styles.titleText} variant="h6">
                Pyright Playground
            </Typography>
            <Box sx={styles.controlsPanel}>
                <IconButton
                    iconDefinition={icons.SettingOutlined}
                    iconSize={headerIconButtonSize}
                    disabled={
                        props.isRightPanelDisplayed &&
                        props.rightPanelType === RightPanelType.Settings
                    }
                    color={'#fff'}
                    hoverColor={'#eee'}
                    disableColor={'#669'}
                    title={'Playground settings'}
                    onPress={() => {
                        props.onShowRightPanel(RightPanelType.Settings);
                    }}
                />
            </Box>
        </Box>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'row',
        px: 1,
        pb: 0.25,
        alignSelf: 'stretch',
        alignItems: 'center',
        bgcolor: '#336',
        height: 42,
    },
    pyrightIcon: {
        height: 24,
        width: 24,
        mr: 1,
    },
    titleText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        fontVariant: 'small-caps',
    },
    controlsPanel: {
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
};
