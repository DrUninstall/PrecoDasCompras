// Calls on page load
window.addEventListener("DOMContentLoaded", async () => {
  updateTableHeaders();  // Update headers with dynamic values
  updateData();          // Call existing updateData function to load prices
});

// Example product data (replace with actual fetching logic)
const priceData = {
  "arroz": {
    name: "Arroz Carolino",
    currentPrice: arrozPriceHistory[arrozPriceHistory.length - 1].price, // Use latest price
    priceHistory: arrozPriceHistory
  },
  "massa": {
    name: "Massa Esparguete",
    currentPrice: massaPriceHistory[massaPriceHistory.length - 1].price, // Use latest price
    priceHistory: massaPriceHistory
  }
};


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
  
  const selectedPriceType = document.querySelector('input[name="priceType"]:checked').value;
  
  let data;
  if (selectedProduct === "all") {
    data = calculateTotalPriceForChart(selectedPriceType);
  } else {
    data = priceData[selectedProduct];
  }

  updateChart(data, selectedPriceType);

  // Use table-specific function for "Soma dos Preços" row
  const totalDataForTable = calculateTotalForTable();
  updateTable(totalDataForTable);
}


// Fill missing prices/dates
function forwardFill(history) {
  for (let i = 1; i < history.length; i++) {
    if (history[i].price === null) {
      history[i].price = history[i - 1].price;
    }
  }
}

function calculateTotalForTable() {
  const tableRows = document.querySelectorAll("#price-details tbody tr:not(.total-row)");
  const totalData = {
    name: "Soma dos Preços",
    currentPrice: 0,
    historicalDifferences: {
      lastMonth: 0,
      threeMonthsAgo: 0,
      lastYear: 0
    }
  };

  let totalLastMonthDiff = 0;
  let totalThreeMonthsAgoDiff = 0;
  let totalLastYearDiff = 0;
  let productCount = 0;

  tableRows.forEach(row => {
    const currentPriceCell = row.querySelector(".currentPrice");
    const lastMonthDiffCell = row.querySelector(".lastMonthDiff");
    const threeMonthsAgoDiffCell = row.querySelector(".threeMonthsAgoDiff");
    const lastYearDiffCell = row.querySelector(".lastYearDiff");

    // Check if cells are found before attempting to access textContent
    const currentPrice = currentPriceCell ? parseFloat(currentPriceCell.textContent.replace('€', '').trim()) || 0 : 0;
    const lastMonthDiff = lastMonthDiffCell ? parseFloat(lastMonthDiffCell.textContent.replace('%', '').trim()) || 0 : 0;
    const threeMonthsAgoDiff = threeMonthsAgoDiffCell ? parseFloat(threeMonthsAgoDiffCell.textContent.replace('%', '').trim()) || 0 : 0;
    const lastYearDiff = lastYearDiffCell ? parseFloat(lastYearDiffCell.textContent.replace('%', '').trim()) || 0 : 0;

    totalData.currentPrice += currentPrice;
    totalLastMonthDiff += lastMonthDiff;
    totalThreeMonthsAgoDiff += threeMonthsAgoDiff;
    totalLastYearDiff += lastYearDiff;
    productCount++;
  });

  totalData.historicalDifferences.lastMonth = productCount > 0 ? (totalLastMonthDiff / productCount).toFixed(2) : "N/A";
  totalData.historicalDifferences.threeMonthsAgo = productCount > 0 ? (totalThreeMonthsAgoDiff / productCount).toFixed(2) : "N/A";
  totalData.historicalDifferences.lastYear = productCount > 0 ? (totalLastYearDiff / productCount).toFixed(2) : "N/A";

  return totalData;
}



