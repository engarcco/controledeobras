// ============================================================
// medicoes.js — Medições, Diárias e Pagamentos
// ============================================================

import { STATE, apiUpdate, fmtBRL, fmtDate } from './config.js';
import { showToast, openModal, closeModal } from './ui.js';

// ── Render Medições ───────────────────────────────────────────
export function renderMedicoes(){
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;

    const medicoes = o.medicoes||[];
    const diarias  = o.diarias||[];

    const totalDiarias      = diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0);
    const totalAdmRecebido  = medicoes.filter(m => m.statusAdm==='recebido').reduce((a,m) => a+(parseFloat(m.valorAdm)||0),0);
    const totalAdmPendente  = medicoes.filter(m => m.statusAdm!=='recebido').reduce((a,m) => a+(parseFloat(m.valorAdm)||0),0);

    document.getElementById('medicoes-resumo').innerHTML = `
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Diárias Pagas</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(totalDiarias)}</p>
            <p class="text-[9px] font-bold text-gray-400 uppercase mt-1">${diarias.length} lançamentos</p>
        </div>
        <div class="bg-arcco-lime/10 p-5 rounded-xl border border-arcco-lime/40 shadow-sm">
            <p class="text-[9px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3 h-3"></i> ADM Recebida</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(totalAdmRecebido)}</p>
            <p class="text-[9px] font-bold text-gray-500 uppercase mt-1">${medicoes.filter(m => m.statusAdm==='recebido').length} medições</p>
        </div>
        <div class="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm">
            <p class="text-[9px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ADM Pendente</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(totalAdmPendente)}</p>
            <p class="text-[9px] font-bold text-orange-500 uppercase mt-1">${medicoes.filter(m => m.statusAdm!=='recebido').length} em aberto</p>
        </div>`;

    const diariasPend = diarias.filter(d => !d.medicaoId);
    const contDP = document.getElementById('diarias-pendentes-container');
    const listDP = document.getElementById('diarias-pendentes-list');
    if(diariasPend.length){
        contDP.classList.remove('hidden');
        listDP.innerHTML = diariasPend.map(d => `
            <div class="flex justify-between items-center bg-white p-3 rounded border border-orange-100 shadow-sm">
                <div>
                    <p class="text-xs font-bold text-arcco-black">${d.forn} — ${d.desc}</p>
                    <p class="text-[9px] font-bold text-gray-400 uppercase mt-0.5">${fmtDate(d.data)} • ${d.qtd} diária(s)</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-sm text-arcco-orange">${fmtBRL(d.total)}</span>
                    <button onclick="APP.deleteDiaria('${d.id}')" class="w-7 h-7 rounded bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-100"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                </div>
            </div>`).join('');
    } else { contDP.classList.add('hidden'); }

    const medList = document.getElementById('medicoes-list');
    if(!medicoes.length){
        medList.innerHTML = '<div class="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm font-bold text-gray-400 uppercase">Nenhuma medição registrada ainda.</div>';
    } else {
        medList.innerHTML = [...medicoes].reverse().map(m => `
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="bg-gray-50 border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <span class="text-[9px] font-bold uppercase px-2 py-1 rounded ${m.periodo==='quinzenal'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'} border">${m.periodo}</span>
                        <p class="font-montserrat font-bold text-base uppercase text-arcco-black mt-2">${fmtDate(m.inicio)} → ${fmtDate(m.fim)}</p>
                        ${m.obs?`<p class="text-[10px] text-gray-500 mt-1">${m.obs}</p>`:''}
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-[9px] font-bold text-gray-500 uppercase">ADM:</span>
                            <span class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(m.valorAdm)}</span>
                            <button onclick="APP.toggleStatusAdm('${m.id}')" class="text-[9px] font-bold uppercase px-3 py-1.5 rounded border transition-colors ${m.statusAdm==='recebido'?'badge-pago hover:bg-red-50 hover:text-red-600 hover:border-red-200':'badge-pendente hover:bg-green-50 hover:text-green-700 hover:border-green-200'}">
                                ${m.statusAdm==='recebido'?'✓ Recebido':'Marcar Recebido'}
                            </button>
                        </div>
                        <p class="text-[9px] font-bold text-gray-400 uppercase">Custo medido: ${fmtBRL(m.custoMedido)} | Diárias: ${fmtBRL(m.totalDiarias||0)}</p>
                    </div>
                </div>
                ${m.etapas?.length?`
                <div class="p-4">
                    <p class="text-[9px] font-bold text-gray-400 uppercase mb-2">Etapas incluídas:</p>
                    <div class="flex flex-wrap gap-2">
                        ${m.etapas.map(et => `<span class="text-[9px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded">${et.nome} — ${et.pct}%</span>`).join('')}
                    </div>
                </div>`:''}
                <div class="bg-gray-50 border-t border-gray-100 p-3 flex justify-end">
                    <button onclick="APP.deleteMedicao('${m.id}')" class="text-[10px] font-bold text-gray-400 hover:text-arcco-red uppercase flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i> Excluir Medição</button>
                </div>
            </div>`).join('');
    }
    lucide.createIcons();
}

