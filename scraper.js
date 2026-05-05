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

async function scrapeGrupo(grupo) {
    try {
        console.log(`\n🔍 Procesando: ${grupo.id}...`);
        
        const response = await axios.get(grupo.url, { 
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000 
        });

        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        // Localizamos la tabla de integrantes
        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            if (i === 0) return; // Saltar encabezado

            const celdas = $(el).find('td');
            
            // Verificamos que existan las columnas necesarias (Nombre, Vinculación, Horas, Inicio-Fin)
            if (celdas.length >= 4) {
                const celdaNombre = celdas.eq(0);
                const celdaPeriodo = celdas.eq(3).text().trim(); // Columna "Inicio - Fin Vinculación"

                // --- MODIFICACIÓN CLAVE: Filtro de Actuales ---
                // Solo procesamos si el periodo contiene la palabra "Actual"
                if (celdaPeriodo.toLowerCase().includes('actual')) {
                    
                    let nombreRaw = celdaNombre.text().trim();
                    let nombreLimpio = nombreRaw
                        .replace(/^\d+[\.\-]\s*/, '') 
                        .replace(/\s+/g, ' ')
                        .trim();

                    let linkRelativo = celdaNombre.find('a').attr('href');
                    let linkCompleto = linkRelativo 
                        ? (linkRelativo.startsWith('http') ? linkRelativo : 'https://scienti.minciencias.gov.co' + linkRelativo)
                        : '#';

                    let vinculacion = celdas.eq(1).text().trim();

                    if (nombreLimpio && nombreLimpio !== "Nombre" && nombreLimpio.length > 2) {
                        investigadores.push({
                            nombre: nombreLimpio,
                            vinculacion: vinculacion,
                            link: linkCompleto
                        });
                    }
                }
            }
        });

        if (investigadores.length > 0) {
            fs.writeFileSync(`${grupo.id}.json`, JSON.stringify(investigadores, null, 2));
            console.log(`✅ ${grupo.id}.json actualizado. Actuales encontrados: ${investigadores.length}`);
        } else {
            console.warn(`⚠️ No se detectaron integrantes ACTUALES para: ${grupo.id}`);
        }
        
    } catch (error) {
        console.error(`❌ Error extrayendo ${grupo.id}: ${error.message}`);
    }
}

async function ejecutarTodo() {
    console.log('🚀 INICIANDO SCRAPER DE INTEGRANTES ACTUALES...');
    for (const grupo of GRUPOS) {
        await scrapeGrupo(grupo);
    }
    console.log('\n✨ Proceso terminado.');
}

ejecutarTodo();
