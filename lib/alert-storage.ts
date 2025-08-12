interface AlertData {
  id: string
  deviceId: string
  timestamp: string
  location: string
  latitude: number
  longitude: number
  status: "PANIC" | "FALL"
  heartbeat: number
  coordinates: string
  emailSent: boolean
  archived?: boolean
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

interface StorageStats {
  totalAlerts: number
  panicAlerts: number
  fallAlerts: number
  emailsSent: number
  archivedAlerts: number
  oldestAlert: string | null
  newestAlert: string | null
  storageSize: number
}

class AlertStorageManager {
  private readonly STORAGE_KEY = "safetrack_critical_alerts"
  private readonly ARCHIVED_KEY = "safetrack_archived_alerts"
  private readonly MAX_ACTIVE_ALERTS = 1000
  private readonly MAX_ARCHIVED_ALERTS = 5000

  // Save alert to storage
  saveAlert(alert: AlertData): boolean {
    try {
      const existingAlerts = this.getAllAlerts()

      // Check for duplicates
      const isDuplicate = existingAlerts.some((existing) => existing.id === alert.id)
      if (isDuplicate) {
        console.warn(`⚠️ Duplicate alert detected: ${alert.id}`)
        return false
      }

      // Add severity classification
      alert.severity = this.classifyAlertSeverity(alert)

      // Add to storage
      const updatedAlerts = [alert, ...existingAlerts]

      // Auto-archive old alerts if limit exceeded
      if (updatedAlerts.length > this.MAX_ACTIVE_ALERTS) {
        const alertsToArchive = updatedAlerts.slice(this.MAX_ACTIVE_ALERTS)
        this.archiveAlerts(alertsToArchive)
        const activeAlerts = updatedAlerts.slice(0, this.MAX_ACTIVE_ALERTS)
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeAlerts))
      } else {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAlerts))
      }

      console.log(`💾 Alert saved: ${alert.deviceId} - ${alert.status}`)
      return true
    } catch (error) {
      console.error("❌ Failed to save alert:", error)
      return false
    }
  }

  // Get all active alerts
  getAllAlerts(): AlertData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("❌ Failed to load alerts:", error)
      return []
    }
  }

  // Get alerts by device ID
  getAlertsByDevice(deviceId: string): AlertData[] {
    return this.getAllAlerts().filter((alert) => alert.deviceId === deviceId)
  }

  // Get alerts by status
  getAlertsByStatus(status: "PANIC" | "FALL"): AlertData[] {
    return this.getAllAlerts().filter((alert) => alert.status === status)
  }

  // Get alerts by date range
  getAlertsByDateRange(startDate: Date, endDate: Date): AlertData[] {
    return this.getAllAlerts().filter((alert) => {
      const alertDate = new Date(alert.timestamp)
      return alertDate >= startDate && alertDate <= endDate
    })
  }

  // Archive alerts
  archiveAlerts(alerts: AlertData[]): boolean {
    try {
      const existingArchived = this.getArchivedAlerts()
      const updatedArchived = [...alerts.map((alert) => ({ ...alert, archived: true })), ...existingArchived]

      // Limit archived alerts
      const limitedArchived = updatedArchived.slice(0, this.MAX_ARCHIVED_ALERTS)

      localStorage.setItem(this.ARCHIVED_KEY, JSON.stringify(limitedArchived))
      console.log(`📦 Archived ${alerts.length} alerts`)
      return true
    } catch (error) {
      console.error("❌ Failed to archive alerts:", error)
      return false
    }
  }

  // Get archived alerts
  getArchivedAlerts(): AlertData[] {
    try {
      const stored = localStorage.getItem(this.ARCHIVED_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("❌ Failed to load archived alerts:", error)
      return []
    }
  }

  // Delete alert by ID
  deleteAlert(alertId: string): boolean {
    try {
      const alerts = this.getAllAlerts()
      const updatedAlerts = alerts.filter((alert) => alert.id !== alertId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAlerts))
      console.log(`🗑️ Alert deleted: ${alertId}`)
      return true
    } catch (error) {
      console.error("❌ Failed to delete alert:", error)
      return false
    }
  }

  // Clear all alerts
  clearAllAlerts(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log("🗑️ All alerts cleared")
      return true
    } catch (error) {
      console.error("❌ Failed to clear alerts:", error)
      return false
    }
  }

  // Clear archived alerts
  clearArchivedAlerts(): boolean {
    try {
      localStorage.removeItem(this.ARCHIVED_KEY)
      console.log("🗑️ All archived alerts cleared")
      return true
    } catch (error) {
      console.error("❌ Failed to clear archived alerts:", error)
      return false
    }
  }

  // Export alerts to JSON
  exportAlerts(includeArchived = false): string {
    const activeAlerts = this.getAllAlerts()
    const archivedAlerts = includeArchived ? this.getArchivedAlerts() : []

    const exportData = {
      exportDate: new Date().toISOString(),
      activeAlerts,
      archivedAlerts,
      stats: this.getStorageStats(),
    }

    return JSON.stringify(exportData, null, 2)
  }

  // Import alerts from JSON
  importAlerts(jsonData: string): boolean {
    try {
      const importData = JSON.parse(jsonData)

      if (importData.activeAlerts && Array.isArray(importData.activeAlerts)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(importData.activeAlerts))
      }

      if (importData.archivedAlerts && Array.isArray(importData.archivedAlerts)) {
        localStorage.setItem(this.ARCHIVED_KEY, JSON.stringify(importData.archivedAlerts))
      }

      console.log("📥 Alerts imported successfully")
      return true
    } catch (error) {
      console.error("❌ Failed to import alerts:", error)
      return false
    }
  }

  // Get storage statistics
  getStorageStats(): StorageStats {
    const activeAlerts = this.getAllAlerts()
    const archivedAlerts = this.getArchivedAlerts()
    const allAlerts = [...activeAlerts, ...archivedAlerts]

    const timestamps = allAlerts.map((alert) => alert.timestamp).sort()

    return {
      totalAlerts: allAlerts.length,
      panicAlerts: allAlerts.filter((alert) => alert.status === "PANIC").length,
      fallAlerts: allAlerts.filter((alert) => alert.status === "FALL").length,
      emailsSent: allAlerts.filter((alert) => alert.emailSent).length,
      archivedAlerts: archivedAlerts.length,
      oldestAlert: timestamps.length > 0 ? timestamps[0] : null,
      newestAlert: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
      storageSize: this.calculateStorageSize(),
    }
  }

  // Classify alert severity
  private classifyAlertSeverity(alert: AlertData): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (alert.heartbeat > 120) return "CRITICAL"
    if (alert.heartbeat > 100) return "HIGH"
    if (alert.heartbeat > 90) return "MEDIUM"
    return "LOW"
  }

  // Calculate storage size in bytes
  private calculateStorageSize(): number {
    try {
      const activeData = localStorage.getItem(this.STORAGE_KEY) || ""
      const archivedData = localStorage.getItem(this.ARCHIVED_KEY) || ""
      return new Blob([activeData + archivedData]).size
    } catch {
      return 0
    }
  }

  // Cleanup old alerts (older than specified days)
  cleanupOldAlerts(daysToKeep = 30): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const alerts = this.getAllAlerts()
    const alertsToKeep = alerts.filter((alert) => new Date(alert.timestamp) >= cutoffDate)
    const alertsToArchive = alerts.filter((alert) => new Date(alert.timestamp) < cutoffDate)

    if (alertsToArchive.length > 0) {
      this.archiveAlerts(alertsToArchive)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(alertsToKeep))
      console.log(`🧹 Cleaned up ${alertsToArchive.length} old alerts`)
    }

    return alertsToArchive.length
  }

  // Mark alert as email sent
  markEmailSent(alertId: string): boolean {
    try {
      const alerts = this.getAllAlerts()
      const alertIndex = alerts.findIndex(alert => alert.id === alertId)
      
      if (alertIndex === -1) {
        console.warn(`⚠️ Alert not found: ${alertId}`)
        return false
      }
      
      // Update the alert
      alerts[alertIndex].emailSent = true
      
      // Save back to storage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(alerts))
      
      console.log(`📧 Marked alert ${alertId} as email sent`)
      return true
    } catch (error) {
      console.error("❌ Failed to mark alert as email sent:", error)
      return false
    }
  }

  // Validate alert data
  validateAlert(alert: any): alert is AlertData {
    return (
      typeof alert === "object" &&
      typeof alert.id === "string" &&
      typeof alert.deviceId === "string" &&
      typeof alert.timestamp === "string" &&
      typeof alert.location === "string" &&
      typeof alert.latitude === "number" &&
      typeof alert.longitude === "number" &&
      (alert.status === "PANIC" || alert.status === "FALL") &&
      typeof alert.heartbeat === "number" &&
      typeof alert.coordinates === "string" &&
      typeof alert.emailSent === "boolean"
    )
  }
}

// Export singleton instance
export const alertStorage = new AlertStorageManager()
export type { AlertData, StorageStats }