// ── Modal Nova Medição ────────────────────────────────────────
export const openModalNovaMedicao = () => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;
    const tasks   = o.tasks||[];
    const mods    = [...new Set(tasks.map(t => t.modulo))];
    const diarias = (o.diarias||[]).filter(d => !d.medicaoId);

    document.getElementById('med-inicio').value = '';
    document.getElementById('med-fim').value    = '';
    document.getElementById('med-obs').value    = '';

    document.getElementById('med-etapas-list').innerHTML = mods.length
        ? mods.map((m,i) => {
            const mTasks = tasks.filter(t => t.modulo===m);
            const done   = mTasks.filter(t => t.status===2).length;
            const pct    = mTasks.length?Math.round(done/mTasks.length*100):0;
            const custo  = mTasks.reduce((a,t) => a+(parseFloat(t.valor)||0),0);
            return `
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                <input type="checkbox" id="med-etapa-${i}" class="med-etapa-chk w-4 h-4 accent-arcco-black" data-custo="${custo}" data-modulo="${m}" data-pct="${pct}" onchange="APP.calcMedicaoTotal()">
                <label for="med-etapa-${i}" class="flex-1 cursor-pointer">
                    <p class="text-xs font-bold text-arcco-black uppercase">${m}</p>
                    <p class="text-[9px] font-bold text-gray-400 uppercase">${done}/${mTasks.length} concluídos • Custo: ${fmtBRL(custo)}</p>
                </label>
                <div class="flex items-center gap-1">
                    <input type="number" class="med-etapa-pct w-16 text-xs font-bold border border-gray-300 rounded p-1" placeholder="${pct}%" min="0" max="100" onchange="APP.calcMedicaoTotal()">
                    <span class="text-[9px] text-gray-400">%</span>
                </div>
            </div>`;
        }).join('')
        : '<p class="text-[10px] text-gray-400 font-bold uppercase text-center py-3">Nenhuma etapa no cronograma.</p>';

    const divDiarias = document.getElementById('med-diarias-list');
    if(diarias.length){
        divDiarias.innerHTML = diarias.map(d => `
            <div class="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                <div>
                    <p class="text-[10px] font-bold text-arcco-black">${d.forn} — ${d.desc}</p>
                    <p class="text-[9px] text-gray-400 uppercase">${fmtDate(d.data)}</p>
                </div>
                <span class="font-bold text-xs text-arcco-orange">${fmtBRL(d.total)}</span>
            </div>`).join('');
        document.getElementById('med-total-diarias').innerText = fmtBRL(diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0));
    } else {
        divDiarias.innerHTML = '<p class="text-[10px] text-gray-400 font-bold uppercase text-center py-2">Sem diárias pendentes para esta obra.</p>';
        document.getElementById('med-total-diarias').innerText = fmtBRL(0);
    }

    document.getElementById('med-custo-display').innerText = fmtBRL(0);
    document.getElementById('med-adm-display').innerText   = fmtBRL(0);
    document.getElementById('med-total-display').innerText = fmtBRL(0);

    openModal('modal-nova-medicao');
    lucide.createIcons();
};

export const calcMedicaoTotal = () => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const taxa = parseFloat(o?.taxa_adm)||0;
    const diarias = (o?.diarias||[]).filter(d => !d.medicaoId);
    const totalDiarias = diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0);

    let custoMedido = 0;
    document.querySelectorAll('.med-etapa-chk').forEach(chk => {
        if(!chk.checked) return;
        const custo     = parseFloat(chk.dataset.custo)||0;
        const pctInput  = chk.closest('.flex').querySelector('.med-etapa-pct');
        const pct       = parseFloat(pctInput?.value)||parseFloat(chk.dataset.pct)||100;
        custoMedido    += custo*(pct/100);
    });

    const valorAdm      = custoMedido*(taxa/100);
    const totalReceber  = valorAdm+totalDiarias;

    document.getElementById('med-custo-display').innerText = fmtBRL(custoMedido);
    document.getElementById('med-adm-display').innerText   = fmtBRL(valorAdm);
    document.getElementById('med-total-display').innerText = fmtBRL(totalReceber);
};

