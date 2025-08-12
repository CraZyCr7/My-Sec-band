"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Heart, AlertTriangle } from "lucide-react"

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

interface HeartbeatChartProps {
  data: DeviceData[]
  className?: string
}

interface ChartDataPoint {
  time: string
  [key: string]: any // For dynamic device IDs
}

export default function HeartbeatChart({ data, className }: HeartbeatChartProps) {
  // Utility function to generate unique keys
  const generateUniqueKey = (prefix: string, id: string, index: number) => {
    return `${prefix}-${id}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Process real data into chart format
  const chartData = useMemo(() => {
    if (data.length === 0) return []

    // Group data by time periods (every 30 minutes for better visualization)
    const timeGroups: { [key: string]: ChartDataPoint } = {}
    
    data.forEach((device) => {
      if (!device.timestamp || !device.heartbeat) return
      
      try {
        const timestamp = new Date(device.timestamp)
        if (isNaN(timestamp.getTime())) return
        
        // Round to nearest 30-minute interval
        const minutes = timestamp.getMinutes()
        const roundedMinutes = Math.floor(minutes / 30) * 30
        const roundedTime = new Date(timestamp)
        roundedTime.setMinutes(roundedMinutes, 0, 0)
        
        const timeKey = roundedTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        
        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = { time: timeKey }
        }
        
        // Use the actual heartbeat value from the data
        timeGroups[timeKey][device.id] = device.heartbeat
      } catch (error) {
        // Skip invalid timestamps
        console.warn("Invalid timestamp for device:", device.id, device.timestamp)
      }
    })
    
    // Convert to array and sort by time
    const sortedData = Object.values(timeGroups).sort((a, b) => {
      const timeA = new Date(`2000-01-01 ${a.time}`)
      const timeB = new Date(`2000-01-01 ${b.time}`)
      return timeA.getTime() - timeB.getTime()
    })
    
    return sortedData
  }, [data])

  const deviceColors = useMemo(() => {
    const colors = [
      "#2563eb", // Blue
      "#dc2626", // Red
      "#059669", // Green
      "#d97706", // Orange
      "#7c3aed", // Purple
      "#0891b2", // Cyan
      "#ea580c", // Orange-red
      "#65a30d", // Lime
      "#be185d", // Pink
      "#374151", // Gray
    ]
    const colorMap: { [key: string]: string } = {}

    data.forEach((device, index) => {
      // Use different colors for devices with alerts
      if (device.panicstatus) {
        colorMap[device.id] = "#dc2626" // Red for panic
      } else if (device.fallstatus) {
        colorMap[device.id] = "#ea580c" // Orange for fall
      } else {
        colorMap[device.id] = colors[index % colors.length]
      }
    })

    return colorMap
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-900 dark:text-white mb-2">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => {
            const device = data.find((d) => d.id === entry.dataKey)
            const isAlert = device?.panicstatus || device?.fallstatus
            return (
              <div key={index} className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-sm font-medium">Device {entry.dataKey}:</span>
                <span className="text-sm font-bold" style={{ color: entry.color }}>
                  {entry.value} BPM
                </span>
                {isAlert && <AlertTriangle className="w-3 h-3 text-red-500" />}
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  const averageHeartRate = useMemo(() => {
    if (data.length === 0) return 0
    const total = data.reduce((sum, device) => sum + (device.heartbeat || 0), 0)
    return Math.round(total / data.length)
  }, [data])

  // Get unique device IDs for chart lines
  const uniqueDeviceIds = useMemo(() => {
    return Array.from(new Set(data.map(device => device.id)))
  }, [data])

  return (
    <div className={className}>
      <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span>Heartbeat Trends (Real-time Data)</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {uniqueDeviceIds.length} device{uniqueDeviceIds.length !== 1 ? "s" : ""}
              </span>
              {averageHeartRate > 0 && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                  Avg: {averageHeartRate} BPM
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Activity className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-lg">No device data available</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                Heartbeat data will appear here once devices are connected
              </p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" className="opacity-20" stroke="#94a3b8" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    interval="preserveStartEnd"
                    className="text-slate-600 dark:text-slate-300"
                    axisLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  />
                  <YAxis
                    domain={[40, "dataMax + 10"]}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    label={{
                      value: "Heart Rate (BPM)",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                    }}
                    className="text-slate-600 dark:text-slate-300"
                    axisLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />

                  {uniqueDeviceIds.map((deviceId, index) => {
                    const device = data.find(d => d.id === deviceId)
                    if (!device) return null
                    
                    return (
                      <Line
                        key={generateUniqueKey("line", deviceId, index)}
                        type="monotone"
                        dataKey={deviceId}
                        stroke={deviceColors[deviceId]}
                        strokeWidth={device.panicstatus || device.fallstatus ? 3 : 2}
                        dot={{ r: device.panicstatus || device.fallstatus ? 4 : 2, strokeWidth: 2 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                        name={`Device ${deviceId}`}
                        connectNulls={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uniqueDeviceIds.map((deviceId, index) => {
                const device = data.find(d => d.id === deviceId)
                if (!device) return null
                
                const isAlert = device.panicstatus || device.fallstatus
                const heartRateStatus = device.heartbeat > 100 ? "High" : device.heartbeat < 60 ? "Low" : "Normal"

                return (
                  <div
                    key={generateUniqueKey("card", deviceId, index)}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      isAlert
                        ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                        : "bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: deviceColors[deviceId] }}
                      ></div>
                      {isAlert && <Heart className="w-4 h-4 text-red-500 animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Device {deviceId}</p>
                        {device.panicstatus && (
                          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">PANIC</span>
                        )}
                        {device.fallstatus && (
                          <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">FALL</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{device.heartbeat} BPM</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            heartRateStatus === "High"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : heartRateStatus === "Low"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          }`}
                        >
                          {heartRateStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{device.location}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{device.timestamp}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