function calculateTotalPriceForChart(priceType) {
  const products = Object.values(priceData);
  const totalData = {
    name: "Soma dos Preços",
    currentPrice: 0,
    priceHistory: [],
  };

  const historyLength = Math.min(...products.map(product => product.priceHistory.length));
  for (let i = 0; i < historyLength; i++) {
    const date = products[0].priceHistory[i].date;
    
    // Use price or pricePerKg based on selected priceType
    const totalPrice = products.reduce((sum, product) => sum + (product.priceHistory[i]?.[priceType] || 0), 0);
    
    totalData.priceHistory.push({ date, [priceType]: totalPrice });
  }

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
function updateTable() {
  const tableBody = document.querySelector("#price-details tbody");
  tableBody.innerHTML = "";  // Clear existing rows

  // Helper function to create rows
  const formatRow = (name, currentPrice, lastMonth, lastQuarter, sameMonthLastYear) => `
    <tr>
      <td>${name}</td>
      <td>€${currentPrice.toFixed(2)}</td>
      <td>${lastMonth !== '-' ? `${lastMonth}%` : lastMonth}</td>
      <td>${lastQuarter !== '-' ? `${lastQuarter}%` : lastQuarter}</td>
      <td>${sameMonthLastYear !== '-' ? `${sameMonthLastYear}%` : sameMonthLastYear}</td>
    </tr>
  `;

  // Variables to track the sum of current prices and historical differences
  let totalCurrentPrice = 0;
  let totalLastMonthDiff = 0;
  let totalThreeMonthsAgoDiff = 0;
  let totalLastYearDiff = 0;
  let productCount = 0;

  // Loop through each product and add the rows
  Object.keys(priceData).forEach(productKey => {
    const product = priceData[productKey];
    const currentPrice = product.currentPrice;

    // Fetch historical prices for comparison
    const history = product.priceHistory;
    const lastMonth = history.length > 1 ? calculateDifference(currentPrice, history[history.length - 2].price) : "N/A";
    const lastQuarter = history.length > 3 ? calculateDifference(currentPrice, history[history.length - 4].price) : "N/A";
    const sameMonthLastYear = history.find(entry => {
      const entryDate = new Date(entry.date);
      const currentDate = new Date();
      return entryDate.getFullYear() === currentDate.getFullYear() - 1 && entryDate.getMonth() === currentDate.getMonth();
    })?.price;
    const lastYearDifference = sameMonthLastYear ? calculateDifference(currentPrice, sameMonthLastYear) : "N/A";

    // Convert percentage strings to numbers for summation
    const lastMonthDiffValue = parseFloat(lastMonth) || 0;
    const lastQuarterDiffValue = parseFloat(lastQuarter) || 0;
    const lastYearDiffValue = parseFloat(lastYearDifference) || 0;

    // Sum up current prices and percentage changes
    totalCurrentPrice += currentPrice;
    totalLastMonthDiff += lastMonthDiffValue;
    totalThreeMonthsAgoDiff += lastQuarterDiffValue;
    totalLastYearDiff += lastYearDiffValue;
    productCount++;

    // Add the row for the current product
    tableBody.innerHTML += formatRow(product.name, currentPrice, lastMonth, lastQuarter, lastYearDifference);
  });

  // Calculate the average of the historical differences
  const avgLastMonthDiff = productCount > 0 ? (totalLastMonthDiff / productCount).toFixed(2) : "N/A";
  const avgThreeMonthsAgoDiff = productCount > 0 ? (totalThreeMonthsAgoDiff / productCount).toFixed(2) : "N/A";
  const avgLastYearDiff = productCount > 0 ? (totalLastYearDiff / productCount).toFixed(2) : "N/A";

  // Create the row for "Soma dos Preços" with calculated sums and averages
  tableBody.innerHTML = formatRow("Soma dos Preços", totalCurrentPrice, avgLastMonthDiff, avgThreeMonthsAgoDiff, avgLastYearDiff) + tableBody.innerHTML;
}


// Helper function to calculate percentage difference
function calculateDifference(current, previous) {
    const difference = ((current - previous) / previous) * 100;
    return (difference >= 0 ? "+" : "") + difference.toFixed(2);
}

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
