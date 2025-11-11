# Attendance Management Dashboard - Frontend

A premium, production-grade React dashboard for attendance management with beautiful UI/UX and comprehensive analytics.

## 🎨 Features

- **Premium UI/UX**: Modern, responsive design with Shadcn UI components
- **Multiple Chart Types**: Line, Bar, Doughnut, Radar, and Area charts using Chart.js
- **Real-time Analytics**: Daily, weekly, monthly, and semester-level insights
- **Advanced Filtering**: Filter by date, year, department, division, and status
- **File Upload**: Drag-and-drop Excel/CSV upload with progress tracking
- **Data Export**: Export attendance records to CSV
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- API Gateway endpoint URL

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.template .env.local
   ```
   
   Edit `.env.local` and add your API Gateway URL:
   ```
   VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   ├── charts/          # Chart.js components
│   │   ├── Layout.jsx       # Main layout with navigation
│   │   ├── StatCard.jsx     # Statistic cards
│   │   ├── FilterBar.jsx    # Filter controls
│   │   └── AttendanceTable.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   └── UploadPage.jsx   # File upload page
│   ├── utils/
│   │   ├── api.js           # API client
│   │   ├── export.js        # CSV export utilities
│   │   └── cn.js            # Class name utilities
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎯 Components

### Charts

- **AttendanceLineChart**: Line chart showing attendance trends over time
- **AttendanceBarChart**: Stacked bar chart comparing attendance statuses
- **StatusDistributionChart**: Doughnut chart showing status distribution
- **AttendanceRadarChart**: Radar chart for performance comparison
- **AttendanceAreaChart**: Area chart for attendance percentage trends

### Pages

- **Dashboard**: Main analytics dashboard with stats, charts, and table
- **UploadPage**: File upload interface with drag-and-drop support

## 🔧 Configuration

### API Endpoints

The frontend expects the following API endpoints:

- `GET /results` - Get attendance results
- `GET /analytics` - Get analytics data
- `POST /generate-presigned-url` - Generate S3 presigned URL

### Environment Variables

- `VITE_API_BASE_URL`: Base URL for API Gateway

## 📊 Chart Types

1. **Line Chart**: Trend analysis over time
2. **Bar Chart**: Comparative analysis
3. **Doughnut Chart**: Distribution visualization
4. **Radar Chart**: Multi-dimensional performance
5. **Area Chart**: Percentage trends

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: High-quality React components
- **Custom Gradients**: Premium gradient backgrounds
- **Dark Mode**: Full dark mode support (ready)

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Optimized layouts for all screen sizes

## 🔐 Security

- Environment variables for sensitive data
- CORS handled by API Gateway
- Secure file uploads via presigned URLs

## 🚀 Deployment

### AWS Amplify

1. Connect your repository
2. Set build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add environment variable: `VITE_API_BASE_URL`
4. Deploy

### Vercel

1. Import repository
2. Set framework preset: Vite
3. Add environment variable: `VITE_API_BASE_URL`
4. Deploy

### Netlify

1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variable: `VITE_API_BASE_URL`
5. Deploy

## 📝 Usage

### Viewing Analytics

1. Navigate to Dashboard
2. Select period (Daily/Weekly/Monthly/Semester)
3. Apply filters as needed
4. View charts and statistics

### Uploading Files

1. Navigate to Upload page
2. Enter date and lecture (optional)
3. Drag & drop or select Excel/CSV file
4. Click "Upload File"
5. Wait for processing

### Exporting Data

1. Go to Dashboard
2. Apply desired filters
3. Click "Export" button in Attendance Table
4. CSV file will download

## 🐛 Troubleshooting

### API Connection Issues

- Check `VITE_API_BASE_URL` in `.env.local`
- Verify API Gateway CORS configuration
- Check browser console for errors

### Chart Not Displaying

- Ensure data is loaded correctly
- Check browser console for Chart.js errors
- Verify API response format

### Build Errors

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+)
- Verify all dependencies are installed

## 📚 Technologies

- **React 18**: UI library
- **Vite**: Build tool
- **Chart.js**: Charting library
- **Shadcn UI**: Component library
- **Tailwind CSS**: Styling
- **React Router**: Navigation
- **Axios**: HTTP client
- **React Dropzone**: File uploads
- **date-fns**: Date utilities

## 🎓 Learning Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Built with ❤️ using React, Vite, and Shadcn UI**

