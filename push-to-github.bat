@echo off
cd /d "%~dp0"
git remote remove origin 2>nul
git remote add origin https://github.com/Vannilavan05/Leave_management.git
git add .
git status --short
git commit -m "Initial commit of leave management system with Docker and Render configuration"
git branch -M main
git push -u origin main
pause
