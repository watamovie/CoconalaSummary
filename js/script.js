// Global state
let allData = [];
let monthlyChartInstance = null;
let serviceChartInstance = null;
let customerChartInstance = null;
let breakdownChartInstance = null;

// Event Listeners
document.getElementById('csvFileInput').addEventListener('change', handleFileUpload);
document.getElementById('filterStartDate').addEventListener('change', updateDashboard);
document.getElementById('filterEndDate').addEventListener('change', updateDashboard);
document.getElementById('filterService').addEventListener('change', updateDashboard);
document.getElementById('filterBreakdown').addEventListener('change', updateDashboard);
document.getElementById('resetFilters').addEventListener('click', resetFilters);
document.getElementById('chartAggregation').addEventListener('change', updateDashboard);
document.getElementById('serviceTopN').addEventListener('change', updateDashboard);
document.getElementById('customerTopN').addEventListener('change', updateDashboard);

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        encoding: "Shift-JIS",
        skipEmptyLines: true,
        complete: function(results) {
            console.log("Parsed Results:", results);
            if (results.errors.length > 0) {
                console.warn("Errors:", results.errors);
            }
            initDashboard(results.data);
        },
        error: function(err) {
            console.error("Error:", err);
            alert("ファイルの読み込みに失敗しました。");
        }
    });
}

