/*
 * Copyright (c) Eric Traut
 * A button that displays an icon and handles press and hover events.
 */

import { Box, IconButton as MuiIconButton } from '@mui/material';
import { MouseEvent } from 'react';
import { useHover } from '../services/HoverHook';
import { IconName, MuiIcon } from './MuiIcon';

interface IconButtonProps {
    icon: IconName;
    iconSize: number;
    disabled?: boolean;
    title?: string;
    color?: string;
    hoverColor?: string;
    disableColor?: string;
    backgroundStyle?: object;
    hoverBackgroundStyle?: object;
    onPress: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function IconButton(props: IconButtonProps) {
    const [hoverRef, isHovered] = useHover();

    const effectiveColor = props.disabled
        ? props.disableColor ?? '#ccc'
        : isHovered
        ? props.hoverColor ?? props.color ?? '#ccc'
        : props.color ?? '#ccc';

    return (
        <Box title={props.title}>
            <MuiIconButton
                ref={hoverRef}
                onClick={props.onPress}
                disabled={props.disabled}
                className="icon-button"
                size="small"
                sx={{
                    ...styles.button,
                    cursor: props.disabled ? 'default' : 'pointer',
                    opacity: props.disabled ? 1 : undefined,
                    ...props.backgroundStyle,
                    ...(isHovered ? props.hoverBackgroundStyle : {}),
                    '&:hover': {
                        bgcolor: 'transparent',
                    },
                }}
            >
                <MuiIcon
                    name={props.icon}
                    size={props.iconSize}
                    color={effectiveColor}
                />
            </MuiIconButton>
        </Box>
    );
}

const styles = {
    button: {
        py: '2px',
        px: '6px',
        border: 'none',
        background: 'none',
        minWidth: 'unset',
        borderRadius: 0,
    },
};
