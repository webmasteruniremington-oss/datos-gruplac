const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');

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

// Función para esperar (promesa)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para descargar con reintentos
async function fetchWithRetry(url, retries = 3, backoff = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000, // 20 segundos
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
        } catch (err) {
            const isLastRetry = i === retries - 1;
            console.warn(`⚠️ Intento ${i + 1} fallido para la URL. Motivo: ${err.message}`);
            if (isLastRetry) throw err;
            console.log(`Retratando en ${backoff / 1000} segundos...`);
            await delay(backoff);
            backoff *= 2; // Aumenta el tiempo de espera en cada fallo
        }
    }
}

async function scrapeGrupo(grupo) {
    try {
        console.log(`\n🚀 Iniciando: ${grupo.id}`);
        
        const response = await fetchWithRetry(grupo.url);
        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        // Buscamos específicamente la sección de integrantes
        const tablaIntegrantes = $("td:contains('Integrantes del grupo')").closest('table');

        if (tablaIntegrantes.length === 0) {
            console.error(`❌ No se encontró la tabla de integrantes en ${grupo.id}`);
            return;
        }

        tablaIntegrantes.find('tr').each((i, el) => {
            if (i === 0) return; // Cabecera

            const celdas = $(el).find('td');
            if (celdas.length >= 4) {
                const periodoTexto = celdas.eq(3).text().trim();

                // FILTRO DE ACTUALES (según imagen image_e815d8.png)
                if (periodoTexto.toLowerCase().includes('actual')) {
                    const celdaNombre = celdas.eq(0);
                    let nombreRaw = celdaNombre.text().trim();
                    
                    let nombreLimpio = nombreRaw
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
            console.log(`✅ Finalizado ${grupo.id}: ${investigadores.length} encontrados.`);
        } else {
            console.warn(`⚠️ ${grupo.id}: No hay integrantes actuales.`);
        }

        // Limpieza manual para liberar memoria
        $ = null; 

    } catch (error) {
        console.error(`💥 Error crítico en ${grupo.id} tras varios intentos: ${error.message}`);
    }
}

async function ejecutarTodo() {
    console.log('--- INICIO DE SCRAPING GLOBAL ---');
    for (const grupo of GRUPOS) {
        await scrapeGrupo(grupo);
        // Pausa prudencial de 3 segundos entre grupos para no saturar al servidor
        console.log(`Esperando antes del siguiente grupo...`);
        await delay(3000);
    }
    console.log('\n--- PROCESO COMPLETADO ---');
}

ejecutarTodo();
