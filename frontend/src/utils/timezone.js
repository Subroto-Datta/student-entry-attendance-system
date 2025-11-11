import { format, formatDistanceToNow } from 'date-fns'

// IST offset: +5 hours 30 minutes = 19800000 milliseconds
export const IST_OFFSET_MS = 6.5 * 60 * 60 * 1000

/**
 * Convert UTC timestamp to IST and format it
 * @param {string|Date} timestamp - UTC timestamp
 * @param {string} formatStr - date-fns format string (default: 'MMM dd, HH:mm:ss')
 * @returns {string} Formatted time in IST
 */
export const formatToIST = (timestamp, formatStr = 'MMM dd, HH:mm:ss') => {
  if (!timestamp) return 'N/A'
  
  try {
    // Parse the timestamp to a Date object (assumes UTC)
    const utcDate = new Date(timestamp)
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid timestamp:', timestamp)
      return 'Invalid Date'
    }
    
    // Convert UTC to IST by adding offset
    const istDate = new Date(utcDate.getTime() + IST_OFFSET_MS)
    
    // Format the date
    return format(istDate, formatStr)
  } catch (error) {
    console.error('Error formatting timestamp to IST:', error, timestamp)
    return 'Error'
  }
}

/**
 * Get relative time (e.g., "2 hours ago") for IST
 * @param {string|Date} timestamp - UTC timestamp
 * @returns {string} Relative time string
 */
export const getTimeAgoIST = (timestamp) => {
  if (!timestamp) return 'Unknown'
  
  try {
    const utcDate = new Date(timestamp)
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid timestamp:', timestamp)
      return 'Unknown'
    }
    
    // Convert to IST by adding offset
    const istDate = new Date(utcDate.getTime() + IST_OFFSET_MS)
    
    // Get current IST time
    const nowUTC = new Date()
    const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS)
    
    // Calculate relative time from IST perspective
    return formatDistanceToNow(istDate, { addSuffix: true })
  } catch (error) {
    console.error('Error getting relative time:', error)
    return 'Unknown'
  }
}

/**
 * Convert UTC timestamp to IST Date object
 * @param {string|Date} timestamp - UTC timestamp
 * @returns {Date} IST Date object
 */
export const convertToIST = (timestamp) => {
  if (!timestamp) return null
  
  try {
    const utcDate = new Date(timestamp)
    if (isNaN(utcDate.getTime())) {
      return null
    }
    // Add IST offset to UTC time
    return new Date(utcDate.getTime() + IST_OFFSET_MS)
  } catch (error) {
    console.error('Error converting to IST:', error)
    return null
  }
}

/**
 * Get current IST time
 * @returns {Date} Current time in IST
 */
export const getCurrentIST = () => {
  const nowUTC = new Date()
  return new Date(nowUTC.getTime() + IST_OFFSET_MS)
}

/**
 * Format date with full details including timezone
 * @param {string|Date} timestamp - UTC timestamp
 * @returns {string} Formatted date with timezone
 */
export const formatToISTFull = (timestamp) => {
  if (!timestamp) return 'N/A'
  
  try {
    const utcDate = new Date(timestamp)
    if (isNaN(utcDate.getTime())) {
      return 'Invalid Date'
    }
    
    const istDate = new Date(utcDate.getTime() + IST_OFFSET_MS)
    return format(istDate, 'MMM dd, yyyy HH:mm:ss') + ' IST'
  } catch (error) {
    console.error('Error formatting full IST:', error)
    return 'Error'
  }
}

