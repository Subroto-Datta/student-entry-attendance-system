# Quick Fix - Chip Filters Not Showing

If chips aren't appearing after refresh, try these steps:

## 1. Hard Refresh Browser
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`
- This clears browser cache

## 2. Restart Dev Server
```bash
# Stop the current server (Ctrl+C)
cd frontend
npm run dev
```

## 3. Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for any red errors
4. Share any errors you see

## 4. Verify Filters Are Active
The chips only appear when you have active filters:
- Select a Year, Department, Division, or Status
- Set a date
- Change period to Weekly/Monthly/Semester

## 5. Clear Vite Cache
```bash
cd frontend
rm -rf node_modules/.vite
npm run dev
```

## 6. Check Network Tab
- Open DevTools → Network tab
- Check if all files are loading (200 status)
- Look for 404 errors

