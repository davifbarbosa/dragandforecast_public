// 🟢 Carrega variáveis conforme o ambiente
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const logFilePath = path.join(__dirname, 'backend_logs.txt');

// 🟢 Carrega dotenv com base em 'ENV' (do Railway)
const dotenv = require('dotenv');
const envFile = process.env.ENV === 'staging' ? '.env.staging' : '.env.production';
dotenv.config({ path: envFile });

// 🔍 Log para verificar qual arquivo está sendo carregado:
console.log("🟢 Arquivo .env carregado:", envFile);
console.log("📂 FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Configura o limite de tamanho do payload para 10 MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload());

function logToFile(message, data = null) {
    const logMessage = `[${new Date().toISOString()}] ${message}`;
    const logData = data ? `\n${JSON.stringify(data, null, 2)}` : '';

    try {
        fs.appendFileSync(logFilePath, logMessage + logData + "\n\n");
        console.log(logMessage, data || ""); // Mantém o log no console
    } catch (error) {
        console.error("❌ Erro ao gravar log no arquivo:", error);
    }
}

const dataStorage = {
  tableData: null,
  originalTableData: null,
  tablePeriods: null
};

const actualsStorage = {
  actualsData: null
};

// ✅ Endpoint para entregar as variáveis do Firebase ao Frontend
app.get('/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  });
});

// ✅ Endpoint para verificar o ambiente atual
app.get('/env-info', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    backendUrl: process.env.PUBLIC_BACKEND_URL,
  });
});

app.post('/upload-actuals', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    logToFile("❌ Nenhum arquivo de actuals foi enviado.");
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }

  const dataFile = req.files.file;
  const fileContent = dataFile.data.toString('utf-8');

  Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!results.data || results.data.length === 0) {
        logToFile("❌ O arquivo de actuals enviado está vazio ou inválido.");
        return res.status(400).json({ error: "Arquivo inválido ou sem dados." });
      }

      actualsStorage.actualsData = results.data;
      logToFile("📊 Dados de Actuals armazenados no backend com sucesso!", results.data.slice(0, 5));

      res.json({ message: "Arquivo de actuals processado!", data: results.data });
    },
    error: (error) => {
      logToFile("❌ Erro ao processar o arquivo CSV de actuals:", error);
      res.status(500).json({ error: "Erro ao processar o arquivo CSV." });
    }
  });
});

app.get('/load-actuals', (req, res) => {
  if (!actualsStorage.actualsData || actualsStorage.actualsData.length === 0) {
    logToFile("⚠️ Nenhum dado de actuals encontrado no backend.");
    return res.status(404).json({ error: "Nenhum dado de actuals armazenado." });
  }
  
  logToFile("📥 Enviando dados de actuals para o frontend!", actualsStorage.actualsData.slice(0, 5));
  res.json({ actualsData: actualsStorage.actualsData });
});

// Endpoint para salvar os dados no backend
app.post('/save-data', (req, res) => {
  const { tableData, originalTableData, tablePeriods } = req.body;

  if (!tableData || !originalTableData || !tablePeriods) {
      return res.status(400).json({ error: "Dados inválidos recebidos." });
  }

  dataStorage.tableData = tableData;
  dataStorage.originalTableData = originalTableData;
  dataStorage.tablePeriods = tablePeriods;

  logToFile("📥 Dados salvos no backend com sucesso!", { tablePeriods });

  res.json({ message: "Dados armazenados com sucesso!" });
});

// Endpoint para carregar os dados armazenados
app.get('/load-data', (req, res) => {
  if (!dataStorage.tableData || !dataStorage.originalTableData || !dataStorage.tablePeriods) {
      return res.status(404).json({ error: "Nenhum dado armazenado no backend." });
  }

  res.json({
      tableData: dataStorage.tableData,
      originalTableData: dataStorage.originalTableData,
      tablePeriods: dataStorage.tablePeriods
  });
});

// Endpoint para upload de dados
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No file uploaded.');
  }
  const dataFile = req.files.file;
  const fileContent = dataFile.data.toString('utf-8'); // Converte o conteúdo do arquivo para string

  // Processa o arquivo CSV com PapaParse
  Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      //console.log('Dados processados:', results.data); // Log dos dados no terminal
      res.json({
        message: 'Arquivo processado com sucesso!',
        data: results.data, // Envia os dados processados para o frontend
      });
    },
    error: (error) => {
      console.error('Erro ao processar CSV:', error);
      res.status(500).send('Erro ao processar arquivo CSV.');
    },
  });
});

// Endpoint para calcular as tabelas auxiliares
app.post('/create-backup', (req, res) => {
  try {
    const { data, periods } = req.body;

    // ✅ Garante que estamos comparando com a última versão salva no backend
    const currentTableData = dataStorage.tableData || [];

    const backupTable = data.map(row => ({ ...row }));

    const differenceTable = data.map(row => {
      const differenceRow = {
        Product: row.Product,
        "Sub-Category": row["Sub-Category"] || row.SubCategory || "N/A",
        Category: row.Category
      };

      // 🔹 Busca a linha correspondente na tabela principal salva no backend
      const currentRow = currentTableData.find(r => 
        r.Product === row.Product &&
        r["Sub-Category"] === row["Sub-Category"] &&
        r.Category === row.Category
      );

      periods.forEach(period => {
        const originalValue = parseFloat(row[period] || 0);
        const modifiedValue = currentRow ? parseFloat(currentRow[period] || 0) : originalValue; // ✅ Pegando a versão mais recente!

        differenceRow[period] = (modifiedValue - originalValue).toFixed(2);
      });

      return differenceRow;
    });

    console.log('✅ Backup e tabela de diferenças criados com sucesso!');
    res.json({ backupTable, differenceTable });

  } catch (error) {
    console.error('❌ Erro ao criar backup e calcular diferenças:', error);
    res.status(500).json({ error: 'Erro ao processar tabelas no backend.' });
  }
});

