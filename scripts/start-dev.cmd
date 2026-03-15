@echo off
setlocal

set "PROJECT_DIR=%~dp0.."
set "WINDOW_TITLE=Jahongir AI Clone - Next Dev Server"

start "%WINDOW_TITLE%" cmd /k "cd /d "%PROJECT_DIR%" && npm.cmd run dev"

echo Started Next.js dev server in a separate terminal window.
