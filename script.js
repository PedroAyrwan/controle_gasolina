// ==========================================
// SEU LINK JÁ ESTÁ CONFIGURADO ABAIXO:
const API_URL = "https://script.google.com/macros/s/AKfycbwOBFHxsJQnXV3iwj71iYYcn60JoW4pTgyrqj_2vwJeCCXo2tNGE5C7j9xo_08x_9s/exec";
// ==========================================

// --- 1. Inicialização ---
document.getElementById('dataViagem').valueAsDate = new Date();

// Carrega histórico local para visualização rápida
let listaViagens = JSON.parse(localStorage.getItem('viagensApp')) || [];
atualizarTabela();
calcularPrevia();

// --- 2. Eventos (Ouvintes) ---
// Atualiza os cálculos sempre que digitar algo
const camposCalculo = ['distancia', 'idaVolta', 'precoCombustivel', 'veiculo', 'consumoManual'];
camposCalculo.forEach(id => {
    document.getElementById(id).addEventListener('input', calcularPrevia);
});

// Mostra o campo de consumo manual se selecionar "Outro"
document.getElementById('veiculo').addEventListener('change', function() {
    const divManual = document.getElementById('divConsumoManual');
    if (this.value === 'Outro') divManual.classList.remove('hidden');
    else divManual.classList.add('hidden');
});

// --- 3. Funções de Cálculo ---

function obterConsumo() {
    const select = document.getElementById('veiculo');
    if (select.value === 'Outro') {
        return parseFloat(document.getElementById('consumoManual').value) || 1;
    }
    return parseFloat(select.options[select.selectedIndex].dataset.kml);
}

function calcularValores() {
    const distIda = parseFloat(document.getElementById('distancia').value) || 0;
    const isIdaVolta = document.getElementById('idaVolta').checked;
    const preco = parseFloat(document.getElementById('precoCombustivel').value) || 0;
    const consumo = obterConsumo();

    const kmTotal = distIda * (isIdaVolta ? 2 : 1);
    const litros = kmTotal / consumo;
    const custo = litros * preco;

    return { kmTotal, litros, custo };
}

function calcularPrevia() {
    const dados = calcularValores();
    document.getElementById('prevKm').innerText = dados.kmTotal.toFixed(1);
    document.getElementById('prevLitros').innerText = dados.litros.toFixed(1);
    document.getElementById('prevCusto').innerText = dados.custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- 4. Função Principal: SALVAR ---
function salvarViagem() {
    const btn = document.querySelector('.btn-primary');
    const textoOriginal = btn.innerText;
    
    // Validação
    const cliente = document.getElementById('cliente').value;
    const destino = document.getElementById('destino').value;
    if (!cliente || !destino) { alert('Preencha Cliente e Destino!'); return; }

    // Prepara os dados
    const calculo = calcularValores();
    const dataFormatada = document.getElementById('dataViagem').value.split('-').reverse().join('/'); // Formato BR

    // DADOS PARA ENVIAR AO GOOGLE (Formatados como Texto para ficar bonito na planilha)
    const dadosParaEnviar = {
        data: dataFormatada,
        cliente: cliente,
        destino: destino,
        veiculo: document.getElementById('veiculo').value,
        km: calculo.kmTotal.toString().replace('.', ','),
        litros: calculo.litros.toFixed(2).replace('.', ','),
        custo: calculo.custo.toFixed(2).replace('.', ','),
        obs: document.getElementById('observacoes').value
    };

    // DADOS PARA SALVAR NO NAVEGADOR (Formato numérico para cálculos futuros)
    const dadosVisuais = {
        id: Date.now(),
        data: document.getElementById('dataViagem').value,
        cliente: cliente,
        destino: destino,
        veiculo: document.getElementById('veiculo').value,
        km: calculo.kmTotal,
        custo: calculo.custo,
        obs: document.getElementById('observacoes').value
    };

    // Feedback Visual
    btn.innerText = "⏳ Enviando...";
    btn.disabled = true;

    // Envia para o Google Sheets
    fetch(API_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaEnviar)
    })
    .then(() => {
        // Sucesso
        alert("✅ Viagem salva na planilha com sucesso!");
        
        // Atualiza a tabela no site também
        listaViagens.unshift(dadosVisuais);
        localStorage.setItem('viagensApp', JSON.stringify(listaViagens));
        atualizarTabela();
        
        // Limpa o formulário
        limparFormulario();
    })
    .catch(error => {
        console.error('Erro:', error);
        alert("❌ Erro ao conectar com a planilha. Verifique a internet.");
    })
    .finally(() => {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    });
}

// --- 5. Funções da Tabela e Utilitários ---
function atualizarTabela() {
    const tbody = document.querySelector('#tabelaDados tbody');
    tbody.innerHTML = '';
    let totalAcumulado = 0;

    listaViagens.forEach(v => {
        totalAcumulado += v.custo;
        const dataBR = v.data.split('-').reverse().join('/');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataBR}</td>
            <td><strong>${v.cliente}</strong></td>
            <td>${v.destino}</td>
            <td>${v.veiculo}</td>
            <td>${v.km.toFixed(1)} km</td>
            <td style="color: green;">R$ ${v.custo.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="btn-danger" onclick="excluirLocal(${v.id})" style="padding: 2px 8px;">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('totalGeral').innerText = totalAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function excluirLocal(id) {
    // Nota: Isso exclui apenas do visual do site, não da planilha
    if(confirm("Remover este item do histórico VISUAL? (Não apaga da planilha)")) {
        listaViagens = listaViagens.filter(v => v.id !== id);
        localStorage.setItem('viagensApp', JSON.stringify(listaViagens));
        atualizarTabela();
    }
}

function limparFormulario() {
    document.getElementById('cliente').value = '';
    document.getElementById('destino').value = '';
    document.getElementById('observacoes').value = '';
    document.getElementById('distancia').value = '0';
    calcularPrevia();
}

// --- NOVA FUNÇÃO: Abrir Planilha ---
function abrirPlanilha() {
    // Link direto para a sua planilha
    const linkPlanilha = "https://docs.google.com/spreadsheets/d/1WY8NDzRrW2HB_dtLHB8dA7s4j1Cqp7YkQNupULzkr_g/edit";
    window.open(linkPlanilha, '_blank');

}
