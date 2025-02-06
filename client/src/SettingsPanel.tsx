/*
 * Copyright (c) Eric Traut
 * A panel that displays settings for the app.
 */

import { Box, Typography } from '@mui/material';
import { useRef } from 'react';
import { CheckmarkMenu, CheckmarkMenuItem } from './CheckmarkMenu';
import IconButton from './IconButton';
import { Menu, MenuRef } from './Menu';
import { PlaygroundSettings } from './PlaygroundSettings';
import PushButton from './PushButton';
import {
    PyrightConfigSetting,
    configSettings,
    configSettingsAlphabetized,
} from './PyrightConfigSettings';
import { SettingsCheckbox } from './SettingsCheckBox';

interface ConfigOptionWithValue {
    name: string;
    value: boolean;
}

export interface SettingsPanelProps {
    settings: PlaygroundSettings;
    latestPyrightVersion?: string;
    supportedPyrightVersions?: string[];
    onUpdateSettings: (settings: PlaygroundSettings) => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
    const configOptionsMenuRef = useRef<MenuRef>(null);
    const configOverrides = getNonDefaultConfigOptions(props.settings);

    return (
        <Box sx={styles.container}>
            <SettingsHeader headerText={'Configuration Options'} />
            <SettingsCheckbox
                key={'strict'}
                label={'Strict'}
                title={'Enable set of strict type checking options'}
                disabled={false}
                value={!!props.settings.strictMode}
                onChange={() => {
                    props.onUpdateSettings({
                        ...props.settings,
                        strictMode: !props.settings.strictMode,
                    });
                }}
            />

            <Box sx={styles.selectionContainer}>
                <Typography sx={styles.selectedOptionText}>
                    {configOverrides.length === 0 ? 'Default' : 'Custom'}
                </Typography>
                <MenuButton
                    onPress={() => {
                        configOptionsMenuRef.current?.open();
                    }}
                />
                <Menu name={'configOptions'} ref={configOptionsMenuRef}>
                    <CheckmarkMenu
                        items={configSettingsAlphabetized.map((item) => {
                            return getConfigOptionMenuItem(props.settings, item);
                        })}
                        onSelect={(item) => {
                            props.onUpdateSettings(toggleConfigOption(props.settings, item.label));
                        }}
                        includeSearchBox={true}
                        fixedSize={{ width: 300, height: 400 }}
                        onDismiss={() => {
                            configOptionsMenuRef.current?.close();
                        }}
                    />
                </Menu>
            </Box>
            <Box sx={styles.overridesContainer}>
                {configOverrides.map((config) => (
                    <ConfigOverride
                        key={config.name}
                        config={config}
                        onRemove={() => {
                            const configOverrides = { ...props.settings.configOverrides };
                            delete configOverrides[config.name];

                            props.onUpdateSettings({
                                ...props.settings,
                                configOverrides,
                            });
                        }}
                    />
                ))}
            </Box>

            <SettingsDivider />
            <Box sx={styles.resetButtonContainer}>
                <PushButton
                    label={'Restore Defaults'}
                    title={'Reset all settings to their default values'}
                    disabled={areSettingsDefault(props.settings)}
                    onPress={() => {
                        props.onUpdateSettings({
                            configOverrides: {},
                        });
                    }}
                />
            </Box>
        </Box>
    );
}

function MenuButton(props: { onPress: () => void }) {
    return (
        <IconButton
            icon="down-circle"
            iconSize={18}
            color="#669"
            hoverColor="#336"
            onPress={props.onPress}
        />
    );
}

function SettingsHeader(props: { headerText: string }) {
    return (
        <Box sx={styles.headerTextBox}>
            <Typography sx={styles.headerText}>
                {props.headerText}
            </Typography>
        </Box>
    );
}

function SettingsDivider() {
    return <Box sx={styles.divider} />;
}

interface ConfigOverrideProps {
    config: ConfigOptionWithValue;
    onRemove: () => void;
}

function ConfigOverride(props: ConfigOverrideProps) {
    const text = `${props.config.name}=${props.config.value.toString()}`;

    return (
        <Box sx={styles.configOverrideContainer}>
            <Typography sx={styles.configOverrideText} noWrap>
                {text}
            </Typography>
            <Box sx={{ mt: -0.5 }}>
                <IconButton
                    icon="close"
                    iconSize={12}
                    color="#666"
                    hoverColor="#333"
                    onPress={props.onRemove}
                />
            </Box>
        </Box>
    );
}

function areSettingsDefault(settings: PlaygroundSettings): boolean {
    return (
        Object.keys(settings.configOverrides).length === 0 &&
        !settings.strictMode &&
        settings.pyrightVersion === undefined &&
        settings.pythonVersion === undefined &&
        settings.pythonPlatform === undefined &&
        settings.locale === undefined
    );
}

function getNonDefaultConfigOptions(settings: PlaygroundSettings): ConfigOptionWithValue[] {
    const overrides: ConfigOptionWithValue[] = [];

    configSettingsAlphabetized.forEach((configInfo) => {
        // If strict mode is in effect, don't consider overrides if the
        // config option is always on in strict mode.
        if (settings.strictMode && configInfo.isEnabledInStrict) {
            return;
        }

        const defaultValue = configInfo.isEnabledInStandard;
        const overrideValue = settings.configOverrides[configInfo.name] ?? defaultValue;

        if (defaultValue !== overrideValue) {
            overrides.push({ name: configInfo.name, value: overrideValue });
        }
    });

    return overrides;
}

function getConfigOptionMenuItem(
    settings: PlaygroundSettings,
    config: PyrightConfigSetting
): CheckmarkMenuItem {
    const isEnabled = settings.configOverrides[config.name] ?? config.isEnabledInStandard;

    return {
        label: config.name,
        checked: isEnabled || (config.isEnabledInStrict && !!settings.strictMode),
        disabled: config.isEnabledInStrict && settings.strictMode,
        title: config.description,
    };
}

function toggleConfigOption(settings: PlaygroundSettings, optionName: string): PlaygroundSettings {
    const configOverrides = { ...settings.configOverrides };
    const configInfo = configSettings.find((s) => s.name === optionName);
    const isEnabledByDefault = configInfo?.isEnabledInStandard;
    const isEnabled = configOverrides[optionName] ?? isEnabledByDefault;

    if (isEnabledByDefault === !isEnabled) {
        // If the new value matches the default value, delete it
        // to restore the default.
        delete configOverrides[optionName];
    } else {
        configOverrides[optionName] = !isEnabled;
    }

    return { ...settings, configOverrides };
}

const styles = {
    container: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'stretch',
        py: 1,
        px: 1.5,
    },
    divider: {
        height: 1,
        borderTop: '1px solid #eee',
        my: 1,
    },
    headerTextBox: {
        mb: 0.5,
    },
    headerText: {
        fontSize: 14,
        color: '#666',
        fontVariant: 'small-caps',
    },
    resetButtonContainer: {
        alignSelf: 'center',
        mt: 0.5,
        mx: 1,
    },
    selectionContainer: {
        height: 24,
        pt: 0.75,
        pb: 0.25,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'row',
    },
    selectedOptionText: {
        fontSize: 13,
        color: '#333',
        flex: 1,
    },
    overridesContainer: {
        display: 'flex',
        flexDirection: 'column',
        mt: 0.5,
    },
    configOverrideContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ml: 2,
        px: 2,
        py: 0.5,
    },
    configOverrideText: {
        flex: -1,
        fontSize: 12,
        color: '#333',
    },
};
