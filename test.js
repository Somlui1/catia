import axios from "axios";

async function sendLicenseLogs(data) {
  const url = "http://10.10.3.215:8181/testing/";

  try {
    const response = await axios.post(url, data, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Response Status:", response.status);
    console.log("Response Data:", response.data);
    return response.data;

  } catch (error) {
    if (error.response) {
      // server responded with status code outside 2xx
      console.error("❌ HTTP Error:", error.response.status);
      console.error("Response Data:", error.response.data);
    } else {
      // network or other errors
      console.error("❌ Error:", error.message);
    }
    throw error;
  }
}

// ตัวอย่างการเรียกใช้
const payload = {
  ip: 0,
  product: "AHA_catia",
  data: [
    {
      session: "28000197D99708E5",
      feature: "CAC-FPEFTXJTEMCEPRXTRE",
      username: "AdministratorAA",
      hostname: "AITS25A1NB0140",
      start_action: "Grant",
      start_datetime: "2025-07-14 03:43:47.917",
      end_datetime: "2025-07-14 03:44:42.819",
      duration_min: 0.92,
      end_action: "Detachment",
      product: "Dassault Systemes V5",
      customer: "R1132103523401",
      license_type: "ConcurrentUser",
      count: 1,
      level: "STD",
      hash_id: "CAC-FPEFTXJTEMCEPRXTRE-Dassault Systemes V5-28000197D99708E5-140725034347-AITS25A1NB0140-AdministratorAA"
    },
    {
      session: "18000197D996FD1E",
      feature: "CAC-FPEFTXJTEMCEPRXTRE",
      username: "AdministratorAA",
      hostname: "AITS25A1NB0140",
      start_action: "Grant",
      start_datetime: "2025-07-14 04:02:56.928",
      end_datetime: "2025-07-14 04:32:35.203",
      duration_min: 29.64,
      end_action: "Detachment",
      product: "Dassault Systemes V5",
      customer: "R1132103523401",
      license_type: "ConcurrentUser",
      count: 1,
      level: "STD",
      hash_id: "CAC-FPEFTXJTEMCEPRXTRE-Dassault Systemes V5-18000197D996FD1E-140725040256-AITS25A1NB0140-AdministratorAA"
    }
  ]
};

// เรียกฟังก์ชัน
sendLicenseLogs(payload);
