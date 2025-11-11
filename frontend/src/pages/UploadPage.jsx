import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { generatePresignedUrl, uploadFile } from '@/utils/api'
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [lecture, setLecture] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const dateInputRef = useRef(null)
  const { toast } = useToast()

  // Sync date input value with state on mount and when date changes
  useEffect(() => {
    if (dateInputRef.current && dateInputRef.current.value !== date) {
      dateInputRef.current.value = date
      console.log('Synced date input value with state:', date)
    }
  }, [date])

  // Also sync when input value changes externally (browser autofill, etc.)
  useEffect(() => {
    const dateInput = dateInputRef.current
    if (!dateInput) return

    const handleInput = () => {
      const inputValue = dateInput.value
      if (inputValue && inputValue !== date) {
        console.log('Date input value changed externally, updating state:', inputValue)
        setDate(inputValue)
      }
    }

    dateInput.addEventListener('input', handleInput)
    return () => dateInput.removeEventListener('input', handleInput)
  }, [date])

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ]
      
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
        toast({
          title: 'File selected',
          description: `${selectedFile.name} is ready to upload`,
        })
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an Excel (.xlsx, .xls) or CSV file',
          variant: 'destructive',
        })
      }
    }
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      })
      return
    }

    // CRITICAL: Force React to flush any pending state updates
    // Then read the date from the actual DOM element (most reliable)
    await new Promise(resolve => setTimeout(resolve, 0)) // Let React finish any pending updates
    
    // Read date from the actual input element in the DOM
    const dateInputElement = document.getElementById('date')
    if (!dateInputElement) {
      toast({
        title: 'Error',
        description: 'Date input field not found. Please refresh the page.',
        variant: 'destructive',
      })
      return
    }
    
    // Get the date value directly from the DOM input element
    // This is the SINGLE SOURCE OF TRUTH - what the user actually sees/selected
    let selectedDate = dateInputElement.value
    
    // If empty, try React state as fallback
    if (!selectedDate) {
      selectedDate = date
      console.warn('Date input is empty, using React state:', selectedDate)
    }
    
    // If still empty, use today (last resort)
    const today = new Date().toISOString().split('T')[0]
    if (!selectedDate) {
      selectedDate = today
      console.warn('No date found, using today:', selectedDate)
    }
    
    // CRITICAL: Ensure date is in YYYY-MM-DD format
    // Strip any whitespace and validate format
    selectedDate = selectedDate.trim()
    
    // Validate date format - must be exactly YYYY-MM-DD (10 characters)
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateFormatRegex.test(selectedDate)) {
      console.error('Invalid date format:', selectedDate)
      console.error('Expected format: YYYY-MM-DD (e.g., 2025-11-06)')
      console.error('Actual format length:', selectedDate.length)
      console.error('Actual format:', selectedDate)
      
      toast({
        title: 'Invalid Date Format',
        description: `Date must be in YYYY-MM-DD format (e.g., 2025-11-06). Received: ${selectedDate}`,
        variant: 'destructive',
      })
      return
    }
    
    // Additional validation: Try to parse the date to ensure it's valid
    const dateParts = selectedDate.split('-')
    if (dateParts.length !== 3) {
      console.error('Invalid date structure:', selectedDate)
      toast({
        title: 'Invalid Date',
        description: `Date must be in YYYY-MM-DD format. Received: ${selectedDate}`,
        variant: 'destructive',
      })
      return
    }
    
    const year = parseInt(dateParts[0], 10)
    const month = parseInt(dateParts[1], 10)
    const day = parseInt(dateParts[2], 10)
    
    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Invalid date components:', { year, month, day })
      toast({
        title: 'Invalid Date',
        description: `Date contains invalid numbers. Please select a valid date.`,
        variant: 'destructive',
      })
      return
    }
    
    // Validate date range
    if (year < 2000 || year > 2100) {
      console.error('Year out of range:', year)
      toast({
        title: 'Invalid Year',
        description: `Year must be between 2000 and 2100. Received: ${year}`,
        variant: 'destructive',
      })
      return
    }
    
    if (month < 1 || month > 12) {
      console.error('Month out of range:', month)
      toast({
        title: 'Invalid Month',
        description: `Month must be between 1 and 12. Received: ${month}`,
        variant: 'destructive',
      })
      return
    }
    
    if (day < 1 || day > 31) {
      console.error('Day out of range:', day)
      toast({
        title: 'Invalid Day',
        description: `Day must be between 1 and 31. Received: ${day}`,
        variant: 'destructive',
      })
      return
    }
    
    // Create a Date object to validate the actual date
    const dateObj = new Date(year, month - 1, day)
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      console.error('Invalid date (e.g., Feb 30):', selectedDate)
      toast({
        title: 'Invalid Date',
        description: `The date ${selectedDate} is not valid. Please select a valid date.`,
        variant: 'destructive',
      })
      return
    }
    
    // Final format check - ensure it's exactly YYYY-MM-DD
    if (selectedDate.length !== 10 || !dateFormatRegex.test(selectedDate)) {
      console.error('Date format validation failed:', selectedDate)
      toast({
        title: 'Invalid Date Format',
        description: `Date must be in YYYY-MM-DD format. Please select a valid date.`,
        variant: 'destructive',
      })
      return
    }
    
    console.log('=== DATE CAPTURE (FINAL) ===')
    console.log('Date from DOM input element:', dateInputElement.value)
    console.log('Date from React state:', date)
    console.log('✅ SELECTED DATE (will be used):', selectedDate)
    console.log('Today\'s date:', today)
    console.log('Is selected date today?', selectedDate === today)
    
    // Show confirmation dialog with the ACTUAL date that will be used
    const isToday = selectedDate === today
    const confirmMessage = `📅 Upload Attendance\n\n` +
      `Selected Date: ${selectedDate}\n` +
      `File Name: uploads/${selectedDate}_${lecture || 'upload'}_...\n\n` +
      `${isToday ? '⚠️ WARNING: You are uploading for TODAY.\n\n' : '✅ This date will be stored in the database.\n\n'}` +
      `Continue with upload?`
    
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) {
      console.log('Upload cancelled by user')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      // Generate filename - Lambda will regenerate it with the correct date anyway
      const fileExtension = file.name.split('.').pop() || 'xlsx'
      const fileName = `uploads/${selectedDate}_${lecture || 'upload'}_${Date.now()}.${fileExtension}`
      const contentType = file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      
      console.log('=== CALLING generatePresignedUrl ===')
      console.log('🚀 CRITICAL: Sending date to Lambda:', selectedDate)
      console.log('Request body will contain:', {
        date: selectedDate,
        lecture: lecture || 'upload',
        file_name: fileName,
        content_type: contentType
      })
      
      // Show toast with the date being used
      toast({
        title: 'Uploading...',
        description: `Uploading file for date: ${selectedDate}`,
      })
      
      // Call API - Lambda will use the date parameter to regenerate filename correctly
      // IMPORTANT: Send selectedDate (from DOM), not the React state
      let presignedResponse
      try {
        presignedResponse = await generatePresignedUrl(selectedDate, lecture, fileName, contentType)
      } catch (error) {
        // Handle errors from Lambda
        console.error('Error generating presigned URL:', error)
        
        if (error.status === 400) {
          // Bad request - date issue
          const errorMsg = error.message || 'Date is required but was not received by the server.'
          const errorData = error.responseData || {}
          
          // Check if request body was empty (API Gateway configuration issue)
          if (errorData.request_body_keys && errorData.request_body_keys.length === 0) {
            toast({
              title: 'API Gateway Configuration Error',
              description: `The server received an empty request body. This usually means Lambda Proxy integration is not enabled in API Gateway.\n\nSelected date: ${selectedDate}\n\nPlease check API Gateway configuration.`,
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'Date Error',
              description: `${errorMsg}\n\nSelected date: ${selectedDate}\n\nPlease check that the date is correctly selected and try again.`,
              variant: 'destructive',
            })
          }
          setUploading(false)
          return
        } else {
          // Other errors
          throw error
        }
      }
      console.log('Presigned URL response:', presignedResponse)
      
      // Verify the response includes the correct filename
      if (presignedResponse.file_name) {
        console.log('=== VERIFYING RESPONSE FILENAME ===')
        console.log('Filename in response:', presignedResponse.file_name)
        const dateInFilename = presignedResponse.file_name.match(/(\d{4}-\d{2}-\d{2})/)?.[1]
        console.log('Date in response filename:', dateInFilename)
        console.log('Expected date:', selectedDate)
        
        // Log debug info from Lambda (if available)
        if (presignedResponse.debug) {
          console.log('=== LAMBDA DEBUG INFO ===')
          console.log('Request body keys received by Lambda:', presignedResponse.debug.request_body_keys)
          console.log('Date validation passed?', presignedResponse.debug.date_validation_passed)
          console.log('Date received by Lambda:', presignedResponse.date_received)
          console.log('Date used by Lambda:', presignedResponse.date_used)
        }
        
        if (dateInFilename === selectedDate) {
          console.log('✅ SUCCESS: Response filename contains the correct date!')
        } else {
          console.error('❌ ERROR: Response filename date mismatch!')
          console.error('Expected date:', selectedDate)
          console.error('Date in response filename:', dateInFilename)
          console.error('Full filename:', presignedResponse.file_name)
          
          // Show detailed error with debug info
          let errorMessage = `Expected date ${selectedDate} but filename has ${dateInFilename}.`
          if (presignedResponse.debug) {
            errorMessage += `\n\nDebug Info:\n- Date received by Lambda: ${presignedResponse.date_received}\n- Date used by Lambda: ${presignedResponse.date_used}\n- Date validation passed: ${presignedResponse.debug.date_validation_passed}\n- Request keys: ${presignedResponse.debug.request_body_keys.join(', ')}`
          }
          errorMessage += '\n\nPlease check CloudWatch logs for details.'
          
          toast({
            title: 'Date Mismatch Error',
            description: errorMessage,
            variant: 'destructive',
          })
        }
      } else {
        console.warn('⚠️ WARNING: Response does not contain file_name')
      }
      
      const presignedUrl = presignedResponse.presigned_url
      if (!presignedUrl) {
        throw new Error('No presigned URL received from server. Response: ' + JSON.stringify(presignedResponse))
      }
      
      console.log('Presigned URL received, starting upload...')
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // Upload file
      console.log('Uploading file to S3...')
      await uploadFile(file, presignedUrl)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      toast({
        title: 'Upload successful',
        description: 'File has been uploaded and is being processed. The dashboard will refresh automatically in a few seconds.',
      })

      // Reset form
      setTimeout(() => {
        setFile(null)
        setLecture('')
        setUploadProgress(0)
      }, 2000)

      // Trigger dashboard refresh after processing (wait for Lambda to process)
      // The Lambda typically processes within 5-10 seconds
      setTimeout(() => {
        // Dispatch custom event to refresh dashboard
        window.dispatchEvent(new CustomEvent('refreshDashboard'))
        toast({
          title: 'Processing complete',
          description: 'Attendance data has been processed. Check the dashboard for updates.',
        })
      }, 10000) // Wait 10 seconds for Lambda to process
    } catch (error) {
      console.error('Upload error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        request: error.request,
        code: error.code,
        isNetworkError: error.isNetworkError,
      })
      
      // Provide user-friendly error messages
      let errorTitle = 'Upload failed'
      let errorDescription = error.message || 'Failed to upload file. Please try again.'
      
      // Check if it's a CORS error (most common issue with S3 uploads)
      if (error.isCorsError || (error.message && error.message.includes('CORS'))) {
        errorTitle = 'CORS Configuration Error'
        errorDescription = error.message || 'The S3 bucket CORS configuration may be missing or incorrect. Please verify that the S3 bucket has CORS enabled to allow PUT requests from your browser.'
      } else if (error.isNetworkError || (!error.response && error.request)) {
        // Check if it's a network error from generatePresignedUrl or uploadFile
        errorTitle = 'Network Error'
        errorDescription = error.message || 'Unable to connect to the server. Please check your internet connection and try again.'
      } else if (error.response) {
        // API error (from generatePresignedUrl)
        const status = error.response.status
        if (status === 0 || status >= 500) {
          errorTitle = 'Server Error'
          errorDescription = 'The server is temporarily unavailable. Please try again in a few moments.'
        } else if (status === 404) {
          errorTitle = 'Service Not Found'
          errorDescription = 'The upload service could not be found. Please contact support.'
        } else if (status === 403) {
          errorTitle = 'Access Denied'
          errorDescription = 'You do not have permission to upload files. Please contact support.'
        } else {
          errorDescription = error.response.data?.error || error.response.data?.message || error.message || 'Failed to upload file. Please try again.'
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      })
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadProgress(0)
  }

  return (
    <div className="space-y-8 animate-slide-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Upload Attendance</h2>
        <p className="text-muted-foreground">
          Upload Excel or CSV files to process attendance records
        </p>
      </div>

      {/* Upload Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>
            Select an Excel (.xlsx, .xls) or CSV file containing attendance data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metadata Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                ref={dateInputRef}
                value={date}
                min="2000-01-01"
                max="2100-12-31"
                onChange={(e) => {
                  const newDate = e.target.value
                  console.log('=== DATE INPUT CHANGED ===')
                  console.log('Previous date state:', date)
                  console.log('New date value from input:', newDate)
                  
                  // Validate format: YYYY-MM-DD
                  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/
                  if (newDate && !dateFormatRegex.test(newDate)) {
                    console.error('Invalid date format from input:', newDate)
                    console.error('Expected format: YYYY-MM-DD')
                    toast({
                      title: 'Invalid Date Format',
                      description: `Date must be in YYYY-MM-DD format. Received: ${newDate}`,
                      variant: 'destructive',
                    })
                    return
                  }
                  
                  // Update React state immediately
                  setDate(newDate)
                  
                  // Also update ref to keep them in sync
                  if (dateInputRef.current) {
                    dateInputRef.current.value = newDate
                  }
                  
                  console.log('✅ Date state updated to:', newDate)
                  console.log('✅ Date format: YYYY-MM-DD')
                  
                  // Verify after a brief delay
                  setTimeout(() => {
                    const domValue = document.getElementById('date')?.value
                    const refValue = dateInputRef.current?.value
                    console.log('Verification after update:')
                    console.log('  DOM value:', domValue)
                    console.log('  Ref value:', refValue)
                    console.log('  State value:', date)
                    console.log('  Format valid:', dateFormatRegex.test(domValue || ''))
                    console.log('  All match?', domValue === refValue && refValue === newDate)
                  }, 50)
                }}
                onBlur={(e) => {
                  const blurredValue = e.target.value
                  console.log('=== DATE FIELD BLURRED ===')
                  console.log('Blurred value:', blurredValue)
                  console.log('Date state:', date)
                  console.log('Ref value:', dateInputRef.current?.value)
                  
                  // Ensure state and ref are in sync
                  if (blurredValue && blurredValue !== date) {
                    console.log('Syncing date state with blurred value')
                    setDate(blurredValue)
                    if (dateInputRef.current) {
                      dateInputRef.current.value = blurredValue
                    }
                  }
                }}
              />
              {date && (
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground">
                    Selected date: <span className="font-bold text-primary text-base">{date}</span>
                  </p>
                  <p className="text-muted-foreground">
                    This date will be used for attendance records
                  </p>
                  {date === new Date().toISOString().split('T')[0] && (
                    <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                      ⚠️ Currently set to today's date. Change it if you need a different date.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = dateInputRef.current?.value || document.getElementById('date')?.value || date
                      alert(`Current date value:\n\nFrom ref: ${dateInputRef.current?.value || 'N/A'}\nFrom DOM: ${document.getElementById('date')?.value || 'N/A'}\nFrom state: ${date}\n\nWill use: ${currentValue}`)
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Verify date value
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lecture">Lecture (Optional)</Label>
              <Input
                id="lecture"
                placeholder="e.g., Lecture 1, Math 9AM"
                value={lecture}
                onChange={(e) => setLecture(e.target.value)}
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
              ${file ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
            `}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile()
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="p-4 rounded-full bg-muted">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supports: .xlsx, .xls, .csv
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>File Format Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Required Columns</p>
                <p className="text-sm text-muted-foreground">
                  Your file must include either <code className="bg-muted px-1 py-0.5 rounded">student_id</code> or <code className="bg-muted px-1 py-0.5 rounded">rfid_uid</code> column
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Optional Columns</p>
                <p className="text-sm text-muted-foreground">
                  You can also include <code className="bg-muted px-1 py-0.5 rounded">name</code>, <code className="bg-muted px-1 py-0.5 rounded">lecture</code>, and <code className="bg-muted px-1 py-0.5 rounded">date</code> columns for better organization
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <File className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Example Format</p>
                <div className="mt-2 text-sm bg-muted p-3 rounded font-mono">
                  <div>student_id | name | lecture</div>
                  <div>STU001 | John Doe | Lecture 1</div>
                  <div>STU002 | Jane Smith | Lecture 1</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

