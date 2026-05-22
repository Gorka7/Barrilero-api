const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const { data } = await axios.get('https://www.barrilero.com/equipo/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);
    const profesionales = [];

    $('article').each((i, el) => {
      const nombre = $(el).find('h2, h3, .entry-title, a').first().text().trim();
      const url = $(el).find('a').first().attr('href') || '';
      const foto = $(el).find('img').first().attr('src') || '';

      if (nombre && url.includes('/equipo/')) {
        profesionales.push({ nombre, url, foto });
      }
    });

    // Si no encuentra con article, prueba con el patrón de links
    if (profesionales.length === 0) {
      $('a[href*="/equipo/"]').each((i, el) => {
        const url = $(el).attr('href') || '';
        const nombre = $(el).text().trim();
        const foto = $(el).find('img').first().attr('src') || '';

        if (nombre && url !== 'https://www.barrilero.com/equipo/' && nombre.length > 2) {
          profesionales.push({ nombre, url, foto });
        }
      });
    }

    // Eliminar duplicados por URL
    const unicos = profesionales.filter((p, index, self) =>
      index === self.findIndex(t => t.url === p.url)
    );

    res.status(200).json({ profesionales: unicos });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el equipo', detalle: error.message });
  }
};