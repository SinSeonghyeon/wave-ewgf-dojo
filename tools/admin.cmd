@echo off
rem 미시마 도장 순위 관리 메뉴 (더블클릭). 토큰은 .sandbox\admin-token.txt 에서 읽는다.
chcp 65001 >nul
cd /d "%~dp0.."
node tools\board-admin.js
pause
