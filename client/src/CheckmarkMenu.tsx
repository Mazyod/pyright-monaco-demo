/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) Eric Traut
 * A menu that displays a checkmark next to items.
 */

import * as icons from '@ant-design/icons-svg';
import { Box, TextField } from '@mui/material';
import { createRef, useEffect, useState } from 'react';
import { MenuItem } from './Menu';

export interface CheckmarkMenuProps {
    items: CheckmarkMenuItem[];
    onSelect: (item: CheckmarkMenuItem, index: number) => void;
    includeSearchBox?: boolean;
    fixedSize?: { width: number; height: number };
    onDismiss?: () => void;
}

export interface CheckmarkMenuItem {
    label: string;
    checked: boolean;
    title?: string;
    disabled?: boolean;
}

interface CheckmarkMenuState {
    searchFilter: string;
}

export function CheckmarkMenu(props: CheckmarkMenuProps) {
    const [state, setState] = useState<CheckmarkMenuState>({
        searchFilter: '',
    });
    const textInputRef = createRef<HTMLInputElement>();

    const searchFilter = state.searchFilter.toLowerCase().trim();
    const filteredItems = props.items.filter((item) => {
        return !searchFilter || item.label.toLowerCase().includes(searchFilter);
    });

    // We need to defer the focus until after the menu has been
    // rendered, measured, and placed in its final position.
    useEffect(() => {
        if (textInputRef.current) {
            setTimeout(() => {
                textInputRef.current?.focus();
            }, 100);
        }
    }, [textInputRef]);

    return (
        <Box sx={styles.contentContainer}>
            {props.includeSearchBox && (
                <Box sx={styles.searchBoxContainer}>
                    <TextField
                        inputRef={textInputRef}
                        sx={styles.searchBox}
                        value={state.searchFilter}
                        placeholder="Search"
                        size="small"
                        onChange={(event) => {
                            setState((prevState) => ({
                                ...prevState,
                                searchFilter: event.target.value,
                            }));
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                props.onDismiss?.();
                            }
                        }}
                        spellCheck={false}
                        InputProps={{
                            sx: {
                                fontSize: 13,
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#ccc',
                                },
                            },
                        }}
                    />
                </Box>
            )}

            <Box
                sx={[
                    styles.container,
                    props.fixedSize ? { width: props.fixedSize.width, height: props.fixedSize.height } : {},
                ]}
            >
                {filteredItems.map((item, index) => (
                    <MenuItem
                        key={index}
                        iconDefinition={item.checked ? icons.CheckOutlined : undefined}
                        label={item.label}
                        labelFilterText={searchFilter}
                        onSelect={() => props.onSelect(item, index)}
                        title={item.title}
                        disabled={item.disabled}
                    />
                ))}
            </Box>
        </Box>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 100,
        maxHeight: 300,
        overflow: 'auto',
    },
    contentContainer: {
        display: 'flex',
        flexDirection: 'column',
    },
    searchBoxContainer: {
        px: 0.5,
        pt: 0.5,
        pb: 1,
        borderBottom: '1px solid #ccc',
    },
    searchBox: {
        width: '100%',
        '& .MuiInputBase-root': {
            backgroundColor: '#fff',
        },
    },
};
