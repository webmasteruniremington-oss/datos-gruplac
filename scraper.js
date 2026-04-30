const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrape() {
    // URL del grupo que me pasaste
    const url = 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016595';
    
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let investigadores = [];

        // Buscamos la tabla de integrantes
        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            if (i === 0) return;
            const celdas = $(el).find('td');
            const nombre = celdas.eq(0).text().trim();
            const vinculacion = celdas.eq(2).text().trim();
            
            if (nombre && nombre !== "Nombre") {
                investigadores.push({ nombre, vinculacion });
            }
        });

        fs.writeFileSync('investigadores.json', JSON.stringify(investigadores, null, 2));
        console.log('✅ Datos extraídos con éxito');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

scrape();
