@echo off
echo ========================================
echo    AFCIP Project - Starting...
echo ========================================
echo.
echo Starting FastAPI ML Engine on port 8001...
start "FastAPI ML Engine" cmd /k "cd /d C:\Users\UmairDev\Desktop\AFCIP-Project && venv\Scripts\activate && uvicorn api.main:app --reload --port 8001"
timeout /t 2 /nobreak >nul
echo Starting Django Backend on port 8000...
start "Django Backend" cmd /k "cd /d C:\Users\UmairDev\Desktop\AFCIP-Project && venv\Scripts\activate && python manage.py runserver"
timeout /t 2 /nobreak >nul
echo Starting React Frontend...
start "React Frontend" cmd /k "cd /d C:\Users\UmairDev\Desktop\AFCIP-Project\frontend && npm run dev"
echo.
echo ========================================
echo All 3 servers are starting up...
echo Open http://localhost:5173 in your browser
echo ========================================
pause
