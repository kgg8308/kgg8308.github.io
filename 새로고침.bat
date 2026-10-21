@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] 블로그 최신글을 다시 읽어옵니다...
echo.
node build.mjs
if errorlevel 1 (
  echo.
  echo 실패했습니다. 위 메시지를 확인하세요.
  pause
  exit /b 1
)
echo.
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [2/2] 아직 GitHub에 연결되지 않아 내 컴퓨터에서만 갱신했습니다.
) else (
  echo [2/2] 홈페이지에 올리는 중...
  git add -A >nul
  git commit -m "최신글 갱신" >nul 2>&1
  git push -q
  if errorlevel 1 (
    echo     올리지 못했습니다. 인터넷 연결이나 GitHub 로그인을 확인하세요.
  ) else (
    echo     올렸습니다 - https://kgg8308.github.io
  )
)
echo.
start "" "%~dp0index.html"
