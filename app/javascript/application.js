// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
(function() {
    console.log("🔄 Página recarregada! Monitorando funções...");
})();

const tableBody = document.getElementById('data-table-body');
const months = []; // Será preenchido dinamicamente
let chartDataCache = []; // Cache dos dados do gráfico
let originalData = [];
let isProcessing = false; // Variável para controlar múltiplos processamentos
let totalRowsPrimary = 0; // Total de linhas na tabela principal
let totalRowsAuxiliary = 0; // Total de linhas nas tabelas auxiliares
let totalRowsProcessed = 0; // Linhas processadas no total
let originalChartData = []; // Armazena os valores originais do gráfico antes das edições

// Função para salvar os dados no Local Storage
function saveToLocalStorage(data, periods) {
    localStorage.setItem('tableData', JSON.stringify(data));
    localStorage.setItem('tablePeriods', JSON.stringify(periods));
}

async function saveToBackend() {
    const tableData = JSON.parse(localStorage.getItem('tableData') || '[]');
    const originalTableData = JSON.parse(localStorage.getItem('originalTableData') || '[]');
    const tablePeriods = JSON.parse(localStorage.getItem('tablePeriods') || '[]'); // 🔹 Adicionado

    try {
        const response = await fetch(`${backendUrl}/save-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableData, originalTableData, tablePeriods }) // 🔹 Incluindo os períodos
        });

        const result = await response.json();
        console.log("✅ Dados salvos no backend:", result.message);
    } catch (error) {
        console.error("❌ Erro ao salvar dados no backend:", error);
    }
}

function loadFromLocalStorage() {
    console.log("🔄 Carregando dados do localStorage...");

    const storedData = JSON.parse(localStorage.getItem('tableData') || '[]');
    const storedOriginalData = JSON.parse(localStorage.getItem('originalTableData') || '[]');
    const storedPeriods = JSON.parse(localStorage.getItem('tablePeriods') || '[]'); // 🔹 Adicionado

    if (storedData.length > 0 && storedPeriods.length > 0) {
        console.log("📌 Dados carregados do localStorage.");

        months.length = 0;
        months.push(...storedPeriods); // 🔹 Atualiza os períodos

        updateTable(storedData, storedPeriods);
        createBackupAndDifferenceTables(storedOriginalData, storedPeriods);
        filterData();
    } else {
        console.warn("⚠️ Nenhum dado encontrado no localStorage.");
    }
}

async function loadFromBackend() {
    try {
        const response = await fetch(`${backendUrl}//load-data`);
        const result = await response.json();

        if (result.tableData && result.originalTableData && result.tablePeriods) {
            console.log("📥 Dados carregados do backend!");

            // Salva os dados localmente como um fallback
            localStorage.setItem('tableData', JSON.stringify(result.tableData));
            localStorage.setItem('originalTableData', JSON.stringify(result.originalTableData));
            localStorage.setItem('tablePeriods', JSON.stringify(result.tablePeriods)); // 🔹 Salva os períodos também

            // Atualiza a UI com os dados carregados
            months.length = 0;
            months.push(...result.tablePeriods); // 🔹 Atualiza os meses globais

            updateTable(result.tableData, result.tablePeriods);
            createBackupAndDifferenceTables(result.originalTableData, result.tablePeriods);
            hideLoadingPopup();
            return;
        }
    } catch (error) {
        console.error("❌ Erro ao carregar do backend. Tentando localStorage...");
    }
    // Se o backend falhar, usa localStorage como fallback
    loadFromLocalStorage();
}

document.addEventListener('DOMContentLoaded', async () => {
    showLoadingPopup();
    await loadFromBackend();
    hideLoadingPopup();
});


function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${backendUrl}//upload`, {
        method: 'POST',
        body: formData,
    })
        .then(response => response.text())
        .then(data => {
        })
        .catch(error => console.error('Error uploading file:', error));
}

