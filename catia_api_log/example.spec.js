import * as funcs from '../helper/fn.js';
import { test, expect } from '@playwright/test';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);
test.use({
  contextOptions: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    platform: 'Win32'
  }
});
export async function loginAndUploadLicense(page, username, password, licenseFilePath) {
  // ไปที่ login page
  await page.goto('https://eu1.iam.3dexperience.3ds.com/cas/login?service=https%3A%2F%2Fr1132103523401-ap2-licensing-3.3dexperience.3ds.com%2Fdslsws%2F');
  // ยอมรับ cookies
  await page.getByRole('button', { name: 'Accept All' }).click();
  // กรอก username
  await page.getByRole('textbox', { name: 'Email or username' }).click();
  await page.getByRole('textbox', { name: 'Email or username' }).fill(username);
  await page.getByRole('button', { name: 'Continue' }).click();
  // กรอก password
  await page.getByRole('textbox', { name: 'Password ' }).fill(password);
  await page.getByText('Log inBack').click();
  await page.getByRole('button', { name: 'Log in' }).click();
  // รอโหลดหน้า
  await page.waitForLoadState('networkidle');
  // กรอก password อีกครั้ง (ถ้ามี step เพิ่ม)
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill(password);
  // อัปโหลด license file
  await page.getByRole('button', { name: 'Choose file...' }).click();
  await page.locator('input[type="file"]').setInputFiles(licenseFilePath);
  // กด Connect
  await page.getByRole('button', { name: 'Connect' }).click();
  // ไปหน้า Server Logs
  await page.locator('//*[@id="root"]/div/div/div[2]/span[5]/a').click();
  // ตั้งค่า Start Date
  await page.getByRole('textbox', { name: 'Start Date' }).click();
  await page.getByRole('button', { name: 'Move backward to switch to' }).dblclick();
}
const logs_server_url = "http://10.10.3.215:8181/testing/";  // วันนี้
const get_numday = process.env.NUMDAY;
function filter_sessions(sessions, refday = get_numday) {
  if (!refday) {
    return sessions;           // ถ้า refday ไม่กำหนด ให้ return sessions ทั้งหมด
  }
  const numDays = refday ? parseInt(refday) : 4;   // แปลง refday เป็นตัวเลข

  const ref_day = new Date();      // วันที่ปัจจุบัน
  ref_day.setDate(ref_day.getDate() - numDays);  // ย้อนกลับ numDays วัน

  return sessions.filter(session => {  // กรอง sessions
    const sessionStart = new Date(session.start_datetime);
    return sessionStart >= ref_day;
  });
}

//===========================================================================================================================================================================================================
test('AA capture getLogs API call', async ({ page }) => {
  // ✅ สร้าง Promise สำหรับรอ request ที่ action = "getLogs"
  const username = 'aa.dsls@aapico.com'
  const password = 'A@pico@2025'
  //const licenseFilePath =  "ER1NQ-P0GYZ-981M8-WQVEP-D80QL_0000_1.LIC";
  const licenseFilePath = path.resolve(__dirname, '..', 'ER1NQ-P0GYZ-981M8-WQVEP-D80QL_0000_1.LIC');
  console.log(licenseFilePath);
  const waitForGetLogsRequest = new Promise((resolve, reject) => {
    page.on('request', async (request) => {
      if (
        request.url().includes('/dslsws/api/service') &&
        request.method() === 'POST'
      ) {
        const bodyText = await request.postData();
        try {
          const json = JSON.parse(bodyText || '{}');
          if (json.action === 'getLogs') {
            const headers = await request.allHeaders(); // ✅ await ก่อน
            resolve({
              url: request.url(),
              headers,
              body: json,
            });
          }
        } catch (err) {
          reject(err);
        }
      }
    });
  });
  // ✅ เริ่มจาก login & action
  await loginAndUploadLicense(page, username, password, licenseFilePath);
  // ✅ รอจนกว่าจะเจอ request ที่ต้องการ
  let matchedRequest = await waitForGetLogsRequest;
  let result;
  matchedRequest.headers = funcs.removePseudoHeaders(matchedRequest.headers); // ✅ ลบ pseudo headers
  matchedRequest.body.parameters.fromDate = 0;
  try {
    expect(matchedRequest.body.action).toBe('getLogs');
    // เปลี่ยนค่าที่ต้องการใน matchedRequest.body
    matchedRequest.body.parameters.numberOfRowsToReturn = 999999; // ลบเพื่อไม่จำกัดจำนวนแถว
    // ส่ง body ที่แก้ไขไปเลย
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(matchedRequest.url, {
      method: 'POST',
      headers: matchedRequest.headers,
      body: JSON.stringify(matchedRequest.body)  // <-- ใช้ matchedRequest.body แทน body
    });
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status}`);
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      return;
    }
    result = await response.json();
    console.log('✅ Matched getLogs request:');
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
  console.log('response', result);

  try {
    const data = await funcs.processData(result);
    console.log('✅ Process data success! count of data =', data.length);
    //await funcs.export_csv(data, 'license_sessions_js_AHA.csv');
    //console.log('✅ Export CSV success!');
    const recentSessions = filter_sessions(data);
    await funcs.sendLicenseLogs(logs_server_url, 'AA_catia', recentSessions, result);
    get_numday ? console.log('Filtered sessions from last', get_numday, 'days. Count =', recentSessions.length) : console.log('No filtering applied. Total sessions count =', data.length);
  } catch (error) {
    console.error('Error processing logs:', error);
  }
}
);
//===========================================================================================================================================================================================================
test('AHA capture getLogs API call', async ({ page }) => {
  // ✅ สร้าง Promise สำหรับรอ request ที่ action = "getLogs"
  const username = 'aha.dsls@aapico.com'
  const password = 'A@pico@2025'
  //const licenseFilePath  = "./EL57E-SAZKY-SL79X-3MBAC-UJPWV_0000_1.LIC";
  const licenseFilePath = path.resolve(__dirname, '..', 'EL57E-SAZKY-SL79X-3MBAC-UJPWV_0000_1.LIC');
  console.log(licenseFilePath);
  const waitForGetLogsRequest = new Promise((resolve, reject) => {
    page.on('request', async (request) => {
      if (
        request.url().includes('/dslsws/api/service') &&
        request.method() === 'POST'
      ) {
        const bodyText = await request.postData();
        try {
          const json = JSON.parse(bodyText || '{}');
          if (json.action === 'getLogs') {
            const headers = await request.allHeaders(); // ✅ await ก่อน
            resolve({
              url: request.url(),
              headers,
              body: json,
            });
          }
        } catch (err) {
          reject(err);
        }
      }
    });
  });
  // ✅ เริ่มจาก login & action
  await loginAndUploadLicense(page, username, password, licenseFilePath);
  // ✅ รอจนกว่าจะเจอ request ที่ต้องการ
  let matchedRequest = await waitForGetLogsRequest;
  let result;
  matchedRequest.headers = funcs.removePseudoHeaders(matchedRequest.headers); // ✅ ลบ pseudo headers
  matchedRequest.body.parameters.fromDate = 0;
  try {
    expect(matchedRequest.body.action).toBe('getLogs');
    // เปลี่ยนค่าที่ต้องการใน matchedRequest.body
    matchedRequest.body.parameters.numberOfRowsToReturn = 999999; // ลบเพื่อไม่จำกัดจำนวนแถว
    // ส่ง body ที่แก้ไขไปเลย
    const response = await fetch(matchedRequest.url, {
      method: 'POST',
      headers: matchedRequest.headers,
      body: JSON.stringify(matchedRequest.body)  // <-- ใช้ matchedRequest.body แทน body
    });
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status}`);
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      return;
    }
    result = await response.json();
    console.log('✅ Matched getLogs request:');
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
  console.log('response', result);
  try {
    const data = await funcs.processData(result);
    console.log('✅ Process data success! count of data =', data.length);
    //await funcs.export_csv(data, 'license_sessions_js_AHA.csv');
    //console.log('✅ Export CSV success!');
    const recentSessions = filter_sessions(data);
    await funcs.sendLicenseLogs(logs_server_url, 'AHA_catia', recentSessions, result);
    get_numday ? console.log('Filtered sessions from last', get_numday, 'days. Count =', recentSessions.length) : console.log('No filtering applied. Total sessions count =', data.length);
  } catch (error) {
    console.error('Error processing logs:', error);
  }
}
);


