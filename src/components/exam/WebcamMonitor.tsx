import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface WebcamMonitorProps {
    onPermissionGranted: () => void;
    onPermissionDenied: () => void;
}

export function WebcamMonitor({ onPermissionGranted, onPermissionDenied }: WebcamMonitorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startWebcam = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasPermission(true);
                    onPermissionGranted();
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
                setHasPermission(false);
                setError("Camera access is required to take this exam.");
                onPermissionDenied();
            }
        };

        startWebcam();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [onPermissionGranted, onPermissionDenied]);

    if (error) {
        return (
            <Alert variant="destructive" className="max-w-md mx-auto mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Camera Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="overflow-hidden shadow-lg border-2 border-primary/20 relative group w-48 h-36 bg-black">
            <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                REC
            </div>

            {!hasPermission && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <CameraOff className="h-8 w-8" />
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs text-center">Proctoring Active</p>
            </div>
        </Card>
    );
}
