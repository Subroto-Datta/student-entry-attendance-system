import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/use-toast'
import { getResults, getAnalytics } from '@/utils/api'
import StatCard from '@/components/StatCard'
import FilterBar from '@/components/FilterBar'
import AttendanceTable from '@/components/AttendanceTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import CompleteStatusDistribution from '@/components/charts/CompleteStatusDistribution'
import AttendancePercentageTrend from '@/components/charts/AttendancePercentageTrend'
import AllStatusStackedChart from '@/components/charts/AllStatusStackedChart'
import PerformanceHeatmap from '@/components/charts/PerformanceHeatmap'
import InsightCard from '@/components/InsightCard'
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/SkeletonLoader'
import { slideInUp, fadeIn, cardHover, springTransition } from '@/utils/animations'
import { Users, CheckCircle, XCircle, AlertCircle, TrendingUp, Activity, Target, Award } from 'lucide-react'
import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns'

// Helper function to calculate analytics from results data
const calculateAnalyticsFromResults = (records, period = 'daily') => {
  if (!records || records.length === 0) {
    return { analytics: [], overall_statistics: { present: 0, absent: 0, proxy: 0, bunk: 0, total: 0, attendance_percentage: 0 } }
  }
  
  // Group records by period
  const grouped = {}
  
  records.forEach(record => {
    const date = record.date
    if (!date) return
    
    let key
    try {
      const dateObj = parseISO(date)
      
      if (period === 'daily') {
        key = format(dateObj, 'yyyy-MM-dd')
      } else if (period === 'weekly') {
        const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 }) // Monday
        key = format(weekStart, 'yyyy-MM-dd')
      } else if (period === 'monthly') {
        const monthStart = startOfMonth(dateObj)
        key = format(monthStart, 'yyyy-MM')
      } else {
        key = format(dateObj, 'yyyy-MM-dd')
      }
    } catch (e) {
      console.error('Error parsing date:', date, e)
      return
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        date: period === 'daily' ? key : (period === 'weekly' ? `Week of ${key}` : `Month ${key}`),
        week: period === 'weekly' ? key : undefined,
        month: period === 'monthly' ? key : undefined,
        present: 0,
        absent: 0,
        proxy: 0,
        bunk: 0,
        total: 0,
      }
    }
    
    const status = record.status
    if (status === 'Present') grouped[key].present++
    else if (status === 'Absent') grouped[key].absent++
    else if (status === 'Proxy') grouped[key].proxy++
    else if (status === 'Bunk') grouped[key].bunk++
    
    grouped[key].total++
  })
  
  // Convert to array and calculate percentages
  const analytics = Object.values(grouped)
    .map(stat => ({
      ...stat,
      attendance_percentage: stat.total > 0 
        ? ((stat.present / stat.total) * 100) 
        : 0
    }))
    .sort((a, b) => {
      // Sort by date
      const dateA = a.date || a.week || a.month || ''
      const dateB = b.date || b.week || b.month || ''
      return dateA.localeCompare(dateB)
    })
  
  // Calculate overall statistics
  const overallStats = {
    present: records.filter(r => r.status === 'Present').length,
    absent: records.filter(r => r.status === 'Absent').length,
    proxy: records.filter(r => r.status === 'Proxy').length,
    bunk: records.filter(r => r.status === 'Bunk').length,
    total: records.length,
    attendance_percentage: records.length > 0
      ? ((records.filter(r => r.status === 'Present').length / records.length) * 100)
      : 0
  }
  
  return { analytics, overall_statistics: overallStats }
}

