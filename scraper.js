const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');

// 1. CONFIGURACIÓN DE GRUPOS
// Aquí agregas los grupos. El "id" debe coincidir con el nombre del archivo .json
const GRUPOS = [
    {
        id: 'investigadores', // Este es GISOR
        url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016595'
    },
    {
        id: 'biomedicas',
        url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000004123'
    },
    {
        id: 'gisam',
        url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000005562'
    },
    {
        id: 'salud_familiar_y_comunitaria',
        url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000018689'
    }
];

async function scrapeGrupo(grupo) {
    try {
        console.log(`Iniciando extracción de: ${grupo.id}...`);
        
        // Descargamos el HTML con arraybuffer para manejar la codificación ISO-8859-1
        const response = await axios.get(grupo.url, { responseType: 'arraybuffer' });
        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        
        let investigadores = [];

        // Buscamos la tabla que contiene el texto "Integrantes del grupo"
        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            // Saltamos el encabezado de la tabla
            if (i === 0) return;

            const celdas = $(el).find('td');
            
            if (celdas.length >= 3) {
                const celdaNombre = celdas.eq(0);
                
                // 1. Extraer y limpiar el nombre
                let nombreRaw = celdaNombre.text().trim();
                let nombreLimpio = nombreRaw
                    .replace(/^\d+[\.\-]\s*/, '') 
                    .replace(/\s+/g, ' ')         
                    .trim();

                // 2. Extraer el enlace al CvLAC
                let linkRelativo = celdaNombre.find('a').attr('href');
                let linkCompleto = linkRelativo 
                    ? (linkRelativo.startsWith('http') ? linkRelativo : 'https://scienti.minciencias.gov.co' + linkRelativo)
                    : '#';

                // 3. Extraer vinculación
                let vinculacion = celdas.eq(1).text().trim();

                if (nombreLimpio && nombreLimpio !== "Nombre") {
                    investigadores.push({
                        nombre: nombreLimpio,
                        vinculacion: vinculacion,
                        link: linkCompleto
                    });
                }
            }
        });

        // Guardar el archivo JSON específico para este grupo
        fs.writeFileSync(`${grupo.id}.json`, JSON.stringify(investigadores, null, 2));
        console.log(`✅ ${grupo.id}.json generado con ${investigadores.length} integrantes.`);
        
    } catch (error) {
        console.error(`❌ Error en grupo ${grupo.id}:`, error.message);
    }
}

// Función principal para ejecutar todos los grupos secuencialmente
async function iniciarScraping() {
    console.log('🚀 Iniciando proceso de actualización múltiple...');
    for (const grupo of GRUPOS) {
        await scrapeGrupo(grupo);
    }
    console.log('🏁 Todos los grupos han sido procesados.');
}

iniciarScraping();
