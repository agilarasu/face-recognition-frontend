"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Webcam from "react-webcam"
import axios from "axios"
import { Camera, RefreshCw, Check, AlertCircle, Info, Users, Shield, Clock, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMobile } from "@/hooks/use-mobile"

export default function Home() {
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [statusType, setStatusType] = useState("") // 'success', 'error', 'warning', 'info'
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [isCameraReady, setIsCameraReady] = useState(false)
  const isMobile = useMobile()
  const [isProcessing, setIsProcessing] = useState(false)

  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setDevices(videoDevices)

      // Select the first device by default or the environment-facing camera on mobile
      if (videoDevices.length > 0) {
        const defaultDevice = isMobile
          ? videoDevices.find(
              (device) =>
                device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("environment"),
            )
          : videoDevices[0]

        setSelectedDeviceId(defaultDevice?.deviceId || videoDevices[0].deviceId)
      }
    } catch (error) {
      console.error("Error accessing media devices:", error)
      setStatusMessage("Unable to access camera. Please check permissions.")
      setStatusType("error")
    }
  }, [isMobile])

  useEffect(() => {
    getDevices()
  }, [getDevices])

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setIsCameraReady(false)
    // Small delay to allow camera to initialize
    setTimeout(() => setIsCameraReady(true), 1000)
  }

  const handleUserMedia = () => {
    setIsCameraReady(true)
  }

  const capture = useCallback(async () => {
    if (!webcamRef.current) return

    try {
      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) {
        setStatusMessage("Failed to capture image. Please try again.")
        setStatusType("error")
        return
      }

      setCapturedImage(imageSrc)
      setStatusMessage("Processing...")
      setStatusType("info")
      setIsProcessing(true)

      const imageDataBase64 = imageSrc.split(",")[1]

      // Get Azure Function URL from environment variable
      const azureFunctionUrl = process.env.NEXT_PUBLIC_AZURE_FUNCTION_URL

      if (!azureFunctionUrl) {
        throw new Error("Azure Function URL not configured")
      }

      // Call Azure Function directly
      const response = await axios.post(azureFunctionUrl, {
        image: imageDataBase64,
      })

      setStatusMessage(response.data.message)
      setStatusType(response.data.status)
    } catch (error) {
      console.error("Error processing attendance:", error)
      setStatusMessage("Error processing attendance. Please try again.")
      setStatusType("error")
    } finally {
      setIsProcessing(false)
    }
  }, [webcamRef])

  const resetCapture = () => {
    setCapturedImage(null)
    setStatusMessage("")
    setStatusType("") // Also reset the status type
  }

  const videoConstraints = {
    width: 1280,
    height: 720,
    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
    facingMode: isMobile ? "environment" : "user",
  }

  const getStatusIcon = () => {
    switch (statusType) {
      case "success":
        return <Check className="h-5 w-5 text-emerald-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-rose-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      default:
        return <Info className="h-5 w-5 text-sky-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl">
        <Card className="border-none shadow-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-bold tracking-tight">AI Attendance System</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Capture your attendance with our advanced facial recognition system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {devices.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Camera Device</label>
                <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${devices.indexOf(device) + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="rounded-lg overflow-hidden border border-border">
              {!capturedImage ? (
                <div className="relative aspect-video bg-muted">
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
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative aspect-video bg-muted">
                  <img
                    src={capturedImage || "/placeholder.svg"}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!capturedImage ? (
                <Button
                  onClick={capture}
                  disabled={!isCameraReady || isProcessing}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Capture Attendance
                </Button>
              ) : (
                <Button
                  onClick={resetCapture}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Take New Photo
                </Button>
              )}
            </div>

            {statusMessage && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  statusType === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : statusType === "error"
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                      : statusType === "warning"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        : "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                }`}
              >
                {getStatusIcon()}
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Smart Recognition</h3>
                  <p className="text-sm text-muted-foreground">Identifies multiple people</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Real-time Processing</h3>
                  <p className="text-sm text-muted-foreground">Instant verification</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Attendance Tracking</h3>
                  <p className="text-sm text-muted-foreground">Automatic record keeping</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