async function uploadFile(event) {
    if (!confirm("Are you sure you want to upload a new template? This will overwrite your current data.")) {
        return; // Cancela a operação se o usuário não confirmar
    }

    const file = event.target.files[0];
    if (!file) return;

    console.time('Tempo Upload Total'); // Inicia o timer
    showLoadingPopup();

    try {
        const formData = new FormData();
        formData.append('file', file);

        // Envia o arquivo CSV para o backend
        const response = await fetch(`${backendUrl}/upload`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        const data = result.data;

        // Extrai os períodos dinamicamente
        const periods = Object.keys(data[0]).filter(key => key.match(/\d{4}-\d{2}/));

        // Atualiza os meses globais
        months.length = 0;
        months.push(...periods);

        // Atualiza a tabela principal
        updateTable(data, periods);

        // Salva os dados no localStorage
        localStorage.setItem('tableData', JSON.stringify(data));
        localStorage.setItem('originalTableData', JSON.stringify(data));
        localStorage.setItem('tablePeriods', JSON.stringify(periods));

        // 🔹 Agora também salva os dados no backend para atualizar `dataStorage.tableData`
        await saveToBackend();

        // Atualiza as tabelas de backup e diferenças
        await createBackupAndDifferenceTables(data, periods);

        // Preenche os dropdowns de filtro
        updateFilterOptions();

        console.timeEnd('Tempo Upload Total'); // Finaliza o timer
    } catch (error) {
        console.error('❌ Erro ao enviar arquivo:', error);
        alert('Erro ao enviar o arquivo.');
    }
}

function updateTable(data, periods) {
    console.log("📌 Periods recebidos na função updateTable:", periods);
    console.log("📌 Primeira linha dos dados recebidos:", data[0]);

    // Atualiza os cabeçalhos da tabela
    updateTableHeaders(periods);

    // Limpa o corpo da tabela existente
    tableBody.innerHTML = '';

    // Adiciona novas linhas à tabela
    data.forEach(row => {
        const tr = document.createElement('tr');

        // Adiciona as colunas fixas
        const tdProduct = document.createElement('td');
        tdProduct.textContent = row['Product'];
        tdProduct.classList.add('sticky');
        tdProduct.setAttribute('data-tooltip', row['Product']);
        tr.appendChild(tdProduct);

        const tdSub = document.createElement('td');
        tdSub.textContent = row['Sub-Category'];
        tdSub.classList.add('sticky');
        tdSub.setAttribute('data-tooltip', row['Sub-Category']);
        tr.appendChild(tdSub);

        const tdCat = document.createElement('td');
        tdCat.textContent = row['Category'];
        tdCat.classList.add('sticky');
        tdCat.setAttribute('data-tooltip', row['Category']);
        tr.appendChild(tdCat);

        // Adiciona os períodos dinamicamente
        periods.forEach(period => {
            const td = document.createElement('td');
            td.textContent = row[period] || '0';
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
    updateFiltersAfterDataLoad(data);
}

async function createBackupAndDifferenceTables(data, periods) {
    const originalTableHead = document.getElementById('original-table-headers');
    const differenceTableHead = document.getElementById('difference-table-headers');
    const originalTableBody = document.getElementById('original-table-body');
    const differenceTableBody = document.getElementById('difference-table-body');

    // Limpa os cabeçalhos e corpos das tabelas secundárias
    originalTableHead.innerHTML = '';
    differenceTableHead.innerHTML = '';
    originalTableBody.innerHTML = '';
    differenceTableBody.innerHTML = '';

    // Cria os cabeçalhos (iguais à tabela principal)
    const headersRow = document.createElement('tr');
    ['Product', 'Sub-Category', 'Category', ...periods].forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header;

        // Aplica a classe 'sticky' nas 3 primeiras colunas
        if (index < 3) {
            th.classList.add('sticky');
        }

        headersRow.appendChild(th);
    });
    originalTableHead.appendChild(headersRow.cloneNode(true));
    differenceTableHead.appendChild(headersRow.cloneNode(true));


    if (isProcessing) {
        console.warn('Processamento já em andamento. Ignorando nova execução.');
        return;
    }

    isProcessing = true;

    try {
        // 🔹 Chamada ao backend para calcular backup e diferenças
        const response = await fetch(`${backendUrl}/create-backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, periods }),
        });

        const { backupTable, differenceTable } = await response.json();

        // 🔹 Arredondar todos os valores antes de salvar
        const roundedBackupTable = backupTable.map(row => {
            let newRow = { ...row };
            periods.forEach(period => {
                if (newRow[period] !== undefined) {
                    newRow[period] = Math.round(parseFormattedNumber(newRow[period]) || 0);
                }
            });
            return newRow;
        });

        // 🔹 Salvar backup arredondado no localStorage
        localStorage.setItem('originalTableData', JSON.stringify(roundedBackupTable));

        //console.log("🔍 Dados recebidos da tabela de diferenças (frontend):", JSON.stringify(differenceTable.slice(0, 5), null, 2));

        // 🔍 Log apenas da coluna "Sub-Category"
        //console.log("🔍 Sub-Category da tabela de diferenças:", differenceTable.map(row => row["Sub-Category"] || row["SubCategory"]));

        // 🔹 Garantindo que a tabela seja renderizada corretamente
        originalTableBody.innerHTML = '';
        differenceTableBody.innerHTML = '';

        roundedBackupTable.forEach((row, index) => {
            const originalRow = document.createElement('tr');
            const differenceRow = document.createElement('tr');

            // 🔹 Adiciona as colunas fixas (Product, Sub-Category, Category)
            ['Product', 'Sub-Category', 'Category'].forEach((key, colIndex) => {
                const tdOriginal = document.createElement('td');
                const tdDifference = document.createElement('td');

                tdOriginal.textContent = row[key];
                tdDifference.textContent = differenceTable[index][key];

                // 🔹 Mantendo formatação e colunas fixas
                tdOriginal.classList.add('sticky');
                tdDifference.classList.add('sticky');
                tdOriginal.style.left = `${colIndex * 100}px`;
                tdDifference.style.left = `${colIndex * 100}px`;

                originalRow.appendChild(tdOriginal);
                differenceRow.appendChild(tdDifference);
            });

            // 🔹 Adiciona os valores dos períodos
            periods.forEach((period) => {
                const tdOriginal = document.createElement('td');
                const tdDifference = document.createElement('td');

                tdOriginal.textContent = row[period] || '0';
                tdDifference.textContent = differenceTable[index][period] || '0';

                originalRow.appendChild(tdOriginal);
                differenceRow.appendChild(tdDifference);
            });

            originalTableBody.appendChild(originalRow);
            differenceTableBody.appendChild(differenceRow);
        });

        // 🔹 Atualiza os totais após carregar a tabela
        updateTotals();
        updateFilterOptions();
        saveTableData();
        isProcessing = false;
        alert("Upload concluído com sucesso!");
        hideLoadingPopup();
        // 🔹 Atualiza o gráfico após o processamento
        filterData();
    } catch (error) {
        console.error('Erro ao buscar tabelas do backend:', error);
        alert('Erro ao carregar tabelas do servidor.');
    }
}

// Lógica para calcular e atualizar os totalizadores
function updateTotals() {
    const tableRows = Array.from(document.querySelectorAll('#data-table-body tr'));

// Calcula os totais gerais (sem filtro por categoria)
    const totalGeral = [0, 0, 0];
    tableRows.forEach(row => {
        for (let i = 0; i < 12; i++) totalGeral[0] += parseFormattedNumber(row.cells[i + 3]?.textContent || '0');
        for (let i = 12; i < 24; i++) totalGeral[1] += parseFormattedNumber(row.cells[i + 3]?.textContent || '0');
        for (let i = 24; i < 36; i++) totalGeral[2] += parseFormattedNumber(row.cells[i + 3]?.textContent || '0');
    });

// 🔹 Atualiza os valores na interface com o total geral
    document.querySelector('#total-motors-2024 span').textContent = Math.round(totalGeral[0]).toLocaleString();
    document.querySelector('#total-motors-2025 span').textContent = Math.round(totalGeral[1]).toLocaleString();
    document.querySelector('#total-motors-2026 span').textContent = Math.round(totalGeral[2]).toLocaleString();


    // Filtra as linhas para o filtro selecionado
    const filterValue = document.querySelector('#filter-select').value;
    const level = document.querySelector('input[name="level"]:checked').value;
    const filteredRows = filterValue === 'total' ? tableRows : tableRows.filter(row => {
        const levelValue = level === 'product' ? row.cells[0]?.textContent.trim()
            : level === 'subcategory' ? row.cells[1]?.textContent.trim()
                : row.cells[2]?.textContent.trim();
        return levelValue === filterValue;
    });

    // Calcula os totais para o filtro selecionado
    const selectedTotals = [0, 0, 0];
    filteredRows.forEach(row => {
        for (let i = 0; i < 12; i++) selectedTotals[0] += parseFormattedNumber(row.cells[i + 3]?.textContent || '0');
        for (let i = 12; i < 24; i++) selectedTotals[1] += parseFormattedNumber(row.cells[i + 3]?.textContent || '0');
        for (let i = 24; i < 36; i++) selectedTotals[2] += parseFormattedNumber(row.cells[i + 3]?.textContent || '0');
    });

    // 🔹 Atualiza os totais do filtro selecionado, arredondando corretamente
    document.querySelector('#total-2024 span').textContent = Math.round(selectedTotals[0]).toLocaleString();
    document.querySelector('#total-2025 span').textContent = Math.round(selectedTotals[1]).toLocaleString();
    document.querySelector('#total-2026 span').textContent = Math.round(selectedTotals[2]).toLocaleString();

}

function populateTable(data) {
    const tableBody = document.getElementById('data-table-body');
    tableBody.innerHTML = ''; // Limpa a tabela

    data.forEach(row => {
        const tr = document.createElement('tr');

        // Adiciona as colunas fixas: Product, Sub-Category, Category
        ['Product', 'Sub-Category', 'Category'].forEach(key => {
            const td = document.createElement('td');
            td.textContent = row[key] || '';
            tr.appendChild(td);
        });

        // Adiciona os valores para os meses
        Object.keys(row).forEach(key => {
            if (!['Product', 'Sub-Category', 'Category'].includes(key)) {
                const td = document.createElement('td');
                td.textContent = row[key] || '0';
                tr.appendChild(td);
            }
        });

        tableBody.appendChild(tr);
    });
}

function updateDifferenceTable() {
    const differenceTableBody = document.getElementById('difference-table-body');
    differenceTableBody.innerHTML = ''; // Limpa a tabela de diferenças

    const originalData = JSON.parse(localStorage.getItem('originalTableData')) || [];
    const tableRows = Array.from(document.querySelectorAll('#data-table-body tr'));
    const periods = JSON.parse(localStorage.getItem('tablePeriods')) || [];

    if (originalData.length === 0 || tableRows.length === 0) {
        console.warn("⚠️ Dados originais ou tabela vazia. Não foi possível atualizar a tabela de diferenças.");
        return;
    }

    originalData.forEach((originalRow, rowIndex) => {
        const differenceRow = document.createElement('tr');

        // Adiciona as colunas fixas
        ['Product', 'Sub-Category', 'Category'].forEach((key, index) => {
            const tdDifference = document.createElement('td');
            tdDifference.textContent = originalRow[key];
            tdDifference.classList.add('sticky');
            differenceRow.appendChild(tdDifference);
        });

        // Calcula e preenche as diferenças para cada período
        periods.forEach((period, periodIndex) => {
            const originalValue = parseFloat(originalRow[period]?.replace(/,/g, '') || 0);

            // 🛠️ Pegamos a linha equivalente da tabela atual
            const currentRow = tableRows[rowIndex];
            const modifiedValue = currentRow
                ? parseFloat(currentRow.cells[periodIndex + 3]?.textContent.replace(/,/g, '') || 0)
                : 0;

            const difference = modifiedValue - originalValue;

            const tdDifference = document.createElement('td');
            tdDifference.textContent = parseFormattedNumber(difference).toFixed(2);
            tdDifference.style.color = difference !== 0 ? 'red' : 'black'; // 🔹 Destaca diferenças
            differenceRow.appendChild(tdDifference);
        });

        differenceTableBody.appendChild(differenceRow);
    });

    console.log("✅ Tabela de diferenças atualizada.");
    filterData();
}

function convertNumberFormat(data, format) {
    return data.map(row => {
        const convertedRow = { ...row };

        for (const key in row) {
            if (row.hasOwnProperty(key) && key !== 'Product' && key !== 'Sub-Category' && key !== 'Category') {
                let value = row[key];

                if (format === 'us') {
                    value = value.replace(/,/g, '');
                } else if (format === 'eu') {
                    value = value.replace(/\./g, '').replace(/,/g, '.');
                }

                // Converte para número
                convertedRow[key] = isNaN(value) ? value : parseFloat(value);
            }
        }

        return convertedRow;
    });
}

function updateTableHeaders(periods) {
    console.log("📌 Cabeçalhos da tabela sendo criados para os períodos:", periods);
    const tableHead = document.querySelector('.data-table thead');
    tableHead.innerHTML = '';

    const trHead = document.createElement('tr');

    // Adiciona cabeçalhos fixos
    ['Product', 'Sub-Category', 'Category'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.classList.add('sticky');
        trHead.appendChild(th);
    });

    // Adiciona cabeçalhos dinâmicos (períodos)
    periods.forEach(period => {
        const th = document.createElement('th');
        th.textContent = period;
        trHead.appendChild(th);
    });

    tableHead.appendChild(trHead);
}

function updateFilterOptions() {
    // Obtenha o nível selecionado
    const level = document.querySelector('input[name="level"]:checked').value;

    // Obtenha os dados carregados
    const tableData = JSON.parse(localStorage.getItem('tableData') || '[]');

    if (tableData.length === 0) {
        console.warn("Nenhum dado disponível para atualizar os filtros.");
        return; // Se não há dados, não atualiza
    }

    // Limpa e atualiza o filtro "Filter by"
    const filterSelect = document.getElementById('filter-select');
    filterSelect.innerHTML = '<option value="total">Total</option>'; // Sempre começa com "Total"

    // Determina as opções com base no nível selecionado
    const options = level === 'product'
        ? [...new Set(tableData.map(row => row['Product']))]
        : level === 'subcategory'
            ? [...new Set(tableData.map(row => row['Sub-Category']))]
            : [...new Set(tableData.map(row => row['Category']))];

    // Adiciona as opções ao filtro
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        filterSelect.appendChild(opt);
    });

    //console.log('Filtros atualizados:', filterSelect.innerHTML);

}

function searchFilterOptions() {
    const searchValue = document.getElementById('filter-search').value.toLowerCase();
    const filterSelect = document.getElementById('filter-select');

    Array.from(filterSelect.options).forEach(option => {
        if (option.textContent.toLowerCase().includes(searchValue)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    });
}

function updateChartColors() {
    let greenPeriods = parseInt(document.getElementById("green-periods").value) || 0;
    let bluePeriods = parseInt(document.getElementById("blue-periods").value) || 0;
    let redPeriods = parseInt(document.getElementById("red-periods").value) || 0;

    // Garante que a soma não ultrapasse 36 períodos
    let totalPeriods = greenPeriods + bluePeriods + redPeriods;
    if (totalPeriods > 36) {
        alert("A soma dos períodos não pode ultrapassar 36!");
        return;
    }

    // Salva a configuração no localStorage
    localStorage.setItem('chartColors', JSON.stringify({ greenPeriods, bluePeriods, redPeriods }));

    createChart(greenPeriods, bluePeriods, redPeriods);
}

async function createChart(greenPeriods, bluePeriods, redPeriods, backupChartData) {
    localStorage.setItem('chartDataCache', JSON.stringify(chartDataCache));

    const ctx = document.getElementById('forecast-chart').getContext('2d');

    if (window.forecastChart) {
        window.forecastChart.destroy();
    }

    // Verifica se o modo escuro está ativado
    const isDarkMode = document.body.classList.contains("dark-mode");

    // Recupera os dados de backup (tabela original)
    const originalData = JSON.parse(localStorage.getItem('originalTableData') || '[]');

    // Define as cores com base nas seleções do usuário
    let colors = [];
    for (let i = 0; i < 36; i++) {
        if (i < greenPeriods) colors.push("green");
        else if (i < greenPeriods + bluePeriods) colors.push("blue");
        else colors.push("red");
    }

    window.forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Actual & Forecast',
                    data: chartDataCache,
                    borderColor: colors,
                    segment: {
                        borderColor: ctx => colors[ctx.p1DataIndex]
                    },
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Original Backup',
                    data: backupChartData,
                    borderColor: 'gray',
                    borderWidth: 2,
                    borderDash: [5, 5], // Linha pontilhada
                    fill: false,
                    pointRadius: 0, // Remove os pontos da linha
                    datalabels: {
                        display: false // Desativa os rótulos de dados para a linha backup
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 50,
                    bottom: 30
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 15,
                        font: {
                            size: 12
                        },
                        color: isDarkMode ? "#ffffff" : "#000000" // Altera a cor da legenda no modo escuro
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? "#333" : "#ffffff",
                    titleColor: isDarkMode ? "#ffffff" : "#000000",
                    bodyColor: isDarkMode ? "#ffffff" : "#000000",
                    borderColor: isDarkMode ? "#666" : "#ddd",
                    borderWidth: 1
                },
                datalabels: {
                    color: isDarkMode ? "#ffffff" : "#000000", // Muda a cor dos rótulos de dados no modo escuro
                    anchor: 'end',
                    align: 'top',
                    formatter: function (value) {
                        return Math.round(value).toLocaleString();
                    },
                    font: {
                        size: 9,
                        weight: 'bold'
                    },
                    rotation: -60
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Period', color: isDarkMode ? "#ffffff" : "#000000" },
                ticks: {
                    maxRotation: 60,
                    minRotation: 30,
                    color: isDarkMode ? "#ffffff" : "#000000" // Cor do eixo X no modo escuro
                },
                grid: {
                    color: isDarkMode ? "#444" : "#ddd" // Linhas da grade em cinza claro no modo escuro
                }
            },
            y: {
                title: { display: true, text: 'Volume', color: isDarkMode ? "#ffffff" : "#000000" },
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return Math.round(value).toLocaleString();
                    },
                    color: isDarkMode ? "#ffffff" : "#000000" // Cor do eixo Y no modo escuro
                },
                grid: {
                    color: isDarkMode ? "#444" : "#ddd" // Linhas da grade em cinza claro no modo escuro
                }
            }
        },
        plugins: [ChartDataLabels]
    });
    // 🔥 FORÇA a atualização do gráfico após a criação para remover o grid
    setTimeout(() => {
        window.forecastChart.options.scales.x.grid.display = false;
        window.forecastChart.options.scales.y.grid.display = false;
        window.forecastChart.update();
        console.log("✅ Grid removido após atualização.");
    }, 300);
    updateChartWithAverages();
    await loadActuals(); // 🔹 Adicionamos essa chamada para carregar os actuals!
}

// 🔹 Carrega as cores salvas ao iniciar a página
document.addEventListener("DOMContentLoaded", () => {
    const storedColors = JSON.parse(localStorage.getItem('chartColors'));

    if (storedColors) {
        document.getElementById("green-periods").value = storedColors.greenPeriods;
        document.getElementById("blue-periods").value = storedColors.bluePeriods;
        document.getElementById("red-periods").value = storedColors.redPeriods;

        createChart(storedColors.greenPeriods, storedColors.bluePeriods, storedColors.redPeriods);
    } else {
        createChart(12, 12, 12); // Valores padrão caso não tenha nada salvo
    }
});

async function clearData() {
    if (!confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
        return; // Cancela a operação se o usuário não confirmar
    }
    console.log("🚨 clearData foi chamado. Verifique a origem desta chamada.");
    // Limpa os dados do Local Storage
    showLoadingPopup();
    localStorage.removeItem('chartColors'); // Remove as cores salvas
    localStorage.removeItem('tableData');
    localStorage.removeItem('tablePeriods');
    localStorage.removeItem('originalTableData');
    localStorage.removeItem('selected3M');
    localStorage.removeItem('selected6M');

    // 🔹 Limpa os dados no backend
    try {
        const response = await fetch(`${backendUrl}/clear-data`, {
            method: 'POST'
        });

        const result = await response.json();
        console.log("✅ Backend limpo:", result.message);
    } catch (error) {
        console.error("❌ Erro ao limpar dados do backend:", error);
    }

    // Limpa a tabela e o gráfico
    if (tableBody) tableBody.innerHTML = '';
    const tableHead = document.querySelector('.data-table thead');
    if (tableHead) tableHead.innerHTML = '';

    if (window.forecastChart) {
        try {
            window.forecastChart.destroy(); // Remove o gráfico com segurança
        } catch (error) {
            console.error("Erro ao destruir o gráfico:", error);
        }
        window.forecastChart = null;
    }

    // 🔥 Resetar os filtros de período
    document.querySelectorAll("#dropdown-content-3m input, #dropdown-content-6m input").forEach(input => {
        input.checked = false;
    });

    // 🔥 Resetar os filtros de período **removendo todos os meses carregados**
    document.getElementById("dropdown-content-3m").innerHTML = "";
    document.getElementById("dropdown-content-6m").innerHTML = "";

    // Reinicia variáveis globais
    months.length = 0;
    chartDataCache = [];

    // Reinicia os filtros
    const filterSelect = document.getElementById('filter-select');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="total">Total</option>';
    }

    // Reseta o nível de filtro para "Product"
    const productFilter = document.querySelector('input[value="product"]');
    if (productFilter) productFilter.checked = true;

    // Verifica e recria o input de upload
    let uploadTemplate = document.getElementById('upload-template'); // Atualizado para o ID correto
    if (uploadTemplate) {
        uploadTemplate.value = ''; // Limpa o valor do input
        const newUpload = uploadTemplate.cloneNode(true); // Cria um clone do input
        uploadTemplate.parentNode.replaceChild(newUpload, uploadTemplate); // Substitui o input antigo
        newUpload.addEventListener('change', handleUpload); // Reinstala o evento de upload
    } else {
        console.error("Elemento 'upload-template' não encontrado no DOM. Certifique-se de que ele existe no HTML.");
        return; // Sai da função para evitar outros erros
    }

    // Mensagem de sucesso
    alert("Os dados foram limpos. Você pode fazer o upload de uma nova base.");
    clearTotals()

    document.getElementById('data-table-body').innerHTML = '';
    document.getElementById('original-table-body').innerHTML = '';
    document.getElementById('difference-table-body').innerHTML = '';
    document.getElementById('green-periods').value = 12;
    document.getElementById('blue-periods').value = 12;
    document.getElementById('red-periods').value = 12;

    createChart(12, 12, 12);

    // Limpa dados armazenados na memória
    data = [];
    storedOriginalData = [];
    storedPeriods = [];
    chartDataCache = []; // Limpa o cache do gráfico

    // Reseta totalizadores
    updateTotals();
    hideLoadingPopup();

    console.log('Dados e tabelas limpos');
}

function filterData() {
    const filterValue = document.getElementById('filter-select').value;
    const level = document.querySelector('input[name="level"]:checked').value;
    const tableRows = Array.from(tableBody.querySelectorAll('tr'));
    const tableBodies = [
        document.getElementById('data-table-body'),
        document.getElementById('original-table-body'),
        document.getElementById('difference-table-body')
    ];

    console.log('Linhas na tabela principal:', tableRows.length);

    // Filtra as linhas com base no filtro selecionado
    const filteredRows = filterValue.toLowerCase() === 'total' ? tableRows : tableRows.filter(row => {
        const levelValue = level === 'product' ? row.cells[0].textContent.trim()
            : level === 'subcategory' ? row.cells[1].textContent.trim()
                : row.cells[2].textContent.trim();
        return levelValue === filterValue;
    });

    // Calcula os dados do gráfico
    const chartData = months.map((_, i) => {
        return filteredRows.reduce((sum, row) => {
            const cellValue = row.cells[i + 3].textContent;
            const parsedValue = parseFloat(cellValue.replace(/,/g, '').replace(/\./g, '.'));
            return sum + (isNaN(parsedValue) ? 0 : parsedValue);
        }, 0);
    });

    // 🔹 Atualiza os dados da tabela de backup (originalTableData)
    const originalData = JSON.parse(localStorage.getItem('originalTableData') || '[]');

    const backupChartData = months.map((_, i) => {
        return originalData
            .filter(row => {
                const levelValue = level === 'product' ? row['Product'].trim()
                    : level === 'subcategory' ? row['Sub-Category'].trim()
                        : row['Category'].trim();
                return filterValue.toLowerCase() === 'total' || levelValue === filterValue;
            })
            .reduce((sum, row) => {
                const value = parseFloat(row[months[i]]) || 0;
                return sum + value;
            }, 0);
    });

    console.log('Filter Value:', filterValue);
    console.log('Filter Level:', level);

    // 🔹 Arredondar os valores antes de salvar
    const roundedChartData = chartData.map(value => Math.round(value));
    const roundedBackupChartData = backupChartData.map(value => Math.round(value));


    // 🔹 Atualiza apenas se houver mudança
    if (JSON.stringify(originalChartData) !== JSON.stringify(roundedChartData)) {
        originalChartData = [...roundedChartData];
        console.log("📌 Valores iniciais do gráfico armazenados:", originalChartData);
    }

    chartDataCache = [...roundedChartData];

    // 🔹 Recupera as cores salvas antes de recriar o gráfico
    const storedColors = JSON.parse(localStorage.getItem('chartColors')) || { greenPeriods: 12, bluePeriods: 12, redPeriods: 12 };

    tableBodies.forEach(tableBody => {
        if (!tableBody) return;

        const rows = Array.from(tableBody.querySelectorAll('tr'));
        rows.forEach(row => {
            const levelValue = level === 'product' ? row.cells[0].textContent.trim()
                : level === 'subcategory' ? row.cells[1].textContent.trim()
                    : row.cells[2].textContent.trim();
            row.style.display = (filterValue === 'total' || levelValue === filterValue) ? '' : 'none';
        });
    });

    // Atualiza os totais e o gráfico
    updateTotals();
    createChart(storedColors.greenPeriods, storedColors.bluePeriods, storedColors.redPeriods,roundedBackupChartData);
}

function navigateFilter(direction) {
    const filterSelect = document.getElementById("filter-select");
    const currentIndex = filterSelect.selectedIndex;

    if (currentIndex === -1) return; // Se não houver seleção, sai da função

    let newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    // Garante que o índice não ultrapasse os limites
    if (newIndex < 0) newIndex = filterSelect.options.length - 1; // Volta ao último
    if (newIndex >= filterSelect.options.length) newIndex = 0; // Volta ao primeiro

    filterSelect.selectedIndex = newIndex; // Atualiza o filtro selecionado
    filterData(); // Aplica a filtragem com a nova opção
}

// Obtém o formato numérico selecionado
function getNumberFormat() {
    const selectedFormat = document.querySelector('input[name="number-format"]:checked');
    return selectedFormat ? selectedFormat.value : 'us'; // Retorna 'us' como padrão
}

// Função para converter valores numéricos com base no formato selecionado
function parseFormattedNumber(value) {
    if (typeof value !== 'string') {
        value = String(value); // 🔹 Converte números e undefined para string
    }

    const numberFormat = getNumberFormat();

    if (numberFormat === 'us') {
        return parseFloat(value.replace(/,/g, '')) || 0;
    } else if (numberFormat === 'eu') {
        return parseFloat(value.replace(/\./g, '').replace(/,/g, '.')) || 0;
    }

    return parseFloat(value) || 0;
}

function getUpdatedMonths() {
    if (originalChartData.length === 0) {
        console.warn("⚠️ Nenhum dado inicial registrado. Nenhuma alteração pode ser detectada.");
        return [];
    }

    let updatedMonths = [];

    chartDataCache.forEach((newValue, index) => {
        const oldValue = originalChartData[index];

        // 🔹 Comparação com arredondamento para evitar falsos positivos
        if (!isNaN(newValue) && !isNaN(oldValue) && Math.round(newValue) !== Math.round(oldValue)) {
            updatedMonths.push(months[index]);
        }
    });

    console.log("📌 updatedMonths identificados (após ajuste de arredondamento):", updatedMonths);
    return updatedMonths;
}

function applyUpdates() {
    console.log("🔄 Iniciando applyUpdates...");

    let updatedMonths = getUpdatedMonths();

    if (updatedMonths.length === 0) {
        console.warn("⚠️ Nenhuma alteração no gráfico foi detectada.");
        return;
    }

    const filterValue = document.getElementById('filter-select').value.toLowerCase();
    const level = document.querySelector('input[name="level"]:checked').value.toLowerCase();

    showLoadingPopup();
    console.time('Tempo Apply Updates');

    if (level === 'product' && filterValue !== 'total') {
        console.log("🟢 Usando função: applyAdjustmentsForZeroItems");
        applyAdjustmentsForZeroItems(filterValue, level, updatedMonths);
    } else {
        console.log("🔵 Usando função: redistributeTotals");
        redistributeTotals(filterValue, level, updatedMonths);
    }
}

function applyAdjustmentsForZeroItems(filterValue, level, updatedMonths) {
    console.log("🔍 Iniciando applyAdjustmentsForZeroItems para:", filterValue);

    const tableRows = Array.from(document.querySelectorAll('#data-table-body tr'));

    console.log("📌 Total de linhas na tabela:", tableRows.length);

    const normalizedFilter = filterValue.trim().toUpperCase();

    // 🔹 Filtra apenas a linha correspondente ao produto selecionado
    const filteredRow = tableRows.find(row => row.cells[0].textContent.trim().toUpperCase() === normalizedFilter);

    if (!filteredRow) {
        console.warn("⚠️ Nenhuma linha encontrada para o filtro:", normalizedFilter);
        return;
    }

    console.log("✅ Linha encontrada para ajuste:", filteredRow.cells[0].textContent.trim());

    // 🔹 Atualiza apenas os meses alterados
    updatedMonths.forEach(month => {
        const monthChartIndex = months.indexOf(month); // 🔹 Obtém o índice correto do mês no gráfico
        if (monthChartIndex === -1) {
            console.warn(`⚠️ Mês ${month} não encontrado em months.`);
            return;
        }

        const newValue = chartDataCache[monthChartIndex]; // 🔹 Obtém o valor correto do gráfico
        const cell = filteredRow.cells[monthChartIndex + 3]; // 🔹 Obtém a célula correta na tabela

        if (!cell) {
            console.warn(`⚠️ Célula não encontrada para ${month}`);
            return;
        }

        console.log(`🔄 Ajustando ${month}: Novo Valor = ${newValue}`);

        cell.textContent = newValue.toLocaleString(); // 🔹 Atualiza a tabela com o valor exato do gráfico
    });

    // 🔹 Salva a nova versão dos dados antes de continuar
    saveTableData();

    // 🔹 Atualiza a tabela de diferenças e o gráfico
    updateDifferenceTable();
    updateTotals();
    hideLoadingPopup();
    console.timeEnd('Tempo Apply Updates');
}

async function redistributeTotals(filterValue, level, updatedMonths) {
    console.log("🔄 Função redistributeTotals chamada com:");
    console.log("   - filterValue:", filterValue);
    console.log("   - level:", level);
    console.log("   - updatedMonths:", updatedMonths);


    // 🔹 Captura todas as linhas da tabela
    const tableRows = Array.from(document.querySelectorAll('#data-table-body tr'));


    // 🔹 Converte todas as linhas para JSON
    const extractedData = tableRows.map(row => {
        let rowData = {
            'Product': row.cells[0].textContent,
            'Sub-Category': row.cells[1].textContent,
            'Category': row.cells[2].textContent
        };

        months.forEach((period, index) => {
            rowData[period] = parseFormattedNumber(row.cells[index + 3].textContent) || 0;
        });

        return rowData;
    });

    const totalGeralTabela = extractedData.reduce((sum, row) => {
        return sum + months.reduce((rowSum, month) => rowSum + (parseFloat(row[month]) || 0), 0);
    }, 0);
    console.log(`📊 Total Geral da Tabela: ${totalGeralTabela}`);


    // 🔹 Criar chartTotals corretamente antes de enviar a requisição
    const chartTotals = {};
    months.forEach((month, index) => {
        chartTotals[month] = Math.round(parseFormattedNumber(chartDataCache[index]) || 0);
    });

    console.log(`📊 Total Geral da Tabela: ${totalGeralTabela}`);

    // 🚀 Enviar os dados ao backend via fetch()
    try {
        const response = await fetch(`${backendUrl}/redistribute-totals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                updatedMonths,
                chartTotals,  // ✅ Agora chartTotals está incluído na requisição
                data: extractedData,
                filterValue,
                filterLevel: level
            }),
        });

        const result = await response.json();

        console.log("✅ Resposta do backend:", result);
        const totalAfterBackend = result.updatedData.reduce((sum, row) => sum + (parseFloat(row['2023-01']) || 0), 0);
        console.log(`📊 Total de 2023-01 recebido do backend: ${totalAfterBackend}`);

        // 🔹 Arredonda todos os valores numéricos nos dados antes de atualizar a tabela
        result.updatedData = result.updatedData.map(row => {
            let newRow = { ...row };
            months.forEach(period => {
                if (newRow[period] !== undefined) {
                    newRow[period] = Math.round(parseFormattedNumber(newRow[period]) || 0);
                }
            });
            return newRow;
        });
        console.log("📌 Dados arredondados antes de updateTable:", result.updatedData.slice(0, 5));


        if (result.updatedData) {
            console.log("📊 Dados atualizados recebidos:", result.updatedData.slice(0,5));
            console.log("📌 Períodos antes de chamar updateTable:", months);
            updateTable(result.updatedData, months); // Atualiza a tabela com os novos valores
            saveTableData();  // 🔹 Garante que o novo ajuste seja salvo!
            updateDifferenceTable(originalData, months);
            updateTotals();
            hideLoadingPopup();
        } else {
            console.warn("⚠️ O backend não retornou updatedData.");
        }
    } catch (error) {
        console.error("❌ Erro ao redistribuir totais:", error);
        alert("Erro ao redistribuir totais. Verifique o console.");
    }
    console.log("🏁 Finalizando redistributeTotals()");
}

