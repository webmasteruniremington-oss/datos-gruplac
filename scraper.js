const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');

// 1. CONFIGURACIÓN DE GRUPOS
const GRUPOS = [
    { id: 'investigadores', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016595' },
    { id: 'biomedicas', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000004123' },
    { id: 'gisam', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000005562' },
    { id: 'salud_familiar_y_comunitaria', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000018689' },
    { id: 'mundo_organizacional', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016673' },
    { id: 'gisor', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000004109' },
    { id: 'ingeniar', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000013180' },
    { id: 'ginver', url: 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000012293' }
];

// Función para generar pausas
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función de descarga con 3 intentos y espera incremental
async function fetchWithRetry(url, retries = 3, backoff = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 25000, // 25 segundos de espera
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
        } catch (err) {
            if (i === retries - 1) throw err;
            console.warn(`⚠️ Fallo en intento ${i + 1}. Reintentando en ${backoff / 1000}s...`);
            await delay(backoff);
            backoff *= 2; 
        }
    }
}

async function scrapeGrupo(grupo) {
    try {
        console.log(`\n🚀 Procesando: ${grupo.id}...`);
        const response = await fetchWithRetry(grupo.url);
        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        const tabla = $("td:contains('Integrantes del grupo')").closest('table');

        tabla.find('tr').each((i, el) => {
            if (i === 0) return; // Saltar cabecera
            const celdas = $(el).find('td');
            
            if (celdas.length >= 4) {
                const periodoTexto = celdas.eq(3).text().trim();

                // FILTRO DE ACTUALES (Solo los que dicen "Actual" en la vinculación)
                if (periodoTexto.toLowerCase().includes('actual')) {
                    const celdaNombre = celdas.eq(0);
                    let nombreLimpio = celdaNombre.text().trim()
                        .replace(/^\d+[\.\-]\s*/, '') 
                        .replace(/\s+/g, ' ')
                        .trim();

                    let linkRelativo = celdaNombre.find('a').attr('href');
                    let linkCompleto = linkRelativo 
                        ? (linkRelativo.startsWith('http') ? linkRelativo : 'https://scienti.minciencias.gov.co' + linkRelativo)
                        : '#';

                    if (nombreLimpio && nombreLimpio !== "Nombre") {
                        investigadores.push({
                            nombre: nombreLimpio,
                            vinculacion: celdas.eq(1).text().trim(),
                            link: linkCompleto
                        });
                    }
                }
            }
        });

        if (investigadores.length > 0) {
            fs.writeFileSync(`${grupo.id}.json`, JSON.stringify(investigadores, null, 2));
            console.log(`✅ ${grupo.id}.json creado con ${investigadores.length} actuales.`);
        } else {
            console.warn(`⚠️ No se hallaron activos en ${grupo.id}`);
        }
        
    } catch (error) {
        console.error(`❌ Error definitivo en ${grupo.id}: ${error.message}`);
    }
}

async function ejecutarTodo() {
    console.log('--- INICIO DE ACTUALIZACIÓN ---');
    for (const grupo of GRUPOS) {
        await scrapeGrupo(grupo);
        await delay(3000); // Pausa de 3 segundos entre grupos
    }
    console.log('\n--- PROCESO FINALIZADO ---');
}

ejecutarTodo();
