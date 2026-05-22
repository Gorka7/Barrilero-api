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

      // Foto desde og:image meta tag
      const foto = $('meta[property="og:image"]').attr('content') || '';

      // Categoría: primer li con texto en mayúsculas corto
      // Categoría: li en mayúsculas excluyendo ES y EN del menú de idiomas
      const EXCLUIR = ['ES', 'EN', 'ENGLISH', 'ESPAÑOL'];
      let categoria = '';
      $('li').each((i, el) => {
        const txt = $(el).text().trim();
        if (
          txt.length > 2 && txt.length < 30 &&
          txt === txt.toUpperCase() &&
          /^[A-ZÁÉÍÓÚÑ\s]+$/.test(txt) &&
          !EXCLUIR.includes(txt)
        ) {
          if (!categoria) categoria = txt;
        }
      });

      // Descripción: párrafos con contenido real (más de 80 chars, no copyright)
      const parrafos = [];
      $('p').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt.length > 80 && !txt.includes('©') && !txt.includes('cookie') && !txt.includes('Privacy')) {
          parrafos.push(txt);
        }
      });
      const descripcion = parrafos.join('\n\n');

      // Teléfonos
      const telefonos = [];
      $('a[href^="tel:"]').each((i, el) => {
        const tel = $(el).text().trim();
        if (tel && !telefonos.includes(tel)) telefonos.push(tel);
      });

      // Email
      const email = $('a[href^="mailto:"]').first().text().trim();

      // Áreas de práctica
      const areas = [];
      $('a[href*="areas_de_practica"]').each((i, el) => {
        const area = $(el).text().trim();
        if (area && area !== 'Áreas de práctica' && !areas.includes(area)) areas.push(area);
      });

      // Idiomas
      let idiomas = '';
      $('h2').each((i, el) => {
        if ($(el).text().trim() === 'Idiomas') {
          idiomas = $(el).next('p').text().trim();
        }
      });

      // Formación
      let formacion = '';
      $('h2').each((i, el) => {
        if ($(el).text().trim() === 'Formación') {
          formacion = $(el).next('p').text().trim();
        }
      });

      return res.status(200).json({ nombre, foto, categoria, descripcion, telefonos, email, areas, idiomas, formacion });
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