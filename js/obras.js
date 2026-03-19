import { STATE, apiUpdate, apiDelete, apiAdd, parseDate, fmtBRL, fmtDate, today } from './config.js';
import { showToast, showMasterSection, switchObraTab, openModal, closeModal } from './ui.js';

// ── Grid de Obras e Orçamentos ──────────────────────────────
export function renderMasterObrasGrid(){
    const grid = document.getElementById('master-obras-grid');
    const orcGrid = document.getElementById('master-orcamentos-grid');
    if(!grid) return;

    grid.innerHTML = '';
    if(orcGrid) orcGrid.innerHTML = '';

    STATE.obras.forEach(o => {
        const card = `
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h4 class="font-bold text-sm uppercase text-arcco-black truncate">${o.nome}</h4>
                <div class="flex gap-2 mt-4">
                    <button onclick="APP.openObraDetail('${o.firebaseId}')" class="flex-1 bg-arcco-black text-white text-[10px] font-bold py-2 rounded">ABRIR</button>
                    <button onclick="APP.duplicarObra('${o.firebaseId}')" class="px-3 bg-gray-100 rounded border" title="Duplicar"><i data-lucide="copy" class="w-4 h-4 text-gray-400"></i></button>
                    <button onclick="APP.deleteObraCompleta('${o.firebaseId}')" class="px-3 bg-red-50 rounded border border-red-200 text-arcco-red" title="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>`;
        
        // Separação automática por tipo
        if(o.tipo === 'ORÇAMENTO') {
            if(orcGrid) orcGrid.innerHTML += card;
        } else {
            grid.innerHTML += card;
        }
    });
    lucide.createIcons();
}

// ── Duplicação com Edição ───────────────────────────
export const duplicarObra = (id) => {
    const orig = STATE.obras.find(x => x.firebaseId === id);
    if (!orig) return;
    openModal('modal-nova-obra');
    document.getElementById('new-obra-nome').value = `${orig.nome} (Cópia)`;
    document.getElementById('new-obra-cliente').value = orig.clienteId;
    document.getElementById('new-obra-tipo').value = 'ORÇAMENTO';
    STATE.skeletonTasks = orig.tasks || [];
    showToast('Ajuste o nome e salve para criar o orçamento');
};

// ── Verificação de Equipe e Custo (MaisControle) ───
export const updateTeamSelection = () => {
    const leaderId = document.getElementById('task-fornecedor').value;
    const container = document.getElementById('team-validation-area');
    if (!leaderId) { container.classList.add('hidden'); return; }

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
        alertBox.className = 'p-3 rounded bg-red-50 text-red-600 border border-red-200';
        alertBox.innerText = `⚠️ ESTOURO: Equipe ${fmtBRL(totalEquipe)} > Orçado ${fmtBRL(custo)}`;
    } else {
        alertBox.className = 'p-3 rounded bg-green-50 text-green-600 border border-green-200';
        alertBox.innerText = `✅ DENTRO: Sobra ${fmtBRL(custo - totalEquipe)}`;
    }
};

// ── Gestão de Tarefas e Cronograma ───────────────────────────
export const openObraDetail = (fId) => {
    STATE.currentObraId = fId;
    showMasterSection('obra-detail');
    renderObraDetail(fId);
};

export function renderObraDetail(fId){
    const o = STATE.obras.find(x => x.firebaseId === fId);
    if(!o) return;
    document.getElementById('det-obra-nome').innerText = o.nome;
    const fSel = document.getElementById('task-fornecedor');
    fSel.innerHTML = '<option value="">(LÍDER)</option>' +
        STATE.forn.filter(f => f.status==='ativo'&&f.vinculo==='MASTER').map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    renderTasks(o.tasks || []);
}

export const saveTaskToObra = async () => {
    const fId = STATE.currentObraId;
    const o = STATE.obras.find(x => x.firebaseId === fId);
    const custoTotal = parseFloat(document.getElementById('task-custo-total').value) || 0;
    const bdi = parseFloat(document.getElementById('task-bdi').value) || 0;
    
    const newTask = {
        id: `T-${Date.now()}`,
        nome: document.getElementById('task-nome').value,
        prazo: document.getElementById('task-prazo').value,
        inicio: document.getElementById('task-inicio').value,
        fim: document.getElementById('task-fim').value,
        valor_venda: custoTotal * (1 + bdi / 100),
        status: 0
    };
    await apiUpdate('obras', fId, { tasks: [...(o.tasks || []), newTask] });
    showToast('Serviço Salvo');
    renderObraDetail(fId);
};

function renderTasks(tasks){
    const list = document.getElementById('det-cronograma-list');
    list.innerHTML = tasks.map(t => `
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center mb-3">
            <div><h5 class="text-[11px] font-bold uppercase">${t.nome}</h5><p class="text-[9px] text-gray-400 font-bold uppercase">${fmtDate(t.inicio)} até ${fmtDate(t.fim)}</p></div>
            <span class="text-[10px] font-black bg-arcco-black text-arcco-lime px-3 py-1 rounded">PERT: ${t.prazo}d</span>
        </div>`).join('');
}

export const deleteObraCompleta = async (id) => {
    if(!confirm('Excluir esta obra permanentemente?')) return;
    await apiDelete('obras', id);
    renderMasterObrasGrid();
    showToast('OBRA EXCLUÍDA');
};