function saveTableData() {
    const updatedData = [];
    const tableRows = Array.from(tableBody.querySelectorAll('tr'));

    tableRows.forEach(row => {
        const rowData = {
            'Product': row.cells[0].textContent,
            'Sub-Category': row.cells[1].textContent,
            'Category': row.cells[2].textContent,
        };

        months.forEach((period, index) => {
            rowData[period] = row.cells[index + 3].textContent;
        });

        updatedData.push(rowData);
    });

    // Salva os dados atualizados no localStorage
    localStorage.setItem('tableData', JSON.stringify(updatedData));
    localStorage.setItem('tablePeriods', JSON.stringify(months));

    // Salva os dados da tabela original (backup)
    const originalData = [];
    const originalTableRows = Array.from(document.querySelectorAll('#original-table-body tr'));

    originalTableRows.forEach(row => {
        const rowData = {
            'Product': row.cells[0].textContent,
            'Sub-Category': row.cells[1].textContent,
            'Category': row.cells[2].textContent,
        };

        months.forEach((period, index) => {
            rowData[period] = row.cells[index + 3].textContent;
        });

        originalData.push(rowData);
    });

    localStorage.setItem('originalTableData', JSON.stringify(originalData));
    saveToBackend(); // 🔹 Chama a função para salvar no backend
}

