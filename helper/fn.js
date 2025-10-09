import  fs from 'fs';
import dayjs from 'dayjs';
import axios from "axios";

export function processData(inputJson) {   
const rows = inputJson.result.rows;
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

export function removePseudoHeaders(headers) {
  const cleanHeaders = {};
  for (const key in headers) {
    if (!key.startsWith(':')) {
      cleanHeaders[key] = headers[key];
    }
  }
  return cleanHeaders;
}

export function export_csv(data,path) {
  const headers = Object.keys(data[0] || {});
  const csvRows = [];
  csvRows.push(headers.join(','));
  for (const row of data) {
      const values = headers.map(h => {
          const val = row[h] !== undefined ? row[h].toString() : '';
          return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
  }
  fs.writeFileSync(path, csvRows.join('\n'), 'utf-8');
  console.log('✅ Export สำเร็จ:' + path);
}

export async function sendLicenseLogs(url, product, result,rawData) {
  const data = { ip: 0, product : product, data: result,raw :true,row : [rawData] };

  console.log("📡 Sending request:", JSON.stringify(data, null, 2));

  try {
    const response = await axios.post(url, data, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });
    console.log("✅ Response status:", response.status);
    //console.log("✅ Response:", response.data);
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error("❌ API error:", err.response.status, err.response.data);
    } else {
      console.error("❌ Axios error:", err.message);
    }
    throw err;
  }
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