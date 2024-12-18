import { chromium } from 'playwright';
import fs from 'fs';

const amazonScraper = async (productUrl: string) => {
  if (!productUrl) throw new Error('URL de producto no proporcionada');

  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    const captcha = await page.$('form[action="/errors/validateCaptcha"]');
    if (captcha) {
      console.error('Se detectó un captcha. Deteniendo el scraping.');
      await page.screenshot({ path: 'captcha-screenshot.png' });
      throw new Error('Captcha detectado');
    }
    const product = await page.$eval('#dp-container', (element) => {
      const title = element.querySelector('#productTitle')?.innerHTML;
      const price = element.querySelector('.aok-offscreen')?.innerHTML;
      return { title, price };
    });
    // Validar que los datos del producto sean correctos
    if (!product || !product.title || !product.price) {
      console.warn(
        'No se encontraron datos válidos del producto. Revisa los selectores o la página.',
      );
      return;
    }

    fs.writeFileSync('products.json', JSON.stringify(product, null, 2));
    console.log('Productos guardados en products.json');
  } catch (error) {
    console.error('Error al hacer scraping:', error);

    // Capturar una captura de pantalla y guardar el HTML para análisis
    await page.screenshot({ path: 'error-amazonScraper.png' });
    const html = await page.content();
    fs.writeFileSync('error-page.html', html);
    console.log(
      'Captura de pantalla y contenido de la página guardados para análisis.',
    );
  } finally {
    await browser.close();
  }
};

amazonScraper(
  'https://www.amazon.com/-/es/Team-Performance-Distribuidor-Compatible-Instalaci%C3%B3n/dp/B075SNVRG2/ref=pd_ci_mcx_mh_mcx_views_0_image?pd_rd_w=Bo849&content-id=amzn1.sym.bb21fc54-1dd8-448e-92bb-2ddce187f4ac%3Aamzn1.symc.40e6a10e-cbc4-4fa5-81e3-4435ff64d03b&pf_rd_p=bb21fc54-1dd8-448e-92bb-2ddce187f4ac&pf_rd_r=P8BR68PPEHBTD9V7XSYS&pd_rd_wg=U2sfd&pd_rd_r=1c0dc13c-567f-458a-8e26-d82fdddca8bd&pd_rd_i=B075SNVRG2&th=1',
);
