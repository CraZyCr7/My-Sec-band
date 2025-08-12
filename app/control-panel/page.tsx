"use client"

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'

import { useState, useEffect, useCallback } from "react"
import { Moon, Sun, Activity, AlertTriangle, RefreshCw, Mail, MailCheck, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { alertStorage } from "@/lib/alert-storage"
import emailjs from '@emailjs/browser'

export default function ControlPanelDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("safetrack_theme")
      return saved === "dark"
    }
    return false
  })
  const [storageStats, setStorageStats] = useState<any | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem("safetrack_auth")
      if (authStatus === "true") {
        setIsAuthenticated(true)
      } else {
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    localStorage.setItem("safetrack_theme", darkMode ? "dark" : "light")
  }, [darkMode])

  const loadCriticalAlerts = useCallback(() => {
    try {
      const alerts = alertStorage.getAllAlerts()
      setCriticalAlerts(alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))

      // Load storage statistics
      const stats = alertStorage.getStorageStats()
      setStorageStats(stats)

      setLastUpdate(new Date())
      console.log(`📊 [${new Date().toLocaleTimeString()}] Loaded ${alerts.length} critical alerts`)
    } catch (error) {
      console.error("❌ Failed to load critical alerts:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearAllAlerts = useCallback(() => {
    if (confirm("Are you sure you want to clear all critical alerts? This action cannot be undone.")) {
      alertStorage.clearAllAlerts()
      setCriticalAlerts([])
      setStorageStats(alertStorage.getStorageStats())
      setLastUpdate(new Date())
      console.log(`🗑️ [${new Date().toLocaleTimeString()}] All critical alerts cleared`)
    }
  }, [])

  const exportAlerts = useCallback(() => {
    try {
      const exportData = alertStorage.exportAlerts(true)
      const blob = new Blob([exportData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `safetrack-control-panel-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log("📤 Control panel data exported successfully")
    } catch (error) {
      console.error("❌ Failed to export data:", error)
    }
  }, [])

  // Send email for a specific alert using EmailJS directly
  const sendAlertEmail = useCallback(async (alertData: any) => {
    try {
              console.log(`📧 Sending email for alert: ${alertData.deviceId} - ${alertData.status}`)
        
        // Initialize EmailJS with your public key
        emailjs.init("B88SJXqcp_WB33ku_")
        
        const templateParams = {
          to_email: "as970789@gmail.com",
          subject: `🚨 CRITICAL ALERT: ${alertData.status} Detected - Device ${alertData.deviceId}`,
          device_id: alertData.deviceId,
          status: alertData.status,
          location: alertData.location,
          heartbeat: alertData.heartbeat,
          coordinates: alertData.coordinates,
          timestamp: alertData.timestamp,
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc2626; border-radius: 8px; background-color: #fef2f2;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0; font-size: 24px;">🚨 CRITICAL SAFETY ALERT</h1>
              <p style="color: #7f1d1d; margin: 5px 0; font-size: 16px;">SafeTrack Security Band System</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h2 style="color: #dc2626; margin-top: 0;">Alert Details</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 10px 0; font-weight: bold; color: #374151;">Device ID:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${alertData.deviceId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 10px 0; font-weight: bold; color: #374151;">Status:</td>
                  <td style="padding: 10px 0;">
                    <span style="background-color: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                      ${alertData.status}
                    </span>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 10px 0; font-weight: bold; color: #374151;">Location:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${alertData.location}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 10px 0; font-weight: bold; color: #374151;">Heartbeat:</td>
                  <td style="padding: 10px 0;">
                    <span style="color: #dc2626; font-weight: bold; font-size: 18px;">${alert.heartbeat} BPM</span>
                    <span style="color: #7f1d1d; margin-left: 10px;">(Critical: >90 BPM)</span>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 10px 0; font-weight: bold; color: #374151;">Coordinates:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${alert.coordinates}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #374151;">Timestamp:</td>
                  <td style="padding: 10px 0; color: #1f2937;">${alert.timestamp}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">Immediate Action Required</h3>
              <p style="color: #78350f; margin: 0;">
                This is a critical safety alert requiring immediate attention. Please verify the status of the individual 
                and dispatch emergency services if necessary.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This alert was generated automatically by the SafeTrack Security Band System<br>
                Generated at: ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        `,
        text_content: `
CRITICAL SAFETY ALERT - SafeTrack Security Band System

Alert Details:
- Device ID: ${alert.deviceId}
- Status: ${alert.status}
- Location: ${alert.location}
- Heartbeat: ${alert.heartbeat} BPM (Critical: >90 BPM)
- Coordinates: ${alert.coordinates}
- Timestamp: ${alert.timestamp}

IMMEDIATE ACTION REQUIRED
This is a critical safety alert requiring immediate attention. Please verify the status of the individual and dispatch emergency services if necessary.

Generated at: ${new Date().toLocaleString()}
        `,
        alert_type: alert.status === "PANIC" ? "🚨 PANIC ALERT" : "⚠️ FALL ALERT",
        priority: alert.status === "PANIC" ? "HIGH" : "MEDIUM"
      }

      // Send email using EmailJS
      const result = await emailjs.send(
        "service_9pp32yv",           // Service ID
        "template_iqb5ops",          // Template ID
        templateParams,
        "B88SJXqcp_WB33ku_"         // Public Key
      )
      
      if (result.status === 200) {
        // Mark alert as email sent in storage
        alertStorage.markEmailSent(alert.id)
        
        // Update local state
        setCriticalAlerts(prev => 
          prev.map(a => 
            a.id === alert.id 
              ? { ...a, emailSent: true, emailSentAt: new Date().toISOString() }
              : a
          )
        )
        
        console.log(`✅ Email sent successfully for device ${alert.deviceId}`)
        
        // Show success message
        alert(`✅ Email sent successfully to as970789@gmail.com`)
      } else {
        throw new Error(`EmailJS error: ${result.status}`)
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      alert(`❌ Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  // Send emails for all pending alerts
  const sendAllPendingEmails = useCallback(async () => {
    const pendingAlerts = criticalAlerts.filter(alert => !alert.emailSent)
    
    if (pendingAlerts.length === 0) {
      alert('✅ All alerts have already been emailed!')
      return
    }

    if (!confirm(`Send emails for ${pendingAlerts.length} pending alerts?`)) {
      return
    }

    try {
      console.log(`📧 Sending emails for ${pendingAlerts.length} pending alerts`)
      
      let successCount = 0
      let failCount = 0

      for (const alertItem of pendingAlerts) {
        try {
          await sendAlertEmail(alertItem)
          successCount++
          
          // Small delay between emails to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          failCount++
          console.error(`Failed to send email for alert ${alertItem.id}:`, error)
        }
      }

      const message = `📧 Email sending completed!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`
      alert(message)
      
      // Reload alerts to get updated email status
      loadCriticalAlerts()
      
    } catch (error) {
      console.error('❌ Bulk email sending failed:', error)
      alert(`❌ Bulk email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [criticalAlerts, sendAlertEmail, loadCriticalAlerts])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const handleLogout = () => {
    localStorage.removeItem("safetrack_auth")
    setIsAuthenticated(false)
    router.push("/login")
  }

  const navigateToMainDashboard = () => {
    router.push("/")
  }

  useEffect(() => {
    loadCriticalAlerts()

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadCriticalAlerts, 10000)
    return () => clearInterval(interval)
  }, [loadCriticalAlerts])

  const totalAlerts = criticalAlerts.length
  const panicAlerts = criticalAlerts.filter((alertItem) => alertItem.status === "PANIC").length
  const fallAlerts = criticalAlerts.filter((alertItem) => alertItem.status === "FALL").length
  const emailsSent = criticalAlerts.filter((alertItem) => alertItem.emailSent).length
  const avgHeartbeat =
    totalAlerts > 0 ? Math.round(criticalAlerts.reduce((sum, alertItem) => sum + alertItem.heartbeat, 0) / totalAlerts) : 0

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    Control Panel
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Critical Alert Management</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">
                    📊 {totalAlerts} alerts
                  </Badge>

                  <Badge variant="outline" className="text-xs">
                    📧 {emailsSent} sent
                  </Badge>

                  {lastUpdate && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadCriticalAlerts}
                    disabled={loading}
                    className="w-9 h-9 p-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllAlerts}
                    className="w-9 h-9 p-0"
                    title="Clear All Alerts"
                  >
                    🗑️
                  </Button>

                  {/* Add export button to the control panel navigation */}
                  <Button variant="ghost" size="sm" onClick={exportAlerts} className="w-9 h-9 p-0" title="Export Data">
                    📤
                  </Button>

                  {/* Add bulk email button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={sendAllPendingEmails} 
                    className="w-9 h-9 p-0 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20" 
                    title={`Send All Pending Emails (${criticalAlerts.filter(alert => !alert.emailSent).length})`}
                    disabled={criticalAlerts.filter(alert => !alert.emailSent).length === 0}
                  >
                    📧
                  </Button>

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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToMainDashboard}
                    className="text-xs bg-transparent"
                  >
                    Main Dashboard
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs bg-transparent">
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Total Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalAlerts}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">All time</div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Panic Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{panicAlerts}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {totalAlerts > 0 ? Math.round((panicAlerts / totalAlerts) * 100) : 0}% of total
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Fall Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{fallAlerts}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {totalAlerts > 0 ? Math.round((fallAlerts / totalAlerts) * 100) : 0}% of total
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Avg Critical Heartbeat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {avgHeartbeat > 0 ? `${avgHeartbeat} BPM` : "-- BPM"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Above 90 BPM threshold</div>
              </CardContent>
            </Card>
          </div>

          {/* Add storage statistics display */}
          {storageStats && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Storage Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Total Size:</span>
                  <span className="ml-2 font-medium">{Math.round(storageStats.storageSize / 1024)} KB</span>
                </div>
                <div>
                  <span className="text-slate-500">Archived:</span>
                  <span className="ml-2 font-medium">{storageStats.archivedAlerts}</span>
                </div>
                <div>
                  <span className="text-slate-500">Oldest:</span>
                  <span className="ml-2 font-medium">
                    {storageStats.oldestAlert ? new Date(storageStats.oldestAlert).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Newest:</span>
                  <span className="ml-2 font-medium">
                    {storageStats.newestAlert ? new Date(storageStats.newestAlert).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Recent Critical Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {criticalAlerts.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                      No critical alerts recorded
                    </p>
                  ) : (
                    criticalAlerts.slice(0, 10).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="destructive" className="text-xs">
                                {alert.status}
                              </Badge>
                              <span className="font-semibold text-red-700 dark:text-red-300">
                                Device {alert.deviceId}
                              </span>
                              {alert.emailSent ? (
                                <MailCheck className="w-4 h-4 text-green-600" title="Email sent" />
                              ) : (
                                <Mail className="w-4 h-4 text-slate-400" title="Email not sent" />
                              )}
                            </div>

                            <div className="space-y-1 text-sm">
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-600 dark:text-slate-400">{alert.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Activity className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-600 dark:text-slate-400">{alert.heartbeat} BPM</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-600 dark:text-slate-400">
                                  {new Date(alert.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            <strong>Coordinates:</strong> {alert.coordinates}
                          </div>
                          
                          {/* Email Action Buttons */}
                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {alert.emailSent ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <MailCheck className="w-3 h-3" />
                                  Email sent
                                </span>
                              ) : (
                                <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  Email pending
                                </span>
                              )}
                            </div>
                            
                            {!alert.emailSent && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendAlertEmail(alert)}
                                className="text-xs h-7 px-2 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
                              >
                                <Mail className="w-3 h-3 mr-1" />
                                Send Email
                              </Button>
                            )}
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
                  <Mail className="w-5 h-5 text-blue-500" />
                  <span>Email Notification Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{emailsSent}</div>
                      <div className="text-xs text-green-700 dark:text-green-300">Emails Sent</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {totalAlerts - emailsSent}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300">Pending</div>
                    </div>
                  </div>

                  {/* Bulk Email Actions */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-700 dark:text-blue-300">Bulk Email Actions</h4>
                      <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                        {criticalAlerts.filter(alert => !alert.emailSent).length} pending
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Button
                        size="sm"
                        onClick={sendAllPendingEmails}
                        disabled={criticalAlerts.filter(alert => !alert.emailSent).length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Send All Pending Emails
                      </Button>
                      

                    </div>
                    
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Send all pending emails to notify about critical alerts
                    </div>
                    
                    {/* Email Configuration Info */}
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <strong>Email Configuration:</strong><br/>
                        • Recipient: as970789@gmail.com<br/>
                        • Service: SafeTrack Email Alert System<br/>
                        • Format: HTML + Plain Text<br/>
                        • Auto-generated from device data
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-700 dark:text-slate-300">Recent Email Activity</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {criticalAlerts
                        .filter((alert) => alert.emailSent)
                        .slice(0, 5)
                        .map((alert) => (
                          <div
                            key={`email-${alert.id}`}
                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <MailCheck className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {alert.deviceId} - {alert.status}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}

                      {criticalAlerts
                        .filter((alert) => !alert.emailSent)
                        .slice(0, 3)
                        .map((alert) => (
                          <div
                            key={`pending-${alert.id}`}
                            className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-orange-600" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {alert.deviceId} - {alert.status}
                              </span>
                            </div>
                            <span className="text-xs text-orange-600">Pending</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>All Critical Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left p-2 font-medium text-slate-600 dark:text-slate-300">Device ID</th>
                        <th className="text-left p-2 font-medium text-slate-600 dark:text-slate-300">Status</th>
                        <th className="text-left p-2 font-medium text-slate-600 dark:text-slate-300">Location</th>
                        <th className="text-left p-2 font-medium text-slate-600 dark:text-slate-300">Heartbeat</th>
                        <th className="text-left p-2 font-medium text-slate-600 dark:text-slate-300">Coordinates</th>
                        <th className="text-left p-2 font-medium text-slate-600 dark:text-slate-300">Timestamp</th>
                        <th className="text-left p-2 font-medium text-slate-600 dark:text-slate-300">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criticalAlerts.map((alert) => (
                        <tr
                          key={alert.id}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="p-2 font-medium text-slate-900 dark:text-white">{alert.deviceId}</td>
                          <td className="p-2">
                            <Badge variant={alert.status === "PANIC" ? "destructive" : "default"} className="text-xs">
                              {alert.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{alert.location}</td>
                          <td className="p-2 font-medium text-red-600 dark:text-red-400">{alert.heartbeat} BPM</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400 font-mono text-xs">
                            {alert.coordinates}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">
                            {new Date(alert.timestamp).toLocaleString()}
                          </td>
                          <td className="p-2">
                            {alert.emailSent ? (
                              <MailCheck className="w-4 h-4 text-green-600" />
                            ) : (
                              <Mail className="w-4 h-4 text-slate-400" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {criticalAlerts.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-500 dark:text-slate-400">No critical alerts to display</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
