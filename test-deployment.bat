@echo off
echo ========================================
echo BACKEND HEALTH CHECK
echo ========================================
curl.exe -s https://attendence12.onrender.com/
echo.
echo.

echo ========================================
echo BACKEND API - Admin Login Test
echo ========================================
curl.exe -s -X POST https://attendence12.onrender.com/api/auth/admin/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"Ksdkt@006\"}"
echo.
echo.

echo ========================================
echo FRONTEND ACCESSIBILITY CHECK
echo ========================================
curl.exe -s -I https://attendence-lime-beta.vercel.app/ | findstr "HTTP"
echo.
