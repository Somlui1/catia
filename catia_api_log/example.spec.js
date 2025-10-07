import fs from 'fs';
import dayjs from 'dayjs';
const { count } = require('console');





function processData(inputJson) {   
const pattern = new RegExp(
  String.raw`(?<datetime>\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}:\d{3})\s+I USGTRACING\s+` +
  String.raw`(?<action>Grant|Detachment|TimeOut)!!` +
  String.raw`(?<feature>[^!]+)!` +
  String.raw`(?<customer>[^!]+)!` +
  String.raw`(?<session>[^!]+)!` +
  String.raw`(?<product>[^!]+)!` +
  String.raw`(?<license_type>[^!]+)!` +
  String.raw`(?<count>[^!]+)!` +
  String.raw`(?<level>[^!]+)!` +
  String.raw`(?<host>[^!]+) \([^!]+\)!` +
  String.raw`(?<ip>[^!]+)!` +
  String.raw`(?<user>[^!]+)!`
);
let records = [];
// แปลงแต่ละ row
for (const line of rows) {
    const match = line.match(pattern);
    if (match && match.groups) {
        const { datetime, action, feature, customer, session, product, license_type, count, level, host, ip, user } = match.groups;
        records.push({
            dateTime: dayjs(datetime, 'YYYY/MM/DD HH:mm:ss:SSS'),
            action,
            feature: feature.trim(),
            customer: customer.trim(),
            session: session.trim(),
            product: product.trim(),
            licenseType: license_type.trim(),
            count: count.trim(),
            level: level.trim(),
            host: host.trim(),
            ip: ip.trim(),
            user: user.trim()
            
        });
    } else {
        // debug สำหรับบรรทัดไม่ match
        console.log("No match:", line.slice(0, 80));
    }
}

// เรียงตาม dateTime
records.sort((a, b) => a.dateTime.valueOf() - b.dateTime.valueOf());
// สร้าง Sessions
let sessions = [];
let active = {};
for (const row of records) {
    const key = `${row.feature.toLowerCase()}|${row.session.toLowerCase()}`.trim();

    if (row.action === 'Grant') {
        active[key] = row.dateTime;
    } else if ((row.action === 'Detachment' || row.action === 'TimeOut') && active[key]) {
        const startTime = active[key];
        const endTime = row.dateTime;
        const durationMin = endTime.diff(startTime, 'minute', true);

        sessions.push({
            session: row.session,
            feature: row.feature,
            username: row.user,
            hostname :row.host,
            start_action : 'Grant',
            start_datetime: startTime.format('YYYY-MM-DD HH:mm:ss.SSS'),
            end_datetime : endTime.format('YYYY-MM-DD HH:mm:ss.SSS'),
            duration_min : parseFloat(durationMin.toFixed(2)),
            end_action: row.action,
            product : row.product,
            customer : row.customer,
            license_type : row.licenseType,
            count : row.count,
            level : row.level,
            hash_id: row.feature + "-" + row.product + "-" + row.session.trim() + "-" + startTime.format('DDMMYYHHmmss') + "-" + row.host + "-" + row.user
        });
        delete active[key];
    }
}
console.log("Active sessions left:", active);
return sessions;
}

function removePseudoHeaders(headers) {
  const cleanHeaders = {};
  for (const key in headers) {
    if (!key.startsWith(':')) {
      cleanHeaders[key] = headers[key];
    }
  }
  return cleanHeaders;
}

//const { MongoClient } = require('mongodb');
//async function saveToMongo(result,db,tb) {
//  // MongoDB connection URI (เปลี่ยนตามของคุณ)
//  const uri = 'mongodb://admin:it%40apico4U@10.10.10.181:27017/?authSource=admin';
//  // สร้าง client
//  const client = new MongoClient(uri);
//
//
//  try {
//    await client.connect();
//    const database = client.db(db); // ชื่อฐานข้อมูล
//    const collection = database.collection(tb); // ชื่อ collection
//    // สมมติ result เป็น object หรือ array
//    // ถ้า result เป็น array ให้ใช้ insertMany
//    // ถ้า result เป็น object ให้ใช้ insertOne
//    if (Array.isArray(result)) {
//      const insertResult = await collection.insertMany(result);
//      console.log(`${insertResult.insertedCount} documents inserted`);
//    } else {
//      const insertResult = await collection.insertOne(result);
//      console.log(`Document inserted with _id: ${insertResult.insertedId}`);
//    }
//  } catch (err) {
//    console.error('Failed to insert document(s):', err);
//  } finally {
//    await client.close();
//  }
//}

// ใช้งาน
import { test, expect } from '@playwright/test';
const path = require('path');
const process = require('process');
process.chdir(__dirname);
const util = require('util');

test.use({
  contextOptions: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    platform: 'Win32'
  }
});

