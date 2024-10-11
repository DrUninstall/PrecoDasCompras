const puppeteer = require('puppeteer');

const arrozUrl = 'https://www.continente.pt/produto/arroz-carolino-continente-4738050.html';
const massaUrl = 'https://www.continente.pt/produto/massa-esparguete-continente-5254224.html';

async function fetchProductPrice(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const product = await page.evaluate(() => {
    const priceElement = document.querySelector('.ct-price-value');
    return priceElement ? parseFloat(priceElement.innerText.replace(',', '.')) : null;
  });

  await browser.close();
  return product;
}

async function fetchArrozCarolinoPrice() {
  return await fetchProductPrice(arrozUrl);
}

async function fetchMassaEsparguetePrice() {
  return await fetchProductPrice(massaUrl);
}

module.exports = { fetchArrozCarolinoPrice, fetchMassaEsparguetePrice };
