import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function AttendancePercentageTrend({ data, period = 'daily' }) {
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

  const attendanceData = data.map(item => item.attendance_percentage || 0)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Attendance %',
        data: attendanceData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Target (75%)',
        data: Array(labels.length).fill(75),
        borderColor: 'rgba(34, 197, 94, 0.5)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
    ],
  }

  const options = {
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
            if (context.datasetIndex === 0) {
              return `Attendance: ${context.parsed.y.toFixed(1)}%`
            }
            return 'Target: 75%'
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 0,
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
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="h-full">
      <Line data={chartData} options={options} />
    </div>
  )
}