function exportData() {
    console.log("📤 Iniciando exportação dos dados...");

    const modifiedData = JSON.parse(localStorage.getItem('tableData') || '[]');
    const originalTableRows = Array.from(document.querySelectorAll('#original-table-body tr'));
    const differenceTableRows = Array.from(document.querySelectorAll('#difference-table-body tr'));

    // 🔹 Captura os cabeçalhos da tabela principal
    const headers = ["Product", "Sub-Category", "Category", ...months];

    // 🔹 Converte os dados da tabela original e de diferenças para arrays
    const originalData = [
        headers,
        ...originalTableRows.map(row => [
            row.cells[0].textContent.trim(),
            row.cells[1].textContent.trim(),
            row.cells[2].textContent.trim(),
            ...months.map((_, index) => parseFormattedNumber(row.cells[index + 3]?.textContent || '0'))
        ])
    ];

    const differenceData = [
        headers,
        ...differenceTableRows.map(row => [
            row.cells[0].textContent.trim(),
            row.cells[1].textContent.trim(),
            row.cells[2].textContent.trim(),
            ...months.map((_, index) => parseFormattedNumber(row.cells[index + 3]?.textContent || '0'))
        ])
    ];

    // 🔹 Formata os dados corretamente antes da exportação
    const cleanedModifiedData = modifiedData.map(row => {
        let newRow = { ...row };
        months.forEach(month => {
            if (newRow[month] !== undefined) {
                newRow[month] = parseFormattedNumber(newRow[month]);
            }
        });
        return newRow;
    });

    // 🔹 Cria o arquivo Excel
    const workbook = XLSX.utils.book_new();
    workbook.SheetNames.push("Valores Alterados");
    workbook.SheetNames.push("Valores Originais");
    workbook.SheetNames.push("Diferenças");

    const modifiedSheet = XLSX.utils.json_to_sheet(cleanedModifiedData);
    const originalSheet = XLSX.utils.aoa_to_sheet(originalData);
    const differenceSheet = XLSX.utils.aoa_to_sheet(differenceData);

    workbook.Sheets["Valores Alterados"] = modifiedSheet;
    workbook.Sheets["Valores Originais"] = originalSheet;
    workbook.Sheets["Diferenças"] = differenceSheet;

    // 🔹 Gera o nome do arquivo com a data e hora atual
    const now = new Date();
    const formattedDate = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const fileName = `data_export_${formattedDate}.xlsx`;

    // 🔹 Salva o arquivo Excel com o nome dinâmico
    XLSX.writeFile(workbook, fileName);

    console.log(`✅ Exportação concluída! Arquivo salvo como: ${fileName}`);
}

