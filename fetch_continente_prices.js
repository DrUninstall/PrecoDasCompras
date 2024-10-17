const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const arrozUrl = 'https://www.continente.pt/produto/arroz-carolino-continente-4738050.html';
const massaUrl = 'https://www.continente.pt/produto/massa-esparguete-continente-5254224.html';
const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

async function fetchProductPrice(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const product = await page.evaluate(() => {
    const unitPriceElement = document.querySelector('.value');
    const pricePerKgElement = document.querySelector('.ct-price-value');
    const unitPrice = unitPriceElement ? parseFloat(unitPriceElement.innerText.replace('€', '').replace(',', '.').trim()) : null;
    const pricePerKg = pricePerKgElement ? parseFloat(pricePerKgElement.innerText.replace('€', '').replace(',', '.').trim()) : null;
    return { price: unitPrice, pricePerKg };
  });

  await browser.close();
  return product;
}

async function updatePriceHistory(productKey, productPrice) {
  const filePath = path.resolve(__dirname, `${productKey}_price_history.js`);
  const history = require(filePath);
  const lastEntry = history[history.length - 1];

  // Check if today's entry already exists
  if (lastEntry && lastEntry.date === today) {
    console.log(`${productKey} price for today already exists.`);
    return;
  }

  // Add new entry for today
  history.push({ date: today, price: productPrice.price, pricePerKg: productPrice.pricePerKg });

  // Save updated history back to file
  const fileContent = `const ${productKey}PriceHistory = ${JSON.stringify(history, null, 2)};\nmodule.exports = ${productKey}PriceHistory;`;
  fs.writeFileSync(filePath, fileContent);
  console.log(`Updated ${productKey} price history with today's data.`);
}

async function main() {
  const arrozPrice = await fetchProductPrice(arrozUrl);
  const massaPrice = await fetchProductPrice(massaUrl);

  if (arrozPrice) await updatePriceHistory('arroz', arrozPrice);
  if (massaPrice) await updatePriceHistory('massa', massaPrice);
}

main().catch(console.error);
