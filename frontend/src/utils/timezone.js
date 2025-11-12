import { format, formatDistanceToNow } from 'date-fns'

// IST timezone string
export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Convert UTC timestamp to IST and format it
 * @param {string|Date} timestamp - UTC timestamp
 * @param {string} formatStr - date-fns format string (default: 'MMM dd, HH:mm:ss')
 * @returns {string} Formatted time in IST
 */
export const formatToIST = (timestamp, formatStr = 'MMM dd, HH:mm:ss') => {
  if (!timestamp) return 'N/A'
  
  try {
    // Parse the timestamp to a Date object (treats as UTC)
    let utcDate
    if (typeof timestamp === 'string') {
      // Ensure UTC by appending 'Z' if not present
      const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
      utcDate = new Date(utcTimestamp)
    } else {
      utcDate = new Date(timestamp)
    }
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid timestamp:', timestamp)
      return 'Invalid Date'
    }
    
    // Get IST time by using toLocaleString with IST timezone
    const istString = utcDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    // Parse the IST string back to a Date object for formatting
    const istDate = new Date(istString)
    
    // Format the date using date-fns
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
    // Parse the timestamp to a Date object
    let utcDate
    if (typeof timestamp === 'string') {
      // Ensure UTC by appending 'Z' if not present
      const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
      utcDate = new Date(utcTimestamp)
    } else {
      utcDate = new Date(timestamp)
    }
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid timestamp:', timestamp)
      return 'Unknown'
    }
    
    // Use formatDistanceToNow with the UTC date
    // It will correctly calculate the relative time
    return formatDistanceToNow(utcDate, { addSuffix: true })
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
    let utcDate
    if (typeof timestamp === 'string') {
      const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
      utcDate = new Date(utcTimestamp)
    } else {
      utcDate = new Date(timestamp)
    }
    
    if (isNaN(utcDate.getTime())) {
      return null
    }
    
    // Convert to IST using toLocaleString
    const istString = utcDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    return new Date(istString)
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
  const now = new Date()
  const istString = now.toLocaleString('en-US', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  return new Date(istString)
}

/**
 * Format date with full details including timezone
 * @param {string|Date} timestamp - UTC timestamp
 * @returns {string} Formatted date with timezone
 */
export const formatToISTFull = (timestamp) => {
  if (!timestamp) return 'N/A'
  
  try {
    let utcDate
    if (typeof timestamp === 'string') {
      const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
      utcDate = new Date(utcTimestamp)
    } else {
      utcDate = new Date(timestamp)
    }
    
    if (isNaN(utcDate.getTime())) {
      return 'Invalid Date'
    }
    
    // Convert to IST
    const istString = utcDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const istDate = new Date(istString)
    return format(istDate, 'MMM dd, yyyy HH:mm:ss') + ' IST'
  } catch (error) {
    console.error('Error formatting full IST:', error)
    return 'Error'
  }
}

