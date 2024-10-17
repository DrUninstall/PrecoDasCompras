// Example product data (replace with actual fetching logic)
const priceData = {
  "arroz": {
    name: "Arroz Carolino",
    currentPrice: 1.25,
    priceHistory: arrozPriceHistory
  },
  "massa": {
    name: "Massa Esparguete",
    currentPrice: 0.65,
    priceHistory: massaPriceHistory
  }
};

async function fetchAndUpdatePrices() {
  try {
    const arrozPrice = await fetchArrozCarolinoPrice();
    const massaPrice = await fetchMassaEsparguetePrice();

    priceData["arroz"].currentPrice = arrozPrice || priceData["arroz"].priceHistory.slice(-1)[0].price;
    priceData["massa"].currentPrice = massaPrice || priceData["massa"].priceHistory.slice(-1)[0].price;

    console.log("Updated Arroz Carolino currentPrice:", priceData["arroz"].currentPrice);
    console.log("Updated Massa Esparguete currentPrice:", priceData["massa"].currentPrice);

    updateData();
  } catch (error) {
    console.error('Error fetching current prices:', error);
  }
}

// Fetch prices on page load
window.addEventListener("DOMContentLoaded", async () => {
  await fetchAndUpdatePrices();  // Ensure prices are fetched first
  updateData();                  // Then update the display
});


