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

export default function AllStatusStackedChart({ data, period = 'daily' }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const labels = data.map(item => {
    if (period === 'daily') return item.date?.split('-').slice(1).join('/') || item.date
    if (period === 'weekly') return item.week
    if (period === 'monthly') return item.month
    return item.date
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Present',
        data: data.map(item => item.present || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      },
      {
        label: 'Absent',
        data: data.map(item => item.absent || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
      },
      {
        label: 'Proxy',
        data: data.map(item => item.proxy || 0),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 2,
      },
      {
        label: 'Bunk',
        data: data.map(item => item.bunk || 0),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          precision: 0,
        },
      },
    },
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
          footer: function(tooltipItems) {
            const total = tooltipItems.reduce((sum, item) => sum + (item.parsed.y || 0), 0)
            const present = tooltipItems.find(item => item.datasetIndex === 0)?.parsed.y || 0
            const attendancePct = total > 0 ? ((present / total) * 100).toFixed(1) : 0
            return `Total: ${total} | Attendance: ${attendancePct}%`
          },
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

