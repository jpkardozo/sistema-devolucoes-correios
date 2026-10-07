// ==========================================================================
// SELETORES DE ELEMENTOS DO DOM
// ==========================================================================
const formGestor = document.getElementById('form-gestor');
const inputNomeGestor = document.getElementById('nome-gestor');
const inputMatriculaGestor = document.getElementById('matricula-gestor');
const gestorSalvoInfo = document.getElementById('gestor-salvo-info');

const formCarteiro = document.getElementById('form-carteiro');
const inputNomeCarteiro = document.getElementById('nome-carteiro');
const inputMatriculaCarteiro = document.getElementById('matricula-carteiro');

const formMotivo = document.getElementById('form-motivo');
const inputNomeMotivo = document.getElementById('nome-motivo');

const formDevolucao = document.getElementById('form-devolucao');
const inputDataDevolucao = document.getElementById('data-devolucao');
const selectCarteiro = document.getElementById('select-carteiro');
const selectMotivo = document.getElementById('select-motivo');
const inputQtdObjetos = document.getElementById('qtd-objetos');

const pdfData = document.getElementById('pdf-data');
const pdfGestorNome = document.getElementById('pdf-gestor-nome');
const pdfGestorMat = document.getElementById('pdf-gestor-mat');
const cabecalhoTabela = document.getElementById('cabecalho-tabela');
const tabelaPdfLinhas = document.getElementById('tabela-pdf-linhas');
const rodapeTabela = document.getElementById('rodape-tabela');
const btnGerarPdf = document.getElementById('btn-gerar-pdf');

// Motivos Padrão dos Correios caso a tabela esteja vazia
const motivosIniciaisPadrao = ["Mudou-se", "Endereço Insuficiente", "Ausente", "Não Procurado", "Recusado"];

// ==========================================================================
// FUNÇÕES AUXILIARES (TRATAMENTO DE DATAS E MÁSCARAS)
// ==========================================================================

function aplicarMascaraMatricula(inputElement) {
    inputElement.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 1) value = value.substring(0, 1) + "." + value.substring(1);
        if (value.length > 5) value = value.substring(0, 5) + "." + value.substring(5);
        if (value.length > 9) value = value.substring(0, 9) + "-" + value.substring(9, 10);
        e.target.value = value;
    });
}

if (inputMatriculaGestor) aplicarMascaraMatricula(inputMatriculaGestor);
if (inputMatriculaCarteiro) aplicarMascaraMatricula(inputMatriculaCarteiro);

function validarFormatoMatricula(matricula) {
    return /^\d\.\d{3}\.\d{3}-\d$/.test(matricula);
}

function definirDataAtualNoInput() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    if (inputDataDevolucao) {
        inputDataDevolucao.value = `${ano}-${mes}-${dia}`;
    }
}

function formatarDataParaBR(dataIso) {
    if (!dataIso) return '--/--/----';
    const partes = dataIso.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ==========================================================================
// CRUDS E PERSISTÊNCIA DE DADOS (SUPABASE)
// ==========================================================================

// Salvar / Atualizar Gestor Imediato
if (formGestor) {
    formGestor.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = inputNomeGestor.value.trim();
        const matricula = inputMatriculaGestor.value;

        if (!validarFormatoMatricula(matricula)) {
            alert("Erro: A matrícula deve seguir estritamente o padrão 0.000.000-0");
            return;
        }

        const { error } = await window.supabase
            .from('gestor')
            .upsert({ id: 'atual', nome, matricula });

        if (error) {
            console.error("Erro ao salvar gestor:", error.message);
            alert("Erro ao salvar o gestor no Supabase.");
            return;
        }

        await carregarGestor();
        alert("Gestor salvo com sucesso!");
    });
}

async function carregarGestor() {
    const { data, error } = await window.supabase
        .from('gestor')
        .select('*')
        .eq('id', 'atual')
        .maybeSingle();

    if (error) {
        console.error("Erro ao carregar gestor:", error.message);
        return;
    }

    if (data) {
        gestorSalvoInfo.textContent = `Gestor Atual: ${data.nome} (${data.matricula})`;
        pdfGestorNome.textContent = data.nome;
        pdfGestorMat.textContent = data.matricula;
    } else {
        gestorSalvoInfo.textContent = "Nenhum gestor cadastrado ainda.";
    }
}

