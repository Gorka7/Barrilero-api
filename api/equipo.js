const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  try {
    const { data } = await axios.get('https://www.barrilero.com/equipo/', { timeout: 15000 });
    const cheerioLoad = cheerio.load(data);
    const $ = cheerioLoad;

    const profesionales = [];
    $('a[href*="/equipo/"]').each((_, el) => {
      const href = $(el).attr('href');
      const nombre = $(el).text().trim();
      const foto = $(el).find('img').attr('src') || '';
      if (
        href &&
        href !== 'https://www.barrilero.com/equipo/' &&
        nombre.length > 2 &&
        !href.includes('?') &&
        !profesionales.find(p => p.url === href)
      ) {
        profesionales.push({ nombre, url: href, foto });
      }
    });

    res.status(200).json({ profesionales });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el equipo', detalle: error.message });
  }
};