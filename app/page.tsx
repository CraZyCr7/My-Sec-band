"use client"

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Moon, Sun, Activity, AlertTriangle, RefreshCw, Play, Pause, History, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import DeviceMap from "@/components/device-map"
import HeartbeatChart from "@/components/heartbeat-chart"
import DeviceTable from "@/components/device-table"
import { useRouter } from "next/navigation"
import { alertStorage, type AlertData } from "@/lib/alert-storage"
import { fetchDeviceData, fetchHistoricalDeviceData } from "@/lib/device-data"
import type { DeviceData } from "@/types/device-data"

export default function SafeTrackDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [data, setData] = useState<DeviceData[]>([])
  const [historicalData, setHistoricalData] = useState<DeviceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [criticalAlerts, setCriticalAlerts] = useState<AlertData[]>([])
  const [alertStats, setAlertStats] = useState<{
    totalAlerts: number
    panicAlerts: number
    fallAlerts: number
    emailsSent: number
    archivedAlerts: number
    oldestAlert: string | null
    newestAlert: string | null
    storageSize: number
  } | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const freshnessIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [totalDevices, setTotalDevices] = useState(0)
  const [uniqueHistoricalDevices, setUniqueHistoricalDevices] = useState(0)
  const [activeAlerts, setActiveAlerts] = useState(0)
  const [fallAlerts, setFallAlerts] = useState(0)
  const [avgHeartbeat, setAvgHeartbeat] = useState(0)
  const [dataChangeCount, setDataChangeCount] = useState(0)

  // Immediate authentication check
  useEffect(() => {
    const authStatus = localStorage.getItem("safetrack_auth")
    if (authStatus !== "true") {
      console.log("🔒 Immediate auth check failed, redirecting to login...")
      router.replace("/login")
      return
    }
    setIsAuthenticated(true)
    setIsCheckingAuth(false)
  }, [router])

  const allHistoricalData = useMemo(() => [...data, ...historicalData], [data, historicalData])

  const detectCriticalAlerts = useCallback(async (devices: DeviceData[]) => {
    const newAlerts: AlertData[] = []

    devices.forEach((device) => {
      const isCritical = (device.panicstatus || device.fallstatus) && device.heartbeat > 90

      if (isCritical) {
        const alertId = `${device.id}-${device.timestamp}`

        // Check if alert already exists in storage
        const existingAlerts = alertStorage.getAllAlerts()
        const existingAlert = existingAlerts.find((alert) => alert.id === alertId)

        if (!existingAlert) {
          const alert: AlertData = {
            id: alertId,
            deviceId: device.id,
            timestamp: device.timestamp,
            location: device.location,
            latitude: device.latitude,
            longitude: device.longitude,
            status: device.panicstatus ? "PANIC" : "FALL",
            heartbeat: device.heartbeat,
            coordinates: `${device.latitude}, ${device.longitude}`,
            emailSent: false,
          }

          // Save to enhanced storage system
          const saved = alertStorage.saveAlert(alert)
          if (saved) {
            newAlerts.push(alert)
            console.log(`🚨 [${new Date().toLocaleTimeString()}] Critical Alert Detected:`, alert)
          }
        }
      }
    })

    if (newAlerts.length > 0) {
      // Update local state for immediate UI updates
      setCriticalAlerts((prev: AlertData[]) => [...prev, ...newAlerts])

      // Critical alerts are now detected and stored
      // Email sending is handled by the control panel using EmailJS
      console.log(`🚨 [${new Date().toLocaleTimeString()}] ${newAlerts.length} new critical alerts detected and stored`)

      // Update alert statistics
      updateAlertStats()
    }
  }, [])

  // Added function to update alert statistics
  const updateAlertStats = useCallback(() => {
    const stats = alertStorage.getStorageStats()
    setAlertStats(stats)
  }, [])

  // Added function to navigate to control panel
  const navigateToControlPanel = () => {
    router.push("/control-panel")
  }

  // Added function to export alert data
  const exportAlertData = useCallback(() => {
    try {
      const exportData = alertStorage.exportAlerts(true)
      const blob = new Blob([exportData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `safetrack-alerts-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log("📤 Alert data exported successfully")
    } catch (error) {
      console.error("❌ Failed to export alert data:", error)
    }
  }, [])

  // Added function to cleanup old alerts
  const cleanupOldAlerts = useCallback(() => {
    try {
      const cleaned = alertStorage.cleanupOldAlerts(30)
      if (cleaned > 0) {
        // Refresh critical alerts from storage
        setCriticalAlerts(alertStorage.getAllAlerts())
        updateAlertStats()
        
        // Show success feedback
        setSuccess(`Cleaned up ${cleaned} old alerts`)
        setError(null)
      } else {
        // Show info that no cleanup was needed
        setSuccess("No old alerts to cleanup")
        setError(null)
      }
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError("Failed to cleanup old alerts")
    }
  }, [updateAlertStats])

  const loadHistoricalData = useCallback(async () => {
    try {
      const historicalDataResponse = await fetchHistoricalDeviceData()
      setHistoricalData(historicalDataResponse)
      setUniqueHistoricalDevices(new Set(historicalDataResponse.map((d) => d.id)).size)
    } catch (err) {
      setError("Failed to load historical data")
    }
  }, [])

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      try {
        const dataResponse = await fetchDeviceData(isManualRefresh) // Pass forceRefresh parameter

        
        // Check if data has changed
        const hasDataChanged = JSON.stringify(dataResponse) !== JSON.stringify(data)
        
        setData(dataResponse)
        setLastUpdate(new Date())
        setTotalDevices(dataResponse.length)
        setActiveAlerts(dataResponse.filter((d) => d.panicstatus || d.fallstatus).length)
        setFallAlerts(dataResponse.filter((d) => d.fallstatus).length)
        setAvgHeartbeat(
          dataResponse.length > 0
            ? Math.round(dataResponse.reduce((sum, d) => sum + d.heartbeat, 0) / dataResponse.length)
            : 0,
        )
        
        // If data changed, increment counter and show notification
        if (hasDataChanged && data.length > 0) {
          setDataChangeCount(prev => prev + 1)
          console.log("🔄 New data detected from Python script!")
        }
        
        detectCriticalAlerts(dataResponse)
      } catch (err) {
        setError("Failed to fetch data")
      } finally {
        setLoading(false)
      }
    },
    [detectCriticalAlerts],
  )

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled((prev: boolean) => !prev)
  }, [])

  const handleManualRefresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  // Function to check if data is fresh (within last 10 seconds)
  const isDataFresh = useCallback(() => {
    if (!lastUpdate) return false
    const now = new Date()
    const timeDiff = now.getTime() - lastUpdate.getTime()
    return timeDiff < 10000 // 10 seconds
  }, [lastUpdate])

  // Function to force refresh if data is stale
  const checkDataFreshness = useCallback(() => {
    if (!isDataFresh() && isAuthenticated) {
      console.log("🔄 Data is stale, refreshing...")
      fetchData(true)
    }
  }, [isDataFresh, isAuthenticated, fetchData])

  const clearCache = useCallback(() => {
    try {
      // Clear device data cache
      localStorage.removeItem("safetrack_device_data")
      localStorage.removeItem("safetrack_historical_data")
      
      // Clear alert storage
      localStorage.removeItem("safetrack_alerts")
      localStorage.removeItem("safetrack_archived_alerts")
      
      // Reset local state
      setData([])
      setHistoricalData([])
      setCriticalAlerts([])
      
      // Update stats
      updateAlertStats()
      
      // Show success feedback
      setSuccess("Cache cleared successfully")
      setError(null)
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
      
      // Force a fresh data fetch after clearing cache
      fetchData(true)
    } catch (error) {
      setError("Failed to clear cache")
    }
  }, [fetchData, updateAlertStats])

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev: boolean) => {
      const newMode = !prev
      // Update localStorage with the new mode
      localStorage.setItem("safetrack_theme", newMode ? "dark" : "light")
      // Apply the theme to HTML element
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", newMode)
      }
      return newMode
    })
  }, [])

  const setTheme = useCallback((theme: "light" | "dark" | "system") => {
    let isDark = false
    
    if (theme === "system") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    } else {
      isDark = theme === "dark"
    }
    
    setDarkMode(isDark)
    localStorage.setItem("safetrack_theme", theme)
    
    // Apply the theme to HTML element
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark)
    }
  }, [])

  const handleLogout = useCallback(() => {
    // Clear all cache and data on logout
    try {
      // Clear device data cache
      localStorage.removeItem("safetrack_device_data")
      localStorage.removeItem("safetrack_historical_data")
      
      // Clear alert storage
      localStorage.removeItem("safetrack_alerts")
      localStorage.removeItem("safetrack_archived_alerts")
      
      // Clear authentication
      localStorage.removeItem("safetrack_auth")
      setIsAuthenticated(false)
      router.push("/login")
    } catch (error) {
      console.error("Failed to clear data on logout:", error)
      // Still logout even if clearing fails
      localStorage.removeItem("safetrack_auth")
      setIsAuthenticated(false)
      router.push("/login")
    }
  }, [router])

  const clearAllDataOnStartup = useCallback(() => {
    try {
      // Clear device data cache
      localStorage.removeItem("safetrack_device_data")
      localStorage.removeItem("safetrack_historical_data")
      
      // Clear alert storage
      localStorage.removeItem("safetrack_alerts")
      localStorage.removeItem("safetrack_archived_alerts")
      
      // Reset local state
      setData([])
      setHistoricalData([])
      setCriticalAlerts([])
      
      // Update stats
      updateAlertStats()
      
      console.log("🧹 All cache and previous data cleared on startup")
    } catch (error) {
      console.error("Failed to clear data on startup:", error)
    }
  }, [updateAlertStats])

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  // Utility function to generate unique keys
  const generateUniqueKey = useCallback((prefix: string, id: string, timestamp: string, index: number) => {
    return `${prefix}-${id}-${timestamp}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add event listener to clear cache when page is refreshed or closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.removeItem("safetrack_device_data")
        localStorage.removeItem("safetrack_historical_data")
        localStorage.removeItem("safetrack_alerts")
        localStorage.removeItem("safetrack_archived_alerts")
      } catch (error) {
        // Silent fail
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, []) // Empty dependency array means this runs only once on mount

  // Initialize theme from localStorage and apply to HTML element
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("safetrack_theme") as "light" | "dark" | "system" | null
      let isDark = false
      
      if (savedTheme === "system" || !savedTheme) {
        // Check system preference
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        if (!savedTheme) {
          localStorage.setItem("safetrack_theme", "system")
        }
      } else {
        isDark = savedTheme === "dark"
      }
      
      setDarkMode(isDark)
      // Apply theme to HTML element immediately
      document.documentElement.classList.toggle("dark", isDark)
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        if (localStorage.getItem("safetrack_theme") === "system") {
          setDarkMode(e.matches)
          document.documentElement.classList.toggle("dark", e.matches)
        }
      }
      
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  // Apply theme to HTML element when darkMode changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", darkMode)
    }
  }, [darkMode])

  useEffect(() => {
    // Check authentication status on component mount
    const authStatus = localStorage.getItem("safetrack_auth")
    if (authStatus === "true") {
      setIsAuthenticated(true)
      
      loadHistoricalData()
      // Load existing critical alerts and stats on startup
      setCriticalAlerts(alertStorage.getAllAlerts())
      updateAlertStats()

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      fetchData()

      if (isAutoRefreshEnabled) {
        intervalRef.current = setInterval(() => {
          fetchData(true) // Pass true to indicate manual refresh
        }, 5000)
        
        // Add a more frequent data freshness check (every 2 seconds)
        freshnessIntervalRef.current = setInterval(() => {
          checkDataFreshness()
        }, 2000)
      }
    } else {
      // If not authenticated, redirect to login immediately
      console.log("🔒 Not authenticated, redirecting to login...")
      router.replace("/login")
      return
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (freshnessIntervalRef.current) {
        clearInterval(freshnessIntervalRef.current)
        freshnessIntervalRef.current = null
      }
    }
  }, [isAutoRefreshEnabled, fetchData, loadHistoricalData, updateAlertStats, router])

  // Add visibility change listener to refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // Page became visible, refresh data to get latest from Python script
        console.log("📱 Page became visible, refreshing data...")
        fetchData(true)
        loadHistoricalData()
        setCriticalAlerts(alertStorage.getAllAlerts())
        updateAlertStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, fetchData, loadHistoricalData, updateAlertStats])

  // Add focus event listener to refresh data when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        // Window gained focus, refresh data
        console.log("🪟 Window gained focus, refreshing data...")
        fetchData(true)
        loadHistoricalData()
        setCriticalAlerts(alertStorage.getAllAlerts())
        updateAlertStats()
      }
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated, fetchData, loadHistoricalData, updateAlertStats])

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show loading state if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    SafeTrack Dashboard
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Security Band Monitoring</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end flex-wrap gap-2">
                <div className="flex items-center space-x-3 flex-wrap gap-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isAutoRefreshEnabled ? "bg-green-500 animate-pulse" : "bg-slate-400"
                      }`}
                    ></div>
                    <span className="text-slate-600 dark:text-slate-300">
                      {isAutoRefreshEnabled ? "Live" : "Paused"}
                    </span>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    📚 {historicalData.length} records
                  </Badge>

                  {/* Added critical alerts badge */}
                  <Badge variant="destructive" className="text-xs">
                    🚨 {criticalAlerts.length} critical
                  </Badge>

                  {lastUpdate && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  {/* Data freshness indicator */}
                  <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className={`w-2 h-2 rounded-full ${lastUpdate ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span>
                      {lastUpdate ? `Last: ${lastUpdate.toLocaleTimeString()}` : 'No data'}
                    </span>
                    {dataChangeCount > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        🔄 {dataChangeCount} updates
                      </Badge>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" onClick={toggleAutoRefresh} className="w-9 h-9 p-0">
                    {isAutoRefreshEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={loading}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    <span className="text-xs font-medium">Refresh</span>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearCache} 
                    className="w-9 h-9 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors" 
                    title="Clear Cache"
                  >
                    🗑️
                  </Button>

                  {/* Added export alerts button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportAlertData}
                    className="w-9 h-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Export Alerts"
                  >
                    📤
                  </Button>

                  {/* Added cleanup alerts button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cleanupOldAlerts}
                    className="w-9 h-9 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    title="Cleanup Old Alerts"
                  >
                    🧹
                  </Button>

                  {/* Added control panel navigation button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToControlPanel}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-medium">Control Panel</span>
                  </Button>

                  <div className="relative group">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleDarkMode}
                      className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 dark:from-yellow-400 dark:to-orange-500 text-white dark:text-slate-900 border-0 hover:shadow-lg transition-all duration-300 transform hover:scale-105 px-3 py-2 rounded-full"
                    >
                      <div className="flex items-center gap-2">
                        {darkMode ? (
                          <>
                            <Sun className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-medium">Light</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-4 h-4 animate-pulse" />
                            <span className="text-xs font-medium">Dark</span>
                          </>
                        )}
                      </div>
                    </Button>
                    
                    {/* Theme dropdown menu */}
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() => setTheme("light")}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          ☀️ Light
                        </button>
                        <button
                          onClick={() => setTheme("dark")}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          🌙 Dark
                        </button>
                        <button
                          onClick={() => setTheme("system")}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          💻 System
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs bg-transparent">
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">






          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300">Error</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                </div>
                <button
                  onClick={clearMessages}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-300">Success</p>
                    <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                  </div>
                </div>
                <button
                  onClick={clearMessages}
                  className="text-green-400 hover:text-green-600 dark:hover:text-green-300"
                >
                  ×
                </button>
              </div>
            </div>
          )}



          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalDevices}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{uniqueHistoricalDevices} historical</div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{activeAlerts}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {allHistoricalData.filter((d: DeviceData) => d.panicstatus || d.fallstatus).length} total alerts
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Fall Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{fallAlerts}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {allHistoricalData.filter((d: DeviceData) => d.fallstatus).length} total falls
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Avg Heartbeat</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {avgHeartbeat > 0 ? `${avgHeartbeat} BPM` : "-- BPM"}
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading device data...</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">This may take a few seconds</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <DeviceMap data={allHistoricalData} className="lg:col-span-3 xl:col-span-3" />

            <div className="space-y-6">
              <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>Live Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {allHistoricalData.filter((d: DeviceData) => d.panicstatus || d.fallstatus).length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No active alerts</p>
                    ) : (
                      allHistoricalData
                        .filter((d: DeviceData) => d.panicstatus || d.fallstatus)
                        .map((device: DeviceData, index: number) => (
                          <div
                            key={generateUniqueKey("current", device.id, device.timestamp, index)}
                            className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-red-700 dark:text-red-300">
                                  {device.panicstatus ? "PANIC" : "FALL"} - {device.id}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{device.location}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">{device.timestamp}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{device.heartbeat} BPM</p>
                                <Badge variant="destructive" className="text-xs">
                                  LIVE
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="w-5 h-5 text-orange-500" />
                    <span>Previous Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {allHistoricalData.filter((d: DeviceData) => d.panicstatus || d.fallstatus).length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No previous alerts</p>
                    ) : (
                      allHistoricalData
                        .filter((d: DeviceData) => d.panicstatus || d.fallstatus)
                        .sort((a: DeviceData, b: DeviceData) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 10)
                        .map((device: DeviceData, index: number) => (
                          <div
                            key={generateUniqueKey("historical", device.id, device.timestamp, index)}
                            className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-orange-700 dark:text-orange-300">
                                  {device.panicstatus ? "PANIC" : "FALL"} - {device.id}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{device.location}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  {new Date(device.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{device.heartbeat} BPM</p>
                                <Badge variant="outline" className="text-xs">
                                  PAST
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>Critical Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {criticalAlerts.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No critical alerts</p>
                    ) : (
                      criticalAlerts
                        .sort((a: AlertData, b: AlertData) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 10)
                        .map((alert: AlertData, index: number) => (
                          <div
                            key={generateUniqueKey("critical", alert.id, alert.timestamp, index)}
                            className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-red-700 dark:text-red-300">
                                  {alert.status} - {alert.deviceId}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{alert.location}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  {new Date(alert.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{alert.heartbeat} BPM</p>
                                <Badge variant="destructive" className="text-xs">
                                  CRITICAL
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          )}

          {!loading && (
            <>
              <div className="mt-6">
                <HeartbeatChart data={allHistoricalData} />
              </div>

              <div className="mt-6">
                <DeviceTable data={allHistoricalData} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
