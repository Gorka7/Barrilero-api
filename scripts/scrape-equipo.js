const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.barrilero.com';
const EQUIPO_URL = `${BASE_URL}/equipo/`;
const AREAS_URL = `${BASE_URL}/areas_de_practica/`;
const OUTPUT_PATH = path.join(__dirname, '../data/equipo.json');

const AREAS = [
  'civil', 'compliance-y-gobierno-corporativo', 'concursal-e-insolvencia',
  'corporate-ma', 'deportivo', 'inmobiliario', 'internacional', 'laboral',
  'medioambiente', 'mercantil', 'penal',
  'private-wealth-financiero-y-mercado-de-capitales',
  'propiedad-intelectual-media-e-it', 'publico', 'resolucion-de-conflictos',
  'seguridad-social', 'societario', 'tributario', 'urbanismo'
];

async function construirMapaAreas() {
  console.log('Construyendo mapa de áreas...');
  const mapa = {}; // { urlPerfil: nombreArea }

  await Promise.all(AREAS.map(async (area) => {
    try {
      const nombreArea = area
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      const { data } = await axios.get(`${AREAS_URL}${area}/`, { timeout: 15000 });
      const $ = cheerio.load(data);

      $('a[href*="/equipo/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/equipo/') && href !== EQUIPO_URL) {
          mapa[href] = nombreArea;
        }
      });

      console.log(`✓ Área ${nombreArea}`);
    } catch (e) {
      console.log(`✗ Error en área ${area}: ${e.message}`);
    }
  }));

  return mapa;
}

async function main() {
  console.log('Iniciando scraping del equipo Barrilero...');

  // 1. Obtener listado de profesionales
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

  console.log(`Encontrados ${links.length} profesionales.`);

  // 2. Construir mapa de áreas (solo 19 peticiones)
  const mapaAreas = await construirMapaAreas();

  // 3. Combinar datos
  const profesionales = links.map(p => ({
    ...p,
    area: mapaAreas[p.url] || '',
    categoria: ''
  }));

  // 4. Guardar
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