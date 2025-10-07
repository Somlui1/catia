#!/bin/sh

ls -a
echo "▶️ Running test: AHA capture getLogs API call"
npx playwright test --project=chromium -g 'AHA capture getLogs API call'

echo "▶️ Running test: AA capture getLogs API call"
npx playwright test --project=chromium -g 'AA capture getLogs API call'
