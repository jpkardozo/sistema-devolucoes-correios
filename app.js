// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://plzpbntxkyalenpphftn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenBibnR4a3lhbGVucHBoZnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTM4MzYsImV4cCI6MjEwNDAyOTgzNn0.rLgLrgUS0PTwIW33AFY_AhVX7_Qsiw2Vxfdr3jDlULM';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. SELEÇÃO DE ELEMENTOS DO DOM
// ==========================================
const formGestor = document.getElementById('form-gestor');
const inputNomeGestor = document.getElementById('nome-gestor');
const inputMatriculaGestor = document.getElementById('matricula-gestor');
const gestorSalvoInfo = document.getElementById('gestor-salvo-info');

const pdfGestorNome = document.getElementById('pdf-gestor-nome');
const pdfGestorMat = document.getElementById('pdf-gestor-mat');

// Carteiros
const formCarteiro = document.getElementById('form-carteiro');
const inputNomeCarteiro = document.getElementById('nome-carteiro');
const inputMatriculaCarteiro = document.getElementById('matricula-carteiro');

// Motivos
const formMotivo = document.getElementById('form-motivo');
const inputNovoMotivo = document.getElementById('novo-motivo');

// Lançamentos e Relatório / PDF
const inputDataDevolucao = document.getElementById('data-devolucao');
const formDevolucaoLote = document.getElementById('form-devolucao-lote');
const cabecalhoLancamento = document.getElementById('cabecalho-lancamento');
const tabelaLancamentoLinhas = document.getElementById('tabela-lancamento-linhas');
const btnGerarPdf = document.getElementById('btn-gerar-pdf');

// ==========================================
// 3. INICIALIZAÇÃO AO CARREGAR A PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    if (inputDataDevolucao) {
        const hoje = new Date().toISOString().split('T')[0];
        inputDataDevolucao.value = hoje;
    }

    await carregarGestor();
    await verificarPadroesMotivos();
    await renderizarTabelaLancamentos();
    await gerarVisualizacaoRelatorio();
});

// ==========================================
// 4. FUNÇÕES DE SUPORTE E FORMATAÇÃO
// ==========================================
function formatarDataParaBR(dataISO) {
    if (!dataISO) return '';
    const partes = dataISO.split('-');
    if (partes.length !== 3) return dataISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function validarFormatoMatricula(matricula) {
    const regex = /^\d\.\d{3}\.\d{3}-\d$/;
    return regex.test(matricula);
}

// ==========================================
// 5. GESTOR (SALVAR E CARREGAR)
// ==========================================
if (formGestor) {
    formGestor.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = inputNomeGestor.value.trim();
        const matricula = inputMatriculaGestor.value;

        if (!validarFormatoMatricula(matricula)) {
            alert("Erro: A matrícula deve seguir o padrão 0.000.000-0");
            return;
        }

        const { error } = await supabaseClient
            .from('gestor')
            .upsert({ id: 'atual', nome, matricula });

        if (error) {
            console.error("Erro ao salvar gestor:", error);
            alert("Erro ao salvar o gestor no Supabase.");
        } else {
            await carregarGestor();
            alert("Gestor salvo com sucesso!");
        }
    });
}

async function carregarGestor() {
    const { data } = await supabaseClient
        .from('gestor')
        .select('*')
        .eq('id', 'atual')
        .maybeSingle();

    if (data) {
        if (gestorSalvoInfo) gestorSalvoInfo.textContent = `Gestor Atual: ${data.nome} (${data.matricula})`;
        if (pdfGestorNome) pdfGestorNome.textContent = data.nome;
        if (pdfGestorMat) pdfGestorMat.textContent = data.matricula;
    } else {
        if (gestorSalvoInfo) gestorSalvoInfo.textContent = "Nenhum gestor cadastrado ainda.";
        if (pdfGestorNome) pdfGestorNome.textContent = "---";
        if (pdfGestorMat) pdfGestorMat.textContent = "---";
    }
}

// ==========================================
// 6. CADASTRO DE CARTEIROS
// ==========================================
if (formCarteiro) {
    formCarteiro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = inputNomeCarteiro.value.trim();
        const matricula = inputMatriculaCarteiro.value;

        if (!validarFormatoMatricula(matricula)) {
            alert("Erro: A matrícula do carteiro deve seguir o padrão 0.000.000-0");
            return;
        }

        const { error } = await supabaseClient
            .from('carteiros')
            .upsert({ matricula, nome });

        if (error) {
            console.error("Erro ao cadastrar carteiro:", error);
            alert("Erro ao salvar carteiro no Supabase.");
        } else {
            alert("Carteiro cadastrado com sucesso!");
            formCarteiro.reset();
            await renderizarTabelaLancamentos();
        }
    });
}

// ==========================================
// 7. MOTIVOS E PADRÕES
// ==========================================
async function verificarPadroesMotivos() {
    let { data: motivos } = await supabaseClient
        .from('motivos')
        .select('nome');

    if (!motivos || motivos.length === 0) {
        const motivosIniciaisPadrao = ["Mudou-se", "Endereço Insuficiente", "Ausente", "Não Procurado", "Recusado"];
        const payload = motivosIniciaisPadrao.map(m => ({ nome: m }));
        
        await supabaseClient.from('motivos').upsert(payload, { onConflict: 'nome' });
    }
}

if (formMotivo) {
    formMotivo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nomeMotivo = inputNovoMotivo.value.trim();

        if (!nomeMotivo) return;

        const { error } = await supabaseClient
            .from('motivos')
            .upsert({ nome: nomeMotivo }, { onConflict: 'nome' });

        if (error) {
            console.error("Erro ao adicionar motivo:", error);
            alert("Erro ao cadastrar novo motivo.");
        } else {
            alert("Motivo adicionado com sucesso!");
            formMotivo.reset();
            await renderizarTabelaLancamentos();
            await gerarVisualizacaoRelatorio();
        }
    });
}

