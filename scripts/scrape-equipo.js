const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.barrilero.com';
const EQUIPO_URL = `${BASE_URL}/equipo/`;
const AREAS_URL = `${BASE_URL}/areas_de_practica/`;
const OUTPUT_PATH = path.join(__dirname, '../data/equipo.json');

const AREAS = [
  { slug: 'civil', nombre: 'Civil' },
  { slug: 'compliance-y-gobierno-corporativo', nombre: 'Compliance y Gobierno Corporativo' },
  { slug: 'concursal-e-insolvencia', nombre: 'Concursal e Insolvencia' },
  { slug: 'corporate-ma', nombre: 'Corporate M&A' },
  { slug: 'deportivo', nombre: 'Deportivo' },
  { slug: 'inmobiliario', nombre: 'Inmobiliario' },
  { slug: 'internacional', nombre: 'Internacional' },
  { slug: 'laboral', nombre: 'Laboral' },
  { slug: 'medioambiente', nombre: 'Medioambiente' },
  { slug: 'mercantil', nombre: 'Mercantil' },
  { slug: 'penal', nombre: 'Penal' },
  { slug: 'private-wealth-financiero-y-mercado-de-capitales', nombre: 'Private Wealth, Financiero y Mercado de Capitales' },
  { slug: 'propiedad-intelectual-media-e-it', nombre: 'Propiedad Intelectual, Media e IT' },
  { slug: 'publico', nombre: 'Público' },
  { slug: 'resolucion-de-conflictos', nombre: 'Resolución de Conflictos' },
  { slug: 'seguridad-social', nombre: 'Seguridad Social' },
  { slug: 'societario', nombre: 'Societario' },
  { slug: 'tributario', nombre: 'Tributario' },
  { slug: 'urbanismo', nombre: 'Urbanismo' },
];

async function construirMapaAreas() {
  console.log('Construyendo mapa de áreas...');
  const mapa = {};

  await Promise.all(AREAS.map(async ({ slug, nombre }) => {
    try {
      const { data } = await axios.get(`${AREAS_URL}${slug}/`, { timeout: 15000 });
      const $ = cheerio.load(data);

      $('a[href*="/equipo/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/equipo/') && href !== EQUIPO_URL) {
          if (!mapa[href]) mapa[href] = nombre;
        }
      });

      console.log(`✓ ${nombre}`);
    } catch (e) {
      console.log(`✗ Error en ${nombre}: ${e.message}`);
    }
  }));

  return mapa;
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

  console.log(`Encontrados ${links.length} profesionales.`);

  const mapaAreas = await construirMapaAreas();

  const profesionales = links.map(p => ({
    ...p,
    area: mapaAreas[p.url] || '',
    categoria: ''
  }));

  if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ profesionales }, null, 2));
  console.log(`\n✅ Guardados ${profesionales.length} profesionales en data/equipo.json`);
  
  const conArea = profesionales.filter(p => p.area).length;
  console.log(`Con área: ${conArea} / ${profesionales.length}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});