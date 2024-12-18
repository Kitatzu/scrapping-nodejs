import { chromium } from 'playwright';
import fs from 'fs';

const scrapeData = async () => {
  const browser = await chromium.launch({
    headless: false, // Cambiar a `true` cuando termines de depurar
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true, // Ignorar errores HTTPS (si es necesario)
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', // Cambia el User-Agent
    viewport: { width: 1280, height: 800 }, // Define el tamaño del viewport
  });
  const page = await context.newPage();

  try {
    // Crear un nuevo contexto para cada solicitud (navegador limpio)

    console.log('Navegando a Amazon...');
    await page.goto('https://amazon.com', { waitUntil: 'domcontentloaded' });

    // Verificar si la página cargó correctamente
    console.log('Verificando redirección...');
    console.log('URL actual:', page.url());

    // Detectar captchas
    const captcha = await page.$('form[action="/errors/validateCaptcha"]');
    if (captcha) {
      console.error('Se detectó un captcha. Deteniendo el scraping.');
      await page.screenshot({ path: 'captcha-screenshot.png' });
      throw new Error('Captcha detectado');
    }

    console.log('Esperando el campo de búsqueda...');
    const searchBox = await page.$('input#twotabsearchtextbox');
    if (!searchBox) {
      throw new Error(
        'Campo de búsqueda no encontrado: input#twotabsearchtextbox',
      );
    }

    console.log('Llenando el campo de búsqueda...');
    await searchBox.fill('A-team performance');

    console.log('Haciendo clic en el botón de búsqueda...');
    const searchButton = await page.$('input#nav-search-submit-button');
    if (!searchButton) {
      throw new Error(
        'Botón de búsqueda no encontrado: input#nav-search-submit-button',
      );
    }
    await searchButton.click();

    console.log('Esperando resultados...');
    await page.waitForSelector('.s-main-slot', {
      timeout: 60000,
    });

    console.log('Extrayendo datos de productos...');
    const products = await page.$$eval('[data-asin]', (items) =>
      items.map((item) => {
        const titleElement = item.querySelector('h2 span');
        const priceElement = item.querySelector('.a-price .a-offscreen');

        const title =
          titleElement instanceof HTMLElement ? titleElement.innerText : null;
        const price =
          priceElement instanceof HTMLElement ? priceElement.innerText : null;
        return { title, price };
      }),
    );

    if (products.length === 0) {
      console.warn(
        'No se encontraron productos. Revisa el selector o el término de búsqueda.',
      );
    } else {
      console.log('Productos encontrados:', products);
    }

    // Guardar resultados en un archivo JSON
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
    console.log('Productos guardados en products.json');
  } catch (error) {
    console.error('Error al hacer scraping:', error);

    // Capturar una captura de pantalla y guardar el HTML para análisis
    await page.screenshot({ path: 'error-screenshot.png' });
    const html = await page.content();
    fs.writeFileSync('error-page.html', html);
    console.log(
      'Captura de pantalla y contenido de la página guardados para análisis.',
    );
  } finally {
    await browser.close();
    console.log('Navegador cerrado.');
  }
};

scrapeData();
