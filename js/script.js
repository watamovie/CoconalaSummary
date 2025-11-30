// Global state
let allData = [];
let monthlyChartInstance = null;
let serviceChartInstance = null;
let customerChartInstance = null;
let breakdownChartInstance = null;
let dayOfWeekChartInstance = null;

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

// Export Buttons
document.getElementById('btnExportCsv').addEventListener('click', () => exportData('original'));
document.getElementById('btnExportYayoi').addEventListener('click', () => exportData('yayoi'));
document.getElementById('btnExportFreee').addEventListener('click', () => exportData('freee'));

// Drag and Drop Logic
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('csvFileInput');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('bg-secondary', 'text-white'); // Highlight style
    dropZone.classList.remove('bg-light');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-secondary', 'text-white');
    dropZone.classList.add('bg-light');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-secondary', 'text-white');
    dropZone.classList.add('bg-light');

    if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        // Manually trigger handleFileUpload since 'change' won't fire on input element
        parseFile(file);
    }
});

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) parseFile(file);
}

function parseFile(file) {
    // Show filename
    const p = dropZone.querySelector('p.small');
    if (p) p.textContent = `選択中: ${file.name}`;

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
    document.getElementById('exportSection').style.display = 'block';
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

    // Day of Week Data
    const dayOfWeekData = new Array(7).fill(0); // 0=Sun, 6=Sat
    filteredData.forEach(row => {
        const dayIndex = row.date.getDay();
        dayOfWeekData[dayIndex] += row.amount;
    });

    renderCharts(trendData, serviceData, customerData, breakdownData, dayOfWeekData, serviceTopN, customerTopN, aggregation);
    renderTable(filteredData);
}

function renderCharts(trendData, serviceData, customerData, breakdownData, dayOfWeekData, serviceLimit, customerLimit, aggregationType) {
    const sortObj = (obj) => Object.entries(obj).sort(([,a], [,b]) => b - a);

    // Trend Chart
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

    // Day of Week Chart
    const ctxDay = document.getElementById('dayOfWeekChart').getContext('2d');
    if (dayOfWeekChartInstance) dayOfWeekChartInstance.destroy();
    dayOfWeekChartInstance = new Chart(ctxDay, {
        type: 'bar',
        data: {
            labels: ['日', '月', '火', '水', '木', '金', '土'],
            datasets: [{
                label: '売上金額',
                data: dayOfWeekData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)', // Sun
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)'  // Sat
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
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

// --- Export Functions ---

function exportData(format) {
    const data = getFilteredData();
    if (data.length === 0) {
        alert("出力するデータがありません。");
        return;
    }

    let content = "";
    let filename = "";

    if (format === 'original') {
        const header = ['売上確定日', 'サービス名', '購入者名', '内訳', '売上金額'];
        const rows = data.map(row => {
            const dateStr = `${row.date.getFullYear()}/${String(row.date.getMonth() + 1).padStart(2, '0')}/${String(row.date.getDate()).padStart(2, '0')}`;
            return [
                dateStr,
                row.serviceName,
                row.customerName,
                row.breakdown,
                row.amount
            ];
        });

        content = Papa.unparse({ fields: header, data: rows });
        filename = "sales_data_filtered.csv";

    } else if (format === 'yayoi') {
        // Yayoi Import Format

        const rows = data.map(row => {
            const dateStr = `${row.date.getFullYear()}/${String(row.date.getMonth() + 1).padStart(2, '0')}/${String(row.date.getDate()).padStart(2, '0')}`;
            const desc = `${row.serviceName} (${row.customerName})`;
            const amount = row.amount;

            return [
                2000,           // 1: Flag
                "",             // 2: SlipNo
                "",             // 3: Settlement
                dateStr,        // 4: Date
                "売掛金",       // 5: Debit Account
                "",             // 6: Debit Sub
                "",             // 7: Debit Dept
                "",             // 8: Debit Tax Class
                amount,         // 9: Debit Amount
                "",             // 10: Debit Tax Amount
                "売上高",       // 11: Credit Account
                "",             // 12: Credit Sub
                "",             // 13: Credit Dept
                "",             // 14: Credit Tax Class
                amount,         // 15: Credit Amount
                "",             // 16: Credit Tax Amount
                desc            // 17: Description
            ];
        });

        content = Papa.unparse(rows, { quotes: true, quoteChar: '"' });
        filename = "yayoi_import.csv";

    } else if (format === 'freee') {
        // Freee Import Format

        const header = ["発生日", "借方勘定科目", "借方金額", "貸方勘定科目", "貸方金額", "摘要"];
        const rows = data.map(row => {
            const dateStr = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}`; // Freee often likes YYYY-MM-DD
            const desc = `${row.serviceName} / ${row.customerName}`;

            return [
                dateStr,
                "売掛金",
                row.amount,
                "売上高",
                row.amount,
                desc
            ];
        });

        content = Papa.unparse({ fields: header, data: rows });
        filename = "freee_import.csv";
    }

    downloadCSV(content, filename);
}

function downloadCSV(csvString, filename) {
    // Convert string to code array
    const unicodeArray = [];
    for (let i = 0; i < csvString.length; i++) {
        unicodeArray.push(csvString.charCodeAt(i));
    }

    // Convert to Shift-JIS
    // Using encoding.js
    const sjisArray = Encoding.convert(unicodeArray, {
        to: 'SJIS',
        from: 'UNICODE'
    });

    // Create Blob
    const blob = new Blob([new Uint8Array(sjisArray)], { type: 'text/csv;charset=Shift-JIS' });

    // Create Link and Click
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