function initDashboard(data) {
    // Basic validations and type conversions
    allData = data.filter(row => row['売上金額'] && row['売上確定日']).map(row => {
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

    if (allData.length === 0) {
        alert("有効なデータが見つかりませんでした。");
        return;
    }

    // Sort by date ascending
    allData.sort((a, b) => a.date - b.date);

    // Initialize Filters
    populateFilters(allData);

    // Show Dashboard UI
    document.getElementById('filterSection').style.display = 'block';
    document.getElementById('dashboard').style.display = 'block';

    // Initial Render
    updateDashboard();
}

function populateFilters(data) {
    const services = new Set();
    const breakdowns = new Set();
    let minDate = data[0].date;
    let maxDate = data[data.length - 1].date;

    data.forEach(row => {
        services.add(row.serviceName);
        breakdowns.add(row.breakdown);
        if (row.date < minDate) minDate = row.date;
        if (row.date > maxDate) maxDate = row.date;
    });

    // Populate Service Select
    const serviceSelect = document.getElementById('filterService');
    serviceSelect.innerHTML = '<option value="">すべて</option>';
    Array.from(services).sort().forEach(s => {
        const option = document.createElement('option');
        option.value = s;
        option.textContent = s;
        serviceSelect.appendChild(option);
    });

    // Populate Breakdown Select
    const breakdownSelect = document.getElementById('filterBreakdown');
    breakdownSelect.innerHTML = '<option value="">すべて</option>';
    Array.from(breakdowns).sort().forEach(b => {
        const option = document.createElement('option');
        option.value = b;
        option.textContent = b;
        breakdownSelect.appendChild(option);
    });

    // Set Date Inputs (default to full range)
    // Format to YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];
    // document.getElementById('filterStartDate').value = formatDate(minDate);
    // document.getElementById('filterEndDate').value = formatDate(maxDate);
    // Let's leave them empty to imply "All Time", but maybe better to fill them?
    // Usually leaving empty is fine, implying no filter.
}

function resetFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('filterService').value = '';
    document.getElementById('filterBreakdown').value = '';
    updateDashboard();
}

function getFilteredData() {
    const startDateVal = document.getElementById('filterStartDate').value;
    const endDateVal = document.getElementById('filterEndDate').value;
    const serviceVal = document.getElementById('filterService').value;
    const breakdownVal = document.getElementById('filterBreakdown').value;

    let startDate = null;
    if (startDateVal) {
        const parts = startDateVal.split('-');
        startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    let endDate = null;
    if (endDateVal) {
        const parts = endDateVal.split('-');
        endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        endDate.setHours(23, 59, 59, 999);
    }

    return allData.filter(row => {
        if (startDate && row.date < startDate) return false;
        if (endDate && row.date > endDate) return false;
        if (serviceVal && row.serviceName !== serviceVal) return false;
        if (breakdownVal && row.breakdown !== breakdownVal) return false;
        return true;
    });
}

function updateDashboard() {
    const filteredData = getFilteredData();

    // 1. Summary Stats
    const totalRevenue = filteredData.reduce((sum, row) => sum + row.amount, 0);
    const totalTransactions = filteredData.length;
    const avgPrice = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    document.getElementById('totalRevenue').textContent = `¥${totalRevenue.toLocaleString()}`;
    document.getElementById('totalTransactions').textContent = totalTransactions.toLocaleString();
    document.getElementById('averagePrice').textContent = `¥${avgPrice.toLocaleString()}`;
    document.getElementById('filteredCount').textContent = totalTransactions.toLocaleString();


    // Prepare data for charts
    const aggregation = document.getElementById('chartAggregation').value; // month or day
    const serviceTopN = parseInt(document.getElementById('serviceTopN').value);
    const customerTopN = parseInt(document.getElementById('customerTopN').value);


    // Trend Data
    const trendData = {};
    filteredData.forEach(row => {
        let key;
        if (aggregation === 'month') {
             key = `${row.date.getFullYear()}/${String(row.date.getMonth() + 1).padStart(2, '0')}`;
        } else {
             key = `${row.date.getFullYear()}/${String(row.date.getMonth() + 1).padStart(2, '0')}/${String(row.date.getDate()).padStart(2, '0')}`;
        }
        trendData[key] = (trendData[key] || 0) + row.amount;
    });

    // Service Data
    const serviceData = {};
    filteredData.forEach(row => {
        serviceData[row.serviceName] = (serviceData[row.serviceName] || 0) + row.amount;
    });

    // Customer Data
    const customerData = {};
    filteredData.forEach(row => {
        customerData[row.customerName] = (customerData[row.customerName] || 0) + row.amount;
    });

    // Breakdown Data
    const breakdownData = {};
    filteredData.forEach(row => {
        breakdownData[row.breakdown] = (breakdownData[row.breakdown] || 0) + row.amount;
    });

    renderCharts(trendData, serviceData, customerData, breakdownData, serviceTopN, customerTopN, aggregation);
    renderTable(filteredData);
}

function renderCharts(trendData, serviceData, customerData, breakdownData, serviceLimit, customerLimit, aggregationType) {
    const sortObj = (obj) => Object.entries(obj).sort(([,a], [,b]) => b - a);

    // Trend Chart
    // Sort keys chronologically
    const sortedKeys = Object.keys(trendData).sort();
    const trendLabels = sortedKeys;
    const trendValues = sortedKeys.map(k => trendData[k]);

    const ctxMonthly = document.getElementById('monthlySalesChart').getContext('2d');
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(ctxMonthly, {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [{
                label: '売上金額',
                data: trendValues,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: aggregationType === 'month' ? '年月' : '年月日'
                    }
                }
            }
        }
    });

    // Service Chart
    const sortedServices = sortObj(serviceData).slice(0, serviceLimit);
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
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Customer Chart
    const sortedCustomers = sortObj(customerData).slice(0, customerLimit);
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
            responsive: true,
            maintainAspectRatio: false
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
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(201, 203, 207, 0.6)'
                ]
            }]
        },
        options: { responsive: true }
    });
}

function renderTable(data) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    // Show top 100 of filtered data
    data.slice(0, 100).forEach(row => {
        const tr = document.createElement('tr');

        // Helper to format date
        const dateStr = `${row.date.getFullYear()}/${String(row.date.getMonth() + 1).padStart(2, '0')}/${String(row.date.getDate()).padStart(2, '0')}`;

        const tdDate = document.createElement('td');
        tdDate.textContent = dateStr;

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
