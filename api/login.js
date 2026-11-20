export default async function handler(req, res) {
  // En-têtes CORS pour Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercel parse automatiquement le JSON du body, mais on gère aussi les formats string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { code } = body || {};
  const cleanCode = (code || '').trim().toUpperCase();

  const ADMIN_CODE = (process.env.ADMIN_CODE || "SDVADMIN").trim().toUpperCase();
  const VIEWER_CODE = (process.env.VIEWER_CODE || "SDV2026").trim().toUpperCase();

  if (cleanCode === ADMIN_CODE) {
    return res.status(200).json({ username: "Direction SDV", role: "admin" });
  } else if (cleanCode === VIEWER_CODE) {
    return res.status(200).json({ username: "Visiteur", role: "viewer" });
  }

  return res.status(401).json({ error: "Code d'accès invalide" });
}