test('AHT capture getLogs API call', async ({ page }) => {
  // ✅ สร้าง Promise สำหรับรอ request ที่ action = "getLogs"
  const username = 'aht.dsls@aapico.com'
  const password = 'A@pico@2025'
  //const licenseFilePath  = "./EL57E-SAZKY-SL79X-3MBAC-UJPWV_0000_1.LIC";
  const licenseFilePath = path.resolve(__dirname, '..', 'CS82A-YPW83-77RIX-RKAOV-5NBTG_0000_1.LIC');
  console.log(licenseFilePath);
  const waitForGetLogsRequest = new Promise((resolve, reject) => {
    page.on('request', async (request) => {
      if (
        request.url().includes('/dslsws/api/service') &&
        request.method() === 'POST'
      ) {
        const bodyText = await request.postData();
        try {
          const json = JSON.parse(bodyText || '{}');
          if (json.action === 'getLogs') {
            const headers = await request.allHeaders(); // ✅ await ก่อน
            resolve({
              url: request.url(),
              headers,
              body: json,
            });
          }
        } catch (err) {
          reject(err);
        }
      }
    });
  });
  // ✅ เริ่มจาก login & action
  await loginAndUploadLicense(page, username, password, licenseFilePath);
  // ✅ รอจนกว่าจะเจอ request ที่ต้องการ
  let matchedRequest = await waitForGetLogsRequest;
  let result;
  matchedRequest.headers = funcs.removePseudoHeaders(matchedRequest.headers); // ✅ ลบ pseudo headers
  matchedRequest.body.parameters.fromDate = 0;
  try {
    expect(matchedRequest.body.action).toBe('getLogs');
    // เปลี่ยนค่าที่ต้องการใน matchedRequest.body
    matchedRequest.body.parameters.numberOfRowsToReturn = 999999; // ลบเพื่อไม่จำกัดจำนวนแถว
    // ส่ง body ที่แก้ไขไปเลย
    const response = await fetch(matchedRequest.url, {
      method: 'POST',
      headers: matchedRequest.headers,
      body: JSON.stringify(matchedRequest.body)  // <-- ใช้ matchedRequest.body แทน body
    });
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status}`);
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      return;
    }
    result = await response.json();
    console.log('✅ Matched getLogs request:');
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
  console.log('response', result);
  try {
    const data = await funcs.processData(result);
    console.log('✅ Process data success! count of data =', data.length);
    await funcs.export_csv(data, 'license_sessions_js_AHT.csv');
    console.log('✅ Export CSV success!');
    const recentSessions = filter_sessions(data);
    await funcs.sendLicenseLogs(logs_server_url, 'AHT_catia', recentSessions, result);
    get_numday ? console.log('Filtered sessions from last', get_numday, 'days. Count =', recentSessions.length) : console.log('No filtering applied. Total sessions count =', data.length);
  } catch (error) {
    console.error('Error processing logs:', error);
  }
}
);






