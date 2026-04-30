const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite'); // Nueva librería para limpiar tildes

async function scrape() {
    const url = 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016595';
    
    try {
        // Descargamos los datos como un chorro de bytes (arraybuffer) para no perder las tildes
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        // Convertimos el formato antiguo de MinCiencias a formato moderno legible
        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        let investigadores = [];

        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            if (i === 0) return;
            const celdas = $(el).find('td');
            
            // Limpiamos espacios extra y saltos de línea
            let nombre = celdas.eq(0).text().replace(/\s+/g, ' ').trim();
            let vinculacion = celdas.eq(2).text().replace(/\s+/g, ' ').trim();

            if (nombre && nombre !== "Nombre") {
                investigadores.push({ 
                    nombre: nombre, 
                    vinculacion: vinculacion 
                });
            }
        });

        fs.writeFileSync('investigadores.json', JSON.stringify(investigadores, null, 2));
        console.log('✅ Datos limpios y guardados');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

scrape();
