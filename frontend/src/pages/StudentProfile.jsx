import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getResults, getAnalytics, getEntryLogs } from '@/utils/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { 
  StudentProfileHeaderSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  EntryCardSkeleton,
  TableSkeleton
} from '@/components/SkeletonLoader'
import { 
  User, 
  ArrowLeft,
  Clock,
  CreditCard,
  Building2,
  GraduationCap,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/utils/cn'
import { formatToIST, getTimeAgoIST } from '@/utils/timezone'
import AttendanceTable from '@/components/AttendanceTable'
import CompleteStatusDistribution from '@/components/charts/CompleteStatusDistribution'
import AttendancePercentageTrend from '@/components/charts/AttendancePercentageTrend'
import AllStatusStackedChart from '@/components/charts/AllStatusStackedChart'

export default function StudentProfile() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [studentInfo, setStudentInfo] = useState(null)
  const [attendanceData, setAttendanceData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [entryLogs, setEntryLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentData()
  }, [studentId])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      
      // Fetch all attendance results from Final_Attendance table (last 90 days)
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const startDate = format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      const allResults = await getResults({ 
        start_date: startDate,
        end_date: endDate
      })
      
      // Filter records by student_id (Final_Attendance table)
      const studentRecords = allResults?.records?.filter(r => r.student_id === studentId) || []
      
      // Extract student info from Student_Master (from first record which has enriched student info)
      if (studentRecords.length > 0) {
        const firstRecord = studentRecords[0]
        setStudentInfo({
          student_id: firstRecord.student_id,
          student_name: firstRecord.student_name || firstRecord.name,
          department: firstRecord.department,
          year: firstRecord.year,
          rfid_uid: firstRecord.rfid_uid,
        })
      } else {
        // If no attendance records, try to get student info from entry logs
        const logs = await getEntryLogs({ 
          start_date: startDate,
          end_date: endDate,
          limit: 500
        })
        
        let logsData = null
        if (logs && logs.logs) {
          logsData = logs
        } else if (logs && logs.body) {
          try {
            logsData = typeof logs.body === 'string' ? JSON.parse(logs.body) : logs.body
          } catch (e) {
            console.error('Error parsing body:', e)
          }
        } else if (logs && logs.data) {
          logsData = logs.data
        }
        
        // Filter by student_id and get first log
        if (logsData?.logs && Array.isArray(logsData.logs)) {
          const studentLogs = logsData.logs.filter(log => log.student_id === studentId)
          if (studentLogs.length > 0) {
            const firstLog = studentLogs[0]
            setStudentInfo({
              student_id: firstLog.student_id,
              student_name: firstLog.student_name || 'Unknown',
              department: firstLog.department,
              year: firstLog.year,
              rfid_uid: firstLog.rfid_uid,
            })
          }
        }
      }
      
      // Calculate summary statistics from Final_Attendance records (4 parameters: Present, Absent, Proxy, Bunk)
      const presentCount = studentRecords.filter(r => r.status === 'Present').length
      const totalCount = studentRecords.length
      const attendancePercentage = totalCount > 0 
        ? (presentCount / totalCount) * 100 
        : 0
      
      const summary = {
        present: presentCount,
        absent: studentRecords.filter(r => r.status === 'Absent').length,
        proxy: studentRecords.filter(r => r.status === 'Proxy').length,
        bunk: studentRecords.filter(r => r.status === 'Bunk').length,
        total: totalCount,
        attendance_percentage: attendancePercentage, // Keep as number, not string
      }
      
      setAttendanceData({
        records: studentRecords,
        summary: summary,
      })
      
      // Fetch analytics for this student (calculate from Final_Attendance records)
      const allAnalytics = await getAnalytics({ 
        start_date: startDate,
        end_date: endDate
      })
      
      // Filter analytics by student_id and calculate daily analytics
      const studentAnalytics = calculateStudentAnalytics(studentRecords, allAnalytics?.analytics || [])
      setAnalyticsData({
        analytics: studentAnalytics,
        overall_statistics: summary,
      })
      
      // Fetch entry logs from Entry_Log table for this student (last 90 days)
      // Note: get_entry_logs doesn't support student_id filter directly, so we fetch all and filter client-side
      const logs = await getEntryLogs({ 
        start_date: startDate,
        end_date: endDate,
        limit: 500 // Get more to filter client-side
      })
      
      // Handle different response formats
      let logsData = null
      if (logs && logs.logs) {
        logsData = logs
      } else if (logs && logs.body) {
        try {
          logsData = typeof logs.body === 'string' ? JSON.parse(logs.body) : logs.body
        } catch (e) {
          console.error('Error parsing body:', e)
        }
      } else if (logs && logs.data) {
        logsData = logs.data
      }
      
      // Filter entry logs by student_id (from Entry_Log table)
      if (logsData && logsData.logs && Array.isArray(logsData.logs)) {
        const studentLogs = logsData.logs
          .filter(log => log.student_id === studentId)
          .slice(0, 200) // Limit to 200 most recent
        setEntryLogs(studentLogs)
      }
      
    } catch (error) {
      console.error('Error fetching student data:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Failed to fetch student data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  const calculateStudentAnalytics = (records, allAnalytics) => {
    // Group records by date and calculate daily statistics
    const dailyStats = {}
    
    records.forEach(record => {
      const date = record.date
      if (!date) return
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date: date,
          present: 0,
          absent: 0,
          proxy: 0,
          bunk: 0,
          total: 0,
        }
      }
      
      const status = record.status
      if (status === 'Present') dailyStats[date].present++
      else if (status === 'Absent') dailyStats[date].absent++
      else if (status === 'Proxy') dailyStats[date].proxy++
      else if (status === 'Bunk') dailyStats[date].bunk++
      
      dailyStats[date].total++
    })
    
    // Convert to array and calculate percentages
    return Object.values(dailyStats).map(stat => ({
      ...stat,
      attendance_percentage: stat.total > 0 ? ((stat.present / stat.total) * 100) : 0, // Keep as number
    })).sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // Ensure attendance_percentage is always a number
  const rawSummary = attendanceData?.summary || {
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

  const analytics = analyticsData?.analytics || []
  const rawOverallStats = analyticsData?.overall_statistics || {
    present: summary.present,
    absent: summary.absent,
    proxy: summary.proxy,
    bunk: summary.bunk,
    total: summary.total,
    attendance_percentage: summary.attendance_percentage,
  }
  
  // Ensure attendance_percentage is always a number
  const overallStats = {
    ...rawOverallStats,
    attendance_percentage: typeof rawOverallStats.attendance_percentage === 'string' 
      ? parseFloat(rawOverallStats.attendance_percentage) || 0
      : (typeof rawOverallStats.attendance_percentage === 'number' 
        ? rawOverallStats.attendance_percentage 
        : 0)
  }

  const getTimeAgo = (timestamp) => {
    // Use IST timezone for relative time
    return getTimeAgoIST(timestamp)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" disabled className="flex items-center gap-2 text-blue-600">
            <ArrowLeft className="h-5 w-5" />
            Back to Live Attendance
          </Button>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Student Profile
          </h2>
          <div className="w-fit"></div>
        </div>

        {/* Student Info Card Skeleton */}
        <StudentProfileHeaderSkeleton />

        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton height="h-64" />
          <ChartSkeleton height="h-64" />
          <ChartSkeleton height="h-64" />
        </div>

        {/* Recent RFID Scans Skeleton */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent RFID Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <EntryCardSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <TableSkeleton rows={5} />
      </div>
    )
  }

  if (!studentInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold text-muted-foreground">Student not found</p>
        <p className="text-sm text-muted-foreground mt-1">No data available for this student ID</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Live Attendance
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Student Profile
            </h2>
            <p className="text-muted-foreground">Attendance history and details</p>
          </div>
        </div>
      </div>

      {/* Student Info Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <User className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Name</p>
                <p className="text-lg font-semibold">{studentInfo.student_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Student ID</p>
                <p className="text-lg font-semibold">{studentInfo.student_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Department</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-semibold">{studentInfo.department || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Year</p>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-semibold">{studentInfo.year || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {typeof summary.attendance_percentage === 'number' 
                    ? summary.attendance_percentage.toFixed(1) 
                    : (parseFloat(summary.attendance_percentage) || 0).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present</p>
                <p className="text-2xl font-bold">{summary.present}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <CompleteStatusDistribution data={overallStats} />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <AttendancePercentageTrend data={analytics} period="daily" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold">All Status Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <AllStatusStackedChart data={analytics} period="daily" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entry Logs */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Recent RFID Scans</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Last 200 RFID scans from Entry_Log table
          </p>
        </CardHeader>
        <CardContent>
          {entryLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No entry logs found</p>
              <p className="text-sm text-muted-foreground mt-1">No RFID scans recorded for this student</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entryLogs.map((entry, index) => (
                <div
                  key={entry.attendance_id || index}
                  className={cn(
                    "p-4 rounded-lg border transition-all hover:shadow-md",
                    index === 0 && "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                        <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold">RFID UID: {entry.rfid_uid || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.timestamp 
                            ? formatToIST(entry.timestamp, 'MMM dd, yyyy HH:mm:ss')
                            : entry.created_at
                              ? formatToIST(entry.created_at, 'MMM dd, yyyy HH:mm:ss')
                              : 'N/A'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">IST</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{getTimeAgo(entry.timestamp || entry.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTable 
            data={attendanceData?.records} 
            loading={loading} 
          />
        </CardContent>
      </Card>
    </div>
  )
}