function displayPriceHistory(productKey) {
    const tableBody = document.querySelector("#priceHistoryTable tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    // Check if the product exists in priceData
    if (priceData[productKey]) {
        const productHistory = priceData[productKey].priceHistory;

        productHistory.forEach(entry => {
            const row = document.createElement("tr");

            const priceCell = document.createElement("td");
            priceCell.textContent = `€${entry.price.toFixed(2)}/kg`;
            
            const dateCell = document.createElement("td");
            dateCell.textContent = entry.date;

            row.appendChild(priceCell);
            row.appendChild(dateCell);

            tableBody.appendChild(row);
        });
    }
}


// Function to update chart and table based on selected product
function updateData() {
  const productSelect = document.getElementById("productSelect");
  const selectedProduct = productSelect.value;

  // Get the selected price type from the radio buttons
  const selectedPriceType = document.querySelector('input[name="priceType"]:checked').value;

  let data;
  if (selectedProduct === "all") {
    data = calculateTotalPrice(selectedPriceType);  // Pass selectedPriceType to calculateTotalPrice
  } else {
    data = priceData[selectedProduct];
  }

  updateChart(data, selectedPriceType); // Pass selectedPriceType to update the chart accordingly
  updateTable(data);
}


// Fill missing prices/dates
function forwardFill(history) {
  for (let i = 1; i < history.length; i++) {
    if (history[i].price === null) {
      history[i].price = history[i - 1].price;
    }
  }
}


// Function to calculate the total price and history of all products
function calculateTotalPrice(priceType) {
  const products = Object.values(priceData);
  const totalData = {
    name: "Soma dos Preços",
    currentPrice: 0,
    priceHistory: [],
    historicalDifferences: {
      lastMonth: 0,
      threeMonthsAgo: 0,
      lastYear: 0
    }
  };

  // Apply forwardFill to each product's price history
  products.forEach(product => forwardFill(product.priceHistory));

  // Calculate total current price
  totalData.currentPrice = products.reduce((sum, product) => sum + product.currentPrice, 0);

  // Calculate total price history
  const historyLength = Math.min(...products.map(product => product.priceHistory.length));
  for (let i = 0; i < historyLength; i++) {
    const date = products[0].priceHistory[i].date;
    const totalPrice = products.reduce((sum, product) => sum + (product.priceHistory[i]?.price || 0), 0);
    totalData.priceHistory.push({ date, price: totalPrice });
  }

  // Calculate historical differences based on individual product differences
  const calculateAggregatedDifference = (indexDiff) => {
    let totalDifference = 0;
    let productCount = 0;
    
    products.forEach(product => {
      const currentPrice = product.currentPrice;
      const historicalPrice = product.priceHistory[historyLength - indexDiff - 1]?.price;
      
      if (historicalPrice && !isNaN(currentPrice) && !isNaN(historicalPrice)) {
        totalDifference += ((currentPrice - historicalPrice) / historicalPrice) * 100;
        productCount++;
      }
    });

    return productCount > 0 ? (totalDifference / productCount).toFixed(2) : "N/A";
  };

  totalData.historicalDifferences.lastMonth = historyLength > 1 ? calculateAggregatedDifference(1) : "N/A";
  totalData.historicalDifferences.threeMonthsAgo = historyLength > 3 ? calculateAggregatedDifference(3) : "N/A";
  totalData.historicalDifferences.lastYear = historyLength > 12 ? calculateAggregatedDifference(12) : "N/A";

  return totalData;
}


// Helper function to calculate percentage difference
function calculateDifference(current, previous) {
    if (!previous || isNaN(current) || isNaN(previous)) {
        return "N/A"; // Return "N/A" if there’s no previous price to compare or if values are NaN
    }
    const difference = ((current - previous) / previous) * 100;
    return (difference >= 0 ? "+" : "") + difference.toFixed(2);
}


function updateChart(data, priceType) {
  const ctx = document.getElementById("price-chart").getContext("2d");
  const chartData = data.priceHistory.map(entry => entry[priceType]); // Use price or pricePerKg
  const labels = data.priceHistory.map(entry => entry.date);

  const n = chartData.length;
  const sumX = n * (n - 1) / 2; // Sum of indexes (0 + 1 + 2 + ... + n-1)
  const sumY = chartData.reduce((sum, y) => sum + y, 0);
  const sumXY = chartData.reduce((sum, y, i) => sum + i * y, 0);
  const sumX2 = n * (n - 1) * (2 * n - 1) / 6; // Sum of squares of indexes

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const trendlineData = chartData.map((_, i) => slope * i + intercept);

  if (window.priceChart) {
    window.priceChart.destroy();  // Destroy previous chart instance
  }

  window.priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `${data.name} - ${priceType === 'price' ? 'Preço por Unidade (€)' : 'Preço por Quilograma (€)'}`,
          data: chartData,
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
          hitRadius: 16,
          hoverBackgroundColor: "rgba(75, 192, 192, 0.8)",
          fill: false
        },
        {
          label: 'Tendência',
          data: trendlineData,
          borderColor: "rgba(255, 99, 132, 0.8)",
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 0,
          hitradius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Desabilitar a legenda padrão
        },
        tooltip: {
          intersect: false, // Tooltip será exibido mesmo se o cursor não estiver exatamente na linha
          mode: 'index' // Mostrar tooltip baseado no eixo X para todos os datasets, simplificando a interação
        }
      },
      scales: {
        x: {
          title: { display: false, text: "Data" },
          ticks: {
            autoSkip: true,
            maxRotation: 45, // Rotate the labels to avoid overlap
            minRotation: 0,
          }
        },
        y: {
          title: { display: false, text: "Preço (€)" },
          beginAtZero: true, // Start y-axis at zero for better visual comparison
          grace: '33%' // Add extra space above the highest point for better visualization
        }
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      },
      hover: {
        mode: 'nearest',
        intersect: false
      }
    }
  });

  // Create custom legend using the .dot class
  const chartContainer = document.getElementById("chart-container");
  const customLegendContainer = document.createElement("div");
  customLegendContainer.classList.add("custom-legend");

  window.priceChart.data.datasets.forEach((dataset) => {
    const legendItem = document.createElement("div");
    legendItem.classList.add("legend-item");

    const dot = document.createElement("span");
    dot.classList.add("dot");
    dot.style.backgroundColor = dataset.borderColor;

    const label = document.createElement("span");
    label.textContent = dataset.label;

    legendItem.appendChild(dot);
    legendItem.appendChild(label);
    customLegendContainer.appendChild(legendItem);
  });

  // Remove any existing custom legend before appending
  const existingLegend = chartContainer.querySelector(".custom-legend");
  if (existingLegend) {
    existingLegend.remove();
  }
  chartContainer.appendChild(customLegendContainer);
}


// Call the function on page load
window.addEventListener("DOMContentLoaded", () => {
  updateTableHeaders();  // Update headers with dynamic values
  updateData();          // Call existing updateData function to load prices
});

// Function to get formatted month/year dynamically
function getDynamicHeaders() {
  const now = new Date();

  // Last month
  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);
  const lastMonthText = lastMonth.toLocaleString('pt-PT', { month: 'long' });

  // Three months ago
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const threeMonthsAgoText = threeMonthsAgo.toLocaleString('pt-PT', { month: 'long' });

  // Same month last year
  const lastYear = new Date(now);
  lastYear.setFullYear(now.getFullYear() - 1);
  const lastYearText = lastYear.toLocaleString('pt-PT', { month: 'long' });

  return {
    lastMonth: `Vs ${lastMonthText}`,
    threeMonthsAgo: `Vs ${threeMonthsAgoText}`,
    lastYear: `Vs ${lastYearText} ${lastYear.getFullYear()}`
  };
}

