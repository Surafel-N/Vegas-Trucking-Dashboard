import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const spreadsheetId = process.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    return res.status(503).json({ error: "Service Account non configuré sur Vercel." });
  }

  try {
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    const ranges = [
      "'AMARA TRUCK 76'!A2:O", 
      "'BRAHIMA TRUCK 45'!A2:O", 
      "'SORO TRUCK 52'!A2:O",
      "'Spreedsheet'!A2:Z"
    ];

    const [tripsData, maintenanceData] = await Promise.all([
      sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: ranges.slice(0, 3) }),
      sheets.spreadsheets.get({ 
        spreadsheetId, 
        ranges: [ranges[3]], 
        fields: "sheets(data(rowData(values(formattedValue,hyperlink))))" 
      })
    ]);

    return res.status(200).json({
      trips: tripsData.data.valueRanges,
      maintenance: maintenanceData.data.sheets[0].data[0].rowData || []
    });
  } catch (error) {
    console.error("Erreur GSheets API:", error);
    return res.status(500).json({ error: error.message });
  }
}
