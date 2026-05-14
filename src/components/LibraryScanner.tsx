"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BarcodeReader } from 'dynamsoft-javascript-barcode';
import { VisionCamera } from 'react-vision-camera';

let licenseSet = false;

interface Props {
    isActive?: boolean;
    isPause?: boolean;
    facingMode?: string;
    desiredCamera?: string;
    desiredResolution?: { width: number; height: number };
    license?: string;
    engineResourcePath?: string;
    runtimeSettings?: string;
    interval?: number;
    drawOverlay?: boolean;
    children?: React.ReactNode;
    onInitialized?: (reader: BarcodeReader) => void;
    onScanned?: (results: any[]) => void;
    onOpened?: (cam: HTMLVideoElement, camLbl: string) => void;
    onClosed?: () => void;
    onClicked?: (result: any) => void;
    onDeviceListLoaded?: (devices: MediaDeviceInfo[]) => void;
}

const LibraryScanner = (props: Props) => {
    const interval = useRef<any>(null);
    const camera = useRef<HTMLVideoElement | null>(null);
    const reader = useRef<BarcodeReader | null>(null);
    const mounted = useRef(false);
    const decoding = useRef(false);
    const [viewBox, setViewBox] = useState("0 0 1280 720");
    const [barcodeResults, setBarcodeResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                console.log("Scanner initializing...", { licenseSet, isWasmLoaded: BarcodeReader.isWasmLoaded() });
                // Fix: Check if BarcodeReader exists and is initialized
                if (!licenseSet && !BarcodeReader.isWasmLoaded()) {
                    try {
                        (BarcodeReader as any)._bNeverShowDialog = true;
                        BarcodeReader.license = props.license || "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
                        (BarcodeReader as any).licenseServer = ["https://public.dynamsoft.com/LTS/v2/LTS.aspx"];
                        BarcodeReader.engineResourcePath = props.engineResourcePath || "https://unpkg.com/dynamsoft-javascript-barcode@9.6.42/dist/";
                        licenseSet = true;
                        console.log("Scanner license assigned.");
                    } catch (e) {
                        console.warn("License already set or could not be set:", e);
                    }
                }
                
                console.log("Creating reader instance...");
                reader.current = await BarcodeReader.createInstance();
                console.log("Reader instance created successfully.");
                
                if (props.runtimeSettings && reader.current) {
                    await reader.current.initRuntimeSettingsWithString(props.runtimeSettings);
                }
                
                if (props.onInitialized && reader.current) {
                    props.onInitialized(reader.current);
                }
                setIsLoading(false);
            } catch (err) {
                console.error("Scanner initialization critical error:", err);
            }
        };
        init();
        mounted.current = true;
        
        return () => {
            mounted.current = false;
            stopScanning();
            if (reader.current) {
                reader.current.destroyContext();
            }
        };
    }, []);

    useEffect(() => {
        if (props.runtimeSettings && reader.current) {
            reader.current.initRuntimeSettingsWithString(props.runtimeSettings);
        }
    }, [props.runtimeSettings]);

    const startScanning = () => {
        stopScanning();
        const decode = async () => {
            if (decoding.current === false && reader.current && camera.current && camera.current.readyState >= 2) {
                decoding.current = true;
                try {
                    const results = await reader.current.decode(camera.current);
                    setBarcodeResults(results);
                    if (props.onScanned) {
                        props.onScanned(results);
                    }
                } catch (err) {
                    console.error("Decode error:", err);
                } finally {
                    decoding.current = false;
                }
            }
        };
        interval.current = setInterval(decode, props.interval || 40);
    };

    const stopScanning = () => {
        if (interval.current) {
            clearInterval(interval.current);
            interval.current = null;
        }
    };

    const onOpened = (cam: HTMLVideoElement, camLbl: string) => {
        camera.current = cam;
        if (cam.videoWidth > 0) {
            setViewBox("0 0 " + cam.videoWidth + " " + cam.videoHeight);
        } else {
            // Poll for dimensions if they aren't ready yet
            let pollCount = 0;
            const poll = setInterval(() => {
                pollCount++;
                if (camera.current && camera.current.videoWidth > 0) {
                    setViewBox("0 0 " + camera.current.videoWidth + " " + camera.current.videoHeight);
                    clearInterval(poll);
                } else if (pollCount > 20) {
                    clearInterval(poll);
                }
            }, 500);
        }
        startScanning();
        if (props.onOpened) {
            props.onOpened(cam, camLbl);
        }
    };

    const onClosed = () => {
        stopScanning();
        if (props.onClosed) {
            props.onClosed();
        }
    };

    const getPointsData = (result: any) => {
        const lr = result.localizationResult;
        return `${lr.x1},${lr.y1} ${lr.x2},${lr.y2} ${lr.x3},${lr.y3} ${lr.x4},${lr.y4}`;
    };

    const renderSVGOverlay = () => {
        if (props.drawOverlay === true && barcodeResults.length > 0) {
            return (
                <svg
                    preserveAspectRatio="xMidYMid slice"
                    viewBox={viewBox}
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                    }}
                >
                    {barcodeResults.map((result, idx) => (
                        <polygon
                            key={"poly-" + idx}
                            points={getPointsData(result)}
                            style={{
                                fill: "rgba(85,240,40,0.3)",
                                stroke: "#55f028",
                                strokeWidth: 2,
                                pointerEvents: 'auto',
                                cursor: 'pointer'
                            }}
                            onClick={() => props.onClicked && props.onClicked(result)}
                        />
                    ))}
                    {barcodeResults.map((result, idx) => (
                        <text
                            key={"text-" + idx}
                            x={result.localizationResult.x1}
                            y={result.localizationResult.y1 - 10}
                            fill="#ff3b3b"
                            fontSize="20"
                            fontWeight="bold"
                            style={{ paintOrder: 'stroke', stroke: 'black', strokeWidth: '1px' }}
                        >
                            {result.barcodeText}
                        </text>
                    ))}
                </svg>
            );
        }
        return null;
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VisionCamera
                isActive={props.isActive}
                isPause={props.isPause}
                facingMode={props.facingMode}
                desiredCamera={props.desiredCamera}
                desiredResolution={props.desiredResolution}
                onOpened={onOpened}
                onClosed={onClosed}
                onDeviceListLoaded={props.onDeviceListLoaded}
            >
                {props.children}
            </VisionCamera>
            {renderSVGOverlay()}
            {isLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: 'white', zIndex: 10 }}>
                    <div style={{ width: 40, height: 40, border: '4px solid #333', borderTop: '4px solid #fbbf24', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: 15, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Initializing Protocol...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </div>
    );
};

export default LibraryScanner;
