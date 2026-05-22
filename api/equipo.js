const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { url } = req.query;

  if (url) {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const $ = cheerio.load(data);

      const nombre = $('h1').first().text().trim();
      const foto = $('img[src*="wp-content/uploads"]').first().attr('src') || '';
      const categoria = $('ul li').filter((i, el) => {
        const txt = $(el).text().trim();
        return txt.length > 0 && txt.length < 40 && txt === txt.toUpperCase();
      }).first().text().trim();

      const descripcion = $('p').filter((i, el) => {
        const txt = $(el).text().trim();
        return txt.length > 50 && !txt.includes('©');
      }).first().text().trim();

      const telefonos = [];
      $('a[href^="tel:"]').each((i, el) => {
        const tel = $(el).text().trim();
        if (tel && !telefonos.includes(tel)) telefonos.push(tel);
      });

      const email = $('a[href^="mailto:"]').first().text().trim();

      const areas = [];
      $('a[href*="areas_de_practica"]').each((i, el) => {
        const area = $(el).text().trim();
        if (area && area !== 'Áreas de práctica') areas.push(area);
      });

      const idiomas = [];
      $('p, li').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt.startsWith('Español') || txt.startsWith('Inglés') || txt.startsWith('Francés') || txt.startsWith('Euskera')) {
          txt.split(',').forEach(i => idiomas.push(i.trim()));
        }
      });

      return res.status(200).json({ nombre, foto, categoria, descripcion, telefonos, email, areas, idiomas });
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener el perfil' });
    }
  }

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