// ==========================================
// 8. LANÇAMENTOS E TABELA DINÂMICA
// ==========================================
if (inputDataDevolucao) {
    inputDataDevolucao.addEventListener('change', async () => {
        await renderizarTabelaLancamentos();
        await gerarVisualizacaoRelatorio();
    });
}

async function renderizarTabelaLancamentos() {
    if (!tabelaLancamentoLinhas || !cabecalhoLancamento) return;

    const dataFiltro = formatarDataParaBR(inputDataDevolucao.value);

    const [resCarteiros, resMotivos, resLancamentos] = await Promise.all([
        supabaseClient.from('carteiros').select('*'),
        supabaseClient.from('motivos').select('nome'),
        supabaseClient.from('lancamentos').select('*').eq('data', dataFiltro)
    ]);

    const carteiros = resCarteiros.data || [];
    const motivos = (resMotivos.data || []).map(m => m.nome);
    const lancamentos = resLancamentos.data || [];

    cabecalhoLancamento.innerHTML = `
        <th>Matrícula</th>
        <th>Carteiro</th>
        ${motivos.map(m => `<th style="text-align: center;">${m}</th>`).join('')}
    `;

    tabelaLancamentoLinhas.innerHTML = "";

    if (carteiros.length === 0) {
        tabelaLancamentoLinhas.innerHTML = `<tr><td colspan="${motivos.length + 2}" style="text-align: center; color: #888;">Nenhum carteiro cadastrado. Cadastre carteiros para realizar lançamentos.</td></tr>`;
        return;
    }

    carteiros.forEach(carteiro => {
        const tr = document.createElement('tr');
        let htmlColunas = `<td>${carteiro.matricula}</td><td>${carteiro.nome}</td>`;

        motivos.forEach(motivo => {
            const lanc = lancamentos.find(l => l.matricula === carteiro.matricula && l.motivo === motivo);
            const qtdSalva = lanc ? lanc.quantidade : "";
            
            htmlColunas += `
                <td style="text-align: center;">
                    <input type="number" min="0" class="input-qtd" 
                        data-matricula="${carteiro.matricula}" 
                        data-nome="${carteiro.nome}" 
                        data-motivo="${motivo}" 
                        value="${qtdSalva}" placeholder="-">
                </td>
            `;
        });

        tr.innerHTML = htmlColunas;
        tabelaLancamentoLinhas.appendChild(tr);
    });
}

if (formDevolucaoLote) {
    formDevolucaoLote.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dataSelecionada = formatarDataParaBR(inputDataDevolucao.value);
        const inputs = tabelaLancamentoLinhas.querySelectorAll('.input-qtd');

        await supabaseClient.from('lancamentos').delete().eq('data', dataSelecionada);

        const novosLancamentos = [];
        inputs.forEach(input => {
            const qtd = parseInt(input.value);
            if (!isNaN(qtd) && qtd > 0) {
                novosLancamentos.push({
                    matricula: input.dataset.matricula,
                    nome: input.dataset.nome,
                    motivo: input.dataset.motivo,
                    quantidade: qtd,
                    data: dataSelecionada
                });
            }
        });

        if (novosLancamentos.length > 0) {
            const { error } = await supabaseClient.from('lancamentos').insert(novosLancamentos);
            if (error) {
                console.error("Erro ao salvar lançamentos:", error);
                alert("Erro ao salvar os lançamentos no Supabase.");
                return;
            }
        }

        // CHAMA A GERAÇÃO DO RELATÓRIO AQUI PARA ATUALIZAR A TELA NA HORA
        await gerarVisualizacaoRelatorio();

        alert(`Lançamentos salvos com sucesso para a data ${dataSelecionada}!`);
    });
}

// ==========================================
// 9. RELATÓRIOS E VISUALIZAÇÃO PARA PDF
// ==========================================
async function gerarVisualizacaoRelatorio() {
    const dataSelecionadaISO = inputDataDevolucao ? inputDataDevolucao.value : '';
    const dataFormatadaBR = formatarDataParaBR(dataSelecionadaISO);

    const spanDataRelatorio = document.getElementById('relatorio-data-texto');
    if (spanDataRelatorio) {
        spanDataRelatorio.textContent = dataFormatadaBR || '--/--/----';
    }

    const tbodyRelatorio = document.getElementById('relatorio-tabela-linhas');
    if (!tbodyRelatorio) return;

    const [resMotivos, resLancamentos] = await Promise.all([
        supabaseClient.from('motivos').select('nome'),
        supabaseClient.from('lancamentos').select('*').eq('data', dataFormatadaBR)
    ]);

    const motivos = (resMotivos.data || []).map(m => m.nome);
    const lancamentos = resLancamentos.data || [];

    tbodyRelatorio.innerHTML = "";

    motivos.forEach(motivo => {
        const totalMotivo = lancamentos
            .filter(l => l.motivo === motivo)
            .reduce((acc, curr) => acc + curr.quantidade, 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${motivo}</td>
            <td style="text-align: center; font-weight: bold;">${totalMotivo}</td>
        `;
        tbodyRelatorio.appendChild(tr);
    });
}

// ==========================================
// 10. GERAÇÃO DE PDF / IMPRESSÃO
// ==========================================
if (btnGerarPdf) {
    btnGerarPdf.addEventListener('click', () => {
        window.print();
    });
}