const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const iconv = require('iconv-lite');

async function scrape() {
    const url = 'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000016595';
    
    try {
        console.log('Iniciando extracción de datos de GISOR...');
        
        // Descargamos el HTML con arraybuffer para manejar la codificación ISO-8859-1
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const html = iconv.decode(response.data, 'iso-8859-1');
        const $ = cheerio.load(html);
        
        let investigadores = [];

        // Buscamos la tabla que contiene el texto "Integrantes del grupo"
        $("td:contains('Integrantes del grupo')").closest('table').find('tr').each((i, el) => {
            // Saltamos el encabezado de la tabla
            if (i === 0) return;

            const celdas = $(el).find('td');
            
            if (celdas.length >= 3) {
                const celdaNombre = celdas.eq(0);
                
                // 1. Extraer y limpiar el nombre (quita "1.- ", "2.- ", etc.)
                let nombreRaw = celdaNombre.text().trim();
                let nombreLimpio = nombreRaw
                    .replace(/^\d+[\.\-]\s*/, '') // Quita números y puntos al inicio
                    .replace(/\s+/g, ' ')         // Quita espacios dobles
                    .trim();

                // 2. Extraer el enlace al CvLAC
                let linkRelativo = celdaNombre.find('a').attr('href');
                let linkCompleto = linkRelativo 
                    ? (linkRelativo.startsWith('http') ? linkRelativo : 'https://scienti.minciencias.gov.co' + linkRelativo)
                    : '#';

                // 3. Extraer vinculación (Columna 2: "Integrante", "Colaborador", etc.)
                let vinculacion = celdas.eq(1).text().trim();

                // Solo agregamos si hay un nombre válido
                if (nombreLimpio && nombreLimpio !== "Nombre") {
                    investigadores.push({
                        nombre: nombreLimpio,
                        vinculacion: vinculacion,
                        link: linkCompleto
                    });
                }
            }
        });

        // Guardar el archivo JSON
        fs.writeFileSync('investigadores.json', JSON.stringify(investigadores, null, 2));
        
        console.log(`✅ Proceso finalizado con éxito.`);
        console.log(`📊 Total investigadores encontrados: ${investigadores.length}`);
        
    } catch (error) {
        console.error('❌ Error durante el scraping:', error.message);
        process.exit(1);
    }
}

scrape();
