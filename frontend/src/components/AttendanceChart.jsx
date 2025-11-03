import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AttendanceChart = ({ data, period }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for the selected period
      </div>
    );
  }

  // Prepare data for charts based on period
  const labels = data.map(item => {
    if (period === 'daily') return item.date;
    if (period === 'weekly') return item.week;
    if (period === 'monthly') return item.month;
    if (period === 'semester') return `${item.department} - ${item.year}`;
    return item.date;
  });

  const presentData = data.map(item => item.present || 0);
  const absentData = data.map(item => item.absent || 0);
  const proxyData = data.map(item => item.proxy || 0);
  const bunkData = data.map(item => item.bunk || 0);

  // Bar Chart Configuration
  const barChartData = {
    labels,
    datasets: [
      {
        label: 'Present',
        data: presentData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
      {
        label: 'Absent',
        data: absentData,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
      {
        label: 'Proxy',
        data: proxyData,
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgba(251, 191, 36, 1)',
        borderWidth: 1,
      },
      {
        label: 'Bunk',
        data: bunkData,
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Attendance by ${period.charAt(0).toUpperCase() + period.slice(1)}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Line Chart for Attendance Percentage
  const attendancePercentages = data.map(item => item.attendance_percentage || 0);
  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Attendance %',
        data: attendancePercentages,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Attendance Percentage Trend',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  // Doughnut Chart for Overall Distribution
  const totalPresent = presentData.reduce((a, b) => a + b, 0);
  const totalAbsent = absentData.reduce((a, b) => a + b, 0);
  const totalProxy = proxyData.reduce((a, b) => a + b, 0);
  const totalBunk = bunkData.reduce((a, b) => a + b, 0);

  const doughnutChartData = {
    labels: ['Present', 'Absent', 'Proxy', 'Bunk'],
    datasets: [
      {
        data: [totalPresent, totalAbsent, totalProxy, totalBunk],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Overall Distribution',
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="h-80">
        <Bar data={barChartData} options={barChartOptions} />
      </div>

      {/* Line and Doughnut Charts Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-80">
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
        <div className="h-80">
          <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;

