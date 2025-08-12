"use client"

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Shield, MapPin, Activity } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Clear any existing authentication when login page loads
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("safetrack_auth")
      console.log("🔒 Cleared existing authentication on login page load")
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate login process
    setTimeout(() => {
      if (email && password) {
        // Clear all cache and previous data before login
        clearAllDataOnLogin()
        
        // Store auth state
        localStorage.setItem("safetrack_auth", "true")
        router.push("/")
      } else {
        setError("Please enter valid credentials")
        setIsLoading(false)
      }
    }, 1000)
  }

  const clearAllDataOnLogin = () => {
    try {
      // Clear device data cache
      localStorage.removeItem("safetrack_device_data")
      localStorage.removeItem("safetrack_historical_data")
      
      // Clear alert storage
      localStorage.removeItem("safetrack_alerts")
      localStorage.removeItem("safetrack_archived_alerts")
      
      // Clear any other cached data
      localStorage.removeItem("safetrack_last_update")
      localStorage.removeItem("safetrack_device_count")
      
      console.log("🧹 All cache and previous data cleared on login")
    } catch (error) {
      console.error("Failed to clear data on login:", error)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand & Security Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-cyan-800 to-cyan-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black font-sans">SafeTrack</h1>
                <p className="text-cyan-200 text-sm">Security Band</p>
              </div>
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-black font-sans leading-tight mb-4">
                Your Safety.
                <br />
                Always in Sight.
              </h2>
              <p className="text-cyan-100 text-lg leading-relaxed">
                Real-time monitoring for peace of mind. Advanced security technology that keeps you connected and
                protected, wherever you go.
              </p>
            </div>

            {/* Feature Icons */}
            <div className="flex space-x-8 pt-8">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-cyan-300" />
                <span className="text-sm text-cyan-200">Live Tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyan-300" />
                <span className="text-sm text-cyan-200">Health Monitor</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-cyan-300" />
                <span className="text-sm text-cyan-200">24/7 Security</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-cyan-300 text-sm">© 2025 SafeTrack Security Systems</div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-cyan-50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-cyan-800 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-sans text-cyan-800">SafeTrack</h1>
              <p className="text-cyan-600 text-sm">Security Band</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-black font-sans text-cyan-800">
                Secure Access to Your Dashboard
              </CardTitle>
              <CardDescription className="text-slate-600">
                Monitor, respond, and protect—anywhere, anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg animate-shake">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-slate-200 focus:border-cyan-400 focus:ring-cyan-400/20 transition-all duration-200"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12 border-slate-200 focus:border-cyan-400 focus:ring-cyan-400/20 transition-all duration-200"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm text-slate-600">
                      Remember me
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-cyan-600 hover:text-cyan-800 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-cyan-800 hover:bg-cyan-900 text-white font-bold text-base transition-all duration-200 hover:shadow-lg hover:shadow-cyan-800/25"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    "Sign In Securely"
                  )}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-sm text-slate-600">
                    Need an account?{" "}
                    <button
                      type="button"
                      className="text-cyan-600 hover:text-cyan-800 hover:underline font-medium transition-colors"
                    >
                      Request Access
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
