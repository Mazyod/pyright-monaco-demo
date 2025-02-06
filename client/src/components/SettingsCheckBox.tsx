/*
 * Copyright (c) Eric Traut
 * A simple check box (toggle) control used in the settings panel.
 */

import { Box, ButtonBase, Typography } from '@mui/material';
import { useHover } from '@/services/HoverHook';
import { MuiIcon } from './MuiIcon';

export interface SettingsCheckboxProps {
    label: string;
    title: string;
    value: boolean;
    disabled: boolean;
    onChange: (value: boolean) => void;
}

export function SettingsCheckbox(props: SettingsCheckboxProps) {
    const [hoverRef, isHovered] = useHover();

    const handleClick = () => {
        if (!props.disabled) {
            props.onChange(!props.value);
        }
    };

    return (
        <ButtonBase
            key={props.label}
            ref={hoverRef}
            onClick={handleClick}
            disabled={props.disabled}
            sx={styles.container}
            className="settings-checkbox"
        >
            <Box 
                sx={{
                    ...styles.checkbox,
                    borderColor: props.disabled ? '#aaa' : '#333',
                    bgcolor: !props.disabled && isHovered ? '#fff' : 'transparent',
                }}
                className="settings-checkbox-box"
            >
                {props.value && (
                    <MuiIcon
                        name="check"
                        size={12}
                        color={props.disabled ? '#aaa' : '#669'}
                    />
                )}
            </Box>
            <Box title={props.title}>
                <Typography
                    sx={{
                        ...styles.label,
                        color: props.disabled ? '#ccc' : '#333',
                    }}
                    className="settings-checkbox-label"
                >
                    {props.label}
                </Typography>
            </Box>
        </ButtonBase>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'row',
        py: 0.5,
        px: 2,
        alignItems: 'center',
        alignSelf: 'flex-start',
        cursor: 'pointer',
        '&.Mui-disabled': {
            cursor: 'default',
        },
        background: 'none',
        border: 'none',
        width: '100%',
        justifyContent: 'flex-start',
    },
    checkbox: {
        width: 16,
        height: 16,
        p: '1px',
        border: '1px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        ml: 1,
        fontSize: 13,
        userSelect: 'none',
    },
};
