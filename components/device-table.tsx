"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Heart,
  MapPin,
  Clock,
} from "lucide-react"

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

interface DeviceTableProps {
  data: DeviceData[]
  className?: string
}

type SortField = keyof DeviceData
type SortDirection = "asc" | "desc"

export default function DeviceTable({ data, className }: DeviceTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Utility function to generate unique keys
  const generateUniqueKey = (prefix: string, id: string, index: number) => {
    return `${prefix}-${id}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(data.map((device) => device.location))).sort()
  }, [data])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((device) => {
      // Search filter
      const matchesSearch =
        device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.location.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      let matchesStatus = true
      if (statusFilter === "panic") {
        matchesStatus = device.panicstatus
      } else if (statusFilter === "fall") {
        matchesStatus = device.fallstatus
      } else if (statusFilter === "normal") {
        matchesStatus = !device.panicstatus && !device.fallstatus
      } else if (statusFilter === "alerts") {
        matchesStatus = device.panicstatus || device.fallstatus
      }

      // Location filter
      const matchesLocation = locationFilter === "all" || device.location === locationFilter

      return matchesSearch && matchesStatus && matchesLocation
    })

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Handle different data types
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1
      }
      return 0
    })

    return filtered
  }, [data, searchTerm, statusFilter, locationFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage)

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 text-blue-500" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-500" />
    )
  }

  // Get status badge
  const getStatusBadge = (device: DeviceData) => {
    if (device.panicstatus) {
      return (
        <Badge variant="destructive" className="text-xs">
          PANIC
        </Badge>
      )
    }
    if (device.fallstatus) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
        >
          FALL
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="text-xs text-green-700 border-green-300 dark:text-green-300 dark:border-green-700"
      >
        Normal
      </Badge>
    )
  }

  // Reset pagination when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, locationFilter])

  return (
    <div className={className}>
      <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Device Data</span>
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              {filteredAndSortedData.length} of {data.length} devices
            </span>
          </CardTitle>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by ID or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alerts">All Alerts</SelectItem>
                <SelectItem value="panic">Panic Only</SelectItem>
                <SelectItem value="fall">Fall Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAndSortedData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">No devices match the current filters</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("id")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Device ID</span>
                          {getSortIcon("id")}
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("location")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Location</span>
                          {getSortIcon("location")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("heartbeat")}
                      >
                        <div className="flex items-center space-x-2">
                          <Heart className="w-4 h-4" />
                          <span>Heartbeat</span>
                          {getSortIcon("heartbeat")}
                        </div>
                      </TableHead>
                      <TableHead>Coordinates</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("timestamp")}
                      >
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Last Update</span>
                          {getSortIcon("timestamp")}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((device, index) => (
                      <TableRow key={generateUniqueKey("row", device.id, index)} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <TableCell className="font-medium">{device.id}</TableCell>
                        <TableCell>{getStatusBadge(device)}</TableCell>
                        <TableCell className="max-w-48 truncate" title={device.location}>
                          {device.location}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span
                              className={`font-medium ${
                                device.heartbeat > 100
                                  ? "text-red-600 dark:text-red-400"
                                  : device.heartbeat < 60
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {device.heartbeat}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">BPM</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                          {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 dark:text-slate-400">{device.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedData.length)} of{" "}
                    {filteredAndSortedData.length} results
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
