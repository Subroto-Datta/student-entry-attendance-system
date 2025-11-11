import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Card, CardContent } from '../ui/card'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function DepartmentComparisonChart({ data }) {
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

  // Group by department
  const deptMap = new Map()
  data.forEach(item => {
    const dept = item.department || 'Unknown'
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { present: 0, total: 0 })
    }
    const stats = deptMap.get(dept)
    stats.present += item.present || 0
    stats.total += item.total || 0
  })

  const departments = Array.from(deptMap.keys())
  const attendanceRates = departments.map(dept => {
    const stats = deptMap.get(dept)
    return stats.total > 0 ? (stats.present / stats.total) * 100 : 0
  })

  const chartData = {
    labels: departments,
    datasets: [
      {
        label: 'Attendance %',
        data: attendanceRates,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `Attendance: ${context.parsed.x.toFixed(1)}%`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value) {
            return value + '%'
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="h-full">
      <Bar data={chartData} options={options} />
    </div>
  )
}

