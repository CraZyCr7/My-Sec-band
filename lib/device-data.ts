import type { DeviceData } from "@/types/device-data"

// API endpoint - replace with your actual AWS API Gateway URL
// NOTE: "defalut2" might be a typo - should probably be "default2"
const API_ENDPOINT = "https://ti02feperh.execute-api.us-east-1.amazonaws.com/defalut2/get_Function_IOT_Core"



// Cache configuration
const CACHE_KEY = "safetrack_device_data"
const HISTORICAL_CACHE_KEY = "safetrack_historical_data"
const CACHE_EXPIRY_MS = 3000 // 3 seconds cache expiry (shorter than 5s refresh interval)

interface CacheData {
  data: DeviceData[]
  timestamp: number
  lastUpdate: string
}

// Load data from cache
function loadFromCache(): CacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const cacheData: CacheData = JSON.parse(cached)
    const age = Date.now() - cacheData.timestamp

    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return cacheData
  } catch (error) {

    return null
  }
}

// Save data to cache
function saveToCache(deviceData: DeviceData[], updateTime: Date): void {
  try {
    const cacheData: CacheData = {
      data: deviceData,
      timestamp: Date.now(),
      lastUpdate: updateTime.toISOString(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {

  }
}

// Save historical data
function saveHistoricalData(newData: DeviceData[]): void {
  try {
    const existing = localStorage.getItem(HISTORICAL_CACHE_KEY)
    let historicalArray: DeviceData[] = existing ? JSON.parse(existing) : []

    newData.forEach((device) => {
      const existingIndex = historicalArray.findIndex((h) => h.id === device.id && h.timestamp === device.timestamp)
      if (existingIndex === -1) {
        historicalArray.push({
          ...device,
          timestamp: device.timestamp || new Date().toISOString(),
        })
      }
    })

    // Group by device ID and keep only latest 100 records per device
    const deviceGroups = historicalArray.reduce(
      (acc, item) => {
        if (!acc[item.id]) acc[item.id] = []
        acc[item.id].push(item)
        return acc
      },
      {} as Record<string, DeviceData[]>,
    )

    historicalArray = Object.values(deviceGroups).flatMap((group) =>
      group.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100),
    )

    localStorage.setItem(HISTORICAL_CACHE_KEY, JSON.stringify(historicalArray))
  } catch (error) {

  }
}

// Fetch device data from API
export async function fetchDeviceData(forceRefresh = false): Promise<DeviceData[]> {
  try {
    // Try cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = loadFromCache()
      if (cachedData) {
        return cachedData.data
      }
    }

    // Create a timeout controller for better error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        cache: "no-cache",
        signal: controller.signal
      })
      
      clearTimeout(timeoutId) // Clear timeout if request succeeds
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      let transformedData: DeviceData[] = []
      
      if (result) {
        if (Array.isArray(result)) {
          transformedData = result
            .map((item: any) => ({
              id: String(item.id || item.deviceId || ""),
              timestamp: item.timestamp || new Date().toISOString(),
              location: item.location || "",
              latitude: Number(item.latitude || 0),
              longitude: Number(item.longitude || 0),
              panicstatus: item.panicstatus === "true" || item.panicstatus === true,
              fallstatus: item.fallstatus === "true" || item.fallstatus === true,
              heartbeat: Number(item.heartbeat || 0),
            }))
            .filter(
              (device) =>
                device.id &&
                device.id !== "unknown" &&
                device.id !== "" &&
                (device.location || device.latitude !== 0 || device.longitude !== 0), // More lenient filtering
            )
        } else if (typeof result === "object") {
          const device = {
            id: String(result.id || result.deviceId || ""),
            timestamp: result.timestamp || new Date().toISOString(),
            location: result.location || "",
            latitude: Number(result.latitude || 0),
            longitude: Number(result.longitude || 0),
            panicstatus: result.panicstatus === "true" || result.panicstatus === true,
            fallstatus: result.fallstatus === "true" || result.fallstatus === true,
            heartbeat: Number(result.heartbeat || 0),
          }

          if (
            device.id &&
            device.id !== "unknown" &&
            device.id !== "" &&
            (device.location || device.latitude !== 0 || device.longitude !== 0) // More lenient filtering
          ) {
            transformedData = [device]
          }
        }
      }
      
      // If no data from API, return empty array
      if (transformedData.length === 0) {
        console.warn("⚠️ No device data received from API")
      }
      
      const updateTime = new Date()
      saveToCache(transformedData, updateTime)
      if (transformedData.length > 0) {
        saveHistoricalData(transformedData)
      }
      
      return transformedData
    } catch (fetchError) {
      clearTimeout(timeoutId) // Clear timeout on error
      throw fetchError
    }
  } catch (error) {
    // Return empty array when API fails
    console.error("❌ Failed to fetch device data:", error)
    return []
  }
}

// Fetch historical device data from localStorage
export async function fetchHistoricalDeviceData(): Promise<DeviceData[]> {
  try {
    const existing = localStorage.getItem(HISTORICAL_CACHE_KEY)
    if (existing) {
      const historicalArray: DeviceData[] = JSON.parse(existing)
      return historicalArray
    }
    return []
  } catch (error) {

    return []
  }
}
