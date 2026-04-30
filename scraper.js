const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');

async function scrape() {
    const url = 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016595';
    
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            if (i === 0) return;
            const celdas = $(el).find('td');
            if (celdas.length >= 3) {
                let nombreRaw = celdas.eq(0).text().trim();
                
                // Limpieza profunda de caracteres basura y números iniciales
                let nombre = nombreRaw
                    .replace(/^\d+[\.\-]\s*/, '') 
                    .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '') 
                    .replace(/\s+/g, ' ')
                    .trim();

                let vinculacion = celdas.eq(2).text().trim();

                if (nombre && nombre !== "Nombre") {
                    investigadores.push({ nombre, vinculacion });
                }
            }
        });

        fs.writeFileSync('investigadores.json', JSON.stringify(investigadores, null, 2));
        console.log('✅ Datos guardados correctamente.');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
scrape();
