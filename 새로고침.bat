@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 블로그 최신글을 다시 읽어옵니다...
echo.
node build.mjs
if errorlevel 1 (
  echo.
  echo 실패했습니다. 위 메시지를 확인하세요.
  pause
  exit /b 1
)
echo.
start "" "%~dp0index.html"
