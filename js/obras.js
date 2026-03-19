import { STATE, apiUpdate, apiDelete, today, parseDate, fmtBRL, fmtDate } from './config.js';
import { showToast, showMasterSection, switchObraTab, openModal, closeModal } from './ui.js';

// ── Renderização do Grid ─────────────────────────────────────
export function renderMasterObrasGrid(){
    const grid = document.getElementById('master-obras-grid');
    const orcGrid = document.getElementById('master-orcamentos-grid');
    
    if(!grid) return;
    grid.innerHTML = '';
    if(orcGrid) orcGrid.innerHTML = '';

    STATE.obras.forEach(o => {
        const cli = STATE.clients.find(c => c.id === o.clienteId);
        const card = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col p-5">
                <h4 class="font-montserrat font-bold text-sm uppercase text-arcco-black truncate">${o.nome}</h4>
                <p class="text-[9px] font-bold text-gray-400 uppercase mt-1">Cliente: ${cli?.nome || 'Não definido'}</p>
                <div class="flex gap-2 mt-4">
                    <button onclick="APP.openObraDetail('${o.firebaseId}')" class="flex-1 bg-arcco-black text-white text-[10px] font-bold py-2 rounded">ABRIR</button>
                    <button onclick="APP.duplicarObra('${o.firebaseId}')" class="px-3 bg-gray-100 rounded border border-gray-200" title="Duplicar"><i data-lucide="copy" class="w-3.5 h-3.5 text-gray-500"></i></button>
                    <button onclick="APP.deleteObraCompleta('${o.firebaseId}')" class="px-3 bg-red-50 rounded border border-red-200 text-arcco-red" title="Excluir"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
            </div>`;
        
        // Se a obra for do tipo Orçamento ou Proposta, vai para o grid de Orçamentos
        if(o.tipo?.toUpperCase().includes('ORÇAMENTO')) {
            if(orcGrid) orcGrid.innerHTML += card;
        } else {
            grid.innerHTML += card;
        }
    });
    lucide.createIcons();
}

// ── Duplicação com Edição ────────────────────────────────────
export const duplicarObra = (id) => {
    const orig = STATE.obras.find(x => x.firebaseId === id);
    if (!orig) return;

    openModal('modal-nova-obra');
    document.getElementById('new-obra-nome').value = `${orig.nome} (Cópia)`;
    document.getElementById('new-obra-cliente').value = orig.clienteId;
    
    // Guardamos o esqueleto no STATE para o "Salvar" incluir os itens
    STATE.skeletonTasks = (orig.tasks || []).map(t => ({
        ...t, id: `T-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, status: 0
    }));
    showToast('Ajuste o nome e clique em Criar para copiar o esqueleto');
};

// ── Detalhe e Cronograma ─────────────────────────────────────
export const openObraDetail = (fId) => {
    STATE.currentObraId = fId;
    showMasterSection('obra-detail');
    switchObraTab('cronograma');
    renderObraDetail(fId);
};

export function renderObraDetail(fId){
    const o = STATE.obras.find(x => x.firebaseId === fId);
    if(!o) return;
    document.getElementById('det-obra-nome').innerText = o.nome;
    renderTasks(o.tasks || []);
    
    // Prepara o select de fornecedores para o modal
    const fSel = document.getElementById('task-fornecedor');
    fSel.innerHTML = '<option value="">(SELECIONE O LÍDER)</option>' +
        STATE.forn.filter(f => f.status==='ativo'&&f.vinculo==='MASTER').map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
}

// ── Verificação de Equipe e Custo (MaisControle) ─────────────
export const updateTeamSelection = () => {
    const leaderId = document.getElementById('task-fornecedor').value;
    const container = document.getElementById('team-validation-area');
    if (!leaderId) { container.classList.add('hidden'); return; }

    const leader = STATE.forn.find(f => f.id === leaderId);
    const members = STATE.forn.filter(f => f.vinculo === leaderId && f.status === 'ativo');

    container.classList.remove('hidden');
    document.getElementById('team-members-list').innerHTML = members.map(m => `
        <label class="flex justify-between items-center p-2 bg-white rounded border border-gray-100 cursor-pointer">
            <div class="flex items-center gap-2">
                <input type="checkbox" class="member-check w-3 h-3" data-diaria="${m.diaria}" checked onchange="APP.calcBudgetValidation()">
                <span class="text-[10px] font-bold text-gray-700">${m.nome}</span>
            </div>
            <span class="text-[9px] text-gray-400">${fmtBRL(m.diaria)}</span>
        </label>
    `).join('');
    calcBudgetValidation();
};

