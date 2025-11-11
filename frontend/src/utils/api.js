import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://iz0fcerohk.execute-api.eu-north-1.amazonaws.com/prod'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response for debugging
    console.log('API Response (raw):', response)
    console.log('API Response data:', response.data)
    console.log('API Response status:', response.status)
    
    // If API Gateway returns Lambda proxy format, extract body
    if (response.data && response.data.body) {
      try {
        const parsedBody = typeof response.data.body === 'string' 
          ? JSON.parse(response.data.body) 
          : response.data.body
        console.log('Extracted Lambda body:', parsedBody)
        // Replace response.data with parsed body
        response.data = parsedBody
      } catch (e) {
        console.error('Error parsing Lambda body:', e)
      }
    }
    
    return response
  },
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data)
      console.error('API Error status:', error.response.status)
    } else if (error.request) {
      console.error('Network Error:', error.request)
    } else {
      console.error('Error:', error.message)
    }
    return Promise.reject(error)
  }
)

// API Functions
export const getResults = async (params = {}) => {
  try {
    const response = await api.get('/results', { params })
    return response.data
  } catch (error) {
    throw error
  }
}

export const getAnalytics = async (params = {}) => {
  try {
    const response = await api.get('/analytics', { params })
    return response.data
  } catch (error) {
    throw error
  }
}

export const generatePresignedUrl = async (date, lecture, fileName, contentType) => {
  try {
    // CRITICAL: Ensure date is a valid string, not empty, not null, not undefined
    const dateToSend = date && typeof date === 'string' && date.trim().length >= 10 
      ? date.trim() 
      : ''
    
    if (!dateToSend) {
      console.error('❌ ERROR: No valid date provided to generatePresignedUrl!')
      console.error('Received date:', date)
      console.error('Date type:', typeof date)
      throw new Error('Date is required for upload. Please select a date.')
    }
    
    const requestBody = {
      date: dateToSend,  // Always send a valid date string
      lecture: lecture || 'upload',
      file_name: fileName,
      content_type: contentType,
    }
    
    console.log('=== API REQUEST: generate-presigned-url ===')
    console.log('URL: /generate-presigned-url')
    console.log('Method: POST')
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    console.log('Date value:', dateToSend)
    console.log('Date type:', typeof dateToSend)
    console.log('Date length:', dateToSend.length)
    console.log('Date format valid:', /^\d{4}-\d{2}-\d{2}$/.test(dateToSend))
    
    const response = await api.post('/generate-presigned-url', requestBody)
    
    console.log('=== API RESPONSE: generate-presigned-url ===')
    console.log('Status:', response.status)
    console.log('Response data:', response.data)
    console.log('Filename in response:', response.data?.file_name)
    
    // Verify the response filename contains the date we sent
    if (response.data?.file_name && dateToSend) {
      const dateInResponseFilename = response.data.file_name.match(/(\d{4}-\d{2}-\d{2})/)?.[1]
      if (dateInResponseFilename === dateToSend) {
        console.log('✅ SUCCESS: Response filename contains the correct date:', dateToSend)
      } else {
        console.error('❌ ERROR: Response filename date mismatch!')
        console.error('Expected date:', dateToSend)
        console.error('Date in response filename:', dateInResponseFilename)
        console.error('Full filename:', response.data.file_name)
      }
    }
    
    return response.data
  } catch (error) {
    // Provide more helpful error messages
    if (error.request && !error.response) {
      // Network error - no response received
      const networkError = new Error('Unable to connect to the server. Please check your internet connection and try again.')
      networkError.isNetworkError = true
      throw networkError
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status
      let message = 'Failed to generate upload URL'
      
      if (status === 400) {
        // Bad request - likely date missing or invalid
        const errorData = error.response.data
        
        // Check if this is an API Gateway configuration issue (empty request body)
        if (errorData?.request_body_keys && errorData.request_body_keys.length === 0) {
          message = 'API Gateway Configuration Error: Request body is empty. Lambda Proxy integration may not be enabled.'
          console.error('❌ CRITICAL: API Gateway is not forwarding request body to Lambda!')
          console.error('   This means Lambda Proxy integration is NOT enabled in API Gateway')
          console.error('   Request body keys received by Lambda:', errorData.request_body_keys)
          console.error('   Request body received by Lambda:', errorData.request_body)
          console.error('   Fix: Enable Lambda Proxy integration in API Gateway')
        } else if (errorData?.message) {
          message = errorData.message
        } else if (errorData?.error) {
          message = errorData.error
        } else {
          message = 'Invalid request. Please ensure a valid date is selected.'
        }
        
        // Log detailed error info
        console.error('❌ Lambda returned 400 error (Bad Request)')
        console.error('Error details:', errorData)
        if (errorData?.received_date) {
          console.error('Date received by Lambda:', errorData.received_date)
          if (errorData.received_date === 'EMPTY') {
            console.error('⚠️ WARNING: Lambda received EMPTY date - API Gateway may not be forwarding request body')
          }
        }
        if (errorData?.request_body_keys) {
          console.error('Request body keys:', errorData.request_body_keys)
          if (errorData.request_body_keys.length === 0) {
            console.error('⚠️ WARNING: Request body is EMPTY - Enable Lambda Proxy integration in API Gateway')
          }
        }
      } else if (status === 403) {
        message = 'Access denied. You do not have permission to upload files.'
      } else if (status === 404) {
        message = 'Upload service not found. Please contact support.'
      } else if (status >= 500) {
        message = 'Server error. Please try again in a few moments.'
      } else {
        message = error.response.data?.error || error.response.data?.message || `Failed to generate upload URL (status ${status})`
      }
      
      const serverError = new Error(message)
      serverError.status = status
      serverError.responseData = error.response.data
      throw serverError
    } else {
      // Other errors
    throw error
    }
  }
}

