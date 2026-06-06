export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      apiKey: process.env.ACRON_API_KEY
    });
  }