export default function Dashboard() {
  const [resultsData, setResultsData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})
  const [period, setPeriod] = useState('daily')
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch results
      const resultsParams = {
        ...filters,
        ...(filters.start_date && filters.end_date
          ? { start_date: filters.start_date, end_date: filters.end_date }
          : filters.date
          ? { date: filters.date }
          : {}),
      }
      
      let fetchedResults = null
      try {
        const results = await getResults(resultsParams)
        console.log('Dashboard - Results fetched:', {
          recordCount: results?.records?.length || 0,
          summary: results?.summary,
          params: resultsParams
        })
        fetchedResults = results
        setResultsData(results)
        
        // Show warning if no data but filters are set
        if (results?.records?.length === 0 && (filters.date || filters.start_date)) {
          toast({
            title: 'No Data Found',
            description: `No attendance records found for the selected date${filters.date ? `: ${filters.date}` : ''}. Make sure files have been uploaded and processed.`,
            variant: 'default',
          })
        }
      } catch (error) {
        console.error('Error fetching results:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          params: resultsParams
        })
        // Set empty data instead of failing completely
        fetchedResults = { records: [], summary: { present: 0, absent: 0, proxy: 0, bunk: 0, total: 0, attendance_percentage: 0 } }
        setResultsData(fetchedResults)
        toast({
          title: 'Error Loading Data',
          description: error.response?.data?.error || error.message || 'Failed to fetch attendance results. Check API configuration.',
          variant: 'destructive',
        })
      }

      // Calculate analytics from fetched results data (CRITICAL: Use fetchedResults, not resultsData state)
      if (fetchedResults?.records && fetchedResults.records.length > 0) {
        console.log('📊 Calculating analytics from results data...', {
          recordCount: fetchedResults.records.length,
          period,
          sampleRecord: fetchedResults.records[0]
        })
        const calculatedAnalytics = calculateAnalyticsFromResults(fetchedResults.records, period)
        console.log('✅ Calculated analytics:', {
          analyticsCount: calculatedAnalytics.analytics.length,
          overallStats: calculatedAnalytics.overall_statistics,
          sampleAnalytics: calculatedAnalytics.analytics[0]
        })
        setAnalyticsData(calculatedAnalytics)
      } else {
        console.log('⚠️ No results data available, trying API...')
        // No results data, try to fetch from API
        try {
          const analyticsParams = {
            period,
            ...filters,
            ...(filters.start_date && filters.end_date
              ? { start_date: filters.start_date, end_date: filters.end_date }
              : {}),
          }
          
          const analyticsResponse = await getAnalytics(analyticsParams)
          
          // Handle different response formats (Lambda proxy vs direct)
          let analyticsData = analyticsResponse
          if (analyticsResponse?.body) {
            try {
              analyticsData = typeof analyticsResponse.body === 'string' 
                ? JSON.parse(analyticsResponse.body) 
                : analyticsResponse.body
            } catch (e) {
              console.error('Error parsing analytics body:', e)
              analyticsData = analyticsResponse
            }
          }
          
          console.log('📊 Analytics from API:', {
            analyticsCount: analyticsData?.analytics?.length || 0,
            hasOverallStats: !!analyticsData?.overall_statistics
          })
          
          setAnalyticsData(analyticsData || { 
            analytics: [], 
            overall_statistics: { present: 0, absent: 0, proxy: 0, bunk: 0, total: 0, attendance_percentage: 0 } 
          })
        } catch (error) {
          console.warn('Error fetching analytics:', error)
          setAnalyticsData({ 
            analytics: [], 
            overall_statistics: { present: 0, absent: 0, proxy: 0, bunk: 0, total: 0, attendance_percentage: 0 } 
          })
        }
      }
    } catch (error) {
      console.error('Error in fetchData:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data. Please check your API configuration.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [filters, period, toast])

  // Listen for refresh events from upload page and auto-refresh
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Dashboard refresh triggered by upload')
      fetchData()
    }

    window.addEventListener('refreshDashboard', handleRefresh)
    
    // Also refresh every 30 seconds to catch any updates
    const interval = setInterval(() => {
      fetchData()
    }, 30000)

    return () => {
      window.removeEventListener('refreshDashboard', handleRefresh)
      clearInterval(interval)
    }
  }, [fetchData])

  // Initial fetch and when filters/period change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Ensure attendance_percentage is always a number
  const rawSummary = resultsData?.summary || {
    present: 0,
    absent: 0,
    proxy: 0,
    bunk: 0,
    total: 0,
    attendance_percentage: 0,
  }
  
  const summary = {
    ...rawSummary,
    attendance_percentage: typeof rawSummary.attendance_percentage === 'string' 
      ? parseFloat(rawSummary.attendance_percentage) || 0
      : (typeof rawSummary.attendance_percentage === 'number' 
        ? rawSummary.attendance_percentage 
        : 0)
  }

  // Recalculate analytics when resultsData or period changes (fallback mechanism)
  useEffect(() => {
    if (resultsData?.records && resultsData.records.length > 0) {
      // Only recalculate if analytics is empty or doesn't match period
      const shouldRecalculate = !analyticsData?.analytics || 
                                analyticsData.analytics.length === 0 ||
                                !analyticsData.analytics.some(a => a.date || a.week || a.month)
      
      if (shouldRecalculate) {
        console.log('🔄 Recalculating analytics from resultsData (useEffect)...', {
          recordCount: resultsData.records.length,
          period,
          currentAnalyticsCount: analyticsData?.analytics?.length || 0
        })
        const calculatedAnalytics = calculateAnalyticsFromResults(resultsData.records, period)
        console.log('✅ Recalculated analytics:', {
          analyticsCount: calculatedAnalytics.analytics.length,
          sample: calculatedAnalytics.analytics[0]
        })
        setAnalyticsData(calculatedAnalytics)
      }
    }
  }, [resultsData, period]) // Recalculate when results or period changes

  // Ensure analytics array exists and has data
  const analytics = (analyticsData?.analytics && Array.isArray(analyticsData.analytics) && analyticsData.analytics.length > 0)
    ? analyticsData.analytics
    : []
  
  // Debug logging
  console.log('📈 Dashboard - Final analytics data:', {
    hasAnalyticsData: !!analyticsData,
    analyticsCount: analytics.length,
    period,
    analyticsSample: analytics[0],
    hasRecords: !!(resultsData?.records && resultsData.records.length > 0)
  })
  
  const rawOverallStats = analyticsData?.overall_statistics || summary
  
  // Ensure attendance_percentage is always a number
  const overallStats = {
    ...rawOverallStats,
    attendance_percentage: typeof rawOverallStats.attendance_percentage === 'string' 
      ? parseFloat(rawOverallStats.attendance_percentage) || 0
      : (typeof rawOverallStats.attendance_percentage === 'number' 
        ? rawOverallStats.attendance_percentage 
        : 0)
  }

  // Calculate additional insights
  const uniqueStudents = new Set(resultsData?.records?.map(r => r.student_id) || []).size
  
  // Ensure avgAttendance is calculated correctly (handle both number and string percentages)
  const avgAttendance = analytics.length > 0 
    ? (analytics.reduce((sum, item) => {
        const percentage = typeof item.attendance_percentage === 'string' 
          ? parseFloat(item.attendance_percentage) || 0
          : (typeof item.attendance_percentage === 'number' ? item.attendance_percentage : 0)
        return sum + percentage
      }, 0) / analytics.length).toFixed(1)
    : '0.0'
  
  // Ensure bestDay comparison uses numbers
  const bestDay = analytics.length > 0 
    ? analytics.reduce((best, current) => {
        const currentPct = typeof current.attendance_percentage === 'string' 
          ? parseFloat(current.attendance_percentage) || 0
          : (typeof current.attendance_percentage === 'number' ? current.attendance_percentage : 0)
        const bestPct = typeof best.attendance_percentage === 'string' 
          ? parseFloat(best.attendance_percentage) || 0
          : (typeof best.attendance_percentage === 'number' ? best.attendance_percentage : 0)
        return currentPct > bestPct ? current : best
      }, analytics[0])
    : null

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Dashboard Overview
        </h2>
        <p className="text-muted-foreground">
          Comprehensive attendance analytics and insights
        </p>
      </div>

      {/* Filters */}
      <FilterBar onFilterChange={setFilters} onPeriodChange={setPeriod} />

      {/* Bento Box Grid - Key Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InsightCard
            title="Total Records"
            value={summary.total.toLocaleString()}
            subtitle="All attendance entries"
            icon={Users}
            gradient="from-blue-600 to-indigo-600"
            size="sm"
            index={0}
          />
          <InsightCard
            title="Attendance Rate"
            value={`${summary.attendance_percentage.toFixed(1)}%`}
            subtitle={summary.attendance_percentage >= 75 ? "Target achieved" : "Below target"}
            icon={Target}
            gradient={summary.attendance_percentage >= 75 ? "from-green-600 to-emerald-600" : "from-orange-600 to-red-600"}
            size="sm"
            index={1}
          />
          <InsightCard
            title="Unique Students"
            value={uniqueStudents.toLocaleString()}
            subtitle="Active in system"
            icon={Activity}
            gradient="from-purple-600 to-pink-600"
            size="sm"
            index={2}
          />
          <InsightCard
            title="Average Attendance"
            value={`${avgAttendance}%`}
            subtitle="Across all periods"
            icon={Award}
            gradient="from-cyan-600 to-blue-600"
            size="sm"
            index={3}
          />
        </div>
      )}

      {/* Status Distribution - Full Width with Quick Stats in Accordion */}
      {loading ? (
        <ChartSkeleton height="h-64" />
      ) : (
        <motion.div
          initial="initial"
          animate="animate"
          variants={slideInUp}
          transition={{ delay: 0.4, ...springTransition }}
          whileHover={cardHover}
        >
          <Card className="border-0 shadow-lg w-full">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold">Complete Status Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">Overall breakdown of all 4 status types: Present, Absent, Proxy, Bunk</p>
            </div>
            {/* Quick Stats in Accordion - Top Right */}
            <div className="flex-shrink-0">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="quick-stats" className="border-b-0">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <span className="text-sm font-semibold">Quick Stats</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="grid grid-cols-2 gap-2 min-w-[280px]">
                      <div className="flex items-center justify-between p-2 rounded-md bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium">Present</span>
                        </div>
                        <span className="text-sm font-bold">{summary.present}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-xs font-medium">Absent</span>
                        </div>
                        <span className="text-sm font-bold">{summary.absent}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-xs font-medium">Proxy</span>
                        </div>
                        <span className="text-sm font-bold">{summary.proxy}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-medium">Bunk</span>
                        </div>
                        <span className="text-sm font-bold">{summary.bunk}</span>
                      </div>
                    </div>
                    {bestDay && (
                      <div className="mt-3 p-2 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Award className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-600">Best Day</span>
                        </div>
                        <p className="text-xs font-bold">{bestDay.date || bestDay.week || bestDay.month}</p>
                        <p className="text-xs text-muted-foreground">
                          {(typeof bestDay.attendance_percentage === 'number' 
                            ? bestDay.attendance_percentage 
                            : (parseFloat(bestDay.attendance_percentage) || 0)).toFixed(1)}% attendance
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <CompleteStatusDistribution data={overallStats} />
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Bento Box Grid - Trends & Patterns */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ChartSkeleton height="h-64" />
          <ChartSkeleton height="h-64" />
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          initial="initial"
          animate="animate"
          variants={fadeIn}
          transition={{ delay: 0.5, ...springTransition }}
        >
          {/* Attendance Percentage Trend - Shows if attendance is improving */}
          <motion.div
            whileHover={cardHover}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Attendance Trend</CardTitle>
                <p className="text-xs text-muted-foreground">Attendance percentage over time with 75% target line</p>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="h-64"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <AttendancePercentageTrend data={analytics} period={period} />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* All Status Stacked - Shows all 4 statuses over time */}
          <motion.div
            whileHover={cardHover}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">All Status Trends (Stacked)</CardTitle>
                <p className="text-xs text-muted-foreground">Visual breakdown of Present, Absent, Proxy, and Bunk over time</p>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="h-64"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <AllStatusStackedChart data={analytics} period={period} />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Bento Box Grid - Performance Heatmap */}
      {loading ? (
        <div className="lg:col-span-4">
          <ChartSkeleton height="h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Performance Heatmap - Large */}
          <div className="lg:col-span-4">
            <PerformanceHeatmap data={resultsData?.records || []} />
          </div>
        </div>
      )}

      {/* Attendance Table - Full Width */}
      {loading ? (
        <TableSkeleton rows={10} />
      ) : (
        <AttendanceTable 
          data={resultsData?.records} 
          loading={false} 
          searchFilter={filters.search}
        />
      )}
    </div>
  )
}

