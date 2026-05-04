const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');

// 1. CONFIGURACIÓN DE GRUPOS 
// Garantizado para procesar cada uno y generar su archivo .json independiente
const GRUPOS = [
    {
        id: 'investigadores', 
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
        console.log(`\n🔍 Procesando: ${grupo.id}...`);
        
        // Descargamos el HTML con arraybuffer y headers para evitar bloqueos
        const response = await axios.get(grupo.url, { 
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000 // 30 segundos de espera
        });

        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        // Buscamos la tabla que contiene el texto "Integrantes del grupo"
        // Usamos una búsqueda flexible para encontrar la tabla correcta
        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            // Saltamos el encabezado de la tabla
            if (i === 0) return;

            const celdas = $(el).find('td');
            
            if (celdas.length >= 3) {
                const celdaNombre = celdas.eq(0);
                
                // 1. Extraer y limpiar el nombre
                let nombreRaw = celdaNombre.text().trim();
                let nombreLimpio = nombreRaw
                    .replace(/^\d+[\.\-]\s*/, '') // Quita "1.- ", "2.- ", etc.
                    .replace(/\s+/g, ' ')         // Quita espacios dobles
                    .trim();

                // 2. Extraer el enlace al CvLAC
                let linkRelativo = celdaNombre.find('a').attr('href');
                let linkCompleto = linkRelativo 
                    ? (linkRelativo.startsWith('http') ? linkRelativo : 'https://scienti.minciencias.gov.co' + linkRelativo)
                    : '#';

                // 3. Extraer vinculación
                let vinculacion = celdas.eq(1).text().trim();

                // Validamos que sea un nombre de integrante real
                if (nombreLimpio && nombreLimpio !== "Nombre" && nombreLimpio.length > 2) {
                    investigadores.push({
                        nombre: nombreLimpio,
                        vinculacion: vinculacion,
                        link: linkCompleto
                    });
                }
            }
        });

        // Verificamos si se obtuvieron datos antes de escribir el archivo
        if (investigadores.length > 0) {
            fs.writeFileSync(`${grupo.id}.json`, JSON.stringify(investigadores, null, 2));
            console.log(`✅ ${grupo.id}.json actualizado exitosamente. Integrantes: ${investigadores.length}`);
        } else {
            console.warn(`⚠️ No se detectaron integrantes en la tabla para: ${grupo.id}`);
        }
        
    } catch (error) {
        console.error(`❌ Error extrayendo ${grupo.id}: ${error.message}`);
    }
}

// Función ejecutora: procesa uno por uno para no saturar el servidor
async function ejecutarTodo() {
    console.log('🚀 INICIANDO ACTUALIZACIÓN GLOBAL DE GRUPOS...');
    for (const grupo of GRUPOS) {
        await scrapeGrupo(grupo);
    }
    console.log('\n✨ Proceso terminado para todos los grupos.');
}

ejecutarTodo();
