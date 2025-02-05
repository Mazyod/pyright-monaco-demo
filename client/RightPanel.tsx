/*
 * Copyright (c) Eric Traut
 * Collapsible panel that appears on the right side of the window.
 */

import * as icons from '@ant-design/icons-svg';
import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
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

    // Animate the appearance or disappearance of the right panel.
    const widthAnimation = useRef(new Animated.Value(panelContents ? rightPanelWidth : 0)).current;

    useEffect(() => {
        Animated.timing(widthAnimation, {
            toValue: props.isRightPanelDisplayed ? rightPanelWidth : 0,
            duration: 250,
            useNativeDriver: false,
            easing: Easing.ease,
        }).start();
    }, [widthAnimation, props.isRightPanelDisplayed]);

    return (
        <Animated.View style={[styles.animatedContainer, { width: widthAnimation }]}>
            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitleText} selectable={false}>
                        {headerTitle}
                    </Text>
                    <View style={styles.headerControlsContainer}>
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
                    </View>
                </View>
                <ScrollView style={styles.contentContainer}>{panelContents}</ScrollView>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    animatedContainer: {
        flexDirection: 'row',
        position: 'relative',
    },
    container: {
        width: rightPanelWidth,
        alignSelf: 'stretch',
        backgroundColor: '#f8f8ff',
    },
    contentContainer: {
        flexGrow: 1,
        flexShrink: 0,
        flexBasis: 0,
        flexDirection: 'column',
        alignSelf: 'stretch',
    },
    headerContainer: {
        flexDirection: 'row',
        height: 36,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderStyle: 'solid',
        borderColor: '#ddd',
        paddingLeft: 12,
        paddingRight: 4,
    },
    headerTitleText: {
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerControlsContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
});
