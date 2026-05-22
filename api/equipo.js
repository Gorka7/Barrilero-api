const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;

  // Si viene una URL concreta, devolvemos el detalle de ese profesional
  if (url) {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const $ = cheerio.load(data);

      const nombre = $('h1').first().text().trim();
      const foto = $('img').first().attr('src') || '';
      const categoria = $('li').filter((i, el) => $(el).text().trim().length < 30).first().text().trim();
      const descripcion = $('p').first().text().trim();
      const telefono = $('a[href^="tel:"]').first().text().trim();
      const email = $('a[href^="mailto:"]').first().text().trim();
      const areas = [];
      $('a[href*="areas_de_practica"]').each((i, el) => {
        const area = $(el).text().trim();
        if (area) areas.push(area);
      });

      return res.status(200).json({ nombre, foto, categoria, descripcion, telefono, email, areas });
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener el perfil' });
    }
  }

  // Sin URL, devolvemos la lista completa
  try {
    const { data } = await axios.get('https://www.barrilero.com/equipo/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const $ = cheerio.load(data);
    const profesionales = [];

    $('a[href*="/equipo/"]').each((i, el) => {
      const url = $(el).attr('href') || '';
      const nombre = $(el).text().trim();
      const foto = $(el).find('img').first().attr('src') || '';

      if (nombre && url !== 'https://www.barrilero.com/equipo/' && nombre.length > 2) {
        profesionales.push({ nombre, url, foto });
      }
    });

    const unicos = profesionales.filter((p, index, self) =>
      index === self.findIndex(t => t.url === p.url)
    );

    res.status(200).json({ profesionales: unicos });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el equipo' });
  }
};