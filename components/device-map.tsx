"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, AlertTriangle, Heart } from "lucide-react"

interface DeviceData {
  id: string
  timestamp: string
  location: string
  latitude: number
  longitude: number
  panicstatus: boolean
  fallstatus: boolean
  heartbeat: number
}

interface DeviceMapProps {
  data: DeviceData[]
  className?: string
}

export default function DeviceMap({ data, className }: DeviceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    const initMap = async () => {
      try {
        // Check if map already exists
        if (mapInstanceRef.current) {
          return
        }

        // Check if the container already has a map instance
        if (mapRef.current && (mapRef.current as any)._leaflet_id) {
          // Clean up any existing map instance
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove()
            mapInstanceRef.current = null
          }
          // Clear the container's leaflet reference
          delete (mapRef.current as any)._leaflet_id
        }

        // Dynamically import Leaflet
        const L = (await import("leaflet")).default

        // Import CSS
        await import("leaflet/dist/leaflet.css")

        // Fix default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        // Initialize map centered on a default location
        const map = L.map(mapRef.current).setView([40.7128, -74.006], 10)

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        mapInstanceRef.current = map
        setMapLoaded(true)
      } catch (error) {
        // Silent error handling
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Handle map resize when container size changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    })

    if (mapRef.current) {
      resizeObserver.observe(mapRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [mapLoaded])

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || typeof window === "undefined") return

    const updateMarkers = async () => {
      try {
        const L = (await import("leaflet")).default

        // Clear existing markers
        markersRef.current.forEach((marker) => {
          mapInstanceRef.current.removeLayer(marker)
        })
        markersRef.current = []

        if (data.length === 0) return

        // Create custom icons
        const createCustomIcon = (color: string) => {
          return L.divIcon({
            className: "custom-marker",
            html: `
              <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background-color: ${color};
                border: 3px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background-color: white;
                "></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
        }

        const greenIcon = createCustomIcon("#10b981")
        const orangeIcon = createCustomIcon("#f59e0b")
        const redIcon = createCustomIcon("#ef4444")

        // Add markers for each device
        const newMarkers: any[] = []
        data.forEach((device) => {
          let icon = greenIcon
          if (device.panicstatus) {
            icon = redIcon
          } else if (device.fallstatus) {
            icon = orangeIcon
          }

          const marker = L.marker([device.latitude, device.longitude], { icon })
            .addTo(mapInstanceRef.current)
            .on("click", () => {
              setSelectedDevice(device)
            })

          newMarkers.push(marker)
        })

        markersRef.current = newMarkers

        // Fit map to show all markers
        if (data.length > 0) {
          const group = new L.featureGroup(newMarkers)
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
        }
      } catch (error) {
        // Silent error handling
      }
    }

    updateMarkers()
  }, [data, mapLoaded])

  const getStatusColor = (device: DeviceData) => {
    if (device.panicstatus) return "text-red-500"
    if (device.fallstatus) return "text-orange-500"
    return "text-green-500"
  }

  const getStatusText = (device: DeviceData) => {
    if (device.panicstatus) return "PANIC ALERT"
    if (device.fallstatus) return "FALL DETECTED"
    return "Normal"
  }

  return (
    <div className={`${className} h-full`}>
      <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Device Locations</span>
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({data.length} devices)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="relative flex-1">
            <div 
              ref={mapRef} 
              className="min-h-[320px] h-[45vh] sm:min-h-[380px] sm:h-[50vh] lg:h-[65vh] xl:h-[70vh] w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 transition-all duration-300 hover:shadow-lg flex-1" 
              style={{ minHeight: '400px', maxHeight: '80vh' }}
            />

            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-slate-500 dark:text-slate-400">Loading map...</p>
                </div>
              </div>
            )}

            {data.length === 0 && mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-700/80 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">No device data available</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-600 dark:text-slate-300">Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-slate-600 dark:text-slate-300">Fall Alert</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-600 dark:text-slate-300">Panic Alert</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Device {selectedDevice.id}</span>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ×
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                  <p className={`font-semibold ${getStatusColor(selectedDevice)}`}>{getStatusText(selectedDevice)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Heartbeat</p>
                  <p className="font-semibold flex items-center space-x-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>{selectedDevice.heartbeat} BPM</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Location</p>
                <p className="font-medium">{selectedDevice.location}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedDevice.latitude.toFixed(6)}, {selectedDevice.longitude.toFixed(6)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Last Update</p>
                <p className="font-medium">{selectedDevice.timestamp}</p>
              </div>

              {(selectedDevice.panicstatus || selectedDevice.fallstatus) && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      {selectedDevice.panicstatus ? "Panic Alert Active" : "Fall Detected"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
