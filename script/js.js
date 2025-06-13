  let dados = [];

  const fileInput = document.getElementById('fileInput');
  const filtroInput = document.getElementById('filtro');
  const tabela = document.querySelector('#tabela tbody');
  const headers = document.querySelectorAll('#tabela thead th');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnFileLabel = document.getElementById('btnFileLabel');

  let estadoOrdenacao = { coluna: 'nsr', sentido: 'asc' };

  // Abrir seletor de arquivo também pelo teclado (enter/space)
  btnFileLabel.addEventListener('keydown', (e) => {
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      fileInput.click();
    }
  });

  function processarArquivo(texto) {
    const linhas = texto.split(/\r?\n/);
    const nsrMap = new Map();

    linhas.forEach(linha => {
      if (!linha.trim()) return;
      try {
        const registro = JSON.parse(linha);
        const nsr = registro.nsr;
        const ident_func = registro.ident_func;
        if (nsr == null || !ident_func) return;

        if (!nsrMap.has(nsr)) nsrMap.set(nsr, new Map());
        const innerMap = nsrMap.get(nsr);
        innerMap.set(ident_func, (innerMap.get(ident_func) || 0) + 1);
      } catch {
        // Ignorar linha inválida
      }
    });

    dados = [];
    nsrMap.forEach((identMap, nsr) => {
      let total = 0;
      identMap.forEach(c => total += c);
      if (total > 1) {
        dados.push({
          nsr,
          total,
          detalhes: Array.from(identMap.entries()).map(([ident_func, count]) => ({ident_func, count}))
        });
      }
    });

    filtroInput.disabled = false;
    btnExportCsv.disabled = false;
    filtroInput.value = '';
    atualizarTabela();
  }

  function comparar(a, b, key, sentido) {
    let va = a[key];
    let vb = b[key];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();

    if (va < vb) return sentido === 'asc' ? -1 : 1;
    if (va > vb) return sentido === 'asc' ? 1 : -1;
    return 0;
  }

  function atualizarTabela() {
    const filtro = filtroInput.value.toLowerCase();
    let linhas = [];

    dados.forEach(item => {
      if (!item.nsr.toString().includes(filtro) &&
          !item.detalhes.some(d => d.ident_func.toLowerCase().includes(filtro))) {
        return;
      }
      item.detalhes.forEach(d => {
        if (d.ident_func.toLowerCase().includes(filtro) || item.nsr.toString().includes(filtro)) {
          linhas.push({
            nsr: item.nsr,
            total: item.total,
            ident_func: d.ident_func,
            count: d.count
          });
        }
      });
    });

    linhas.sort((a,b) => comparar(a,b, estadoOrdenacao.coluna, estadoOrdenacao.sentido));

    tabela.innerHTML = '';
    linhas.forEach(linha => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${linha.nsr}</td>
        <td>${linha.total}</td>
        <td>${linha.ident_func}</td>
        <td>${linha.count}</td>
      `;
      tabela.appendChild(tr);
    });
  }

  function atualizarHeaders(coluna, sentido) {
    headers.forEach(th => {
      th.classList.remove('asc', 'desc');
      th.setAttribute('aria-sort', 'none');
      if (th.dataset.key === coluna) {
        th.classList.add(sentido);
        th.setAttribute('aria-sort', sentido === 'asc' ? 'ascending' : 'descending');
      }
    });
  }

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => processarArquivo(evt.target.result);
    reader.readAsText(file, 'UTF-8');
  });

  filtroInput.addEventListener('input', atualizarTabela);

  headers.forEach(th => {
    th.addEventListener('click', () => {
      const coluna = th.dataset.key;
      if (estadoOrdenacao.coluna === coluna) {
        estadoOrdenacao.sentido = estadoOrdenacao.sentido === 'asc' ? 'desc' : 'asc';
      } else {
        estadoOrdenacao.coluna = coluna;
        estadoOrdenacao.sentido = 'asc';
      }
      atualizarHeaders(estadoOrdenacao.coluna, estadoOrdenacao.sentido);
      atualizarTabela();
    });
  });

  btnExportCsv.addEventListener('click', () => {
    let csv = 'NSR,Total,ident_func,Ocorrências por ident_func\n';
    tabela.querySelectorAll('tr').forEach(tr => {
      const cols = tr.querySelectorAll('td');
      const row = Array.from(cols).map(td => `"${td.textContent.replace(/"/g, '""')}"`);
      csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nsr_duplicados.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  atualizarHeaders(estadoOrdenacao.coluna, estadoOrdenacao.sentido);