// Cadastrar Carteiro
if (formCarteiro) {
    formCarteiro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = inputNomeCarteiro.value.trim();
        const matricula = inputMatriculaCarteiro.value;

        if (!validarFormatoMatricula(matricula)) {
            alert("Erro: A matrícula do carteiro deve seguir o padrão 0.000.000-0");
            return;
        }

        const { error } = await window.supabase
            .from('carteiros')
            .upsert({ matricula, nome });

        if (error) {
            console.error("Erro ao cadastrar carteiro:", error.message);
            alert("Erro ao cadastrar carteiro.");
            return;
        }

        formCarteiro.reset();
        await carregarDropdownCarteiros();
        await gerarVisualizacaoRelatorio();
        alert("Carteiro cadastrado com sucesso!");
    });
}

async function carregarDropdownCarteiros() {
    const valorPreSelecionado = selectCarteiro.value;

    const { data: carteiros, error } = await window.supabase
        .from('carteiros')
        .select('*')
        .order('nome', { ascending: true });

    if (error) {
        console.error("Erro ao carregar carteiros:", error.message);
        return;
    }

    selectCarteiro.innerHTML = '<option value="">-- Escolha um carteiro cadastrado --</option>';
    
    if (carteiros) {
        carteiros.forEach(carteiro => {
            const option = document.createElement('option');
            option.value = JSON.stringify(carteiro);
            option.textContent = `${carteiro.nome} (${carteiro.matricula})`;
            selectCarteiro.appendChild(option);
        });
    }

    if (valorPreSelecionado) {
        selectCarteiro.value = valorPreSelecionado;
    }
}

// Cadastrar Novo Motivo de Devolução
if (formMotivo) {
    formMotivo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = inputNomeMotivo.value.trim();

        if (!nome) return;

        const { error } = await window.supabase
            .from('motivos')
            .upsert({ nome });

        if (error) {
            console.error("Erro ao cadastrar motivo:", error.message);
            alert("Erro ao cadastrar motivo.");
            return;
        }

        formMotivo.reset();
        await carregarDropdownMotivos();
        await gerarVisualizacaoRelatorio();
        alert("Motivo cadastrado com sucesso!");
    });
}

async function carregarDropdownMotivos() {
    const valorPreSelecionado = selectMotivo.value;

    const { data: motivosData, error } = await window.supabase
        .from('motivos')
        .select('nome');

    if (error) {
        console.error("Erro ao carregar motivos:", error.message);
        return;
    }

    let motivos = motivosData ? motivosData.map(m => m.nome) : [];

    if (motivos.length === 0) {
        const payloadIniciais = motivosIniciaisPadrao.map(m => ({ nome: m }));
        const { error: errIns } = await window.supabase.from('motivos').upsert(payloadIniciais);
        if (!errIns) {
            return carregarDropdownMotivos();
        }
    }

    selectMotivo.innerHTML = '<option value="">-- Escolha um motivo cadastrado --</option>';
    motivos.forEach(motivo => {
        const option = document.createElement('option');
        option.value = motivo;
        option.textContent = motivo;
        selectMotivo.appendChild(option);
    });

    if (valorPreSelecionado) {
        selectMotivo.value = valorPreSelecionado;
    }
}

// Registrar Lançamento de Devolução
if (formDevolucao) {
    formDevolucao.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectCarteiro.value || !selectMotivo.value || !inputDataDevolucao.value) return;

        const carteiro = JSON.parse(selectCarteiro.value);
        const motivo = selectMotivo.value;
        const quantidade = parseInt(inputQtdObjetos.value);
        const dataSelecionada = formatarDataParaBR(inputDataDevolucao.value);

        if (isNaN(quantidade) || quantidade <= 0) {
            alert("Insira uma quantidade válida.");
            return;
        }

        const { data: existente, error: errBusca } = await window.supabase
            .from('lancamentos')
            .select('*')
            .eq('data', dataSelecionada)
            .eq('matricula', carteiro.matricula)
            .eq('motivo', motivo)
            .maybeSingle();

        if (errBusca) {
            console.error("Erro ao consultar lançamentos:", errBusca.message);
            return;
        }

        let errorOp;
        if (existente) {
            const novaQtd = existente.quantidade + quantidade;
            const { error } = await window.supabase
                .from('lancamentos')
                .update({ quantidade: novaQtd })
                .eq('id', existente.id);
            errorOp = error;
        } else {
            const { error } = await window.supabase
                .from('lancamentos')
                .insert([{
                    matricula: carteiro.matricula,
                    nome: carteiro.nome,
                    motivo: motivo,
                    quantidade: quantidade,
                    data: dataSelecionada
                }]);
            errorOp = error;
        }

        if (errorOp) {
            console.error("Erro ao salvar lançamento:", errorOp.message);
            alert("Erro ao salvar lançamento no banco de dados.");
            return;
        }

        inputQtdObjetos.value = "";
        await gerarVisualizacaoRelatorio();
        alert(`Devolução registrada com sucesso para o dia ${dataSelecionada}!`);
    });
}