function showLoadingPopup() {
    const popup = document.querySelector('.loading-popup');
    if (popup) popup.style.display = 'block';
    console.log('Popup de carregamento exibido'); // Log para depuração
}

function hideLoadingPopup() {
    const popup = document.querySelector('.loading-popup');
    if (popup) popup.style.display = 'none';
    console.log('Popup de carregamento escondido'); // Log para depuração
}

function processLargeData(data, processCallback, completeCallback) {
    const totalRows = data.length;
    const chunkSize = Math.max(10, Math.floor(totalRows / 50)); // Tamanho de cada pedaço
    let currentIndex = 0;

    function processChunk() {
        const fragment = document.createDocumentFragment();
        const chunk = data.slice(currentIndex, currentIndex + chunkSize);

        document.getElementById('data-table-body').appendChild(fragment);

        currentIndex += chunkSize;

        if (currentIndex < totalRows) {
            setTimeout(processChunk, 0); // Libera o thread principal
        } else {
            if (completeCallback) completeCallback();
        }
    }
    processChunk();
}

// Função para resetar os totalizadores
function clearTotals() {
    document.querySelectorAll('.totals-container .total span').forEach(span => {
        span.textContent = '0';
    });
}

// Atualiza os totais após carregar a página
document.addEventListener('DOMContentLoaded', updateTotals);

