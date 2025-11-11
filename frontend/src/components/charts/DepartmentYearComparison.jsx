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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function DepartmentYearComparison({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Check if data is from analytics (has present/absent/proxy/bunk directly) or results (has status)
  const isResultsData = data.length > 0 && data[0].status !== undefined

  // Group by department and year
  const deptYearMap = new Map()
  
  data.forEach(item => {
    let dept, year, status
    
    if (isResultsData) {
      // Results data: has department, year, and status fields
      dept = item.department || 'Unknown'
      year = item.year || 'Unknown'
      status = item.status
    } else {
      // Analytics data: has department, year, and present/absent/proxy/bunk counts
      dept = item.department || 'Unknown'
      year = item.year || 'Unknown'
      // For analytics, we'll use the counts directly below
    }
    
    const key = `${dept}-${year}`
    
    if (!deptYearMap.has(key)) {
      deptYearMap.set(key, {
        department: dept,
        year: year,
        present: 0,
        absent: 0,
        proxy: 0,
        bunk: 0,
        total: 0,
      })
    }
    
    const stats = deptYearMap.get(key)
    
    if (isResultsData) {
      // Count by status
      if (status === 'Present') stats.present += 1
      else if (status === 'Absent') stats.absent += 1
      else if (status === 'Proxy') stats.proxy += 1
      else if (status === 'Bunk') stats.bunk += 1
      stats.total += 1
    } else {
      // Use counts from analytics
      stats.present += item.present || 0
      stats.absent += item.absent || 0
      stats.proxy += item.proxy || 0
      stats.bunk += item.bunk || 0
      stats.total += item.total || 0
    }
  })

  // Create labels and data
  const labels = Array.from(deptYearMap.keys()).map(key => {
    const [dept, year] = key.split('-')
    return `${dept} (${year})`
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Present',
        data: Array.from(deptYearMap.values()).map(stats => {
          const pct = stats.total > 0 ? (stats.present / stats.total) * 100 : 0
          return pct
        }),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Absent',
        data: Array.from(deptYearMap.values()).map(stats => {
          const pct = stats.total > 0 ? (stats.absent / stats.total) * 100 : 0
          return pct
        }),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Proxy',
        data: Array.from(deptYearMap.values()).map(stats => {
          const pct = stats.total > 0 ? (stats.proxy / stats.total) * 100 : 0
          return pct
        }),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: 'Bunk',
        data: Array.from(deptYearMap.values()).map(stats => {
          const pct = stats.total > 0 ? (stats.bunk / stats.total) * 100 : 0
          return pct
        }),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 12,
          font: {
            size: 11,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.x.toFixed(1)}%`
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
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
        stacked: true,
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

