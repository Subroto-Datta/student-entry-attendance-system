import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function CompleteStatusDistribution({ data }) {
  if (!data || (!data.present && !data.absent && !data.proxy && !data.bunk)) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const chartData = {
    labels: ['Present', 'Absent', 'Proxy', 'Bunk'],
    datasets: [
      {
        data: [
          data.present || 0,
          data.absent || 0,
          data.proxy || 0,
          data.bunk || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',    // Green for Present
          'rgba(239, 68, 68, 0.8)',    // Red for Absent
          'rgba(245, 158, 11, 0.8)',   // Orange/Yellow for Proxy
          'rgba(139, 92, 246, 0.8)',   // Purple for Bunk
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(139, 92, 246)',
        ],
        borderWidth: 3,
        hoverOffset: 12,
      },
    ],
  }

  const total = (data.present || 0) + (data.absent || 0) + (data.proxy || 0) + (data.bunk || 0)

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500',
          },
          generateLabels: (chart) => {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0]
                const value = dataset.data[i]
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor[i],
                  lineWidth: dataset.borderWidth,
                  hidden: false,
                  index: i,
                }
              })
            }
            return []
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: '600',
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed || 0
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
    },
  }

  return (
    <div className="h-full">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

