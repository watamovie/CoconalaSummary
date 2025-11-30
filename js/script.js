document.getElementById('csvFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        encoding: "Shift-JIS", // Specify encoding for Japanese CSV
        skipEmptyLines: true,
        complete: function(results) {
            console.log("Parsed Results:", results);
            if (results.errors.length > 0) {
                console.warn("Errors:", results.errors);
                // Continue processing even if there are errors, as some might be benign
            }
            processData(results.data);
        },
        error: function(err) {
            console.error("Error:", err);
            alert("ファイルの読み込みに失敗しました。");
        }
    });
});

let monthlyChartInstance = null;
let serviceChartInstance = null;
let customerChartInstance = null;
let breakdownChartInstance = null;

function processData(data) {
    // Basic validations and type conversions
    const cleanData = data.filter(row => row['売上金額'] && row['売上確定日']).map(row => {
        // Handle potential comma separation in numbers
        const amountStr = String(row['売上金額']).replace(/,/g, '');
        return {
            ...row,
            amount: parseInt(amountStr) || 0,
            date: new Date(row['売上確定日']),
            serviceName: row['サービス名'] || '不明',
            customerName: row['購入者名'] || '不明',
            breakdown: row['内訳'] || 'その他'
        };
    });

    if (cleanData.length === 0) {
        alert("有効なデータが見つかりませんでした。");
        return;
    }

    // Sort by date ascending
    cleanData.sort((a, b) => a.date - b.date);

    // 1. Summary Stats
    const totalRevenue = cleanData.reduce((sum, row) => sum + row.amount, 0);
    const totalTransactions = cleanData.length;
    const avgPrice = Math.round(totalRevenue / totalTransactions);

    document.getElementById('totalRevenue').textContent = `¥${totalRevenue.toLocaleString()}`;
    document.getElementById('totalTransactions').textContent = totalTransactions.toLocaleString();
    document.getElementById('averagePrice').textContent = `¥${avgPrice.toLocaleString()}`;

    // 2. Monthly Sales
    const monthlySales = {};
    cleanData.forEach(row => {
        const monthKey = `${row.date.getFullYear()}/${String(row.date.getMonth() + 1).padStart(2, '0')}`;
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + row.amount;
    });

    // 3. Service Sales
    const serviceSales = {};
    cleanData.forEach(row => {
        serviceSales[row.serviceName] = (serviceSales[row.serviceName] || 0) + row.amount;
    });

    // 4. Customer Sales
    const customerSales = {};
    cleanData.forEach(row => {
        customerSales[row.customerName] = (customerSales[row.customerName] || 0) + row.amount;
    });

    // 5. Breakdown Sales
    const breakdownSales = {};
    cleanData.forEach(row => {
        breakdownSales[row.breakdown] = (breakdownSales[row.breakdown] || 0) + row.amount;
    });


    renderCharts(monthlySales, serviceSales, customerSales, breakdownSales);
    renderTable(cleanData);
    document.getElementById('dashboard').style.display = 'block';
}

function renderCharts(monthlyData, serviceData, customerData, breakdownData) {
    // Helper to sort object by value descending
    const sortObj = (obj) => Object.entries(obj).sort(([,a], [,b]) => b - a);

    // Monthly Chart
    const monthlyLabels = Object.keys(monthlyData);
    const monthlyValues = Object.values(monthlyData);

    const ctxMonthly = document.getElementById('monthlySalesChart').getContext('2d');
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(ctxMonthly, {
        type: 'line',
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: '売上金額',
                data: monthlyValues,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: { responsive: true }
    });

    // Service Chart (Top 5)
    const sortedServices = sortObj(serviceData).slice(0, 5);
    const ctxService = document.getElementById('serviceSalesChart').getContext('2d');
    if (serviceChartInstance) serviceChartInstance.destroy();
    serviceChartInstance = new Chart(ctxService, {
        type: 'bar',
        data: {
            labels: sortedServices.map(item => item[0].length > 15 ? item[0].substring(0, 15) + '...' : item[0]),
            datasets: [{
                label: '売上金額',
                data: sortedServices.map(item => item[1]),
                backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true
        }
    });

    // Customer Chart (Top 5)
    const sortedCustomers = sortObj(customerData).slice(0, 5);
    const ctxCustomer = document.getElementById('customerSalesChart').getContext('2d');
    if (customerChartInstance) customerChartInstance.destroy();
    customerChartInstance = new Chart(ctxCustomer, {
        type: 'bar',
        data: {
            labels: sortedCustomers.map(item => item[0]),
            datasets: [{
                label: '購入金額',
                data: sortedCustomers.map(item => item[1]),
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true
        }
    });

    // Breakdown Chart
    const sortedBreakdown = sortObj(breakdownData);
    const ctxBreakdown = document.getElementById('breakdownChart').getContext('2d');
    if (breakdownChartInstance) breakdownChartInstance.destroy();
    breakdownChartInstance = new Chart(ctxBreakdown, {
        type: 'pie',
        data: {
            labels: sortedBreakdown.map(item => item[0]),
            datasets: [{
                data: sortedBreakdown.map(item => item[1]),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ]
            }]
        },
        options: { responsive: true }
    });
}

function renderTable(data) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    // Show top 100 rows to avoid freezing
    data.slice(0, 100).forEach(row => {
        const tr = document.createElement('tr');

        // Use textContent for safety against XSS
        const tdDate = document.createElement('td');
        tdDate.textContent = row['売上確定日'];

        const tdService = document.createElement('td');
        tdService.textContent = row.serviceName;

        const tdCustomer = document.createElement('td');
        tdCustomer.textContent = row.customerName;

        const tdBreakdown = document.createElement('td');
        tdBreakdown.textContent = row.breakdown;

        const tdAmount = document.createElement('td');
        tdAmount.textContent = `¥${row.amount.toLocaleString()}`;

        tr.appendChild(tdDate);
        tr.appendChild(tdService);
        tr.appendChild(tdCustomer);
        tr.appendChild(tdBreakdown);
        tr.appendChild(tdAmount);

        tbody.appendChild(tr);
    });
}