// Integração com a função de limpar dados
document.querySelector('#clear-data-button')?.addEventListener('click', () => {
    showLoadingPopup();
    setTimeout(() => {
        clearTotals();
        document.querySelector('#data-table-body').innerHTML = ''; // Limpa os dados da tabela
        hideLoadingPopup();
    }, 0);
});

document.addEventListener('DOMContentLoaded', () => {
    // Seleciona todas as linhas da tabela
    const tableRows = document.querySelectorAll('#data-table-body tr');

    // Verifica se existem linhas na tabela
    if (tableRows.length === 0) {
        console.warn("Nenhuma linha encontrada na tabela.");
        return;
    }

    // Itera sobre as primeiras 3 colunas da primeira linha
    const firstRow = tableRows[0]; // Pega a primeira linha
    if (firstRow.cells.length >= 3) { // Verifica se há pelo menos 3 colunas
        console.log("Coluna 0:", firstRow.cells[0]?.textContent.trim());
        console.log("Coluna 1:", firstRow.cells[1]?.textContent.trim());
        console.log("Coluna 2:", firstRow.cells[2]?.textContent.trim());
    } else {
        console.warn("A primeira linha não possui 3 colunas.");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const fixedElements = document.querySelector('.fixed-elements');
    const scrollableContent = document.querySelector('.scrollable-content');

    function adjustScrollableHeight() {
        const fixedHeight = fixedElements.offsetHeight;
        scrollableContent.style.top = `${fixedHeight}px`;
    }

    adjustScrollableHeight();
    window.addEventListener('resize', adjustScrollableHeight);
});

// Atualizando a função de upload para usar processamento assíncrono
document.querySelector('#upload-template')?.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
        const lines = reader.result.split('\n');

        processLargeData(lines, (line, fragment, index) => {
            // Criação otimizada de elementos
            const tr = document.createElement('tr');
            const tdIndex = document.createElement('td');
            tdIndex.textContent = index + 1;
            tr.appendChild(tdIndex);

            const tdData = document.createElement('td');
            tdData.textContent = line;
            tr.appendChild(tdData);

            fragment.appendChild(tr);
        }, () => {
        });
    };
    reader.readAsText(file);
});

// Atualiza os totais sempre que o filtro mudar
const filterSelect = document.querySelector('#filter-select');
filterSelect?.addEventListener('change', updateTotals);

// Atualizando o HTML para adicionar os totalizadores
const fixedElements = document.querySelector('.fixed-elements');
const totalsContainer = document.createElement('div');
totalsContainer.classList.add('totals-container');
totalsContainer.innerHTML = `
  <div class="total highlight-gray" id="total-motors-2024">TOTALS 2024:<br> <span>0</span></div>
  <div class="total highlight-green" id="total-motors-2025">TOTALS 2025:<br> <span>0</span></div>
  <div class="total highlight-gray" id="total-motors-2026">TOTALS 2026:<br> <span>0</span></div>
  <div class="total highlight-gray" id="total-2024">FILTERED 2024:<br> <span>0</span></div>
  <div class="total highlight-green" id="total-2025">FILTERED 2025:<br> <span>0</span></div>
  <div class="total highlight-gray" id="total-2026">FILTERED 2026:<br> <span>0</span></div>
`;
fixedElements.appendChild(totalsContainer);

// Atualizando o CSS
const style = document.createElement('style');
style.textContent = `
  .totals-container {
    display: flex;
    marging-left: -15px;
    justify-content: space-between;
    padding: 10px 50px;
    background-color: #f4f4f4;
    border-bottom: 1px solid #ddd;
  }
  .total {
    font-size: 14px;
    font-weight: bold;
  }
  .highlight-green {
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    padding: 5px;
    border-radius: 5px;
  }
  .highlight-gray {
    background-color: #f4f4f4;
    border: 1px solid #c3e6cb;
    padding: 5px;
    border-radius: 5px;
  }
  .loading-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.75);
    color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: none;
    text-align: center;
  }
`;
document.head.appendChild(style);


