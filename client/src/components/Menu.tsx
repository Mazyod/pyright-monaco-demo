/*
 * Copyright (c) Eric Traut
 * Provides rendering of (and interaction with) a menu of options.
 */

import { Box, Menu as MuiMenu, MenuItem as MuiMenuItem, Typography } from '@mui/material';
import React, { ForwardedRef, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useHover } from '@/services/HoverHook';
import { IconName, MuiIcon } from './MuiIcon';

export const menuIconColor = '#669';
export const panelTextColor = '#222';
export const focusedMenuItemBackgroundColor = '#eee';

export interface MenuProps extends React.PropsWithChildren {
    name: string;
    onOpen?: () => void;
    isPopup?: boolean;
}

export interface MenuRef {
    open: () => void;
    close: () => void;
}

export const Menu = forwardRef(function Menu(props: MenuProps, ref: ForwardedRef<MenuRef>) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => {
        return {
            open: () => {
                if (menuRef.current) {
                    setAnchorEl(menuRef.current);
                    props.onOpen?.();
                }
            },
            close: () => {
                setAnchorEl(null);
            },
        };
    });

    return (
        <Box ref={menuRef} sx={{ width: 0, height: 0 }}>
            <MuiMenu
                key={props.name}
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                sx={props.isPopup ? styles.popupMenu : undefined}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={styles.menuContainer}>{props.children}</Box>
            </MuiMenu>
        </Box>
    );
});

export interface MenuItemProps {
    label: string;
    labelFilterText?: string;
    title?: string;
    icon?: IconName;
    disabled?: boolean;
    focused?: boolean;
    onSelect?: () => void;
}

export function MenuItem(props: MenuItemProps) {
    const [hoverRef, isHovered] = useHover();

    // If there's a label filter, see if we can find it in the label.
    const filterOffset = props.labelFilterText
        ? props.label.toLowerCase().indexOf(props.labelFilterText.toLowerCase())
        : -1;

    let labelItem: JSX.Element;

    if (filterOffset < 0) {
        labelItem = (
            <Typography sx={styles.labelText} noWrap>
                {props.label}
            </Typography>
        );
    } else {
        const beforeText = props.label.substring(0, filterOffset);
        const middleText = props.label.substring(
            filterOffset,
            filterOffset + (props.labelFilterText?.length ?? 0)
        );
        const afterText = props.label.substring(
            filterOffset + (props.labelFilterText?.length ?? 0)
        );

        labelItem = (
            <Typography sx={styles.labelText} noWrap>
                {beforeText}
                <Box component="span" sx={styles.labelFiltered}>
                    {middleText}
                </Box>
                {afterText}
            </Typography>
        );
    }

    return (
        <MuiMenuItem
            onClick={props.onSelect}
            disabled={props.disabled}
            title={props.title}
            ref={hoverRef}
            sx={{
                ...styles.container,
                ...((props.focused || isHovered) && !props.disabled ? styles.focused : {}),
                ...(props.disabled ? styles.disabled : {}),
            }}
        >
            <Box sx={styles.iconContainer}>
                {props.icon && <MuiIcon name={props.icon} size={14} color={menuIconColor} />}
            </Box>
            {labelItem}
        </MuiMenuItem>
    );
}

const styles = {
    container: {
        py: 0.25,
        px: 0.75,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 0.5,
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: 'transparent',
        },
    },
    disabled: {
        cursor: 'default',
        opacity: 0.5,
    },
    iconContainer: {
        minWidth: 14,
        ml: 0.25,
        mr: 0.5,
    },
    focused: {
        backgroundColor: focusedMenuItemBackgroundColor,
        '&:hover': {
            backgroundColor: focusedMenuItemBackgroundColor,
        },
    },
    menuContainer: {
        m: 0.5,
    },
    labelText: {
        fontSize: 13,
        p: 0.5,
        color: panelTextColor,
    },
    labelFiltered: {
        bgcolor: '#ccc',
        color: '#000',
    },
    popupMenu: {
        '& .MuiPaper-root': {
            bgcolor: 'transparent',
            boxShadow: 'none',
        },
    },
};
