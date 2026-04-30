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
            
            // LIMPIEZA: Quitamos números iniciales (1.-), diamantes raros y espacios extra
            let nombreRaw = celdas.eq(0).text();
            let nombre = nombreRaw
                .replace(/^\d+[\.\-]\s*/, '') // Quita el "1.- "
                .replace(/[^\x00-\x7F]/g, '') // Quita caracteres no ASCII (los diamantes)
                .replace(/\s+/g, ' ')         // Espacios dobles a simples
                .trim();

            let vinculacion = celdas.eq(2).text().replace(/\s+/g, ' ').trim();

            if (nombre && nombre !== "Nombre") {
                investigadores.push({ nombre, vinculacion });
            }
        });

        fs.writeFileSync('investigadores.json', JSON.stringify(investigadores, null, 2));
        console.log('✅ Archivo JSON limpio generado');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
scrape();
