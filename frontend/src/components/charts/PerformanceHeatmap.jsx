import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
)

export default function PerformanceHeatmap({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group by department and year from records
  const heatmapData = new Map()
  data.forEach(item => {
    // Handle both analytics format (with present/total) and records format (with status)
    const dept = item.department || 'Unknown'
    const year = item.year || 'Unknown'
    const key = `${dept}-${year}`
    
    if (!heatmapData.has(key)) {
      heatmapData.set(key, { dept, year, present: 0, total: 0 })
    }
    const stats = heatmapData.get(key)
    
    // If item has present/total (analytics format)
    if (item.present !== undefined && item.total !== undefined) {
      stats.present += item.present || 0
      stats.total += item.total || 0
    } 
    // If item has status (records format)
    else if (item.status) {
      stats.total += 1
      if (item.status === 'Present') {
        stats.present += 1
      }
    }
  })

  const departments = Array.from(new Set(Array.from(heatmapData.values()).map(v => v.dept)))
  const years = Array.from(new Set(Array.from(heatmapData.values()).map(v => v.year)))

  const getColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Performance Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted-foreground">Year</div>
            <div className="flex gap-2 text-xs">
              {years.map(year => (
                <div key={year} className="text-center min-w-[60px]">{year}</div>
              ))}
            </div>
          </div>
          {departments.map(dept => (
            <div key={dept} className="flex items-center gap-2">
              <div className="text-xs font-medium w-20 truncate">{dept}</div>
              <div className="flex gap-2 flex-1">
                {years.map(year => {
                  const key = `${dept}-${year}`
                  const stats = heatmapData.get(key)
                  const percentage = stats && stats.total > 0 
                    ? (stats.present / stats.total) * 100 
                    : 0
                  return (
                    <div
                      key={year}
                      className={`flex-1 h-8 rounded-md ${getColor(percentage)} flex items-center justify-center text-white text-xs font-semibold hover:scale-105 transition-transform cursor-pointer`}
                      title={`${dept} - ${year}: ${percentage.toFixed(1)}%`}
                    >
                      {percentage > 0 ? `${Math.round(percentage)}%` : '-'}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-muted-foreground">≥80%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span className="text-muted-foreground">60-79%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span className="text-muted-foreground">40-59%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-muted-foreground">&lt;40%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

