/**
 * Utility functions for exporting data to CSV/Excel
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} headers - Optional custom headers
 * @returns {String} CSV string
 */
export const convertToCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV rows
  const csvRows = [];
  
  // Add header row
  csvRows.push(csvHeaders.join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = csvHeaders.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Name of the file
 * @param {Array} headers - Optional custom headers
 */
export const downloadCSV = (data, filename = 'export.csv', headers = null) => {
  const csvContent = convertToCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Export attendance results to CSV
 * @param {Array} records - Attendance records
 */
export const exportAttendanceResults = (records) => {
  const headers = [
    'Student ID',
    'Student Name',
    'RFID UID',
    'Year',
    'Department',
    'Division',
    'Date',
    'Lecture',
    'Status'
  ];
  
  const csvData = records.map(record => ({
    'Student ID': record.student_id,
    'Student Name': record.student_name,
    'RFID UID': record.rfid_uid,
    'Year': record.year,
    'Department': record.department,
    'Division': record.division,
    'Date': record.date,
    'Lecture': record.lecture,
    'Status': record.status
  }));
  
  const filename = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvData, filename, headers);
};