if (inputDataDevolucao) {
    inputDataDevolucao.addEventListener('change', gerarVisualizacaoRelatorio);
}

// ==========================================================================
// RENDERIZAÇÃO DO RELATÓRIO DO DIA
// ==========================================================================

async function gerarVisualizacaoRelatorio() {
    if (!inputDataDevolucao) return;
    const dataFiltro = formatarDataParaBR(inputDataDevolucao.value);
    pdfData.textContent = dataFiltro;

    const [resCarteiros, resMotivos, resLancamentos] = await Promise.all([
        window.supabase.from('carteiros').select('*').order('nome', { ascending: true }),
        window.supabase.from('motivos').select('nome'),
        window.supabase.from('lancamentos').select('*').eq('data', dataFiltro)
    ]);

    const carteiros = resCarteiros.data || [];
    const motivos = (resMotivos.data || []).map(m => m.nome);
    const lancamentos = resLancamentos.data || [];

    cabecalhoTabela.innerHTML = `
        <th>Matrícula</th>
        <th>Carteiro</th>
        ${motivos.map(m => `<th style="text-align: center;">${m}</th>`).join('')}
        <th style="text-align: center;">Total</th>
    `;

    tabelaPdfLinhas.innerHTML = "";

    if (carteiros.length === 0) {
        tabelaPdfLinhas.innerHTML = `<tr><td colspan="${motivos.length + 3}" style="text-align: center; color: #888;">Nenhum carteiro cadastrado no sistema.</td></tr>`;
        rodapeTabela.innerHTML = "";
        return;
    }

    const totaisPorMotivo = {};
    motivos.forEach(m => totaisPorMotivo[m] = 0);
    let totalGeralDoDia = 0;

    carteiros.forEach(carteiro => {
        let totalCarteiro = 0;
        const colunasQuantidade = [];

        motivos.forEach(motivo => {
            const lanc = lancamentos.find(l => l.matricula === carteiro.matricula && l.motivo === motivo);
            const qtd = lanc ? lanc.quantidade : 0;

            colunasQuantidade.push(`<td style="text-align: center;">${qtd > 0 ? qtd : '-'}</td>`);
            totaisPorMotivo[motivo] += qtd;
            totalCarteiro += qtd;
        });

        totalGeralDoDia += totalCarteiro;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${carteiro.matricula}</td>
            <td>${carteiro.nome}</td>
            ${colunasQuantidade.join('')}
            <td style="text-align: center; font-weight: bold;">${totalCarteiro}</td>
        `;
        tabelaPdfLinhas.appendChild(tr);
    });

    rodapeTabela.innerHTML = `
        <tr>
            <td colspan="2" style="font-weight: bold; text-align: right;">Total Geral:</td>
            ${motivos.map(m => `<td style="font-weight: bold; text-align: center;">${totaisPorMotivo[m]}</td>`).join('')}
            <td style="font-weight: bold; text-align: center;">${totalGeralDoDia}</td>
        </tr>
    `;
}

// ==========================================================================
// EXPORTAÇÃO EM PDF
// ==========================================================================
if (btnGerarPdf) {
    btnGerarPdf.addEventListener('click', async () => {
        const { data: gestor, error } = await window.supabase
            .from('gestor')
            .select('*')
            .eq('id', 'atual')
            .maybeSingle();

        if (error || !gestor) {
            alert("Erro: Por favor, realize o cadastro do Gestor Imediato antes de exportar o PDF.");
            return;
        }

        const elementoRelatorio = document.getElementById('area-relatorio');
        const dataFiltroArquivo = formatarDataParaBR(inputDataDevolucao.value).replace(/\//g, '-');
        
        const opcoes = {
            margin:       [2, 2, 2, 2],
            filename:     `Relatorio_Devolucoes_${dataFiltroArquivo}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, letterRendering: true }, 
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        html2pdf().set(opcoes).from(elementoRelatorio).save();
    });
}

// ==========================================================================
// INICIALIZAÇÃO DO SISTEMA
// ==========================================================================
async function inicializarSistema() {
    definirDataAtualNoInput(); 
    await carregarGestor();
    await carregarDropdownCarteiros();
    await carregarDropdownMotivos();
    await gerarVisualizacaoRelatorio();
}

document.addEventListener('DOMContentLoaded', inicializarSistema);