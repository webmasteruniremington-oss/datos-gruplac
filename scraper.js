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
        
        // Timeout de 15s y manejo de buffer para evitar que el flujo se quede colgado
        const response = await axios.get(grupo.url, { 
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000 
        });

        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        // Localizar la tabla de integrantes de forma flexible
        const tablaIntegrantes = $("td:contains('Integrantes del grupo')").closest('table');

        tablaIntegrantes.find('tr').each((i, el) => {
            if (i === 0) return; // Saltar fila de encabezados

            try {
                const celdas = $(el).find('td');
                
                // Verificamos que existan al menos 4 celdas (Nombre, Vinculación, Horas, Periodo)
                if (celdas.length >= 4) {
                    const celdaNombre = celdas.eq(0);
                    const periodoTexto = celdas.eq(3).text().trim(); // Columna "Inicio - Fin Vinculación"

                    // FILTRO CRÍTICO: Solo si el periodo contiene la palabra "Actual"
                    if (periodoTexto.toLowerCase().includes('actual')) {
                        
                        let nombreRaw = celdaNombre.text().trim();
                        let nombreLimpio = nombreRaw
                            .replace(/^\d+[\.\-]\s*/, '') // Limpia números iniciales
                            .replace(/\s+/g, ' ')          // Limpia espacios dobles
                            .trim();

                        let linkRelativo = celdaNombre.find('a').attr('href');
                        let linkCompleto = linkRelativo 
                            ? (linkRelativo.startsWith('http') ? linkRelativo : 'https://scienti.minciencias.gov.co' + linkRelativo)
                            : '#';

                        let vinculacion = celdas.eq(1).text().trim();

                        if (nombreLimpio && nombreLimpio.length > 2 && nombreLimpio !== "Nombre") {
                            investigadores.push({
                                nombre: nombreLimpio,
                                vinculacion: vinculacion,
                                link: linkCompleto
                            });
                        }
                    }
                }
            } catch (errRow) {
                // Si falla una fila, lo reportamos pero no detenemos el script
                console.error(`⚠️ Error procesando fila en ${grupo.id}: ${errRow.message}`);
            }
        });

        if (investigadores.length > 0) {
            fs.writeFileSync(`${grupo.id}.json`, JSON.stringify(investigadores, null, 2));
            console.log(`✅ ${grupo.id}.json actualizado (${investigadores.length} integrantes actuales).`);
        } else {
            console.warn(`⚠️ No se encontraron integrantes con vinculación "Actual" en: ${grupo.id}`);
        }
        
    } catch (error) {
        // Atrapamos el error del grupo para que el bucle 'for' continúe con el siguiente grupo
        console.error(`❌ Error al acceder a ${grupo.id}: ${error.message}`);
    }
}

// Función principal con ejecución secuencial
async function ejecutarTodo() {
    console.log('🚀 INICIANDO ACTUALIZACIÓN: Filtrando solo investigadores ACTUALES...');
    
    for (const grupo of GRUPOS) {
        await scrapeGrupo(grupo);
        // Pequeña pausa de 1 segundo entre grupos para evitar bloqueos por parte del servidor
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✨ Proceso terminado para todos los grupos.');
}

ejecutarTodo();