document.getElementById("forecast-chart").addEventListener("click", function(event) {
    const chart = window.forecastChart;
    const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);

    if (points.length) {
        const point = points[0]; // Captura o ponto mais próximo clicado
        const datasetIndex = point.datasetIndex;
        const dataIndex = point.index;
        const currentValue = chart.data.datasets[datasetIndex].data[dataIndex];

        // Criar campo de input para editar o valor
        const input = document.createElement("input");
        input.type = "number";
        input.value = currentValue;
        input.style.position = "absolute";
        input.style.left = `${event.clientX}px`;
        input.style.top = `${event.clientY}px`;
        input.style.width = "80px";
        input.style.zIndex = "1000";

        document.body.appendChild(input);
        input.focus();

        // Quando o usuário confirmar o valor
        input.addEventListener("blur", () => {
            const newValue = parseFloat(input.value);
            if (!isNaN(newValue)) {
                chart.data.datasets[datasetIndex].data[dataIndex] = newValue;
                chart.update(); // Atualiza o gráfico
            }
            document.body.removeChild(input); // Remove o campo de entrada após a edição
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                input.blur(); // Confirma ao pressionar Enter
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const toggleDarkModeButton = document.getElementById("toggle-dark-mode");
    const body = document.body;
    const logo = document.getElementById("site-logo");

    // Função para atualizar o logo conforme o tema
    function updateLogo() {
        if (body.classList.contains("dark-mode")) {
            logo.src = "Dark-mode-logo.png";
        } else {
            logo.src = "Light-mode-logo.png";
        }
    }

    // Ativar o modo escuro se já estiver salvo no localStorage
    if (localStorage.getItem("dark-mode") === "enabled") {
        body.classList.add("dark-mode");
        toggleDarkModeButton.textContent = "Light";
    }

    // Atualiza o logo ao carregar a página
    updateLogo();

    // Evento de clique no botão para alternar o modo escuro/claro
    toggleDarkModeButton.addEventListener("click", function () {
        body.classList.toggle("dark-mode");

        if (body.classList.contains("dark-mode")) {
            localStorage.setItem("dark-mode", "enabled");
            toggleDarkModeButton.textContent = "Light";
        } else {
            localStorage.setItem("dark-mode", "disabled");
            toggleDarkModeButton.textContent = "Dark";
        }

        // Atualiza o logo ao mudar o tema
        updateLogo();

        // Atualiza o gráfico após mudar para o modo escuro/claro
        setTimeout(() => {
            document.getElementById('forecast-chart').remove(); // Remove o gráfico atual
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'forecast-chart';
            document.getElementById('chart-container').appendChild(newCanvas);
            createChart(12, 12, 12); // Recria o gráfico com as novas cores
        }, 100);
    });
});

//Início das funções para média 3M e 6M

// Função para alternar a visibilidade do menu suspenso corretamente
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.style.display = (dropdown.style.display === "block") ? "none" : "block";
}

// Fecha os menus suspensos ao clicar fora
window.addEventListener("click", function (event) {
    if (!event.target.closest(".custom-dropdown")) {
        document.getElementById("dropdown-content-3m").style.display = "none";
        document.getElementById("dropdown-content-6m").style.display = "none";
    }
});

// Adiciona eventos de clique aos botões do dropdown
document.getElementById("dropdown-btn-3m").addEventListener("click", function (event) {
    event.stopPropagation(); // Impede que o clique feche o dropdown imediatamente
    toggleDropdown("dropdown-content-3m");
});

document.getElementById("dropdown-btn-6m").addEventListener("click", function (event) {
    event.stopPropagation();
    toggleDropdown("dropdown-content-6m");
});

// Popula os menus suspensos com os períodos disponíveis (apenas quando base de dados é carregada)
function populatePeriodFilters() {
    const dropdownContent3M = document.getElementById("dropdown-content-3m");
    const dropdownContent6M = document.getElementById("dropdown-content-6m");

    if (!dropdownContent3M || !dropdownContent6M) {
        console.error("❌ Dropdowns não encontrados no DOM!");
        return;
    }

    // Limpa os menus antes de adicionar novos períodos
    dropdownContent3M.innerHTML = "";
    dropdownContent6M.innerHTML = "";

    if (!months || months.length === 0) {
        console.warn("❌ Nenhum período carregado. Tentando carregar do localStorage...");
        const storedPeriods = JSON.parse(localStorage.getItem("tablePeriods") || "[]");
        if (storedPeriods.length > 0) {
            months.length = 0;
            months.push(...storedPeriods);
        } else {
            console.error("❌ Nenhum período encontrado no localStorage ou na base de dados.");
            return;
        }
    }

    // Obtém os períodos armazenados anteriormente pelo usuário
    const saved3M = JSON.parse(localStorage.getItem("selected3M")) || [];
    const saved6M = JSON.parse(localStorage.getItem("selected6M")) || [];

    // Se não houver períodos salvos, define os 3 e 6 primeiros meses como padrão
    const default3M = saved3M.length > 0 ? saved3M : months.slice(0, 3);
    const default6M = saved6M.length > 0 ? saved6M : months.slice(0, 6);

    // Adiciona os períodos disponíveis como opções nos filtros
    months.forEach(period => {
        // Criação do filtro 3M
        const label3M = document.createElement("label");
        const checkbox3M = document.createElement("input");
        checkbox3M.type = "checkbox";
        checkbox3M.value = period;
        checkbox3M.checked = default3M.includes(period); // Seleção inicial
        label3M.appendChild(checkbox3M);
        label3M.appendChild(document.createTextNode(period));
        dropdownContent3M.appendChild(label3M);

        // Criação do filtro 6M
        const label6M = document.createElement("label");
        const checkbox6M = document.createElement("input");
        checkbox6M.type = "checkbox";
        checkbox6M.value = period;
        checkbox6M.checked = default6M.includes(period); // Seleção inicial
        label6M.appendChild(checkbox6M);
        label6M.appendChild(document.createTextNode(period));
        dropdownContent6M.appendChild(label6M);
    });

    console.log("✅ Períodos carregados nos filtros:", months);
    console.log("📌 Períodos selecionados por padrão (3M):", default3M);
    console.log("📌 Períodos selecionados por padrão (6M):", default6M);
}

// Função para capturar os períodos dinamicamente da base de dados (usada dentro de updatefiltersafterdataload)
function extractPeriodsFromData(data) {
    if (!data || data.length === 0) {
        console.warn("Nenhum dado disponível para extrair períodos.");
        return [];
    }

    // Extrai os períodos das chaves do primeiro item da base de dados
    return Object.keys(data[0]).filter(key => key.match(/^\d{4}-\d{2}$/));
}

// Atualiza os filtros quando a base de dados é carregada (apenas quando base de dados é carregada)
function updateFiltersAfterDataLoad(data) {
    months.length = 0;
    months.push(...extractPeriodsFromData(data));

    localStorage.setItem("tablePeriods", JSON.stringify(months)); // Salva os períodos

    populatePeriodFilters(); // Atualiza os filtros de período
    setupFilterListeners(); // Garante que os eventos sejam aplicados após a atualização dos filtros
}

//Ativa os eventos de atualização dos filtros de período
function setupFilterListeners() {
    document.querySelectorAll("#dropdown-content-3m input, #dropdown-content-6m input").forEach(input => {
        input.addEventListener("change", function () {
            console.log(`📌 Checkbox alterado! Período: ${this.value}, Status: ${this.checked}`);
            saveSelectedPeriods();
            updateChartWithAverages();
        });
    });

    document.getElementById('filter-select').addEventListener("change", () => {
        const selectedFilter = document.getElementById("filter-select").value;
        console.log(`📌 Filtro de produto alterado para: ${selectedFilter}`);

        localStorage.setItem("selectedFilter", selectedFilter); // 🔥 Agora o filtro é salvo corretamente
        filterData(); // 🔥 Aplica o filtro corretamente
        updateChartWithAverages(); // 🔥 Recalcula as médias com base no novo filtro
    });

    document.querySelectorAll('input[name="level"]').forEach(input => {
        input.addEventListener("change", () => {
            console.log("📌 Nível de filtro alterado! Recalculando médias...");
            filterData();
            updateChartWithAverages();
        });
    });
}

// Captura os períodos selecionados pelos filtros
function getSelectedPeriods3M() {
    console.log("🔍 Buscando períodos selecionados para 3M...");
    const selected = Array.from(document.querySelectorAll("#dropdown-content-3m input:checked"))
        .map(input => input.value);
    console.log("📌 Períodos selecionados para 3M após interação:", selected);
    return selected;
}

function getSelectedPeriods6M() {
    console.log("🔍 Buscando períodos selecionados para 6M...");
    const selected = Array.from(document.querySelectorAll("#dropdown-content-6m input:checked"))
        .map(input => input.value);
    console.log("📌 Períodos selecionados para 6M após interação:", selected);
    return selected;
}

//Calcula média dentro da função updatechart
function calculateAverage(selectedPeriods) {
    if (selectedPeriods.length === 0) {
        console.warn("⚠️ Nenhum período selecionado para calcular a média.");
        return null;
    }

    const tableRows = Array.from(document.querySelectorAll("#data-table-body tr"));

    // Verifica se o filtro está em "Total" ou em um nível específico
    const filterValue = document.getElementById('filter-select').value.toLowerCase();
    const level = document.querySelector('input[name="level"]:checked').value.toLowerCase();

    let filteredRows;

    if (filterValue === "total") {
        filteredRows = tableRows; // 🔥 Para "Total", considerar todas as linhas
    } else {
        filteredRows = tableRows.filter(row => {
            const levelValue = level === 'product' ? row.cells[0]?.textContent.trim()
                : level === 'subcategory' ? row.cells[1]?.textContent.trim()
                    : row.cells[2]?.textContent.trim();
            return levelValue.toLowerCase() === filterValue;
        });
    }

    let totalSumPerPeriod = {}; // Objeto para armazenar a soma de cada período
    let periodCount = {}; // Objeto para contar quantas linhas contribuíram para cada período

    selectedPeriods.forEach(period => {
        totalSumPerPeriod[period] = 0;
        periodCount[period] = 0;
    });

    filteredRows.forEach(row => {
        selectedPeriods.forEach(period => {
            const periodIndex = months.indexOf(period);
            if (periodIndex !== -1) {
                const cell = row.cells[periodIndex + 3]; // Certifique-se de que está pegando a célula certa
                if (cell) {
                    const cellValue = parseFloat(cell.textContent.replace(/,/g, '').replace(/\./g, '.') || 0);
                    if (!isNaN(cellValue)) {
                        totalSumPerPeriod[period] += cellValue;
                        periodCount[period] += 1;
                    }
                }
            }
        });
    });

    // Agora, calcular a média dos totais por período
    let finalTotalSum = 0;
    let validPeriods = 0;

    selectedPeriods.forEach(period => {
        if (periodCount[period] > 0) {
            finalTotalSum += totalSumPerPeriod[period];
            validPeriods++;
        }
    });

    const average = validPeriods > 0 ? (finalTotalSum / validPeriods).toFixed(2) : "N/A";
    console.log(`📊 Média final calculada para ${selectedPeriods} (Filtro: ${filterValue}):`, average);
    return average;
}

// Função para atualizar o gráfico com as linhas auxiliares (dentro de restoreperiod)
function updateChartWithAverages() {
    console.log("🔄 Atualizando gráfico com as médias...");

    // Remover linhas de médias existentes antes de adicionar novas
    window.forecastChart.data.datasets = window.forecastChart.data.datasets.filter(dataset =>
        dataset.label !== "Avg-1" && dataset.label !== "Avg-2"
    );


    const selected3M = getSelectedPeriods3M();
    const selected6M = getSelectedPeriods6M();

    if (selected3M.length === 0 && selected6M.length === 0) {
        console.warn("⚠️ Nenhum período selecionado! O gráfico não será atualizado.");
        return;
    }

    const average3M = calculateAverage(selected3M);
    const average6M = calculateAverage(selected6M);

    if (average3M === "N/A" && average6M === "N/A") {
        console.warn("⚠️ Nenhuma média válida calculada. O gráfico não será atualizado.");
        return;
    }

    console.log("📊 Média 3M calculada:", average3M);
    console.log("📊 Média 6M calculada:", average6M);

    // Criar arrays com a média replicada para todos os meses (linhas retas)
    const avgLine3M = months.map(() => average3M);
    const avgLine6M = months.map(() => average6M);

    // Obter referência ao gráfico original
    if (!window.forecastChart) {
        console.warn("⚠️ Gráfico não encontrado. Abortando atualização.");
        return;
    }

    // Remover as linhas de médias anteriores (se existirem)
    window.forecastChart.data.datasets = window.forecastChart.data.datasets.filter(dataset =>
        dataset.label !== "3M-Avg" && dataset.label !== "6M-Avg"
    );

    // Adicionar as novas linhas de média ao gráfico
    window.forecastChart.data.datasets.push(
        {
            label: "Avg-1",
            data: avgLine3M,
            borderColor: "rgba(255, 99, 132, 0.5)", // 🔥 Vermelho pastel
            borderWidth: 1, // 🔥 Linha mais fina
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0, // 🔥 Remove os pontos (botinhas)
            tension: 0.1, // 🔥 Deixa a linha mais suave
            datalabels: { display: false } // 🔥 Remove os rótulos de dados APENAS para essa linha

        },
        {
            label: "Avg-2",
            data: avgLine6M,
            borderColor: "rgba(54, 162, 235, 0.5)", // 🔥 Azul pastel
            borderWidth: 1, // 🔥 Linha mais fina
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0, // 🔥 Remove os pontos (botinhas)
            tension: 0.1, // 🔥 Deixa a linha mais suave
            datalabels: { display: false } // 🔥 Remove os rótulos de dados APENAS para essa linha
        }
    );

    // Atualizar o gráfico sem modificar o layout original
    window.forecastChart.update();
    console.log("✅ Gráfico atualizado com as médias, substituindo as linhas antigas.");
}

function saveSelectedPeriods() {
    const selected3M = getSelectedPeriods3M();
    const selected6M = getSelectedPeriods6M();
    const selectedFilter = document.getElementById("filter-select").value;

    localStorage.setItem("selected3M", JSON.stringify(selected3M));
    localStorage.setItem("selected6M", JSON.stringify(selected6M));
    localStorage.setItem("selectedFilter", selectedFilter);
}

function restoreSelectedPeriods() {
    const saved3M = JSON.parse(localStorage.getItem("selected3M")) || [];
    const saved6M = JSON.parse(localStorage.getItem("selected6M")) || [];
    let savedFilter = localStorage.getItem("selectedFilter");

    // 🔥 Se não houver filtro salvo, mantém o atual
    if (!savedFilter) {
        savedFilter = document.getElementById("filter-select").value;
    }

    document.querySelectorAll("#dropdown-content-3m input, #dropdown-content-6m input").forEach(input => {
        input.checked = saved3M.includes(input.value) || saved6M.includes(input.value);
    });

    document.getElementById("filter-select").value = savedFilter;
    console.log("✅ Filtro restaurado corretamente:", savedFilter);

    filterData();
    updateChartWithAverages();
}

//--- Início Upload Actuals

async function uploadActuals(event) {
    if (!confirm("Tem certeza que deseja fazer upload de uma nova base de actuals?")) {
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    showLoadingPopup();

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${backendUrl}/upload-actuals`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log("✅ Actuals carregados:", result.data);

        await loadActuals();
    } catch (error) {
        console.error('❌ Erro ao enviar arquivo de actuals:', error);
        alert('Erro ao enviar o arquivo de actuals.');
    } finally {
        hideLoadingPopup();
    }
}

async function loadActuals() {
    try {
        const response = await fetch(`${backendUrl}/load-actuals`);
        const result = await response.json();

        if (result.actualsData) {
            console.log("📥 Actuals carregados do backend:", result.actualsData);
            updateChartWithActuals(result.actualsData);
        }
    } catch (error) {
        console.error("❌ Erro ao carregar os actuals:", error);
    }
}

async function updateChartWithActuals() {
    showLoadingPopup();
    if (!window.forecastChart) return;

    try {
        const response = await fetch(`${backendUrl}/load-actuals`);
        const result = await response.json();

        if (!result.actualsData) return;

        console.log("📊 Actuals carregados do backend:", result.actualsData);

        const filterValue = document.getElementById('filter-select').value;
        const level = document.querySelector('input[name="level"]:checked').value;

        const filteredActuals = result.actualsData.filter(row => {
            if (filterValue === "total") return true;

            // Normaliza os nomes das colunas
            const columnMap = {
                "product": "Product",
                "subcategory": "Sub-Category",
                "category": "Category"
            };

            const columnKey = columnMap[level]; // Obtém o nome correto da coluna

            if (!columnKey || !row[columnKey]) return false;

            // Normaliza os valores (removendo espaços extras e ajustando para minúsculas)
            const rowValue = row[columnKey].trim().toLowerCase();
            const filterNormalized = filterValue.trim().toLowerCase();

            return rowValue === filterNormalized;
        });


        const actualsChartData = months.map(month => {
            return filteredActuals.reduce((sum, row) => {
                return sum + (parseFloat(row[month]) || 0);
            }, 0);
        });

        const actualsDataset = {
            label: 'Actuals',
            data: actualsChartData,
            backgroundColor: "rgba(75, 192, 192, 0.5)", // Cor mais clara para barras
            type: 'bar',
            barPercentage: 0.5,
            categoryPercentage: 0.8,
            datalabels: {
                display: false // Desativa os rótulos de dados para a linha backup
            }
        };

        const existingActualsIndex = window.forecastChart.data.datasets.findIndex(ds => ds.label === 'Actuals');

        if (existingActualsIndex !== -1) {
            window.forecastChart.data.datasets[existingActualsIndex] = actualsDataset;
        } else {
            window.forecastChart.data.datasets.push(actualsDataset);
        }

        window.forecastChart.update();
    } catch (error) {
        console.error("❌ Erro ao carregar os actuals:", error);
    }
    hideLoadingPopup();
}

async function clearActuals() {
    if (!confirm("Tem certeza que deseja limpar apenas os dados de Actuals?")) {
        return;
    }

    showLoadingPopup();

    try {
        await fetch(`${backendUrl}/clear-actuals`, {
            method: 'POST'
        });

        console.log("✅ Actuals apagados do backend!");
    } catch (error) {
        console.error("❌ Erro ao limpar Actuals do backend:", error);
    }

    // 🔹 Limpa os Actuals apenas do frontend
    localStorage.removeItem('actualsData');

    // 🔹 Remove as barras de Actuals do gráfico
    if (window.forecastChart) {
        const datasetIndex = window.forecastChart.data.datasets.findIndex(ds => ds.label === 'Actuals');
        if (datasetIndex !== -1) {
            window.forecastChart.data.datasets.splice(datasetIndex, 1);
            window.forecastChart.update();
        }
    }

    hideLoadingPopup();
    console.log("✅ Os dados de Actuals foram removidos.");
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltip = document.getElementById('tooltip');

    // Adiciona evento às células fixas após a tabela ser carregada
    document.body.addEventListener('mouseover', function (event) {
        const target = event.target;
        if (target.classList.contains('sticky')) {
            const text = target.textContent;
            if (text) {
                tooltip.textContent = text;
                tooltip.style.display = 'block';
            }
        }
    });

    document.body.addEventListener('mousemove', function (event) {
        if (tooltip.style.display === 'block') {
            // Ajuste da posição do tooltip com limite de bordas
            let x = event.clientX + 15;
            let y = event.clientY + 15;

            // Evita que o tooltip ultrapasse a janela
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;

            if (x + tooltipWidth > windowWidth) {
                x = windowWidth - tooltipWidth - 10;
            }

            if (y + tooltipHeight > windowHeight) {
                y = windowHeight - tooltipHeight - 10;
            }

            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        }
    });

    document.body.addEventListener('mouseout', function (event) {
        if (event.target.classList.contains('sticky')) {
            tooltip.style.display = 'none';
            tooltip.textContent = '';
        }
    });
});
