import React, { useEffect, useState, type FC } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, type LayoutChangeEvent } from 'react-native';
import { CameraPreviewView } from '../../src/CameraPreviewView';
import { Lenses } from './Lenses';
import { useCameraPermissions } from '../../src/useCameraPermissions';
import { useCameraKit } from '../../src/CameraKitContext';
import { Snapshot } from './capture-preview/ImagePreview';
import { VideoPreview } from './capture-preview/VideoPreview';
import { useCameraState, useCameraStateDispatch } from './CameraStateContext';
import { Button } from './Button';
import type { Rect } from '../../src/CameraKitContextModule';

/**
 * An interface that defines a single method onStopRendering which takes no parameters and returns void.
 */
interface PreviewProps {
    onStopRendering: () => void;
}

const platformScale = Platform.OS === 'android' ? Dimensions.get('screen').scale : 1;

const reduceHeightTo70Percent = (rect: Rect): Rect => ({
    ...rect,
    bottom: rect.bottom * 0.7,
});

/**
 * A function to calculate the preview size based on the LayoutChangeEvent.
 * 
 * @param {LayoutChangeEvent} event - the event containing layout information
 * @returns {Rect} - the preview size
 */
export const Preview: FC<PreviewProps> = ({ onStopRendering }) => {
    const { position, mirrorHorizontally, videoRecording, reduceSafeArea } = useCameraState();
    const dispatch = useCameraStateDispatch();
    const { takeSnapshot, takeVideo } = useCameraKit();
    const [showCamera, setShowCamera] = useState(true);
    const { permissionStatus, request } = useCameraPermissions();
    const [previewSize, setPreviewSize] = useState<Rect | undefined>(undefined);

    const safeArea = reduceSafeArea && previewSize ? reduceHeightTo70Percent(previewSize) : undefined;

    useEffect(() => {
        if (Platform.OS === 'android' && !permissionStatus['android.permission.CAMERA']) {
            request(['android.permission.CAMERA']);
        }
    }, [request]);

    /**
     * A function to calculate the preview size based on the LayoutChangeEvent.
     * 
     * @param {LayoutChangeEvent} event - the event containing layout information
     * @returns {void}
     */

    const calculatePreviewSize = (event: LayoutChangeEvent): void => {
        const {
            nativeEvent: {
                layout: { x, y, width, height },
            },
        } = event;

        setPreviewSize({
            top: x * platformScale,
            left: y * platformScale,
            bottom: height * platformScale,
            right: width * platformScale,
        });
    };

    /**
     * Function to handle video recording logic.
     *  - If video recording is active, stop it.
     *  - If video recording is not active, start it.
     */
    const onVideoRecording = () => {
        if (videoRecording) {
            videoRecording.stop().then(({ uri }) => {
                dispatch({ type: 'setVideo', videoUri: uri });
                dispatch({ type: 'setVideoRecording', videoRecording: undefined });
            });
        } else {
            dispatch({ type: 'setVideoRecording', videoRecording: takeVideo() });
        }
    };

    return (
        <View style={styles.box}>
            {showCamera ? (
                <CameraPreviewView
                    //@ts-expect-error
                    onLayout={calculatePreviewSize}
                    style={styles.box}
                    cameraPosition={position}
                    mirrorFramesHorizontally={mirrorHorizontally}
                    safeRenderArea={safeArea}
                />
            ) : (
                <View style={styles.box} />
            )}
            <View style={styles.container}>
                <Text style={{ backgroundColor: 'gray' }}>
                    Camera permissions: {permissionStatus['android.permission.CAMERA']}
                </Text>
                <Button title="Stop render context" onPress={onStopRendering} />
                <Button title={`camera enabled ${showCamera}`} onPress={() => setShowCamera((val) => !val)} />
                <Button title={position} onPress={() => dispatch({ type: 'toggleCameraPosition' })} />
                <Button
                    title={`mirror: ${mirrorHorizontally}`}
                    onPress={() => dispatch({ type: 'toggleMirrorHorizontally' })}
                />
                <Button
                    title="capture image"
                    onPress={async () => {
                        const { uri } = await takeSnapshot('JPEG', 90);
                        dispatch({ type: 'setSnapshot', snapshotUri: uri });
                    }}
                />
                <Button title={videoRecording ? 'stop taking video' : 'take video'} onPress={onVideoRecording} />
                <Button
                    title="toggle safe area"
                    onPress={() => {
                        dispatch({ type: 'toggleSafeArea' });
                    }}
                />
            </View>
            <Lenses />
            <Snapshot />
            <VideoPreview />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: '50%',
        height: '45%',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        right: 0,
    },
    box: {
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
    },
});
