const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');

async function scrape() {
    const url = 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016595';
    
    try {
        console.log('Iniciando descarga...');
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 15000 
        });
        
        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        // Buscamos la tabla de integrantes
        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            if (i === 0) return;
            const celdas = $(el).find('td');
            if (celdas.length >= 3) {
                let nombreRaw = celdas.eq(0).text().trim();
                
                // Limpieza total: quitamos números, diamantes y basura
                let nombre = nombreRaw
                    .replace(/^\d+[\.\-]\s*/, '') // Quita "1.- "
                    .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '') // Quita caracteres no legibles
                    .replace(/\s+/g, ' ')
                    .trim();

                let vinculacion = celdas.eq(2).text().trim();

                if (nombre && nombre !== "Nombre") {
                    investigadores.push({ nombre, vinculacion });
                }
            }
        });

        if (investigadores.length === 0) throw new Error('No se encontraron investigadores en la tabla');

        fs.writeFileSync('investigadores.json', JSON.stringify(investigadores, null, 2));
        console.log(`✅ Éxito: ${investigadores.length} investigadores guardados.`);
    } catch (error) {
        console.error('❌ ERROR FATAL:', error.message);
        process.exit(1);
    }
}

scrape();
