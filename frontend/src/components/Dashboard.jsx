import React, { useState, useEffect } from 'react';
import { getAttendanceResults, getAnalytics } from '../utils/api';
import AttendanceChart from './AttendanceChart';
import AttendanceTable from './AttendanceTable';
import FilterBar from './FilterBar';
import { exportAttendanceResults } from '../utils/export';

const Dashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    period: 'daily'
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch attendance results
      const resultsResponse = await getAttendanceResults({
        date: filters.date,
        year: filters.year,
        department: filters.department,
        division: filters.division,
        status: filters.status
      });
      
      setAttendanceData(resultsResponse.records || []);
      
      // Fetch analytics
      const analyticsResponse = await getAnalytics({
        period: filters.period,
        year: filters.year,
        department: filters.department,
        division: filters.division,
        start_date: filters.start_date,
        end_date: filters.end_date
      });
      
      setAnalyticsData(analyticsResponse);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExport = () => {
    if (attendanceData.length > 0) {
      exportAttendanceResults(attendanceData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Attendance Dashboard</h1>
              <p className="text-gray-600 mt-1">View and analyze student attendance data</p>
            </div>
            <button
              onClick={handleExport}
              disabled={attendanceData.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {/* Summary Cards */}
        {analyticsData?.overall_statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              title="Total Records"
              value={analyticsData.overall_statistics.total_records}
              color="blue"
            />
            <SummaryCard
              title="Present"
              value={analyticsData.overall_statistics.present}
              color="green"
            />
            <SummaryCard
              title="Absent"
              value={analyticsData.overall_statistics.absent}
              color="red"
            />
            <SummaryCard
              title="Attendance %"
              value={`${analyticsData.overall_statistics.attendance_percentage}%`}
              color="purple"
            />
          </div>
        )}

        {/* Charts */}
        {analyticsData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Analytics</h2>
            <AttendanceChart data={analyticsData.analytics} period={filters.period} />
          </div>
        )}

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Attendance Records</h2>
          <AttendanceTable data={attendanceData} />
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
      <p className={`text-3xl font-bold ${colorClasses[color]} text-white p-3 rounded-lg inline-block`}>
        {value}
      </p>
    </div>
  );
};

export default Dashboard;

