# Troubleshooting Guide

## Dev Server Shows Blank Screen

### 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab for errors.

### 2. Common Issues:

#### API Connection Error
- **Symptom**: Blank screen or "Failed to fetch" errors
- **Solution**: 
  - Check if `.env.local` exists with `VITE_API_BASE_URL`
  - Verify API Gateway URL is correct
  - Check CORS settings on API Gateway

#### Missing Dependencies
- **Symptom**: Module not found errors
- **Solution**: 
  ```bash
  cd frontend
  npm install
  ```

#### Port Already in Use
- **Symptom**: "Port 5173 is already in use"
- **Solution**: 
  ```bash
  # Kill process on port 5173 or change port
  npm run dev -- --port 3000
  ```

### 3. Check Dev Server Output

The dev server should show:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4. Verify Files

Ensure all files exist:
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `frontend/index.html`

### 5. Clear Cache and Reinstall

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 6. Check Vite Config

Ensure `vite.config.js` has correct path alias:
```js
alias: {
  '@': path.resolve(__dirname, './src'),
}
```

### 7. Browser Cache

- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Try incognito/private mode

## API Errors

### CORS Errors
- Ensure API Gateway has CORS enabled
- Check `Access-Control-Allow-Origin` header

### 404 Errors
- Verify API Gateway URL in `.env.local`
- Check API Gateway endpoints are deployed
- Ensure stage name matches (`/prod` vs `/dev`)

## Chart.js Errors

If charts don't render:
1. Check browser console for Chart.js errors
2. Verify `chart.js` and `react-chartjs-2` are installed
3. Ensure Chart.js components are properly imported

## Still Not Working?

1. Check terminal output for build errors
2. Verify Node.js version (18+)
3. Try deleting `.vite` cache folder
4. Check file permissions

