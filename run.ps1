# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Smart Traffic System Demo Started!" -ForegroundColor Green
Write-Host "Backend running on http://localhost:5000"
Write-Host "Frontend running on http://localhost:5173"
