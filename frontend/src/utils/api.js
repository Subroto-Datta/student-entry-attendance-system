/**
 * API utility functions for communicating with AWS API Gateway endpoints
 */

import axios from 'axios';

// Replace with your API Gateway endpoint URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod';

// Note: For S3 presigned URL uploads, we need to make direct requests to S3
// The presigned URL will be a full S3 URL, not an API Gateway URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Send entry log from IoT device
 * @param {Object} entryData - {rfid_uid, timestamp, date}
 * @returns {Promise}
 */
export const sendEntryLog = async (entryData) => {
  try {
    const response = await api.post('/entry', entryData);
    return response.data;
  } catch (error) {
    console.error('Error sending entry log:', error);
    throw error;
  }
};

/**
 * Get attendance results with optional filters
 * @param {Object} filters - {date, year, department, division, status, start_date, end_date}
 * @returns {Promise}
 */
export const getAttendanceResults = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    
    const response = await api.get(`/results?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching attendance results:', error);
    throw error;
  }
};

/**
 * Get analytics data
 * @param {Object} filters - {period, year, department, division, start_date, end_date}
 * @returns {Promise}
 */
export const getAnalytics = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    
    const response = await api.get(`/analytics?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

/**
 * Upload attendance Excel/CSV file to S3 via presigned URL
 * 
 * Implementation using presigned URLs (recommended):
 * 1. Get presigned URL from Lambda
 * 2. Upload file directly to S3
 */
export const uploadAttendanceFile = async (file, date, lecture) => {
  try {
    // Option 1: Use presigned URL (recommended)
    // First, get presigned URL from Lambda
    const presignedUrlResponse = await api.post('/upload-url', {
      file_name: `uploads/${date}_${(lecture || 'upload').replace(/\s+/g, '_')}.${file.name.split('.').pop()}`,
      date: date,
      lecture: lecture || '',
      content_type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const { presigned_url } = presignedUrlResponse.data;
    
    // Upload directly to S3 using presigned URL
    const uploadResponse = await axios.put(presigned_url, file, {
      headers: {
        'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      onUploadProgress: (progressEvent) => {
        // Optional: Track upload progress
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });
    
    return {
      success: true,
      message: 'File uploaded successfully',
      file_name: presignedUrlResponse.data.file_name
    };
    
  } catch (error) {
    // Fallback: Try direct API Gateway upload (if /upload endpoint exists)
    if (error.response?.status === 404) {
      console.warn('Presigned URL endpoint not found, trying direct upload...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('date', date);
        formData.append('lecture', lecture || '');
        
        const response = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        return response.data;
      } catch (fallbackError) {
        console.error('Both upload methods failed:', fallbackError);
        throw new Error('Upload failed. Please ensure upload endpoint is configured.');
      }
    }
    
    console.error('Error uploading file:', error);
    throw error;
  }
};

export default api;

