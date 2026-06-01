const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.barrilero.com';
const EQUIPO_URL = `${BASE_URL}/equipo/`;
const OUTPUT_PATH = path.join(__dirname, '../data/equipo.json');
const BATCH_SIZE = 10;

async function scrapeDetalle(url) {
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(data);

    // Categoría: está en un <li> solo, en mayúsculas, ANTES del primer <p> de biografía
    let categoria = '';
    $('article li, .entry-content li, main li').each((_, el) => {
      const texto = $(el).text().trim();
      if (
        /^[A-ZÁÉÍÓÚÜÑ\s\-\/]+$/.test(texto) &&
        texto.length > 2 &&
        texto.length < 50 &&
        texto !== 'ENGLISH' &&
        texto !== 'ESPAÑOL' &&
        !texto.includes('@') &&
        !texto.includes('+')
      ) {
        categoria = texto;
        return false;
      }
    });

    // Área: está en el enlace que sigue al h2 "Área de práctica"
    let area = '';
    $('h2, h3').each((_, el) => {
      const titulo = $(el).text().trim().toLowerCase();
      if (titulo.includes('área') && titulo.includes('práctica')) {
        const siguiente = $(el).next();
        area = siguiente.find('a').first().text().trim() ||
               siguiente.text().trim() ||
               $(el).nextAll('a').first().text().trim();
        return false;
      }
    });

    return { categoria, area };
  } catch {
    return { categoria: '', area: '' };
  }
}

async function main() {
  console.log('Iniciando scraping del equipo Barrilero...');

  const { data } = await axios.get(EQUIPO_URL, { timeout: 15000 });
  const $ = cheerio.load(data);

  const links = [];
  $('a[href*="/equipo/"]').each((_, el) => {
    const href = $(el).attr('href');
    const nombre = $(el).text().trim();
    const foto = $(el).find('img').attr('src') || '';
    if (
      href &&
      href !== EQUIPO_URL &&
      nombre.length > 2 &&
      !href.includes('?') &&
      !links.find(l => l.url === href)
    ) {
      links.push({ nombre, url: href, foto });
    }
  });

  console.log(`Encontrados ${links.length} profesionales. Scraping perfiles...`);

  const profesionales = [];
  for (let i = 0; i < links.length; i += BATCH_SIZE) {
    const lote = links.slice(i, i + BATCH_SIZE);
    const resultados = await Promise.all(
      lote.map(async p => {
        const { categoria, area } = await scrapeDetalle(p.url);
        console.log(`✓ ${p.nombre} — ${categoria} / ${area}`);
        return { ...p, categoria, area };
      })
    );
    profesionales.push(...resultados);
  }

  if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ profesionales }, null, 2));
  console.log(`\n✅ Guardados ${profesionales.length} profesionales en data/equipo.json`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});