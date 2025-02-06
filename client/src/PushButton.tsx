/*
 * Copyright (c) Eric Traut
 * A button that displays an icon and handles press and hover events.
 */

import { Box, Button, Typography } from '@mui/material';
import { MouseEvent } from 'react';
import { useHover } from './HoverHook';

interface PushButtonProps {
    label: string;
    disabled?: boolean;
    title?: string;
    backgroundStyle?: object;
    textStyle?: object;
    hoverBackgroundStyle?: object;
    hoverTextStyle?: object;
    onPress: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function PushButton(props: PushButtonProps) {
    const [hoverRef, isHovered] = useHover();

    return (
        <Box title={props.title}>
            <Button
                ref={hoverRef}
                onClick={props.onPress}
                disabled={props.disabled}
                className="push-button"
                variant="outlined"
                sx={{
                    ...styles.button,
                    borderColor: props.disabled ? '#ccc' : '#669',
                    bgcolor: props.disabled 
                        ? 'transparent' 
                        : isHovered 
                            ? '#fff' 
                            : '#f8f8ff',
                    cursor: props.disabled ? 'default' : 'pointer',
                    ...props.backgroundStyle,
                    ...(isHovered && !props.disabled ? props.hoverBackgroundStyle : {}),
                    '&:hover': {
                        bgcolor: props.disabled ? 'transparent' : '#fff',
                        borderColor: props.disabled ? '#ccc' : '#669',
                    },
                }}
            >
                <Typography
                    className="push-button-text"
                    sx={{
                        ...styles.text,
                        color: props.disabled ? '#ccc' : '#333',
                        ...props.textStyle,
                        ...(isHovered && !props.disabled ? props.hoverTextStyle : {}),
                    }}
                >
                    {props.label}
                </Typography>
            </Button>
        </Box>
    );
}

const styles = {
    button: {
        display: 'flex',
        flexDirection: 'row',
        py: '6px',
        px: '12px',
        borderRadius: '4px',
        minWidth: 'unset',
        textTransform: 'none',
    },
    text: {
        fontSize: 13,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};
