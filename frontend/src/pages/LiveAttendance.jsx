import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getEntryLogs } from '@/utils/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { EntryCardSkeleton } from '@/components/SkeletonLoader'
import { slideInUp, staggerContainer, staggerItem, cardHover, springTransition } from '@/utils/animations'
import { 
  Radio, 
  Clock, 
  User, 
  CreditCard, 
  Building2, 
  GraduationCap, 
  Users,
  RefreshCw,
  Zap,
  Calendar,
  CalendarRange,
  X,
  Menu
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/utils/cn'
import { formatToIST, getTimeAgoIST } from '@/utils/timezone'

export default function LiveAttendance() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    uniqueStudents: 0,
  })
  const [dateFilters, setDateFilters] = useState({
    date: '',
    start_date: '',
    end_date: '',
  })
  const [timeFilters, setTimeFilters] = useState({
    start_time: '',
    end_time: '',
  })
  const [appliedDateFilters, setAppliedDateFilters] = useState({
    date: '',
    start_date: '',
    end_date: '',
  })
  const [appliedTimeFilters, setAppliedTimeFilters] = useState({
    start_time: '',
    end_time: '',
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const intervalRef = useRef(null)
  const menuRef = useRef(null)

  const fetchLatestEntries = async () => {
    try {
      setLoading(true)
      
      // Determine date range based on applied filters
      let startDate, endDate
      
      if (appliedDateFilters.date) {
        // If specific date is selected, use that date only
        startDate = appliedDateFilters.date
        endDate = appliedDateFilters.date
      } else if (appliedDateFilters.start_date && appliedDateFilters.end_date) {
        // Use date range
        startDate = appliedDateFilters.start_date
        endDate = appliedDateFilters.end_date
      } else if (appliedDateFilters.start_date) {
        // Only start date, use today as end
        startDate = appliedDateFilters.start_date
        endDate = format(new Date(), 'yyyy-MM-dd')
      } else if (appliedDateFilters.end_date) {
        // Only end date, use 90 days back as start
        endDate = appliedDateFilters.end_date
        startDate = format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      } else {
        // Default: last 90 days
        endDate = format(new Date(), 'yyyy-MM-dd')
        startDate = format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      }
      
      console.log('Fetching entry logs with date range:', { startDate, endDate })
      
      const params = {
        start_date: startDate,
        end_date: endDate,
        limit: 100,
      }
      
      // Add time filters if provided
      if (appliedTimeFilters.start_time) {
        params.start_time = appliedTimeFilters.start_time
      }
      if (appliedTimeFilters.end_time) {
        params.end_time = appliedTimeFilters.end_time
      }
      
      const response = await getEntryLogs(params)
      
      console.log('API Response:', response)
      console.log('Response type:', typeof response)
      console.log('Response keys:', response ? Object.keys(response) : 'null')
      
      // Handle different response formats (API Gateway might wrap it)
      let logsData = null
      
      // Check if response has logs directly
      if (response && response.logs) {
        logsData = response
      }
      // Check if response is wrapped in body (Lambda proxy integration)
      else if (response && response.body) {
        try {
          logsData = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
          console.log('Parsed body:', logsData)
        } catch (e) {
          console.error('Error parsing body:', e)
        }
      }
      // Check if response is in data property
      else if (response && response.data) {
        logsData = response.data
      }
      
      if (logsData && logsData.logs && Array.isArray(logsData.logs)) {
        console.log('Entry logs found:', logsData.logs.length)
        console.log('Applied date filters:', appliedDateFilters)
        console.log('Applied time filters:', appliedTimeFilters)
        
        // Apply date and time filters client-side (as backup to ensure filtering works)
        let filteredLogs = logsData.logs
        
        // Apply date filters client-side ONLY if user explicitly set filters
        // Don't filter on initial load to show all available data
        if (appliedDateFilters.date) {
          // Filter by specific date
          const filterDate = appliedDateFilters.date
          filteredLogs = filteredLogs.filter(log => {
            const logDate = log.date || log.timestamp || log.created_at
            if (!logDate) {
              console.warn('Log missing date field:', log)
              return false // Only exclude if date is truly missing and filter is active
            }
            
            try {
              // Parse the log date and compare
              const logDateObj = new Date(logDate)
              if (isNaN(logDateObj.getTime())) {
                console.error('Invalid date object:', logDate)
                return false
              }
              const filterDateObj = new Date(filterDate)
              const logDateStr = format(logDateObj, 'yyyy-MM-dd')
              const filterDateStr = format(filterDateObj, 'yyyy-MM-dd')
              
              return logDateStr === filterDateStr
            } catch (e) {
              console.error('Error parsing date:', e, logDate)
              return false
            }
          })
        } else if (appliedDateFilters.start_date || appliedDateFilters.end_date) {
          // Filter by date range
          filteredLogs = filteredLogs.filter(log => {
            const logDate = log.date || log.timestamp || log.created_at
            if (!logDate) {
              console.warn('Log missing date field:', log)
              return false
            }
            
            try {
              const logDateObj = new Date(logDate)
              if (isNaN(logDateObj.getTime())) {
                console.error('Invalid date object:', logDate)
                return false
              }
              const logDateStr = format(logDateObj, 'yyyy-MM-dd')
              
              if (appliedDateFilters.start_date) {
                const startDateStr = format(new Date(appliedDateFilters.start_date), 'yyyy-MM-dd')
                if (logDateStr < startDateStr) return false
              }
              
              if (appliedDateFilters.end_date) {
                const endDateStr = format(new Date(appliedDateFilters.end_date), 'yyyy-MM-dd')
                if (logDateStr > endDateStr) return false
              }
              
              return true
            } catch (e) {
              console.error('Error parsing date range:', e, logDate)
              return false
            }
          })
        }
        
        // Apply time filters client-side if provided
        if (appliedTimeFilters.start_time || appliedTimeFilters.end_time) {
          filteredLogs = filteredLogs.filter(log => {
            const logTime = log.timestamp || log.created_at
            if (!logTime) return false
            
            try {
              const logDate = new Date(logTime)
              const logTimeStr = format(logDate, 'HH:mm:ss')
              
              if (appliedTimeFilters.start_time && logTimeStr < appliedTimeFilters.start_time) {
                return false
              }
              if (appliedTimeFilters.end_time && logTimeStr > appliedTimeFilters.end_time) {
                return false
              }
              return true
            } catch (e) {
              console.error('Error parsing time:', e)
              return false
            }
          })
        }
        
        console.log('Filtered logs after all filters:', filteredLogs.length)
        
        // Sort by timestamp (most recent first) after filtering
        // Priority: created_at > timestamp > date
        filteredLogs.sort((a, b) => {
          const timeA = a.created_at || a.timestamp || a.date || ''
          const timeB = b.created_at || b.timestamp || b.date || ''
          
          // Debug logging for first few entries
          if (filteredLogs.indexOf(a) < 3) {
            console.log(`Sorting entry ${a.student_id}: ${timeA}`)
          }
          
          // Compare in reverse order (newest first)
          return timeB.localeCompare(timeA)
        })
        
        // Log first few entries after sorting
        if (filteredLogs.length > 0) {
          console.log('First 3 entries after sorting:')
          filteredLogs.slice(0, 3).forEach((entry, idx) => {
            console.log(`  ${idx + 1}. ${entry.student_id} at ${entry.created_at || entry.timestamp || entry.date}`)
          })
        }
        
        // Set entries and stats
        setEntries(filteredLogs)
        
        const statsData = {
          total: filteredLogs.length,
          uniqueStudents: new Set(filteredLogs.map(log => log.student_id).filter(Boolean)).size,
        }
        setStats(statsData)
        
        // Check if filters are applied
        const hasFilters = (appliedDateFilters.date || appliedDateFilters.start_date || appliedDateFilters.end_date || 
                           appliedTimeFilters.start_time || appliedTimeFilters.end_time)
        
        if (filteredLogs.length === 0) {
          if (hasFilters) {
            toast({
              title: 'No Data Found',
              description: 'No RFID scans match the applied filters. Try adjusting your date or time range.',
              variant: 'default',
            })
          } else {
            toast({
              title: 'No Scans Found',
              description: 'No RFID scans found in the date range. Try adjusting the date range.',
              variant: 'default',
            })
          }
        }
      } else {
        console.warn('No logs in response:', response)
        console.warn('logsData:', logsData)
        setEntries([])
        setStats({ total: 0, uniqueStudents: 0 })
        
        const hasFilters = (appliedDateFilters.date || appliedDateFilters.start_date || appliedDateFilters.end_date || 
                           appliedTimeFilters.start_time || appliedTimeFilters.end_time)
        toast({
          title: 'No Data Found',
          description: hasFilters 
            ? 'No entry logs match the applied filters. Please check your filter settings.'
            : logsData?.error || response?.error || 'No entry logs returned from API. Check browser console for details.',
          variant: 'default',
        })
      }
    } catch (error) {
      console.error('Error fetching entry logs:', error)
      console.error('Error details:', error.response?.data || error.message)
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Failed to fetch entry logs',
        variant: 'destructive',
      })
      setEntries([])
      setStats({ total: 0, uniqueStudents: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLatestEntries()
    
    // Set up auto-refresh every 5 seconds if enabled
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLatestEntries()
      }, 5000)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, appliedDateFilters, appliedTimeFilters])
  
  // Auto-apply filters when they change (real-time filtering)
  useEffect(() => {
    setAppliedDateFilters({ ...dateFilters })
    setAppliedTimeFilters({ ...timeFilters })
  }, [dateFilters, timeFilters])
  
  const handleDateFilterChange = (key, value) => {
    const newFilters = { ...dateFilters }
    
    // Handle mutual exclusivity: if date is set, clear range; if range is set, clear date
    if (key === 'date' && value) {
      newFilters.start_date = ''
      newFilters.end_date = ''
      newFilters.date = value
    } else if (key === 'start_date' || key === 'end_date') {
      newFilters.date = '' // Clear specific date when using range
      newFilters[key] = value
    } else {
      newFilters[key] = value
    }
    
    setDateFilters(newFilters)
  }
  
  const clearDateFilters = () => {
    setDateFilters({
      date: '',
      start_date: '',
      end_date: '',
    })
    setAppliedDateFilters({
      date: '',
      start_date: '',
      end_date: '',
    })
  }
  
  const clearTimeFilters = () => {
    setTimeFilters({
      start_time: '',
      end_time: '',
    })
    setAppliedTimeFilters({
      start_time: '',
      end_time: '',
    })
  }
  
  const clearAllFilters = () => {
    clearDateFilters()
    clearTimeFilters()
  }
  
  const hasDateFilters = dateFilters.date || dateFilters.start_date || dateFilters.end_date
  const hasTimeFilters = timeFilters.start_time || timeFilters.end_time
  const hasAppliedDateFilters = appliedDateFilters.date || appliedDateFilters.start_date || appliedDateFilters.end_date
  const hasAppliedTimeFilters = appliedTimeFilters.start_time || appliedTimeFilters.end_time
  const hasAnyFilters = hasAppliedDateFilters || hasAppliedTimeFilters
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const handleManualRefresh = () => {
    setLoading(true)
    fetchLatestEntries()
  }

  const getTimeAgo = (timestamp) => {
    // Use IST timezone for relative time
    return getTimeAgoIST(timestamp)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Radio className="h-8 w-8 text-blue-600" />
            Live Attendance Tracker
          </h2>
          <p className="text-muted-foreground">
            Real-time tracking of RFID scans and attendance entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-3 w-3 rounded-full",
              autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-sm text-muted-foreground">
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </span>
          </div>
          <motion.button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              autoRefresh 
                ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </motion.button>
          <motion.button
            onClick={handleManualRefresh}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            whileHover={!loading ? { scale: 1.05 } : {}}
            whileTap={!loading ? { scale: 0.95 } : {}}
          >
            <motion.div
              animate={loading ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="h-4 w-4" />
            </motion.div>
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Students</p>
                <p className="text-2xl font-bold text-purple-600">{stats.uniqueStudents}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Entries */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Recent RFID Scans (Last 90 Days)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Showing latest 100 RFID scans from Entry_Log table, sorted by most recent
              </p>
            </div>
            {/* Filters Hamburger Menu */}
            <div className="relative ml-4 z-[105]" ref={menuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2"
              >
                <Menu className="h-4 w-4" />
                <span>Filters</span>
                {hasAnyFilters && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-blue-600"></span>
                )}
              </Button>
              
              {menuOpen && (
                <div className="absolute top-full right-0 mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-900 border rounded-lg shadow-lg z-[110] p-3 overflow-hidden">
                  <div className="space-y-3 min-w-0">
                    {/* Date Filter Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <Label className="text-sm font-semibold">Filter By Date</Label>
                        </div>
                        {(hasDateFilters || hasAppliedDateFilters) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDateFilters}
                            className="h-6 text-xs hover:bg-red-50 hover:text-red-600 px-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Input
                          id="date"
                          type="date"
                          value={dateFilters.date}
                          onChange={(e) => handleDateFilterChange('date', e.target.value)}
                          className="h-8 text-sm w-full"
                        />
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground py-1">
                          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                          <span className="px-1">or</span>
                          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 min-w-0">
                          <Input
                            id="start_date"
                            type="date"
                            value={dateFilters.start_date}
                            onChange={(e) => handleDateFilterChange('start_date', e.target.value)}
                            className="h-8 text-sm w-full min-w-0"
                          />
                          <span className="text-muted-foreground text-xs px-0.5 shrink-0">-</span>
                          <Input
                            id="end_date"
                            type="date"
                            value={dateFilters.end_date}
                            onChange={(e) => handleDateFilterChange('end_date', e.target.value)}
                            className="h-8 text-sm w-full min-w-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                    {/* Time Range Filter Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <Label className="text-sm font-semibold">Filter By Time</Label>
                        </div>
                        {(hasTimeFilters || hasAppliedTimeFilters) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearTimeFilters}
                            className="h-6 text-xs hover:bg-red-50 hover:text-red-600 px-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 min-w-0">
                          <div className="space-y-1">
                            <Label htmlFor="start_time" className="text-xs text-muted-foreground">From</Label>
                            <Input
                              id="start_time"
                              type="time"
                              value={timeFilters.start_time}
                              onChange={(e) => setTimeFilters({ ...timeFilters, start_time: e.target.value })}
                              className="h-8 text-sm w-full min-w-0"
                            />
                          </div>
                          <span className="text-muted-foreground text-xs px-0.5 shrink-0 pt-5">-</span>
                          <div className="space-y-1">
                            <Label htmlFor="end_time" className="text-xs text-muted-foreground">To</Label>
                            <Input
                              id="end_time"
                              type="time"
                              value={timeFilters.end_time}
                              onChange={(e) => setTimeFilters({ ...timeFilters, end_time: e.target.value })}
                              className="h-8 text-sm w-full min-w-0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Clear All Filters Button */}
                    {hasAnyFilters && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          onClick={clearAllFilters}
                          variant="outline"
                          className="w-full h-9"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear All Filters
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && entries.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <EntryCardSkeleton key={i} />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Radio className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">
                {hasAnyFilters ? 'No Data Found' : 'No attendance records found'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasAnyFilters 
                  ? 'No RFID scans match the applied filters. Try adjusting your date or time range.'
                  : 'Waiting for RFID scans or attendance uploads...'}
              </p>
              {hasAnyFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-4"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <motion.div 
              className="space-y-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence>
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.attendance_id || entry.log_id || index}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    variants={staggerItem}
                    transition={{ delay: index * 0.05, ...springTransition }}
                    whileHover={cardHover}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => entry.student_id && navigate(`/student/${entry.student_id}`)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer",
                      index === 0 && "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800",
                      index < 5 && index > 0 && "bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 border-blue-100 dark:border-blue-900"
                    )}
                  >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold">{entry.student_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">ID: {entry.student_id || 'N/A'}</p>
                        </div>
                      </div>

                      {/* RFID Info */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                          <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.rfid_uid || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">RFID UID</p>
                        </div>
                      </div>

                      {/* Department/Year */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                          <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{entry.department || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {entry.year || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{getTimeAgo(entry.timestamp || entry.created_at || entry.date)}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.timestamp 
                              ? formatToIST(entry.timestamp, 'MMM dd, HH:mm:ss')
                              : entry.created_at
                                ? formatToIST(entry.created_at, 'MMM dd, HH:mm:ss')
                                : entry.date 
                                  ? formatToIST(entry.date + 'T00:00:00', 'MMM dd, yyyy')
                                  : 'N/A'}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">IST</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