export const calcBudgetValidation = () => {
    const custo = parseFloat(document.getElementById('task-custo-total').value) || 0;
    const bdi = parseFloat(document.getElementById('task-bdi').value) || 0;
    const venda = custo * (1 + bdi / 100);
    const dias = parseInt(document.getElementById('task-prazo').value) || 1;
    
    document.getElementById('task-venda-preview').innerText = fmtBRL(venda);

    const leaderId = document.getElementById('task-fornecedor').value;
    if (!leaderId) return;

    const leader = STATE.forn.find(f => f.id === leaderId);
    let custoEquipe = parseFloat(leader.diaria || 0);
    document.querySelectorAll('.member-check:checked').forEach(i => custoEquipe += parseFloat(i.dataset.diaria));

    const totalEquipe = custoEquipe * dias;
    const alertBox = document.getElementById('budget-alert');
    alertBox.classList.remove('hidden');

    if (totalEquipe > custo) {
        alertBox.className = 'p-3 rounded-lg border bg-red-50 border-red-200 text-arcco-red flex items-center gap-2';
        alertBox.innerHTML = `<i data-lucide="alert-octagon"></i> ESTOURO: Equipe ${fmtBRL(totalEquipe)} > Orçado ${fmtBRL(custo)}`;
    } else {
        alertBox.className = 'p-3 rounded-lg border bg-green-50 border-green-200 text-green-700 flex items-center gap-2';
        alertBox.innerHTML = `<i data-lucide="check-circle"></i> SALDO POSITIVO: Sobra ${fmtBRL(custo - totalEquipe)}`;
    }
    lucide.createIcons();
};

// ── Salvar e Alertas de Sobreposição ────────────────────────
export const saveTaskToObra = async () => {
    const fId = STATE.currentObraId;
    const o = STATE.obras.find(x => x.firebaseId === fId);
    if(!o) return;

    const newTask = {
        id: `T-${Date.now()}`,
        nome: document.getElementById('task-nome').value,
        prazo: document.getElementById('task-prazo').value,
        custo_total: document.getElementById('task-custo-total').value,
        bdi: document.getElementById('task-bdi').value,
        valor_venda: parseFloat(document.getElementById('task-custo-total').value) * (1 + parseFloat(document.getElementById('task-bdi').value)/100),
        fornecedor: document.getElementById('task-fornecedor').value,
        inicio: document.getElementById('task-inicio').value,
        fim: document.getElementById('task-fim').value,
        status: 0
    };

    const updatedTasks = [...(o.tasks || []), newTask];
    await apiUpdate('obras', fId, { tasks: updatedTasks });
    showToast('SERVIÇO SALVO');
    renderObraDetail(fId);
};

const hasOverlap = (t1, tasks) => {
    const s1 = parseDate(t1.inicio);
    const e1 = parseDate(t1.fim);
    return tasks.some(t2 => t1.id !== t2.id && s1 <= parseDate(t2.fim) && e1 >= parseDate(t2.inicio));
};

function renderTasks(tasks){
    const list = document.getElementById('det-cronograma-list');
    if(!list) return;
    list.innerHTML = tasks.map(t => {
        const overlap = hasOverlap(t, tasks);
        return `
            <div class="bg-white p-4 rounded-xl border ${overlap?'border-orange-300 bg-orange-50/30':'border-gray-200'} shadow-sm mb-3">
                <div class="flex justify-between items-start">
                    <h5 class="text-[11px] font-bold uppercase text-arcco-black">${t.nome}</h5>
                    <span class="text-[10px] font-extrabold px-3 py-1 bg-arcco-black text-arcco-lime rounded">PERT: ${t.prazo}d</span>
                </div>
                <div class="flex gap-4 mt-3">
                    <div class="flex flex-col"><span class="text-[9px] font-bold text-gray-400">INÍCIO</span><span class="text-[11px] font-bold text-arcco-black">${fmtDate(t.inicio)}</span></div>
                    <div class="flex flex-col"><span class="text-[9px] font-bold text-gray-400">TÉRMINO</span><span class="text-[11px] font-bold text-arcco-black">${fmtDate(t.fim)}</span></div>
                </div>
                ${overlap ? `<div class="text-[9px] font-bold text-orange-600 mt-2 uppercase flex items-center gap-1"><i data-lucide="layers" class="w-3 h-3"></i> Alerta de Sobreposição</div>`:''}
            </div>`;
    }).join('');
    lucide.createIcons();
}
