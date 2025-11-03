import React, { useState } from 'react';
import { uploadAttendanceFile } from '../utils/api';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lecture, setLecture] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && 
          !selectedFile.name.endsWith('.xls') && !selectedFile.name.endsWith('.csv')) {
        setMessage({
          type: 'error',
          text: 'Please upload a valid Excel (.xlsx, .xls) or CSV file'
        });
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setMessage({ type: '', text: '' });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setMessage({
        type: 'error',
        text: 'Please select a file to upload'
      });
      return;
    }

    if (!date) {
      setMessage({
        type: 'error',
        text: 'Please select a date'
      });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      // Note: In production, you would need to implement proper S3 upload
      // This is a placeholder that shows the expected flow
      const result = await uploadAttendanceFile(file, date, lecture);
      
      setMessage({
        type: 'success',
        text: 'File uploaded successfully! Attendance processing will begin shortly.'
      });
      
      // Reset form
      setFile(null);
      setLecture('');
      
      // Clear file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to upload file. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Attendance</h1>
          <p className="text-gray-600 mb-6">
            Upload an Excel or CSV file containing student attendance data
          </p>

          {/* File Format Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">File Format Requirements:</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>Required columns: <code className="bg-blue-100 px-1 rounded">student_id</code> OR <code className="bg-blue-100 px-1 rounded">rfid_uid</code></li>
              <li>Optional columns: <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">lecture</code></li>
              <li>Supported formats: .xlsx, .xls, .csv</li>
              <li>Date can be specified in filename or using the date picker below</li>
            </ul>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-input"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-input"
                        name="file-input"
                        type="file"
                        className="sr-only"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">Excel or CSV up to 10MB</p>
                  {file && (
                    <p className="text-sm text-gray-700 mt-2">
                      Selected: <span className="font-medium">{file.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Lecture Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lecture (Optional)
              </label>
              <input
                type="text"
                value={lecture}
                onChange={(e) => setLecture(e.target.value)}
                placeholder="e.g., Lecture 1, Math, Physics"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Lecture name will be extracted from filename if not provided
              </p>
            </div>

            {/* Message */}
            {message.text && (
              <div
                className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload Attendance File'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

