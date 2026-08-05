@echo off
cd /d "%~dp0"
node scripts\sync-redaktion-data.mjs
pause
