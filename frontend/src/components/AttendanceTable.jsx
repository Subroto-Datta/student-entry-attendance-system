import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import { ArrowUpDown, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { exportToCSV } from '@/utils/export'
import { format } from 'date-fns'
import { fadeIn, springTransition } from '@/utils/animations'
import { cn } from '@/utils/cn'

export default function AttendanceTable({ data, loading = false, searchFilter = '' }) {
  const navigate = useNavigate()
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Combine external search filter with local search
  const searchTerm = searchFilter || localSearchTerm

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const filteredAndSortedData = useMemo(() => {
    let result = [...(data || [])]

    // Search filter - search in student name, ID, and RFID
    if (searchTerm) {
      result = result.filter(item => {
        const searchLower = searchTerm.toLowerCase()
        return (
          (item.student_name && item.student_name.toLowerCase().includes(searchLower)) ||
          (item.student_id && item.student_id.toLowerCase().includes(searchLower)) ||
          (item.rfid_uid && item.rfid_uid.toLowerCase().includes(searchLower))
        )
      })
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchTerm, sortConfig])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedData, currentPage])

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)

  const handleExport = () => {
    exportToCSV(filteredAndSortedData, `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`)
  }

  const getStatusBadge = (status) => {
    const colors = {
      Present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      Absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      Proxy: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      Bunk: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 pb-2 border-b">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            {/* Table Rows */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4 py-3 border-b">
                {Array.from({ length: 7 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12">
          <div className="text-center text-muted-foreground">
            No attendance data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Attendance Records</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search in table..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-9 w-64"
                disabled={!!searchFilter}
              />
              {searchFilter && (
                <p className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
                  Using filter search
                </p>
              )}
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">
                  <button
                    onClick={() => handleSort('student_id')}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    Student ID
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="text-left p-3 font-semibold">
                  <button
                    onClick={() => handleSort('student_name')}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    Name
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Lecture</th>
                <th className="text-left p-3 font-semibold">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="text-left p-3 font-semibold">Department</th>
                <th className="text-left p-3 font-semibold">Year</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((record, index) => (
                <motion.tr 
                  key={record.attendance_id || index} 
                  className={cn(
                    "border-b hover:bg-muted/50 transition-colors cursor-pointer",
                    "hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, ...springTransition }}
                  whileHover={{ scale: 1.005, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                  onClick={() => {
                    if (record.student_id) {
                      navigate(`/student/${record.student_id}`)
                    }
                  }}
                  title={record.student_id ? `Click to view ${record.student_name || record.student_id}'s profile` : ''}
                >
                  <td className="p-3">{record.student_id}</td>
                  <td className="p-3 font-medium">{record.student_name}</td>
                  <td className="p-3">{record.date}</td>
                  <td className="p-3">{record.lecture || '-'}</td>
                  <td className="p-3">
                    <motion.span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {record.status}
                    </motion.span>
                  </td>
                  <td className="p-3">{record.department || '-'}</td>
                  <td className="p-3">{record.year || '-'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

