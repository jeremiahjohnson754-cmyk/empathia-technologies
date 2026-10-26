@echo off
rem Windows: double-click to start the Empathia Founder Studio on this computer.
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node server\serve.mjs
) else (
  echo Node.js 22 or later is not installed, so the studio opens straight from disk instead.
  echo Everything works except automatic persona switching, the data inspector and saved states.
  start "" "index.html"
  pause
)