//===========================================================================================================================================================================================================
test('AA capture getLogs API call', async ({ page }) => {
  // ✅ สร้าง Promise สำหรับรอ request ที่ action = "getLogs"
  const username = 'aa.dsls@aapico.com'
  const password ='A@pico@2025'
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
  await page.goto('https://eu1.iam.3dexperience.3ds.com/cas/login?service=https%3A%2F%2Fr1132103523401-ap2-licensing-3.3dexperience.3ds.com%2Fdslsws%2F');
  await page.getByRole('button', { name: 'Accept All' }).click();
  await page.getByRole('textbox', { name: 'Email or username' }).click();
  await page.getByRole('textbox', { name: 'Email or username' }).fill(username);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Password ' }).fill(password);
  await page.getByRole('textbox', { name: 'Password ' }).click();
  await page.getByText('Log inBack').click();
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill(password);
  await page.getByRole('button', { name: 'Choose file...' }).click();
  await page.locator('input[type="file"]').setInputFiles(licenseFilePath);
  await page.getByRole('button', { name: 'Connect' }).click();
  //await page.getByRole('link', { name: /Server Logs/ }).click({ timeout: 60000 });
  await page.locator('//*[@id="root"]/div/div/div[2]/span[5]/a').click();
  await page.getByRole('textbox', { name: 'Start Date' }).click();
  await page.getByRole('button', { name: 'Move backward to switch to' }).dblclick();
  // ✅ รอจนกว่าจะเจอ request ที่ต้องการ
  let matchedRequest = await waitForGetLogsRequest;
  let result;
  matchedRequest.headers = removePseudoHeaders(matchedRequest.headers); // ✅ ลบ pseudo headers
  matchedRequest.body.parameters.fromDate = 0;
  try {
  expect(matchedRequest.body.action).toBe('getLogs');
  // เปลี่ยนค่าที่ต้องการใน matchedRequest.body
matchedRequest.body.parameters.numberOfRowsToReturn = 999999; // ลบเพื่อไม่จำกัดจำนวนแถว
  // ส่ง body ที่แก้ไขไปเลย
  const fetch = require('node-fetch');
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
  // await saveToMongo(result,'logs','AA');
  // console.log(util.inspect(result, {showHidden: false, depth: null, maxArrayLength: null}));;
  //console.log(JSON.stringify(result, null, 2));
  //console.log('Done to set massage to Clipboard');  
   const data = processData(result);
   await data
  // Save session data to MongoDB (uncomment to use)
  // await saveToMongo(data, 'sessions', 'AA');
  console.table(data);
}
);

//===========================================================================================================================================================================================================
test('AHA capture getLogs API call', async ({ page }) => {
  // ✅ สร้าง Promise สำหรับรอ request ที่ action = "getLogs"
  const username = 'aha.dsls@aapico.com'
  const password ='A@pico@2025'
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
  await page.goto('https://r1132103523417-ap2-licensing-3.3dexperience.3ds.com');
  await page.getByRole('button', { name: 'Accept All' }).click();
  await page.getByRole('textbox', { name: 'Email or username' }).click();
  await page.getByRole('textbox', { name: 'Email or username' }).fill(username);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Password ' }).fill(password);
  await page.getByRole('textbox', { name: 'Password ' }).click();
  await page.getByText('Log inBack').click();
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill(password);
  await page.getByRole('button', { name: 'Choose file...' }).click();
  await page.locator('input[type="file"]').setInputFiles(licenseFilePath);
  await page.getByRole('button', { name: 'Connect' }).click();
  await page.getByRole('link', { name: /Server Logs/ }).click({ timeout: 60000 });
  await page.getByRole('textbox', { name: 'Start Date' }).click();
  await page.getByRole('button', { name: 'Move backward to switch to' }).dblclick();
  // ✅ รอจนกว่าจะเจอ request ที่ต้องการ
  let matchedRequest = await waitForGetLogsRequest;
  let result;
  matchedRequest.headers = removePseudoHeaders(matchedRequest.headers); // ✅ ลบ pseudo headers
  matchedRequest.body.parameters.fromDate = 0;
  try {
  expect(matchedRequest.body.action).toBe('getLogs');
  // เปลี่ยนค่าที่ต้องการใน matchedRequest.body
matchedRequest.body.parameters.numberOfRowsToReturn = 999999; // ลบเพื่อไม่จำกัดจำนวนแถว
  // ส่ง body ที่แก้ไขไปเลย
  const fetch = require('node-fetch');
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
  console.error('Error fetching logs:', error); }
  //await saveToMongo(result,'logs','AHA');
  //console.log(util.inspect(result, {showHidden: false, depth: null, maxArrayLength: null}));
    const data = processData(result);
   await data
  // Save session data to MongoDB (uncomment to use)
  // await saveToMongo(data, 'sessions', 'AA');
  console.table(data);
  //console.log('Done to set massage to Clipboard');
});






