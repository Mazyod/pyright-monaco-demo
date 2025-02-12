/*
 * Copyright (c) Eric Traut
 * Header bar with embedded controls for the playground.
 */

import pyrightIcon from '@/assets/pyright.png';
import { Box, Typography } from '@mui/material';
import { Link } from '@mui/material';

export function HeaderPanel() {
    const image = <Box component="img" src={pyrightIcon} sx={styles.pyrightIcon} />;

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
                Pyright Monaco Demo
            </Typography>
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
        bgcolor: '#933',
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
};
