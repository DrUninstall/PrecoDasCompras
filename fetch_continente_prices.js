const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const arrozUrl = 'https://www.continente.pt/produto/arroz-carolino-continente-4738050.html';
const massaUrl = 'https://www.continente.pt/produto/massa-esparguete-continente-5254224.html';
const azeiteUrl = 'https://www.continente.pt/produto/azeite-virgem-extra-classico-oliveira-da-serra-2014566.html';
const bolachasUrl = 'https://www.continente.pt/produto/bolachas-maria-continente-6715842.html';
const feijaoUrl = 'https://www.continente.pt/produto/feijao-manteiga-cozido-continente-2859483.html';
const leiteUrl = 'https://www.continente.pt/produto/leite-uht-meio-gordo-mimosa-2210946.html';
const manteigaUrl = 'https://www.continente.pt/produto/manteiga-com-sal-mimosa-2211084.html';
const paoUrl = 'https://www.continente.pt/produto/carcaca-portuguesa-7371774.html';
const queijoUrl = 'https://www.continente.pt/produto/queijo-flamengo-fatiado-continente-6184775.html';
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
  
  // Read the file contents as a string
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Extract the history array from the file (parse the JSON part)
  const historyString = fileContent.match(/const\s+\w+\s+=\s+(\[.*\]);/s)[1]; // Regex to capture array
  const history = JSON.parse(historyString);

  const lastEntry = history[history.length - 1];

  // Check if today's entry already exists
  if (lastEntry && lastEntry.date === today) {
    console.log(`${productKey} price for today already exists.`);
    return;
  }

  // Add new entry for today
  history.push({ date: today, price: productPrice.price, pricePerKg: productPrice.pricePerKg });

  // Save updated history back to file
  const updatedFileContent = `const ${productKey}PriceHistory = ${JSON.stringify(history, null, 2)};\nmodule.exports = ${productKey}PriceHistory;`;
  fs.writeFileSync(filePath, updatedFileContent);

  console.log(`Updated ${productKey} price history with today's data.`);
}


async function main() {
  const arrozPrice = await fetchProductPrice(arrozUrl);
  const massaPrice = await fetchProductPrice(massaUrl);
  const azeitePrice = await fetchProductPrice(azeiteUrl);
  const bolachasPrice = await fetchProductPrice(bolachasUrl);
  const feijaoPrice = await fetchProductPrice(feijaoUrl);
  const leitePrice = await fetchProductPrice(leiteUrl);
  const manteigaPrice = await fetchProductPrice(manteigaUrl);
  const paoPrice = await fetchProductPrice(paoUrl);
  const queijoPrice = await fetchProductPrice(queijoUrl);

  if (arrozPrice) await updatePriceHistory('arroz', arrozPrice);
  if (massaPrice) await updatePriceHistory('massa', massaPrice);
  if (azeitePrice) await updatePriceHistory('azeite', azeitePrice);
  if (bolachasPrice) await updatePriceHistory('bolachas', bolachasPrice);
  if (feijaoPrice) await updatePriceHistory('feijao', feijaoPrice);
  if (leitePrice) await updatePriceHistory('leite', leitePrice);
  if (manteigaPrice) await updatePriceHistory('manteiga', manteigaPrice);
  if (paoPrice) await updatePriceHistory('pao', paoPrice);
  if (queijoPrice) await updatePriceHistory('queijo', queijoPrice);
}
main().catch(console.error);