app.post('/redistribute-totals', (req, res) => {
  try {
    // Recebendo os dados do frontend
    let { updatedMonths, chartTotals, data, filterValue, filterLevel } = req.body;

    // Logs para depuração
    logToFile("📅 updatedMonths:", updatedMonths);
    logToFile("📊 Totais ajustados pelo usuário (chartTotals):", chartTotals);
    logToFile("🔍 Filtro aplicado:", { filterValue, filterLevel });
    logToFile("📊 Dados recebidos para redistribuição (primeiros 5 itens):", data.slice(0, 5));

    // Garante que os dados foram recebidos corretamente
    if (!data || !Array.isArray(data) || data.length === 0) {
      logToFile("❌ Erro: Nenhum dado válido recebido.");
      return res.status(400).json({ error: "Nenhum dado válido recebido para redistribuição." });
    }

    if (!updatedMonths || !Array.isArray(updatedMonths) || updatedMonths.length === 0) {
      logToFile("❌ Erro: Nenhum mês foi atualizado.");
      return res.status(400).json({ error: "Nenhum mês foi atualizado para redistribuição." });
    }

    if (!chartTotals || typeof chartTotals !== 'object') {
      logToFile("❌ Erro: Totais do gráfico inválidos.");
      return res.status(400).json({ error: "Totais do gráfico inválidos." });
    }

    // Criar uma cópia dos dados para evitar modificar a entrada original
    let updatedData = JSON.parse(JSON.stringify(data));

    const totalReceived = data.reduce((sum, row) => sum + (parseFloat(row['2023-01']) || 0), 0);
    logToFile(`📊 Total de 2023-01 recebido pelo backend: ${totalReceived}`);

        // 🔹 Se o filtro for "total", pega TODAS as linhas
        const filteredData = filterValue.toLowerCase() === "total" ? updatedData : updatedData.filter(row => {
          const cellValue = filterLevel === 'product' ? row.Product.toLowerCase()
                          : filterLevel === 'subcategory' ? row["Sub-Category"].toLowerCase()
                          : row.Category.toLowerCase();
          return cellValue === filterValue.toLowerCase();
      });


      logToFile(`✅ ${filteredData.length} linhas selecionadas para redistribuição.`);


        // 🔹 Aplicar redistribuição apenas nas linhas filtradas
        updatedMonths.forEach(month => {
            let totalOriginal = filteredData.reduce((sum, row) => sum + (parseFloat(row[month]) || 0), 0);
            let totalNovo = chartTotals[month] !== undefined ? parseFloat(chartTotals[month]) : 0;

            logToFile(`🔄 Redistribuindo para ${month}: Total Original=${totalOriginal} -> Novo Total=${totalNovo}`);

            if (totalOriginal > 0) {
                let adjustmentFactor = totalNovo / totalOriginal;

                filteredData.forEach(row => {
                    if (row.hasOwnProperty(month) && parseFloat(row[month]) > 0) {
                        row[month] = (parseFloat(row[month]) * adjustmentFactor).toFixed(2);
                    }
                });
            }
        });


    logToFile("✅ Redistribuição concluída. Dados processados:", updatedData);

    // Envia os dados atualizados de volta para o frontend
    res.json({ message: "Redistribuição concluída!", updatedData });

    const totalProcessed = updatedData.reduce((sum, row) => sum + (parseFloat(row['2023-01']) || 0), 0);
    logToFile(`📊 Total de 2023-01 após processamento: ${totalProcessed}`);


  } catch (error) {
    logToFile("❌ Erro no backend ao processar os dados:", { message: error.message, stack: error.stack });
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Endpoint para cálculo e processamento
app.post('/process-data', (req, res) => {
  const { data } = req.body;
  // Processar os cálculos necessários
  const processedData = {}; // Dados processados
  logToFile("📊 Processando dados", { data: data.slice(0, 5) });
  res.json(processedData);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Endpoint para limpar os dados do backend
app.post('/clear-data', (req, res) => {
  dataStorage.tableData = null;
  dataStorage.originalTableData = null;
  dataStorage.tablePeriods = null;

  logToFile("🚮 Todos os dados foram apagados do backend.");
  
  res.json({ message: "Todos os dados foram apagados do backend com sucesso." });
});

app.post('/clear-actuals', (req, res) => {
  actualsStorage.actualsData = null; // 🔹 Apenas os Actuals serão apagados
  logToFile("🚮 Dados de Actuals foram apagados do backend.");
  
  res.json({ message: "Os dados de Actuals foram apagados com sucesso." });
});

