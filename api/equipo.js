const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  try {
    const filePath = path.join(__dirname, '../data/equipo.json');
    const data = fs.readFileSync(filePath, 'utf8');
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo leer el equipo', detalle: error.message });
  }
};