export const saveMedicao = async () => {
    const o    = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;
    const taxa    = parseFloat(o.taxa_adm)||0;
    const diarias = (o.diarias||[]).filter(d => !d.medicaoId);
    const totalDiarias = diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0);

    let custoMedido = 0;
    const etapas = [];
    document.querySelectorAll('.med-etapa-chk').forEach(chk => {
        if(!chk.checked) return;
        const custo    = parseFloat(chk.dataset.custo)||0;
        const pctInput = chk.closest('.flex').querySelector('.med-etapa-pct');
        const pct      = parseFloat(pctInput?.value)||parseFloat(chk.dataset.pct)||100;
        custoMedido   += custo*(pct/100);
        etapas.push({nome:chk.dataset.modulo, pct:Math.round(pct)});
    });

    const valorAdm   = custoMedido*(taxa/100);
    const medicaoId  = `M-${Date.now()}`;

    const novaMedicao = {
        id: medicaoId,
        periodo: document.getElementById('med-periodo').value,
        inicio:  document.getElementById('med-inicio').value,
        fim:     document.getElementById('med-fim').value,
        etapas, custoMedido, totalDiarias, valorAdm,
        statusAdm: 'pendente',
        obs: document.getElementById('med-obs').value,
        criadoPor: STATE.activeUser.name,
        timestamp: Date.now()
    };

    const diariasAtualizadas = (o.diarias||[]).map(d => !d.medicaoId?{...d,medicaoId}:d);
    const medicoes = [...(o.medicoes||[]), novaMedicao];
    await apiUpdate('obras',STATE.currentObraId,{medicoes,diarias:diariasAtualizadas});
    showToast('MEDIÇÃO REGISTRADA!');
    closeModal();
    renderMedicoes();
};

export const toggleStatusAdm = async (medId) => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const medicoes = (o.medicoes||[]).map(m => {
        if(m.id!==medId) return m;
        return {...m,statusAdm:m.statusAdm==='recebido'?'pendente':'recebido',recebidoPor:STATE.activeUser.name,recebidoEm:new Date().toISOString().split('T')[0]};
    });
    await apiUpdate('obras',STATE.currentObraId,{medicoes});
    showToast('STATUS ATUALIZADO!');
    renderMedicoes();
};

export const deleteMedicao = async (medId) => {
    if(!confirm('Excluir esta medição? As diárias vinculadas voltarão para pendentes.')) return;
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const medicoes = (o.medicoes||[]).filter(m => m.id!==medId);
    const diarias  = (o.diarias||[]).map(d => d.medicaoId===medId?{...d,medicaoId:null}:d);
    await apiUpdate('obras',STATE.currentObraId,{medicoes,diarias});
    showToast('MEDIÇÃO EXCLUÍDA');
    renderMedicoes();
};

// ── Diárias ───────────────────────────────────────────────────
export const openModalNovaDiaria = () => {
    document.getElementById('diaria-forn').innerHTML =
        '<option value="">(SELECIONE)</option>' +
        STATE.forn.filter(f => f.status==='ativo').map(f => `<option value="${f.nome}" data-diaria="${f.diaria||0}">${f.nome}</option>`).join('');
    document.getElementById('diaria-forn').onchange = function(){
        const opt = this.options[this.selectedIndex];
        document.getElementById('diaria-valor-unit').value = opt.dataset.diaria||'';
        calcDiaria();
    };
    document.getElementById('diaria-data').value       = new Date().toISOString().split('T')[0];
    document.getElementById('diaria-qtd').value        = '1';
    document.getElementById('diaria-valor-unit').value = '';
    document.getElementById('diaria-desc').value       = '';
    document.getElementById('diaria-total-display').innerText = fmtBRL(0);
    openModal('modal-nova-diaria');
    lucide.createIcons();
};

export const calcDiaria = () => {
    const qtd = parseFloat(document.getElementById('diaria-qtd').value)||0;
    const val = parseFloat(document.getElementById('diaria-valor-unit').value)||0;
    document.getElementById('diaria-total-display').innerText = fmtBRL(qtd*val);
};

export const saveDiaria = async () => {
    const forn = document.getElementById('diaria-forn').value;
    const data = document.getElementById('diaria-data').value;
    const qtd  = parseFloat(document.getElementById('diaria-qtd').value)||1;
    const unit = parseFloat(document.getElementById('diaria-valor-unit').value)||0;
    const desc = document.getElementById('diaria-desc').value;
    if(!forn||!unit) return showToast('SELECIONE O TRABALHADOR E O VALOR DA DIÁRIA');
    const o    = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const nova = {id:`D-${Date.now()}`,forn,data,qtd,unit,total:qtd*unit,desc,medicaoId:null};
    await apiUpdate('obras',STATE.currentObraId,{diarias:[...(o.diarias||[]),nova]});
    showToast('DIÁRIA LANÇADA!');
    closeModal();
    renderMedicoes();
};

export const deleteDiaria = async (dId) => {
    if(!confirm('Excluir este lançamento de diária?')) return;
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    await apiUpdate('obras',STATE.currentObraId,{diarias:(o.diarias||[]).filter(d => d.id!==dId)});
    showToast('DIÁRIA EXCLUÍDA');
    renderMedicoes();
};
