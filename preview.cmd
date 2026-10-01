@echo off
rem Local preview: assemble src/ into _site/ and serve it at http://localhost:8080/ in the default browser (double-click this file).
rem It serves _site\ instead of opening _site\index.html as a file: folder links such as ko/guide/ need index.html served the way GitHub Pages does.
rem Close this window (or press Ctrl+C) to stop the preview. --no-open builds only (used by tests).
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found. Install it from https://nodejs.org and run this again. & pause & exit /b 1)
node tools\build-site.js || (echo Build failed. See the error above. & pause & exit /b 1)
if /i "%~1"=="--no-open" exit /b 0
node tools\serve.js --open
pause
