@echo off
REM --- Move to the directory where this script is located ---
cd /d "%~dp0"

REM --- Get current day from system date ---
for /f "tokens=2 delims=/" %%a in ("%DATE%") do set DAY=%%a
echo Today is day: %DAY%

REM --- If today is the 15th or the 1st, skip setting NUMDAY ---
if "%DAY%"=="15" (
    echo Today is 15th, skipping setting NUMDAY.
) else if "%DAY%"=="1" (
    echo Today is 1st, skipping setting NUMDAY.
) else (
    set NUMDAY=3
    echo NUMDAY set to %NUMDAY%
)

REM --- Function to run each test and check its result ---
:run_test
set TEST_NAME=%~1
echo =========================================
echo Starting test: %TEST_NAME%
echo =========================================

npx playwright test --project=chromium -g "%TEST_NAME%"
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Test "%TEST_NAME%" failed with exit code %ERRORLEVEL%.
    REM To stop the script on failure, uncomment the next line:
    REM exit /b %ERRORLEVEL%
) ELSE (
    echo SUCCESS: Test "%TEST_NAME%" completed successfully.
)

REM --- Delay for 3 seconds before running the next test ---
timeout /t 3 /nobreak >nul
goto :eof

REM --- Run all tests sequentially ---
call :run_test "AA capture getLogs API call"
call :run_test "AHA capture getLogs API call"

echo All tests finished.
timeout /t 3 /nobreak >nul
pause