export const uploadFile = async (file, presignedUrl) => {
  try {
    console.log('Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      presignedUrl: presignedUrl ? presignedUrl.substring(0, 100) + '...' : 'MISSING'
    })
    
    const response = await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      timeout: 30000, // 30 second timeout
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`Upload progress: ${percentCompleted}%`)
        }
      }
    })
    
    console.log('Upload successful:', response.status)
    return response
  } catch (error) {
    console.error('Upload error details:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : null,
      request: error.request ? 'Request made but no response' : null,
      config: error.config ? {
        url: error.config.url?.substring(0, 100),
        method: error.config.method
      } : null
    })
    
    // Provide more helpful error messages
    if (error.code === 'ECONNABORTED') {
      const uploadError = new Error('Upload timeout. The file may be too large or the connection is slow. Please try again.')
      uploadError.isNetworkError = true
      throw uploadError
    } else if (error.message && (error.message.includes('CORS') || error.message.includes('cors'))) {
      // CORS error
      const corsError = new Error('CORS error: The S3 bucket may not be configured to allow uploads from your browser. Please check S3 bucket CORS settings or contact support.')
      corsError.isNetworkError = true
      corsError.isCorsError = true
      throw corsError
    } else if (error.request && !error.response) {
      // Network error - no response received (often CORS or connection issue)
      // Check if it's likely a CORS issue
      const isLikelyCors = error.message && (
        error.message.includes('Network Error') || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('CORS')
      )
      
      const networkError = new Error(
        isLikelyCors 
          ? 'CORS error: The S3 bucket CORS configuration may be missing or incorrect. Please verify S3 bucket CORS settings allow PUT requests from your domain.'
          : 'Network error. Please check your internet connection and try again. If the problem persists, the server may be unavailable.'
      )
      networkError.isNetworkError = true
      networkError.isCorsError = isLikelyCors
      throw networkError
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status
      let message = 'Upload failed'
      
      if (status === 403) {
        message = 'Access denied. The upload link may have expired or you do not have permission. Please try uploading again.'
      } else if (status === 404) {
        message = 'Upload endpoint not found. The presigned URL may be invalid. Please try uploading again.'
      } else if (status === 405) {
        message = 'Method not allowed. This may be a CORS configuration issue with the S3 bucket.'
      } else if (status >= 500) {
        message = 'Server error. Please try again in a few moments.'
      } else {
        const errorData = error.response.data
        message = errorData?.message || errorData?.error || error.response.statusText || `Upload failed with status ${status}`
      }
      
      const serverError = new Error(message)
      serverError.status = status
      throw serverError
    } else {
      // Other errors
    throw error
    }
  }
}

export const getEntryLogs = async (params = {}) => {
  try {
    const response = await api.get('/entry-logs', { params })
    return response.data
  } catch (error) {
    throw error
  }
}

export default api

