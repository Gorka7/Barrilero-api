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

    // LOG: ver todos los li que hay en la página
    const todosLi = [];
    $('li').each((_, el) => {
      const texto = $(el).text().trim();
      if (texto.length < 60) todosLi.push(texto);
    });
    console.log('LIs en', url.split('/equipo/')[1], ':', JSON.stringify(todosLi.slice(0, 20)));

    // Área
    let area = '';
    $('h2').each((_, el) => {
      const texto = $(el).text().trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (texto.includes('area') && texto.includes('practica')) {
        const nextEl = $(el).next();
        area = nextEl.find('a').first().text().trim() ||
               nextEl.text().trim() ||
               $(el).nextAll('a[href*="areas_de_practica"]').first().text().trim();
        return false;
      }
    });

    return { categoria: '', area };
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

  // Para el diagnóstico solo procesamos los 3 primeros
  const linksPrueba = links.slice(0, 3);
  console.log(`Probando con ${linksPrueba.length} profesionales...`);

  const profesionales = [];
  for (let i = 0; i < linksPrueba.length; i += BATCH_SIZE) {
    const lote = linksPrueba.slice(i, i + BATCH_SIZE);
    const resultados = await Promise.all(
      lote.map(async p => {
        const { categoria, area } = await scrapeDetalle(p.url);
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