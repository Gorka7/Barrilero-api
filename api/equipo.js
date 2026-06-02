const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  const { url } = req.query;

  // Si viene ?url= devuelve el perfil individual
  if (url) {
    try {
      const { data } = await axios.get(url, { timeout: 15000 });
      const $ = cheerio.load(data);

      const nombre = $('h1').first().text().trim();
      const foto = $('article img, main img').first().attr('src') || '';
      const descripcion = $('article p, main p').first().text().trim();

      const telefonos = [];
      $('a[href^="tel:"]').each((_, el) => {
        const tel = $(el).text().trim();
        if (tel) telefonos.push(tel);
      });

      let email = '';
      $('a[href^="mailto:"]').each((_, el) => {
        if (!email) email = $(el).attr('href')?.replace('mailto:', '') || '';
      });

      const areas = [];
      let idiomas = '';
      let formacion = '';

      $('h2, h3').each((_, el) => {
        const titulo = $(el).text().trim().toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const siguiente = $(el).next();

        if (titulo.includes('area') && titulo.includes('practica')) {
          siguiente.find('a').each((_, a) => {
            const t = $(a).text().trim();
            if (t) areas.push(t);
          });
          if (!areas.length) {
            const t = siguiente.text().trim();
            if (t) areas.push(t);
          }
        }
        if (titulo.includes('idioma')) {
          idiomas = siguiente.text().trim();
        }
        if (titulo.includes('formacion') || titulo.includes('formación')) {
          formacion = siguiente.text().trim();
        }
      });

      return res.status(200).json({
        nombre, foto, descripcion,
        telefonos, email, areas,
        idiomas, formacion
      });

    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener el perfil', detalle: error.message });
    }
  }

  // Sin ?url= devuelve el listado completo
  try {
    const { data } = await axios.get('https://www.barrilero.com/equipo/', { timeout: 15000 });
    const $ = cheerio.load(data);

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