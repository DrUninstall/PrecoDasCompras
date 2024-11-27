// Calls on page load
window.addEventListener("DOMContentLoaded", async () => {
  updateTableHeaders();  // Update headers with dynamic values
  updateData();          // Call existing updateData function to load prices
  updateTable();

  // Ensure the default selected product is highlighted on page load
  const defaultProduct = document.getElementById("productSelect").value;
  highlightSelectedRow(defaultProduct); // Highlight the default option's row
});

// product data
const priceData = {
  "arroz": {
    name: "Arroz Carolino",
    currentPrice: arrozPriceHistory[arrozPriceHistory.length - 1].price,
    priceHistory: arrozPriceHistory
  },
  "massa": {
    name: "Massa Esparguete",
    currentPrice: massaPriceHistory[massaPriceHistory.length - 1].price,
    priceHistory: massaPriceHistory
  },
  "azeite": {
    name: "Azeite Virgem Extra",
    currentPrice: azeitePriceHistory[azeitePriceHistory.length - 1].price,
    priceHistory: azeitePriceHistory
  },
  "bolachas": {
    name: "Bolachas Maria",
    currentPrice: bolachasPriceHistory[bolachasPriceHistory.length - 1].price,
    priceHistory: bolachasPriceHistory
  },
  "feijao": {
    name: "Feijão Manteiga",
    currentPrice: feijaoPriceHistory[feijaoPriceHistory.length - 1].price,
    priceHistory: feijaoPriceHistory
  },
  "leite": {
    name: "Leite UHT Meio Gordo",
    currentPrice: leitePriceHistory[leitePriceHistory.length - 1].price,
    priceHistory: leitePriceHistory
  },
  "manteiga": {
    name: "Manteiga com Sal",
    currentPrice: manteigaPriceHistory[manteigaPriceHistory.length - 1].price,
    priceHistory: manteigaPriceHistory
  },
  "pao": {
    name: "Carcaça Portuguesa",
    currentPrice: paoPriceHistory[paoPriceHistory.length - 1].price,
    priceHistory: paoPriceHistory
  },
  "queijo": {
    name: "Queijo Flamengo Fatiado",
    currentPrice: queijoPriceHistory[queijoPriceHistory.length - 1].price,
    priceHistory: queijoPriceHistory
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

function forwardFill(history) {
  for (let i = 1; i < history.length; i++) {
    if (history[i].price === null || history[i].price === 0) {
      history[i].price = history[i - 1] ? history[i - 1].price : history[i].price;
    }
    if (history[i].pricePerKg === null || history[i].pricePerKg === 0) {
      history[i].pricePerKg = history[i - 1] ? history[i - 1].pricePerKg : history[i].pricePerKg;
    }
  }
}

function forwardFillAllProducts() {
  Object.keys(priceData).forEach(productKey => {
    forwardFill(priceData[productKey].priceHistory);
  });
}

function cleanHistory(history) {
  return history.filter(entry => entry.price !== null && entry.price !== 0 && entry.pricePerKg !== null && entry.pricePerKg !== 0);
}



// Function to update chart and table based on selected product
function updateData() {
  const productSelect = document.getElementById("productSelect");
  const selectedProduct = productSelect.value;

  // Apply forward fill to all product histories to ensure consistency
  forwardFillAllProducts();

  const selectedPriceType = document.querySelector('input[name="priceType"]:checked').value;
  const selectedTimeInterval = document.querySelector('input[name="timeInterval"]:checked').value;

  let data;
  if (selectedProduct === "all") {
    data = calculateTotalPriceForChart(selectedPriceType, selectedTimeInterval);
  } else {
    data = calculateProductPriceForChart(selectedProduct, selectedPriceType, selectedTimeInterval);
  }

  // Update the chart with the selected data
  updateChart(data, selectedPriceType, selectedTimeInterval);

  // Update the table with current data and historical differences
  updateTable(); // Refresh the table with updated data

  // Highlight the selected row in the table based on the selected product
  highlightSelectedRow(selectedProduct);
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

    // Since we already applied forward fill, all prices should be valid
    const currentPrice = currentPriceCell ? parseFloat(currentPriceCell.textContent.replace('€', '').trim()) : 0;
    const lastMonthDiff = lastMonthDiffCell ? parseFloat(lastMonthDiffCell.textContent.replace('%', '').trim()) : 0;
    const threeMonthsAgoDiff = threeMonthsAgoDiffCell ? parseFloat(threeMonthsAgoDiffCell.textContent.replace('%', '').trim()) : 0;
    const lastYearDiff = lastYearDiffCell ? parseFloat(lastYearDiffCell.textContent.replace('%', '').trim()) : 0;

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




function calculateTotalPriceForChart(priceType, timeInterval) {
  const products = Object.values(priceData);
  const totalData = {
    name: "Soma dos Preços",
    currentPrice: 0,
    priceHistory: [],
  };

  // Get unique dates from all products' histories
  const allDates = [...new Set(products.flatMap(product => product.priceHistory.map(entry => entry.date)))];
  allDates.sort(); // Sort dates in ascending order

  // Aggregate based on the selected time interval
  const aggregatedData = aggregateDataByTimeInterval(allDates, products, priceType, timeInterval);

  // Fill in the total data for chart display
  totalData.priceHistory = aggregatedData;
  
  return totalData;
}

function calculateProductPriceForChart(productKey, priceType, timeInterval) {
  const product = priceData[productKey];
  const priceHistory = product.priceHistory;

  // Aggregate based on the selected time interval
  const aggregatedData = aggregateDataByTimeInterval(priceHistory.map(entry => entry.date), [product], priceType, timeInterval);

  return {
    name: product.name,
    currentPrice: product.currentPrice,
    priceHistory: aggregatedData,
  };
}

function aggregateDataByTimeInterval(dates, products, priceType, timeInterval) {
  const aggregatedData = [];
  const dateFormat = timeInterval === "anual" ? "yyyy" :
                     timeInterval === "mensal" ? "yyyy-MM" :
                     timeInterval === "semanal" ? "yyyy-WW" : "yyyy-MM-dd"; // Format based on interval

  const groupedDates = dates.reduce((groups, date) => {
    const formattedDate = formatDate(date, timeInterval);
    if (!groups[formattedDate]) {
      groups[formattedDate] = [];
    }
    groups[formattedDate].push(date);
    return groups;
  }, {});

  Object.keys(groupedDates).forEach(formattedDate => {
    let totalPrice = 0;
    let validProductCount = 0;

    products.forEach(product => {
      const relevantEntries = product.priceHistory.filter(entry => groupedDates[formattedDate].includes(entry.date));

      // If no relevant entries, look for the closest previous or next price
      if (relevantEntries.length === 0) {
        const previousPrice = findPreviousPrice(product.priceHistory, groupedDates[formattedDate][0]);
        const nextPrice = findNextPrice(product.priceHistory, groupedDates[formattedDate][0]);
        
        // Choose the previous price if available, otherwise use the next price
        if (previousPrice !== null) {
          totalPrice += previousPrice[priceType];
          validProductCount++;
        } else if (nextPrice !== null) {
          totalPrice += nextPrice[priceType];
          validProductCount++;
        }
      } else {
        // Calculate the average price from the available entries
        const averagePrice = relevantEntries.reduce((sum, entry) => sum + entry[priceType], 0) / relevantEntries.length;
        totalPrice += averagePrice;
        validProductCount++;
      }
    });

    if (validProductCount > 0) {
      aggregatedData.push({ date: formattedDate, [priceType]: totalPrice });
    }
  });

  return aggregatedData;
}

function findPreviousPrice(priceHistory, targetDate) {
  const target = new Date(targetDate);
  for (let i = priceHistory.length - 1; i >= 0; i--) {
    const entryDate = new Date(priceHistory[i].date);
    if (entryDate <= target) {
      return priceHistory[i];
    }
  }
  return null; // No previous price found
}

function findNextPrice(priceHistory, targetDate) {
  const target = new Date(targetDate);
  for (let i = 0; i < priceHistory.length; i++) {
    const entryDate = new Date(priceHistory[i].date);
    if (entryDate >= target) {
      return priceHistory[i];
    }
  }
  return null; // No next price found
}


function formatDate(date, interval) {
  const dateObj = new Date(date);
  if (interval === "anual") {
    return dateObj.getFullYear().toString();
  } else if (interval === "mensal") {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
  } else if (interval === "semanal") {
    const week = getWeekNumber(dateObj);
    return `${dateObj.getFullYear()}-W${String(week).padStart(2, '0')}`;
  } else {
    return date;
  }
}

function getWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return weekNo;
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

  // Helper function to create rows with unique IDs for each product
  const formatRow = (id, name, currentPrice, lastMonth, lastQuarter, sameMonthLastYear) => `
    <tr id="row-${id}">
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

    // Add the row for the current product with a unique ID based on the product key
    tableBody.innerHTML += formatRow(productKey, product.name, currentPrice, lastMonth, lastQuarter, lastYearDifference);
  });

  // Calculate the average of the historical differences
  const avgLastMonthDiff = productCount > 0 ? (totalLastMonthDiff / productCount).toFixed(2) : "N/A";
  const avgThreeMonthsAgoDiff = productCount > 0 ? (totalThreeMonthsAgoDiff / productCount).toFixed(2) : "N/A";
  const avgLastYearDiff = productCount > 0 ? (totalLastYearDiff / productCount).toFixed(2) : "N/A";

  // Create the row for "Soma dos Preços" with calculated sums and averages
  tableBody.innerHTML = formatRow("all", "Soma dos Preços", totalCurrentPrice, avgLastMonthDiff, avgThreeMonthsAgoDiff, avgLastYearDiff) + tableBody.innerHTML;
}


function highlightSelectedRow(productKey) {
  const allRows = document.querySelectorAll('.price-table tr');
  
  // Remove existing highlights from all rows
  allRows.forEach(row => {
    row.classList.remove('selected-row'); // Remove previous highlight
  });

  // Get the row corresponding to the selected product key
  const productRow = document.getElementById(`row-${productKey}`);

  if (productRow) {
    // Add the 'selected-row' class to the selected product row
    productRow.classList.add('selected-row');

    // Move the selected row to the top (just after the header)
    const tableBody = document.querySelector("#price-details tbody");
    tableBody.insertBefore(productRow, tableBody.firstChild);  // Move the row to the top of the tbody
  }
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
