'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Camera, RefreshCw, Check, AlertCircle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMobile } from '@/hooks/use-mobile';

export default function Home() {
    const webcamRef = useRef<Webcam>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState(''); // 'success', 'error', 'warning', 'info'
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const isMobile = useMobile();
    const [isProcessing, setIsProcessing] = useState(false);

    const getDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setDevices(videoDevices);
            
            // Select the first device by default or the environment-facing camera on mobile
            if (videoDevices.length > 0) {
                const defaultDevice = isMobile 
                    ? videoDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'))
                    : videoDevices[0];
                
                setSelectedDeviceId(defaultDevice?.deviceId || videoDevices[0].deviceId);
            }
        } catch (error) {
            console.error("Error accessing media devices:", error);
            setStatusMessage("Unable to access camera. Please check permissions.");
            setStatusType('error');
        }
    }, [isMobile]);

    useEffect(() => {
        getDevices();
    }, [getDevices]);

    const handleDeviceChange = (deviceId: string) => {
        setSelectedDeviceId(deviceId);
        setIsCameraReady(false);
        // Small delay to allow camera to initialize
        setTimeout(() => setIsCameraReady(true), 1000);
    };

    const handleUserMedia = () => {
        setIsCameraReady(true);
    };

    const capture = useCallback(async () => {
        if (!webcamRef.current) return;
        
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) {
                setStatusMessage("Failed to capture image. Please try again.");
                setStatusType('error');
                return;
            }
            
            setCapturedImage(imageSrc);
            setStatusMessage('Processing...');
            setStatusType('info');
            setIsProcessing(true);

            const imageDataBase64 = imageSrc.split(',')[1];
            
            // Get Azure Function URL from environment variable
            const azureFunctionUrl = process.env.NEXT_PUBLIC_AZURE_FUNCTION_URL;
            
            if (!azureFunctionUrl) {
                throw new Error("Azure Function URL not configured");
            }

            // Call Azure Function directly
            const response = await axios.post(azureFunctionUrl, {
                image: imageDataBase64,
            });

            setStatusMessage(response.data.message);
            setStatusType(response.data.status);
        } catch (error) {
            console.error("Error processing attendance:", error);
            setStatusMessage("Error processing attendance. Please try again.");
            setStatusType('error');
        } finally {
            setIsProcessing(false);
        }
    }, [webcamRef]);

    const resetCapture = () => {
        setCapturedImage(null);
        setStatusMessage('');
    };

    const videoConstraints = {
        width: 1280,
        height: 720,
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        facingMode: isMobile ? "environment" : "user"
    };

    const getStatusIcon = () => {
        switch (statusType) {
            case 'success':
                return <Check className="h-5 w-5 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            case 'warning':
                return <AlertCircle className="h-5 w-5 text-amber-600" />;
            default:
                return <Info className="h-5 w-5 text-blue-600" />;
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1d1d1f] flex flex-col items-center py-8 px-4">
            <Card className="w-full max-w-md bg-white dark:bg-[#2d2d2f] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <CardTitle className="text-2xl font-medium text-center text-gray-900 dark:text-gray-100">
                        AI Attendance System
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {devices.length > 1 && (
                        <div className="mb-4">
                            <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select camera" />
                                </SelectTrigger>
                                <SelectContent>
                                    {devices.map(device => (
                                        <SelectItem key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Camera ${devices.indexOf(device) + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900">
                        {!capturedImage ? (
                            <div className="aspect-[4/3] flex items-center justify-center">
                                {selectedDeviceId && (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        videoConstraints={videoConstraints}
                                        screenshotFormat="image/jpeg"
                                        onUserMedia={handleUserMedia}
                                        className="w-full h-full object-cover"
                                        mirrored={!isMobile}
                                    />
                                )}
                                {!isCameraReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                        <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-[4/3]">
                                <img 
                                    src={capturedImage || "/placeholder.svg"} 
                                    alt="Captured" 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center gap-3">
                        {!capturedImage ? (
                            <Button 
                                onClick={capture}
                                disabled={!isCameraReady || isProcessing}
                                className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2 px-6 rounded-full transition-all"
                            >
                                <Camera className="mr-2 h-5 w-5" />
                                Capture Attendance
                            </Button>
                        ) : (
                            <Button 
                                onClick={resetCapture}
                                disabled={isProcessing}
                                variant="outline"
                                className="border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3]/10 font-medium py-2 px-6 rounded-full transition-all"
                            >
                                <RefreshCw className="mr-2 h-5 w-5" />
                                Take New Photo
                            </Button>
                        )}
                    </div>

                    {statusMessage && (
                        <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                            statusType === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                            statusType === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 
                            statusType === 'warning' ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' : 
                            'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        }`}>
                            {getStatusIcon()}
                            <span>{statusMessage}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