// Function to update table headers dynamically
function updateTableHeaders() {
  const headers = getDynamicHeaders();

  // Select header cells and update text
  document.querySelector("#price-details thead th:nth-child(3)").textContent = headers.lastMonth;
  document.querySelector("#price-details thead th:nth-child(4)").textContent = headers.threeMonthsAgo;
  document.querySelector("#price-details thead th:nth-child(5)").textContent = headers.lastYear;
}

// Function to update the table with current and historical price differences
function updateTable(data) {
  const tableBody = document.querySelector("#price-details tbody");
  tableBody.innerHTML = "";  // Clear existing rows

  if (!data) return;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed: Jan is 0, Dec is 11

  const formatRow = (name, currentPrice, lastMonth, lastQuarter, sameMonthLastYear) => `
    <tr>
      <td>${name}</td>
      <td>€${currentPrice.toFixed(2)}</td>
      <td>${lastMonth !== '-' ? `${lastMonth}%` : lastMonth}</td>
      <td>${lastQuarter !== '-' ? `${lastQuarter}%` : lastQuarter}</td>
      <td>${sameMonthLastYear !== '-' ? `${sameMonthLastYear}%` : sameMonthLastYear}</td>
    </tr>
  `;

  if (data.name === "Soma dos Preços") {
    tableBody.innerHTML += formatRow(
      data.name,
      data.currentPrice,
      data.historicalDifferences.lastMonth !== "N/A" ? data.historicalDifferences.lastMonth : "-",
      data.historicalDifferences.threeMonthsAgo !== "N/A" ? data.historicalDifferences.threeMonthsAgo : "-",
      data.historicalDifferences.lastYear !== "N/A" ? data.historicalDifferences.lastYear : "-"
    );

    // Display each individual product
    Object.keys(priceData).forEach(productKey => {
      const product = priceData[productKey];
      const currentPrice = product.currentPrice;

      const lastMonth = product.priceHistory?.length > 1 ? product.priceHistory[product.priceHistory.length - 2].price : currentPrice;
      const lastQuarter = product.priceHistory?.length > 3 ? product.priceHistory[product.priceHistory.length - 4].price : currentPrice;
      const sameMonthLastYear = product.priceHistory.find(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getFullYear() === currentYear - 1 && entryDate.getMonth() === currentMonth;
      })?.price || currentPrice;

      tableBody.innerHTML += formatRow(
        product.name,
        currentPrice,
        calculateDifference(currentPrice, lastMonth),
        calculateDifference(currentPrice, lastQuarter),
        calculateDifference(currentPrice, sameMonthLastYear)
      );
    });
  } else {
    const currentPrice = data.currentPrice;

    const lastMonth = data.priceHistory?.length > 1 ? data.priceHistory[data.priceHistory.length - 2].price : currentPrice;
    const lastQuarter = data.priceHistory?.length > 3 ? data.priceHistory[data.priceHistory.length - 4].price : currentPrice;
    const sameMonthLastYear = data.priceHistory.find(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === currentYear - 1 && entryDate.getMonth() === currentMonth;
    })?.price || currentPrice;

    tableBody.innerHTML += formatRow(
      data.name,
      currentPrice,
      calculateDifference(currentPrice, lastMonth),
      calculateDifference(currentPrice, lastQuarter),
      calculateDifference(currentPrice, sameMonthLastYear)
    );
  }
}


// Helper function to calculate percentage difference
function calculateDifference(current, previous) {
    const difference = ((current - previous) / previous) * 100;
    return (difference >= 0 ? "+" : "") + difference.toFixed(2);
}


// Initialize the page with default data
window.addEventListener("DOMContentLoaded", () => {
  updateData();
});

// Helper function to get the previous month name
function getPreviousMonthName() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toLocaleString('pt-PT', {month: 'long'});
}

// Helper function to get the previous quarter (3 months ago)
function getPreviousQuarterName() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3); // Go back 3 months
  return date.toLocaleString('pt-PT', { month: 'long' });
}

// Helper function to get the name and year for the same month last year
function getSameMonthLastYear() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1); // Go back 1 year
  return {
    month: date.toLocaleString('pt-PT', { month: 'long' }), // Get month name
    year: date.getFullYear() // Get year
  };
}

// Fetch Twitter Profile
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('https://unavatar.io/x/mbatalhamusic');
    if (response.ok) {
      const avatarUrl = response.url;
      document.getElementById('authorAvatar').src = avatarUrl;
    } else {
      console.error('Failed to fetch Twitter avatar.');
    }
  } catch (error) {
    console.error('Error fetching Twitter avatar:', error);
  }
});
