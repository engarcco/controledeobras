// ============================================================
// obras.js — Obras, Tarefas, Módulos EAP e Cronograma
// ============================================================
// CORREÇÕES INCLUÍDAS NESTA VERSÃO:
//   1. duplicarObra → Abre modal para editar nome e cliente antes de salvar
//   2. Formulário de tarefa → Simplificado: Custo Total + BDI + Preço Venda
//      com toggle opcional para detalhar MO/MAT/EQ/OUTROS
//   3. Seleção de equipe → Ao selecionar Líder, carrega subordinados com checkbox
//   4. Alerta de custo de diárias vs. MO previsto no período selecionado
//   5. Datas Início/Fim/PERT maiores e visíveis; alerta de sobreposição de datas
// ============================================================

import { STATE, apiAdd, apiUpdate, apiDelete, today, parseDate,
         fmtBRL, fmtDate, todayISO, sortModulos, MOD_COLORS } from './config.js';
import { showToast, showMasterSection, switchObraTab, closeModal } from './ui.js';

// ── Obras Grid (lista de projetos na tela principal) ──────────
export function renderMasterObrasGrid(){
    const grid = document.getElementById('master-obras-grid');
    const now = today();

    // Mostra apenas obras ATIVAS (não finalizadas)
    const obrasAtivas = STATE.obras.filter(o => o.status !== 'finalizada');
    if(!obrasAtivas.length && !STATE.obras.length){
        grid.innerHTML = '<div class="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200"><p class="text-sm font-bold text-gray-400 uppercase">Nenhum projeto cadastrado.</p></div>';
        return;
    }
    if(!obrasAtivas.length){
        grid.innerHTML = '<div class="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200"><p class="text-sm font-bold text-gray-400 uppercase">Todas as obras estão finalizadas. Veja em "Finalizadas".</p></div>';
        return;
    }
    grid.innerHTML = obrasAtivas.map(o => {
        const tasks   = o.tasks||[];
        const done    = tasks.filter(t => t.status===2).length;
        const total   = tasks.length;
        const pct     = total ? Math.round(done/total*100) : 0;
        const late    = tasks.filter(t => t.status!==2 && t.fim && parseDate(t.fim)<now);
        const crit    = tasks.filter(t => t.atencao && t.status!==2);
        const cli     = STATE.clients.find(c => c.id===o.clienteId);
        const mods    = [...new Set(tasks.map(t => t.modulo))];
        const donutId = `donut-${o.firebaseId.replace(/[^a-z0-9]/gi,'_')}`;

        const pending = tasks
            .filter(t => t.status!==2 && !late.includes(t))
            .sort((a,b) => (parseDate(a.fim)||new Date(2099,0,1))-(parseDate(b.fim)||new Date(2099,0,1)));
        const nextTask = pending[0]||null;

        return `
        <div class="bg-white rounded-xl shadow-sm border ${late.length?'border-red-200':'border-gray-200'} flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200">
            <div class="p-5 pb-3">
                <div class="flex gap-4 items-start">
                    <div class="relative shrink-0 w-[72px] h-[72px]">
                        <canvas id="${donutId}" width="72" height="72"></canvas>
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span class="font-montserrat font-bold text-[11px] text-arcco-black leading-none">${pct}%</span>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-montserrat font-bold text-sm uppercase leading-tight text-arcco-black truncate">${o.nome}</h4>
                        <p class="text-[9px] font-bold text-gray-400 uppercase mt-0.5 truncate">${cli?.nome||o.clienteId}</p>
                        <div class="flex flex-wrap gap-1 mt-2">
                            <span class="text-[8px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase">${o.tipo||'OBRA'}</span>
                            ${o.contrato?`<span class="text-[8px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase">${o.contrato}</span>`:''}
                            ${crit.length?`<span class="text-[8px] font-bold text-arcco-red bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5"><i data-lucide="alert-triangle" class="w-2.5 h-2.5"></i>${crit.length}</span>`:''}
                        </div>
                    </div>
                </div>
            </div>
            ${mods.length ? `
            <div class="px-5 pb-3 space-y-1.5">
                ${mods.slice(0,4).map((m,i) => {
                    const mt = tasks.filter(t => t.modulo===m);
                    const mp = mt.length ? Math.round(mt.filter(t => t.status===2).length/mt.length*100) : 0;
                    const color = MOD_COLORS[i%MOD_COLORS.length];
                    return `<div>
                        <div class="flex justify-between mb-0.5">
                            <span class="text-[8px] font-bold text-gray-500 uppercase truncate max-w-[140px]">${m}</span>
                            <span class="text-[8px] font-bold text-gray-600 ml-2 shrink-0">${mp}%</span>
                        </div>
                        <div class="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-500" style="width:${mp}%;background-color:${color}"></div>
                        </div>
                    </div>`;
                }).join('')}
                ${mods.length>4?`<p class="text-[8px] font-bold text-gray-400 uppercase">+${mods.length-4} módulos</p>`:''}
            </div>` : ''}
            ${late.length ? `
            <div class="mx-4 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <p class="text-[9px] font-bold text-arcco-red uppercase flex items-center gap-1 mb-1.5">
                    <i data-lucide="clock" class="w-3 h-3"></i> ${late.length} em atraso
                </p>
                ${late.slice(0,2).map(t => `<p class="text-[8px] font-bold text-red-700 truncate">• ${t.nome} <span class="text-red-400 font-normal">(${fmtDate(t.fim)})</span></p>`).join('')}
                ${late.length>2?`<p class="text-[8px] text-red-400 font-bold mt-0.5">+${late.length-2} mais</p>`:''}
            </div>` : ''}
            ${nextTask ? `
            <div class="mx-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <p class="text-[8px] font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
                    <i data-lucide="arrow-right-circle" class="w-2.5 h-2.5 text-arcco-black"></i> Próximo a executar
                </p>
                <p class="text-[10px] font-bold text-arcco-black truncate">${nextTask.nome}</p>
                <p class="text-[8px] font-bold text-gray-400 uppercase mt-0.5 truncate">${nextTask.modulo}${nextTask.fim?' · '+fmtDate(nextTask.fim):''}</p>
            </div>` : done===total && total>0 ? `
            <div class="mx-4 mb-3 bg-arcco-lime/10 border border-arcco-lime/30 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <i data-lucide="check-circle-2" class="w-4 h-4 text-arcco-black shrink-0"></i>
                <p class="text-[9px] font-bold text-arcco-black uppercase">Obra 100% Concluída!</p>
            </div>` : `
            <div class="mx-4 mb-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-2.5">
                <p class="text-[9px] font-bold text-gray-400 uppercase">Nenhum serviço planejado</p>
            </div>`}
            <div class="px-5 pb-3 flex gap-3 text-center">
                <div class="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-1.5"><p class="text-[8px] font-bold text-gray-400 uppercase">Total</p><p class="font-montserrat font-bold text-sm text-arcco-black">${total}</p></div>
                <div class="flex-1 bg-arcco-lime/10 border border-arcco-lime/30 rounded-lg py-1.5"><p class="text-[8px] font-bold text-gray-600 uppercase">Concluídos</p><p class="font-montserrat font-bold text-sm text-arcco-black">${done}</p></div>
                <div class="flex-1 ${late.length?'bg-red-50 border-red-200':'bg-gray-50 border-gray-200'} border rounded-lg py-1.5"><p class="text-[8px] font-bold ${late.length?'text-arcco-red':'text-gray-400'} uppercase">Atrasos</p><p class="font-montserrat font-bold text-sm ${late.length?'text-arcco-red':'text-gray-300'}">${late.length}</p></div>
            </div>
            <div class="border-t border-gray-100 bg-gray-50 p-3 flex gap-2 mt-auto flex-wrap">
                <button onclick="APP.openObraDetail('${o.firebaseId}')" class="flex-1 bg-arcco-black text-white font-montserrat font-bold text-xs uppercase py-2.5 rounded hover:bg-gray-800 transition-colors shadow-sm min-w-[100px]">Abrir Gestão</button>
                <button onclick="APP.abrirModalEditarObra('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 flex items-center justify-center" title="Editar obra"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="APP.finalizarObra('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-green-50 hover:text-green-600 flex items-center justify-center" title="Finalizar obra"><i data-lucide="check-circle-2" class="w-4 h-4"></i></button>
                <button onclick="APP.abrirModalDuplicar('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center" title="Duplicar"><i data-lucide="copy" class="w-4 h-4"></i></button>
                <button onclick="APP.deleteObraCompleta('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:text-arcco-red flex items-center justify-center" title="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();

    // Renderiza os mini-gráficos de rosca em cada card de obra
    setTimeout(() => {
        obrasAtivas.forEach(o => {
            const tasks   = o.tasks||[];
            const mods    = [...new Set(tasks.map(t => t.modulo))];
            const donutId = `donut-${o.firebaseId.replace(/[^a-z0-9]/gi,'_')}`;
            const ctx     = document.getElementById(donutId);
            if(!ctx) return;
            const fullData   = mods.length
                ? [...mods.map(m => tasks.filter(t=>t.modulo===m&&t.status===2).length),
                   ...mods.map(m => tasks.filter(t=>t.modulo===m&&t.status!==2).length)]
                : [tasks.filter(t=>t.status===2).length, tasks.filter(t=>t.status!==2).length];
            const fullLabels = mods.length
                ? [...mods.map(m=>`${m} ✓`), ...mods.map(m=>`${m} ⏳`)]
                : ['Concluído','Pendente'];
            const fullColors = mods.length
                ? [...MOD_COLORS.slice(0,mods.length), ...mods.map(()=>'#f3f4f6')]
                : ['#ccff00','#e5e7eb'];
            new Chart(ctx, {
                type: 'doughnut',
                data: { labels: fullLabels, datasets:[{ data: fullData, backgroundColor: fullColors, borderWidth: 1, borderColor: '#fff' }]},
                options: { maintainAspectRatio:false, cutout:'66%', plugins:{tooltip:{enabled:false},legend:{display:false}} }
            });
        });
    }, 80);
}

// ── Abrir detalhe da obra ─────────────────────────────────────
export const openObraDetail = (fId) => {
    STATE.currentObraId = fId;
    cancelEditModulo();
    const mm = document.getElementById('mobile-menu');
    if(mm && !mm.classList.contains('hidden')) window.toggleMobileMenu();
    showMasterSection('obra-detail');
    switchObraTab('cronograma');
    renderObraDetail(fId);
};

// ============================================================
// NOVO: Editar dados da obra (nome, cliente, tipo)
// ============================================================
export const abrirModalEditarObra = (id) => {
    const o = STATE.obras.find(x => x.firebaseId===id);
    if(!o) return;
    document.getElementById('new-obra-nome').value = o.nome;
    document.getElementById('new-obra-tipo').value = o.tipo||'Reforma Residencial';
    const sel = document.getElementById('new-obra-cliente');
    sel.innerHTML = '<option value="">(SELECIONE O CLIENTE)</option>' +
        STATE.clients.map(c => `<option value="${c.id}" ${c.id===o.clienteId?'selected':''}>${c.nome}</option>`).join('');
    // Muda botão e título para modo edição
    const btn = document.getElementById('btn-salvar-obra');
    if(btn){ btn.innerText = 'Salvar Alterações'; btn.onclick = () => salvarEdicaoObra(id); }
    const titulo = document.getElementById('modal-nova-obra-titulo');
    if(titulo) titulo.innerText = 'Editar Obra';
    const modal = document.getElementById('modal-nova-obra');
    if(modal){ modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

export const salvarEdicaoObra = async (id) => {
    const nome = document.getElementById('new-obra-nome').value.trim();
    const cli  = document.getElementById('new-obra-cliente').value;
    const tipo = document.getElementById('new-obra-tipo').value;
    if(!nome||!cli) return showToast('Preencha nome e cliente');
    await apiUpdate('obras', id, {nome, clienteId:cli, tipo});
    showToast('OBRA ATUALIZADA!');
    closeModal();
    // Reseta modal para modo criação
    const btn = document.getElementById('btn-salvar-obra');
    if(btn){ btn.innerText = 'Criar Base da Obra'; btn.onclick = saveNovaObra; }
    const titulo = document.getElementById('modal-nova-obra-titulo');
    if(titulo) titulo.innerText = 'Nova Obra';
};

// ============================================================
// NOVO: Finalizar Obra — arquiva e registra custo final
// ============================================================
export const finalizarObra = (id) => {
    const o = STATE.obras.find(x => x.firebaseId===id);
    if(!o) return;
    const tasks      = o.tasks||[];
    const totalCusto = tasks.reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
    const totalVenda = tasks.reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
    const concluidas = tasks.filter(t=>t.status===2).length;
    document.getElementById('fin-obra-nome').innerText    = o.nome;
    document.getElementById('fin-custo-orcado').innerText = fmtBRL(totalCusto);
    document.getElementById('fin-venda-orcada').innerText = fmtBRL(totalVenda);
    document.getElementById('fin-servicos-ok').innerText  = `${concluidas} / ${tasks.length}`;
    document.getElementById('fin-custo-real').value   = '';
    document.getElementById('fin-obs-final').value    = '';
    document.getElementById('fin-obra-id').value      = id;
    const modal = document.getElementById('modal-finalizar-obra');
    if(modal){ modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

export const confirmarFinalizarObra = async () => {
    const id        = document.getElementById('fin-obra-id').value;
    const custoReal = parseFloat(document.getElementById('fin-custo-real').value)||null;
    const obs       = document.getElementById('fin-obs-final').value;
    await apiUpdate('obras', id, {
        status: 'finalizada', dataFim: todayISO(),
        custoFinal: custoReal, obsFinal: obs,
        finalizadoPor: STATE.activeUser.name
    });
    showToast('OBRA FINALIZADA E ARQUIVADA!');
    closeModal();
    showMasterSection('dash');
};

// ============================================================
// NOVO: Grid de Obras Finalizadas
// ============================================================
export function renderObrasFinalizadasGrid(){
    const grid = document.getElementById('obras-finalizadas-grid');
    if(!grid) return;
    const finalizadas = STATE.obras.filter(o => o.status==='finalizada');
    if(!finalizadas.length){
        grid.innerHTML = '<div class="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200"><p class="text-sm font-bold text-gray-400 uppercase">Nenhuma obra finalizada ainda.</p></div>';
        return;
    }
    grid.innerHTML = finalizadas.map(o => {
        const tasks      = o.tasks||[];
        const totalCusto = tasks.reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
        const totalVenda = tasks.reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
        const cli        = STATE.clients.find(c=>c.id===o.clienteId);
        const custoFinal = o.custoFinal ? parseFloat(o.custoFinal) : null;
        const variacao   = custoFinal !== null ? custoFinal - totalCusto : null;
        return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div class="bg-gray-800 px-4 py-2 flex items-center justify-between">
                <span class="text-[8px] font-bold text-arcco-lime uppercase tracking-widest flex items-center gap-1">
                    <i data-lucide="check-circle-2" class="w-3 h-3"></i> Concluída ${o.dataFim?fmtDate(o.dataFim):''}
                </span>
            </div>
            <div class="p-5 flex-1">
                <h4 class="font-montserrat font-bold text-sm uppercase leading-tight text-arcco-black truncate">${o.nome}</h4>
                <p class="text-[9px] font-bold text-gray-400 uppercase mt-0.5">${cli?.nome||o.clienteId}</p>
                <div class="mt-3 space-y-1.5">
                    <div class="flex justify-between text-[9px] font-bold uppercase"><span class="text-gray-500">Orçado:</span><span>${fmtBRL(totalCusto)}</span></div>
                    ${custoFinal!==null?`
                    <div class="flex justify-between text-[9px] font-bold uppercase"><span class="text-gray-500">Custo Final:</span><span class="${custoFinal>totalCusto?'text-arcco-red':'text-green-600'}">${fmtBRL(custoFinal)}</span></div>
                    <div class="flex justify-between text-[9px] font-bold uppercase"><span class="text-gray-500">Variação:</span><span class="${variacao>0?'text-arcco-red':'text-green-600'}">${variacao>0?'+':''}${fmtBRL(variacao)}</span></div>
                    `:'<p class="text-[8px] text-gray-400 font-bold uppercase italic">Custo final não registrado</p>'}
                </div>
                ${o.obsFinal?`<p class="mt-2 text-[8px] text-gray-500 italic border-t border-gray-100 pt-2">"${o.obsFinal}"</p>`:''}
            </div>
            <div class="border-t border-gray-100 bg-gray-50 p-3 flex gap-2">
                <button onclick="APP.openObraDetail('${o.firebaseId}')" class="flex-1 bg-arcco-black text-white font-bold text-xs uppercase py-2 rounded hover:bg-gray-800">Ver Detalhes</button>
                <button onclick="APP.abrirModalDuplicar('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center" title="Duplicar como obra ativa"><i data-lucide="copy" class="w-4 h-4"></i></button>
                <button onclick="APP.reativarObra('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 flex items-center justify-center" title="Reativar"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

export const reativarObra = async (id) => {
    if(!confirm('Reativar esta obra? Ela voltará para o portfólio ativo.')) return;
    await apiUpdate('obras', id, {status:'ativa', dataFim:null});
    showToast('OBRA REATIVADA!');
};

// ============================================================
// NOVO: Página de Inteligência / Histórico de Desempenho
// ============================================================
export function renderHistoricoIntelligence(){
    const cont = document.getElementById('historico-content');
    if(!cont) return;
    const todasObras = STATE.obras;
    const todas = todasObras.flatMap(o => (o.tasks||[]).map(t => ({...t, obraNome:o.nome})));
    const now   = today();

    // Serviços mais atrasados
    const comAtraso = todas
        .filter(t => t.status!==2 && t.fim && parseDate(t.fim)<now)
        .map(t => ({...t, diasAtraso: Math.ceil((now - parseDate(t.fim)) / 86400000)}))
        .sort((a,b) => b.diasAtraso - a.diasAtraso).slice(0,10);

    // Ranking equipes: atrasos
    const equipeAtraso = {};
    todas.filter(t=>t.status!==2&&t.fim&&parseDate(t.fim)<now&&t.forn)
        .forEach(t=>{ equipeAtraso[t.forn]=(equipeAtraso[t.forn]||0)+1; });
    const rankEquipeAtraso = Object.entries(equipeAtraso).sort((a,b)=>b[1]-a[1]).slice(0,8);

    // Ranking equipes: pontualidade
    const equipeTotal={}, equipeOk={};
    todas.filter(t=>t.forn).forEach(t=>{
        equipeTotal[t.forn]=(equipeTotal[t.forn]||0)+1;
        if(t.status===2) equipeOk[t.forn]=(equipeOk[t.forn]||0)+1;
    });
    const rankEquipeMelhor = Object.entries(equipeOk)
        .map(([n,ok])=>({nome:n,ok,total:equipeTotal[n]||1,pct:Math.round(ok/(equipeTotal[n]||1)*100)}))
        .sort((a,b)=>b.pct-a.pct).slice(0,8);

    // Módulos que mais atrasam
    const moduloAtraso={};
    todas.filter(t=>t.status!==2&&t.fim&&parseDate(t.fim)<now&&t.modulo)
        .forEach(t=>{ moduloAtraso[t.modulo]=(moduloAtraso[t.modulo]||0)+1; });
    const rankModulo = Object.entries(moduloAtraso).sort((a,b)=>b[1]-a[1]).slice(0,8);

    // Obras com variação de custo
    const obrasVariacao = todasObras.filter(o=>o.custoFinal).map(o=>{
        const orcado=(o.tasks||[]).reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
        return {...o, orcado, variacao:parseFloat(o.custoFinal)-orcado};
    }).sort((a,b)=>Math.abs(b.variacao)-Math.abs(a.variacao)).slice(0,5);

    const totalServicos=todas.length, totalConcluidos=todas.filter(t=>t.status===2).length;
    const taxaConclusao=totalServicos>0?Math.round(totalConcluidos/totalServicos*100):0;

    cont.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
            <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Total de Obras</p>
            <p class="font-montserrat font-black-italic text-4xl text-arcco-black mt-1">${todasObras.length}</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
            <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Total de Serviços</p>
            <p class="font-montserrat font-black-italic text-4xl text-arcco-black mt-1">${totalServicos}</p>
        </div>
        <div class="bg-arcco-lime/10 p-5 rounded-xl border border-arcco-lime/40 shadow-sm text-center">
            <p class="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Taxa de Conclusão</p>
            <p class="font-montserrat font-black-italic text-4xl text-arcco-black mt-1">${taxaConclusao}%</p>
        </div>
        <div class="${comAtraso.length?'bg-red-50 border-red-200':'bg-gray-50 border-gray-200'} p-5 rounded-xl border shadow-sm text-center">
            <p class="text-[8px] font-bold ${comAtraso.length?'text-arcco-red':'text-gray-400'} uppercase tracking-widest">Em Atraso</p>
            <p class="font-montserrat font-black-italic text-4xl ${comAtraso.length?'text-arcco-red':'text-gray-300'} mt-1">${comAtraso.length}</p>
        </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center gap-2">
                <i data-lucide="clock" class="w-4 h-4 text-arcco-red"></i>
                <h4 class="font-montserrat font-bold text-xs uppercase text-arcco-red">Serviços Mais Atrasados</h4>
            </div>
            <div class="divide-y divide-gray-50">
                ${comAtraso.length?comAtraso.map(t=>`
                <div class="px-5 py-3 flex justify-between items-center">
                    <div class="flex-1 min-w-0 pr-3"><p class="text-[10px] font-bold text-arcco-black uppercase truncate">${t.nome}</p><p class="text-[8px] font-bold text-gray-400 uppercase">${t.obraNome}</p></div>
                    <span class="text-[9px] font-bold text-white bg-arcco-red px-2 py-1 rounded shrink-0">+${t.diasAtraso}d</span>
                </div>`).join(''):'<div class="px-5 py-6 text-center text-[10px] font-bold text-gray-400 uppercase">🎉 Nenhum atraso!</div>'}
            </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="bg-orange-50 border-b border-orange-100 px-5 py-3 flex items-center gap-2">
                <i data-lucide="users" class="w-4 h-4 text-arcco-orange"></i>
                <h4 class="font-montserrat font-bold text-xs uppercase text-arcco-orange">Equipes com Mais Atrasos</h4>
            </div>
            <div class="divide-y divide-gray-50">
                ${rankEquipeAtraso.length?rankEquipeAtraso.map(([nome,qtd],i)=>`
                <div class="px-5 py-3 flex justify-between items-center">
                    <div class="flex items-center gap-2"><span class="text-[8px] font-bold text-gray-400">${i+1}.</span><p class="text-[10px] font-bold text-arcco-black uppercase">${nome}</p></div>
                    <span class="text-[9px] font-bold text-arcco-orange bg-orange-100 px-2 py-1 rounded">${qtd}x</span>
                </div>`).join(''):'<div class="px-5 py-6 text-center text-[10px] font-bold text-gray-400 uppercase">Sem dados</div>'}
            </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="bg-arcco-lime/10 border-b border-arcco-lime/30 px-5 py-3 flex items-center gap-2">
                <i data-lucide="trophy" class="w-4 h-4 text-arcco-black"></i>
                <h4 class="font-montserrat font-bold text-xs uppercase text-arcco-black">🏆 Equipes Mais Pontuais</h4>
            </div>
            <div class="divide-y divide-gray-50">
                ${rankEquipeMelhor.length?rankEquipeMelhor.map((e,i)=>`
                <div class="px-5 py-3 flex justify-between items-center">
                    <div class="flex items-center gap-2"><span class="text-[9px]">${i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span><p class="text-[10px] font-bold text-arcco-black uppercase">${e.nome}</p></div>
                    <div class="text-right"><span class="text-[9px] font-bold text-arcco-black bg-arcco-lime px-2 py-1 rounded">${e.pct}%</span><p class="text-[7px] text-gray-400 font-bold mt-0.5">${e.ok}/${e.total} ok</p></div>
                </div>`).join(''):'<div class="px-5 py-6 text-center text-[10px] font-bold text-gray-400 uppercase">Sem dados</div>'}
            </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="bg-blue-50 border-b border-blue-100 px-5 py-3 flex items-center gap-2">
                <i data-lucide="layers" class="w-4 h-4 text-blue-600"></i>
                <h4 class="font-montserrat font-bold text-xs uppercase text-blue-700">Etapas que Mais Atrasam</h4>
            </div>
            <div class="divide-y divide-gray-50">
                ${rankModulo.length?rankModulo.map(([nome,qtd],i)=>`
                <div class="px-5 py-3 flex justify-between items-center">
                    <div class="flex items-center gap-2"><span class="text-[8px] font-bold text-gray-400">${i+1}.</span><p class="text-[10px] font-bold text-arcco-black uppercase truncate max-w-[200px]">${nome}</p></div>
                    <span class="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">${qtd}x</span>
                </div>`).join(''):'<div class="px-5 py-6 text-center text-[10px] font-bold text-gray-400 uppercase">Sem atrasos!</div>'}
            </div>
        </div>
        ${obrasVariacao.length?`
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
            <div class="bg-purple-50 border-b border-purple-100 px-5 py-3 flex items-center gap-2">
                <i data-lucide="bar-chart-2" class="w-4 h-4 text-purple-600"></i>
                <h4 class="font-montserrat font-bold text-xs uppercase text-purple-700">Obras: Orçado vs. Custo Final</h4>
            </div>
            <div class="divide-y divide-gray-50">
                ${obrasVariacao.map(o=>`
                <div class="px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <p class="text-[10px] font-bold text-arcco-black uppercase">${o.nome}</p>
                    <div class="flex gap-4 text-right">
                        <div><p class="text-[7px] text-gray-400 uppercase font-bold">Orçado</p><p class="text-[9px] font-bold text-gray-600">${fmtBRL(o.orcado)}</p></div>
                        <div><p class="text-[7px] text-gray-400 uppercase font-bold">Final</p><p class="text-[9px] font-bold text-gray-600">${fmtBRL(parseFloat(o.custoFinal))}</p></div>
                        <div><p class="text-[7px] text-gray-400 uppercase font-bold">Variação</p><p class="text-[9px] font-bold ${o.variacao>0?'text-arcco-red':'text-green-600'}">${o.variacao>0?'+':''}${fmtBRL(o.variacao)}</p></div>
                    </div>
                </div>`).join('')}
            </div>
        </div>`:''}
        <div class="bg-arcco-black rounded-xl p-6 lg:col-span-2">
            <h4 class="font-montserrat font-bold text-sm text-arcco-lime uppercase mb-3">💡 Como usar esses dados</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-[9px] font-bold text-gray-400 uppercase">
                <div class="bg-gray-900 p-3 rounded-lg"><p class="text-white mb-1">Para precificar melhor:</p>Veja quais serviços sempre atrasam. Se Demolição sempre passa do prazo, adicione mais dias no PERT e no custo de MO.</div>
                <div class="bg-gray-900 p-3 rounded-lg"><p class="text-white mb-1">Para reconhecer equipes:</p>Use o ranking de pontualidade no fim do ano. Quem está no topo merece reconhecimento público.</div>
                <div class="bg-gray-900 p-3 rounded-lg"><p class="text-white mb-1">Para reduzir desvios:</p>Módulos que mais atrasam revelam onde você precisa de mais folga no cronograma ou precificação errada.</div>
            </div>
        </div>
    </div>`;
    lucide.createIcons();
}

// ── Duplicar Obra (com Tipo de Obra e sempre vai para ativas) ──
let _obraParaDuplicarId = null;

export const abrirModalDuplicar = (id) => {
    const orig = STATE.obras.find(x => x.firebaseId===id);
    if(!orig) return;
    _obraParaDuplicarId = id;
    document.getElementById('dup-obra-nome').value = orig.nome + ' (Cópia)';
    const tipoSel = document.getElementById('dup-obra-tipo');
    if(tipoSel) tipoSel.value = orig.tipo||'Reforma Residencial';
    const sel = document.getElementById('dup-obra-cliente');
    sel.innerHTML = '<option value="">(SELECIONE O CLIENTE)</option>' +
        STATE.clients.map(c => `<option value="${c.id}" ${c.id===orig.clienteId?'selected':''}>${c.nome}</option>`).join('');
    const modal = document.getElementById('modal-duplicar-obra');
    if(modal){ modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

export const confirmarDuplicar = async () => {
    const id   = _obraParaDuplicarId;
    const orig = STATE.obras.find(x => x.firebaseId===id);
    if(!orig || !id) return;
    const novoNome = document.getElementById('dup-obra-nome').value.trim();
    const novoCli  = document.getElementById('dup-obra-cliente').value;
    const novoTipo = document.getElementById('dup-obra-tipo')?.value || orig.tipo;
    if(!novoNome) return showToast('Digite o nome da nova obra!');
    if(!novoCli)  return showToast('Selecione o cliente!');
    const idMap={}, base=Date.now();
    const tasks=(orig.tasks||[]).map((t,i)=>{ const nid=`T-${base+i}`; idMap[t.id]=nid; return {...t,id:nid,status:0,concluidoPor:null}; });
    tasks.forEach(t=>{ if(t.dep?.length) t.dep=t.dep.map(d=>idMap[d]||d); });
    await apiAdd('obras',{nome:novoNome,clienteId:novoCli,tipo:novoTipo,contrato:orig.contrato,taxa_adm:orig.taxa_adm||0,modulos:[...(orig.modulos||[])],tasks,compras:[],medicoes:[],diarias:[],status:'ativa',timestamp:base});
    const modal=document.getElementById('modal-duplicar-obra');
    if(modal){ modal.classList.add('hidden'); modal.classList.remove('flex'); }
    _obraParaDuplicarId=null;
    showToast('OBRA DUPLICADA — disponível nas obras ativas!');
};

export const duplicarObra = abrirModalDuplicar;

export const deleteObraCompleta = async (id) => {
    if(!confirm('⚠️ Excluir esta Obra completamente? Esta ação não pode ser desfeita.')) return;
    await apiDelete('obras',id);
    if(STATE.currentObraId===id) showMasterSection('dash');
    showToast('OBRA EXCLUÍDA');
};

// ── Detalhe da Obra ───────────────────────────────────────────
export function renderObraDetail(fId){
    const o = STATE.obras.find(x => x.firebaseId===fId);
    if(!o) return;

    document.getElementById('det-obra-nome').innerText = o.nome;
    document.getElementById('det-obra-tipo').innerText = o.tipo||'PROJETO';
    const cli = STATE.clients.find(c => c.id===o.clienteId);
    document.getElementById('det-obra-cliente').innerText = `Cliente: ${cli?.nome||o.clienteId}`;

    document.getElementById('det-config-contrato').innerHTML = `
        <div class="flex-1 min-w-[150px]">
            <label class="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Modelo de Contrato</label>
            <select id="det-edit-contrato" class="w-full text-xs font-bold text-arcco-black border border-gray-300 rounded p-2" onchange="APP.updateObraConfig('${fId}')">
                <option value="PREÇO FECHADO" ${o.contrato==='PREÇO FECHADO'?'selected':''}>Preço Fechado</option>
                <option value="ADMINISTRAÇÃO" ${o.contrato==='ADMINISTRAÇÃO'?'selected':''}>Administração</option>
            </select>
        </div>
        ${o.contrato==='ADMINISTRAÇÃO'?`
        <div class="w-32">
            <label class="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Taxa ADM (%)</label>
            <input type="number" step="0.1" id="det-edit-taxa" class="w-full text-xs font-bold text-arcco-black border border-gray-300 rounded p-2" value="${o.taxa_adm||0}" onblur="APP.updateObraConfig('${fId}')">
        </div>`:''}`;

    const tasks = o.tasks||[];
    const comprasAprov = (o.compras||[]).filter(c => c.status==='aprovado');
    const totalCusto = tasks.reduce((a,t) => a+(parseFloat(t.valor)||0),0);
    const totalVenda = tasks.reduce((a,t) => a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
    const totalCompras = comprasAprov.reduce((a,c) => a+(parseFloat(c.valor)||0),0);
    const custoDireto = totalCusto + totalCompras;

    const fin = document.getElementById('det-financeiro-container');
    if(o.contrato==='ADMINISTRAÇÃO'){
        const taxa = parseFloat(o.taxa_adm)||0;
        fin.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-right"><p class="text-[9px] text-gray-400 font-bold uppercase mb-1">Custo Real (CD)</p><p class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(custoDireto)}</p></div>
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-right"><p class="text-[9px] text-gray-400 font-bold uppercase mb-1">Taxa ADM (${taxa}%)</p><p class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(custoDireto*taxa/100)}</p></div>`;
    } else {
        fin.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-right"><p class="text-[9px] text-gray-400 font-bold uppercase mb-1">Custo Direto</p><p class="font-montserrat font-bold text-lg text-arcco-black">${fmtBRL(custoDireto)}</p></div>
            <div class="bg-arcco-lime/20 p-4 rounded-lg border border-arcco-lime/50 text-right shadow-sm col-span-2 lg:col-span-1"><p class="text-[9px] text-gray-600 font-bold uppercase mb-1">Preço Venda</p><p class="font-montserrat font-bold text-xl text-arcco-black">${fmtBRL(totalVenda+totalCompras)}</p></div>`;
    }

    // ============================================================
    // CORREÇÃO 3: Select de fornecedor agora carrega subordinados
    // Ao selecionar o líder, aparece checkboxes dos subordinados
    // ============================================================
    const fSel = document.getElementById('task-fornecedor');
    fSel.innerHTML = '<option value="">(SELECIONE A EQUIPE)</option>' +
        STATE.forn.filter(f => f.status==='ativo'&&f.vinculo==='MASTER')
            .map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

    const depSel = document.getElementById('task-dep');
    depSel.innerHTML = '<option value="">NENHUMA (INÍCIO LIVRE)</option>' +
        tasks.map(t => `<option value="${t.id}">${t.modulo} – ${t.nome}</option>`).join('');

    let mods = [...(o.modulos||[])];
    [...new Set(tasks.map(t => t.modulo))].forEach(m => { if(!mods.includes(m)) mods.push(m); });
    mods = sortModulos(mods);

    const modInline = document.getElementById('lista-modulos-inline');
    modInline.innerHTML = !mods.length
        ? '<p class="text-[10px] text-gray-400 font-bold uppercase text-center py-3">Nenhum módulo ainda.</p>'
        : mods.map(m => {
            const inUse   = tasks.some(t => t.modulo===m);
            const editing = m===STATE.editingModuloOldName;
            return `<div class="flex justify-between items-center p-3 rounded-lg border ${editing?'border-orange-400 bg-orange-50':'border-gray-200 bg-white'} shadow-sm">
                <span class="text-xs font-bold text-arcco-black uppercase">${m}</span>
                <div class="flex gap-2">
                    <button onclick="APP.editModuloObra('${m}')" class="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:text-arcco-orange hover:bg-orange-100"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="APP.deleteModuloObra('${m}')" class="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:text-arcco-red hover:bg-red-100 ${inUse?'opacity-50 cursor-not-allowed':''}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>`;
        }).join('');

    const modSel = document.getElementById('task-modulo');
    const prevMod = modSel.value;
    modSel.innerHTML = !mods.length
        ? '<option value="">(CRIE UM MÓDULO PRIMEIRO)</option>'
        : mods.map(m => `<option value="${m}">${m}</option>`).join('');
    if(STATE.editingTaskId){
        const t = tasks.find(x => x.id===STATE.editingTaskId);
        if(t) modSel.value = t.modulo;
    } else if(prevMod && mods.includes(prevMod)) modSel.value = prevMod;

    // Gráfico de rosca (avanço geral)
    const done = tasks.filter(t => t.status===2).length;
    const pct  = tasks.length ? Math.round(done/tasks.length*100) : 0;
    document.getElementById('det-pct-text').innerText = `${pct}%`;

    if(STATE.donutChart) STATE.donutChart.destroy();
    const ctxD = document.getElementById('det-chart-donut');
    if(ctxD) STATE.donutChart = new Chart(ctxD,{type:'doughnut',data:{datasets:[{data:[done,tasks.length-done],backgroundColor:['#ccff00','#f4f4f5'],borderWidth:0}]},options:{maintainAspectRatio:false,cutout:'78%',plugins:{tooltip:{enabled:false}}}});

    // Gráfico de barras por módulo
    const phases = {};
    tasks.forEach(t => { if(!phases[t.modulo]) phases[t.modulo]={done:0,total:0}; phases[t.modulo].total++; if(t.status===2) phases[t.modulo].done++; });
    const phLabels = Object.keys(phases);
    if(STATE.barChart) STATE.barChart.destroy();
    const ctxB = document.getElementById('det-chart-bar');
    if(ctxB) STATE.barChart = new Chart(ctxB,{type:'bar',data:{labels:phLabels,datasets:[{label:'Concluído',data:phLabels.map(l=>phases[l].done),backgroundColor:'#111111',barThickness:16,borderRadius:4},{label:'Pendente',data:phLabels.map(l=>phases[l].total-phases[l].done),backgroundColor:'#e4e4e7',barThickness:16,borderRadius:4}]},options:{maintainAspectRatio:false,responsive:true,scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,display:false}},plugins:{legend:{display:false}}}});

    // Alertas de atraso
    const alertC = document.getElementById('det-alertas-container');
    const nowD   = today();
    const late   = tasks.filter(t => t.status!==2&&t.fim&&parseDate(t.fim)<nowD);
    const bottlenecks = late.filter(lt => tasks.some(t => t.dep?.includes(lt.id)));
    const lateOther   = late.filter(lt => !bottlenecks.includes(lt));
    alertC.innerHTML = `
        ${bottlenecks.length?`<div class="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-5 flex items-start gap-4 shadow-sm"><div class="bg-red-100 p-2 rounded-full"><i data-lucide="shield-alert" class="text-red-600 w-5 h-5"></i></div><div><h5 class="text-xs font-bold uppercase text-red-700 mb-2">Gargalo Crítico Detectado</h5>${bottlenecks.map(b=>`<p class="text-[10px] font-bold text-gray-800 uppercase">• ${b.nome} — ${b.forn}</p>`).join('')}</div></div>`:''}
        ${lateOther.length?`<div class="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-5 flex items-start gap-4 shadow-sm"><div class="bg-orange-100 p-2 rounded-full"><i data-lucide="clock" class="text-orange-600 w-5 h-5"></i></div><div><h5 class="text-xs font-bold uppercase text-orange-700 mb-2">Atrasos de Cronograma</h5>${lateOther.map(b=>`<p class="text-[10px] font-bold text-gray-800 uppercase">• ${b.nome} — ${b.forn}</p>`).join('')}</div></div>`:''}`;

    renderCronogramaList(o, mods, tasks, phases);
    renderComprasList(o);
    lucide.createIcons();
}

// ── Lista EAP / Cronograma ────────────────────────────────────
export function renderCronogramaList(o, mods, tasks, phases){
    const cont = document.getElementById('det-cronograma-list');
    if(!mods.length){ cont.innerHTML='<div class="text-center p-8 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-400 uppercase">Crie módulos e adicione serviços.</div>'; return; }

    cont.innerHTML = mods.map(m => {
        const fTasks = tasks.filter(t => t.modulo===m);
        if(!fTasks.length) return '';
        const ph = phases[m]||{done:0,total:0};
        const totalVenda = fTasks.reduce((a,t) => a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
        const totalCusto = fTasks.reduce((a,t) => a+(parseFloat(t.valor)||0),0);
        const colId = `mod-collapse-${m.replace(/\W/g,'')}`;
        return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div class="bg-gray-100 border-b border-gray-200 py-3 px-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer hover:bg-gray-200" onclick="document.getElementById('${colId}').classList.toggle('hidden')">
                <div class="flex items-center gap-2">
                    <i data-lucide="chevron-down" class="w-4 h-4 text-gray-500"></i>
                    <h5 class="font-montserrat font-bold text-sm uppercase tracking-widest text-arcco-black">${m}</h5>
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    <span class="text-[9px] font-bold text-gray-600 uppercase border border-gray-300 px-2 py-1 rounded bg-white">Custo: ${fmtBRL(totalCusto)}</span>
                    <span class="text-[9px] font-bold text-arcco-black uppercase bg-arcco-lime px-2 py-1 rounded shadow-sm">Venda: ${fmtBRL(totalVenda)}</span>
                    <span class="text-[9px] font-bold text-white bg-arcco-black px-2 py-1 rounded shadow-sm">${ph.done} de ${ph.total} concluídos</span>
                </div>
            </div>
            <div id="${colId}" class="divide-y divide-gray-100">
                ${fTasks.map(t => renderTaskRow(t,tasks,o)).join('')}
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// ── Task Row (linha de cada serviço no cronograma) ────────────
export function renderTaskRow(t, allTasks, o){
    const isBlocked  = t.dep?.some(dId => { const dt=allTasks.find(x=>x.id===dId); return dt&&dt.status!==2; });
    const isEditing  = t.id===STATE.editingTaskId;
    // PERT já está dentro de _datasDestaque — não chama getPertHtml para não duplicar
    const alertaDiaria = _alertaCustoDiaria(t);
    const datasHtml    = _datasDestaque(t);

    return `
    <div class="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-gray-50 transition-colors ${isEditing?'editing-row':''} ${isBlocked?'alert-blocked':''}">
        <div class="flex-1 flex gap-4 items-start cursor-pointer w-full" onclick="APP.editTask('${t.id}')">
            <div class="mt-1 shrink-0">${t.atencao?`<div class="w-3.5 h-3.5 rounded-full bg-arcco-red animate-pulse shadow"></div>`:`<div class="w-3 h-3 rounded-full bg-gray-300 border border-gray-400"></div>`}</div>
            <div class="flex-1">
                <p class="text-sm font-bold text-arcco-black uppercase">${t.nome} <span class="text-green-600 font-normal ml-2 text-xs hidden sm:inline">${fmtBRL(t.valor_venda||t.valor)}</span></p>
                <div class="flex flex-wrap gap-1 mt-1.5 mb-2">
                    ${t.valor_mo?`<span class="text-[8px] font-bold text-gray-500 uppercase border border-gray-200 px-1.5 py-0.5 rounded">MO: ${fmtBRL(t.valor_mo)}</span>`:''}
                    ${t.valor_mat?`<span class="text-[8px] font-bold text-gray-500 uppercase border border-gray-200 px-1.5 py-0.5 rounded">MAT: ${fmtBRL(t.valor_mat)}</span>`:''}
                    ${t.valor_eq?`<span class="text-[8px] font-bold text-gray-500 uppercase border border-gray-200 px-1.5 py-0.5 rounded">EQ: ${fmtBRL(t.valor_eq)}</span>`:''}
                    ${t.taxa_pct>0
                        ? t.taxa_tipo==='ADM'
                            ? `<span class="text-[8px] font-bold text-white uppercase bg-gray-800 px-1.5 py-0.5 rounded">ADM: ${t.taxa_pct}%</span>`
                            : `<span class="text-[8px] font-bold text-arcco-black uppercase bg-arcco-lime px-1.5 py-0.5 rounded">BDI: ${t.taxa_pct}%</span>`
                        : ''}
                </div>
                <!-- CORREÇÃO 5: Datas em destaque abaixo do nome -->
                ${datasHtml}
                <div class="flex flex-wrap items-center gap-2 mt-1">
                    <span class="text-[9px] font-bold text-arcco-black uppercase bg-gray-200 px-2 py-0.5 rounded">${t.forn}</span>
                    <!-- Subordinados da equipe selecionada -->
                    ${(t.membros||[]).map(m => `<span class="text-[8px] font-bold text-gray-600 uppercase bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">${m}</span>`).join('')}
                    ${isBlocked?`<span class="text-[9px] font-bold text-arcco-red uppercase bg-red-100 px-2 py-0.5 rounded flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> TRAVADO</span>`:''}
                    ${t.status===2&&t.concluidoPor?`<span class="text-[9px] font-bold text-green-700 uppercase bg-green-100 px-2 py-0.5 rounded border border-green-200"><i data-lucide="check" class="inline w-3 h-3"></i> ${t.concluidoPor}</span>`:''}
                </div>
                <!-- CORREÇÃO 4: Alerta de custo de diárias -->
                ${alertaDiaria}
            </div>
        </div>
        <div class="flex gap-2 shrink-0">
            <button onclick="APP.toggleTaskStatus('${o.firebaseId}','${t.id}')" class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm ${t.status===2?'bg-arcco-lime text-arcco-black':t.status===1?'bg-orange-500 text-white':'bg-gray-100 text-gray-400 border border-gray-300 hover:bg-gray-200'}">
                ${t.status===2?'<i data-lucide="check-circle-2" class="w-5 h-5"></i>':t.status===1?'<i data-lucide="eye" class="w-5 h-5"></i>':'<i data-lucide="circle" class="w-5 h-5"></i>'}
            </button>
            <button onclick="APP.deleteTask('${o.firebaseId}','${t.id}')" class="w-10 h-10 rounded-lg border border-gray-300 text-gray-400 hover:text-white hover:bg-arcco-red hover:border-arcco-red flex items-center justify-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    </div>`;
}

// ============================================================
// CORREÇÃO 5 (auxiliar): Renderiza as 3 datas em destaque
// ============================================================
function _datasDestaque(t){
    if(!t.inicio && !t.fim) return '';
    const inicioFmt = t.inicio ? fmtDate(t.inicio) : '—';
    const fimFmt    = t.fim    ? fmtDate(t.fim)    : '—';

    // Calcula data PERT se tiver início e fim
    let pertFmt = '—';
    if(t.inicio && t.fim){
        const ds = parseDate(t.inicio);
        const de = parseDate(t.fim);
        const m  = Math.round((de-ds)/86400000);
        if(m >= 0){
            const ot = m + (t.otimista||0);
            const pe = m + (t.pessimista||0);
            const te = (ot + 4*m + pe) / 6;
            const dp = new Date(ds);
            dp.setDate(dp.getDate() + Math.round(te));
            pertFmt = fmtDate(dp.toISOString().split('T')[0]);
        }
    }

    return `
    <div class="flex flex-wrap gap-2 mt-2">
        <div class="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
            <i data-lucide="play-circle" class="w-3 h-3 text-blue-500 shrink-0"></i>
            <span class="text-[9px] font-bold text-blue-700 uppercase">Início: ${inicioFmt}</span>
        </div>
        <div class="flex items-center gap-1 bg-gray-100 border border-gray-300 px-2 py-1 rounded">
            <i data-lucide="flag" class="w-3 h-3 text-gray-500 shrink-0"></i>
            <span class="text-[9px] font-bold text-gray-700 uppercase">Fim: ${fimFmt}</span>
        </div>
        ${pertFmt !== '—' ? `
        <div class="flex items-center gap-1 bg-purple-50 border border-purple-200 px-2 py-1 rounded">
            <i data-lucide="trending-up" class="w-3 h-3 text-purple-500 shrink-0"></i>
            <span class="text-[9px] font-bold text-purple-700 uppercase">PERT: ${pertFmt}</span>
        </div>` : ''}
    </div>`;
}

// ============================================================
// CORREÇÃO 4 (auxiliar): Calcula custo de diárias da equipe
// e retorna HTML do alerta comparando com MO previsto
// ============================================================
function _alertaCustoDiaria(t){
    // Precisa de início, fim e membros selecionados para calcular
    if(!t.inicio || !t.fim || !t.forn) return '';

    // Dias de duração do serviço
    const ds   = parseDate(t.inicio);
    const de   = parseDate(t.fim);
    const dias = Math.ceil((de - ds) / 86400000) + 1; // +1 para incluir o dia de início
    if(dias <= 0) return '';

    // Coleta a diária do líder
    const lider  = STATE.forn.find(f => f.id === t.forn && f.status === 'ativo');
    if(!lider) return '';

    // Membros selecionados para esta tarefa (array de IDs guardados em t.membros_ids)
    const membrosSelecionados = (t.membros_ids || [])
        .map(id => STATE.forn.find(f => f.id === id && f.status === 'ativo'))
        .filter(Boolean);

    // Custo total = diária do líder + diárias dos membros × dias
    const custoDiariaLider   = (parseFloat(lider.diaria)||0) * dias;
    const custoDiariasMembros = membrosSelecionados.reduce((acc, m) => acc + (parseFloat(m.diaria)||0) * dias, 0);
    const custoTotalDiarias  = custoDiariaLider + custoDiariasMembros;

    // Só mostra o alerta se houver diárias configuradas
    if(custoTotalDiarias === 0) return '';

    // Valor de MO previsto (ou custo total se MO não foi detalhado)
    const moPrevisto = parseFloat(t.valor_mo) || parseFloat(t.valor) || 0;

    // Decide o status do alerta
    let alertClass, alertIcon, alertMsg;
    if(custoTotalDiarias > moPrevisto){
        alertClass = 'bg-red-50 border-red-300 text-red-700';
        alertIcon  = 'alert-triangle';
        alertMsg   = `Custo diárias ${fmtBRL(custoTotalDiarias)} MAIOR que o previsto (${fmtBRL(moPrevisto)}) em ${dias} dias`;
    } else if(custoTotalDiarias === moPrevisto){
        alertClass = 'bg-yellow-50 border-yellow-300 text-yellow-700';
        alertIcon  = 'minus-circle';
        alertMsg   = `Custo diárias ${fmtBRL(custoTotalDiarias)} IGUAL ao previsto em ${dias} dias`;
    } else {
        alertClass = 'bg-green-50 border-green-300 text-green-700';
        alertIcon  = 'check-circle-2';
        alertMsg   = `Custo diárias ${fmtBRL(custoTotalDiarias)} abaixo do previsto (${fmtBRL(moPrevisto)}) em ${dias} dias`;
    }

    return `
    <div class="mt-2 flex items-center gap-1.5 border px-2 py-1.5 rounded text-[8px] font-bold uppercase ${alertClass}">
        <i data-lucide="${alertIcon}" class="w-3 h-3 shrink-0"></i>
        ${alertMsg}
    </div>`;
}

// ── PERT badge para o topo do card (pequeno, mantido para compatibilidade) ──
export function getPertHtml(t){
    if(!t.inicio||!t.fim) return '';
    const [sy,sm,sd]=t.inicio.split('-'); const [ey,em,ed]=t.fim.split('-');
    const ds=new Date(sy,sm-1,sd); const de=new Date(ey,em-1,ed);
    const m=Math.round((de-ds)/86400000); if(m<0) return '';
    const o=m+(t.otimista||0); const p=m+(t.pessimista||0);
    const te=(o+4*m+p)/6;
    const dP=new Date(ds); dP.setDate(dP.getDate()+Math.round(te));
    const fmt=[String(dP.getDate()).padStart(2,'0'),String(dP.getMonth()+1).padStart(2,'0'),dP.getFullYear()].join('/');
    return `<span class="text-[8px] font-bold text-blue-700 uppercase bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200" title="PERT: ${te.toFixed(1)} dias">PERT: ${fmt}</span>`;
}

// ============================================================
// CORREÇÃO 2: Formulário simplificado
// Agora é: Custo Total + BDI + Preço Venda
// Com toggle opcional para detalhar MO/MAT/EQ/OUTROS
// ============================================================

// ============================================================
// CORREÇÃO 2 — Toggle de detalhamento
// Quando LIGADO: trava o campo "Custo Total" e soma MO+MAT+EQ+OUTROS
// Quando DESLIGADO: libera o campo para digitação livre
// ============================================================
export const toggleDetalhamento = () => {
    const painel   = document.getElementById('campos-detalhe-custos');
    const btn      = document.getElementById('btn-toggle-detalhe');
    const custoEl  = document.getElementById('task-custo-total');
    if(!painel || !custoEl) return;

    const abrindo = painel.classList.contains('hidden');
    painel.classList.toggle('hidden');

    if(abrindo){
        // LIGANDO o detalhamento: trava o Custo Total
        custoEl.readOnly = true;
        custoEl.classList.add('bg-gray-100','text-gray-400','cursor-not-allowed');
        custoEl.classList.remove('bg-white');
        custoEl.title = 'Calculado automaticamente pela soma dos campos abaixo';
        if(btn){
            btn.innerHTML = '<i data-lucide="minus-circle" class="w-3 h-3 inline mr-1"></i> Ocultar detalhamento (MO / MAT / EQ / Outros)';
        }
        // Adiciona evento oninput em cada campo de detalhe para atualizar a soma
        ['task-mo','task-mat','task-eq','task-ou'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.oninput = _somarDetalheNoCusto;
        });
        // Soma imediata ao abrir (caso já tenha valores)
        _somarDetalheNoCusto();
    } else {
        // DESLIGANDO o detalhamento: libera o Custo Total
        custoEl.readOnly = false;
        custoEl.classList.remove('bg-gray-100','text-gray-400','cursor-not-allowed');
        custoEl.classList.add('bg-white');
        custoEl.title = '';
        if(btn){
            btn.innerHTML = '<i data-lucide="plus-circle" class="w-3 h-3 inline mr-1"></i> Detalhar Custos: MO / Material / Equipamento / Outros';
        }
        // Remove o listener dos campos de detalhe
        ['task-mo','task-mat','task-eq','task-ou'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.oninput = null;
        });
    }
    lucide.createIcons();
};

// Soma MO + MAT + EQ + OUTROS e coloca no Custo Total (quando detalhamento ligado)
function _somarDetalheNoCusto(){
    const mo  = parseFloat(document.getElementById('task-mo')?.value)  || 0;
    const mat = parseFloat(document.getElementById('task-mat')?.value) || 0;
    const eq  = parseFloat(document.getElementById('task-eq')?.value)  || 0;
    const ou  = parseFloat(document.getElementById('task-ou')?.value)  || 0;
    const custoEl = document.getElementById('task-custo-total');
    if(custoEl) custoEl.value = (mo + mat + eq + ou).toFixed(2);
    // Recalcula preço de venda com o novo custo
    calcTotalTask();
}

// Calcula o Preço de Venda = Custo Total × (1 + BDI/100)
// e atualiza os campos automaticamente
export const calcTotalTask = () => {
    const custo = parseFloat(document.getElementById('task-custo-total')?.value) || 0;
    const bdi   = parseFloat(document.getElementById('task-bdi')?.value) || 0;
    const venda = custo * (1 + bdi / 100);

    // Atualiza o campo de preço de venda
    const vendaEl = document.getElementById('task-valor-venda-display');
    if(vendaEl) vendaEl.innerText = fmtBRL(venda);

    // Guarda os valores nos campos ocultos que serão salvos
    const elValor = document.getElementById('task-valor');
    const elVenda = document.getElementById('task-valor-venda');
    if(elValor) elValor.value = custo;
    if(elVenda) elVenda.value = venda;

    // ============================================================
    // CORREÇÃO 4: Ao mudar valores, re-calcula o alerta de diárias
    // ============================================================
    _atualizarAlertaDiariaForm();
};

// Calcula e mostra a data PERT no formulário
export const calcPERT = () => {
    const s    = document.getElementById('task-inicio').value;
    const e    = document.getElementById('task-fim').value;
    const disp = document.getElementById('pert-display');
    if(!s || !e){ if(disp) disp.innerText = '---'; return; }
    const [sy,sm,sd] = s.split('-'); const [ey,em,ed] = e.split('-');
    const ds = new Date(sy,sm-1,sd); const de = new Date(ey,em-1,ed);
    const m  = Math.round((de - ds) / 86400000);
    if(m < 0){ if(disp) disp.innerText = 'Datas inválidas'; return; }
    const ot = m + (parseInt(document.getElementById('task-otimista').value)||0);
    const pe = m + (parseInt(document.getElementById('task-pessimista').value)||0);
    const te = (ot + 4*m + pe) / 6;
    const dp = new Date(ds); dp.setDate(dp.getDate() + Math.round(te));
    if(disp) disp.innerText = `${te.toFixed(1)} dias (${fmtDate(dp.toISOString().split('T')[0])})`;

    // ============================================================
    // CORREÇÃO 5: Após recalcular datas, verifica sobreposição
    // ============================================================
    _verificarSobreposicaoDatas(s, e);

    // Atualiza alerta de diárias ao mudar datas
    _atualizarAlertaDiariaForm();
};

// ============================================================
// CORREÇÃO 5 (auxiliar): Verifica se o período do serviço
// se sobrepõe com outro serviço da mesma obra
// ============================================================
function _verificarSobreposicaoDatas(inicio, fim){
    const alertEl = document.getElementById('alerta-sobreposicao');
    if(!alertEl || !inicio || !fim) return;

    const o = STATE.obras.find(x => x.firebaseId === STATE.currentObraId);
    if(!o) return;

    const ds = parseDate(inicio);
    const de = parseDate(fim);
    const editandoId = STATE.editingTaskId;

    // Procura qualquer outra tarefa com datas que se sobreponham
    const conflitos = (o.tasks || []).filter(t => {
        if(t.id === editandoId) return false; // ignora a própria tarefa sendo editada
        if(!t.inicio || !t.fim) return false;
        const tS = parseDate(t.inicio);
        const tE = parseDate(t.fim);
        // Há sobreposição se o início de um é antes do fim do outro
        return ds <= tE && de >= tS;
    });

    if(conflitos.length){
        const nomes = conflitos.slice(0,3).map(t => t.nome).join(', ');
        alertEl.innerHTML = `
            <div class="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded px-3 py-2 text-[9px] font-bold text-yellow-700 uppercase">
                <i data-lucide="clock-alert" class="w-3 h-3 shrink-0"></i>
                Data igual a: ${nomes}${conflitos.length>3?' e mais...':''}
            </div>`;
        lucide.createIcons();
        alertEl.classList.remove('hidden');
    } else {
        alertEl.innerHTML = '';
        alertEl.classList.add('hidden');
    }
}

// ============================================================
// CORREÇÃO 3 (auxiliar): Ao trocar o líder no formulário,
// carrega os subordinados como checkboxes para seleção múltipla
// ============================================================
export const onChangeFornecedor = () => {
    const liderId  = document.getElementById('task-fornecedor').value;
    const contMembros = document.getElementById('membros-equipe-container');
    if(!contMembros) return;

    if(!liderId){
        contMembros.classList.add('hidden');
        return;
    }

    // Busca todos os membros ativos vinculados a este líder
    const membros = STATE.forn.filter(f => f.vinculo === liderId && f.status === 'ativo');

    if(!membros.length){
        contMembros.innerHTML = `
            <p class="text-[9px] font-bold text-gray-400 uppercase mt-2">
                Este líder não tem subordinados cadastrados.
            </p>`;
        contMembros.classList.remove('hidden');
        return;
    }

    // Mantém os membros já selecionados se estiver editando
    const jaSelecionados = _getMembrosIdsSelecionados();

    contMembros.innerHTML = `
        <div class="mt-3 border border-gray-200 rounded-lg overflow-hidden">
            <div class="bg-gray-100 px-3 py-2 border-b border-gray-200">
                <p class="text-[9px] font-bold text-gray-600 uppercase">Subordinados da Equipe (selecione os que vão trabalhar)</p>
            </div>
            <div class="p-3 grid grid-cols-1 gap-2">
                ${membros.map(m => `
                <label class="flex items-center gap-3 p-2 rounded border border-gray-100 hover:bg-arcco-lime/10 cursor-pointer">
                    <input type="checkbox"
                        id="membro-check-${m.id}"
                        value="${m.id}"
                        data-nome="${m.nome}"
                        data-diaria="${m.diaria||0}"
                        class="membro-checkbox w-4 h-4 accent-arcco-black"
                        onchange="APP.onChangeMembros()"
                        ${jaSelecionados.includes(m.id)?'checked':''}>
                    <div class="flex-1">
                        <p class="text-xs font-bold text-arcco-black uppercase">${m.nome}</p>
                        <p class="text-[9px] text-gray-400 font-bold uppercase">${m.espec} ${m.diaria?'• Diária: '+fmtBRL(m.diaria):''}</p>
                    </div>
                </label>`).join('')}
            </div>
        </div>`;
    contMembros.classList.remove('hidden');

    // Recalcula alerta de diárias ao trocar de líder
    _atualizarAlertaDiariaForm();
};

// Retorna os IDs de membros já marcados nos checkboxes
function _getMembrosIdsSelecionados(){
    return Array.from(document.querySelectorAll('.membro-checkbox:checked')).map(el => el.value);
}

// Retorna os nomes de membros já marcados
function _getMembrosNomesSelecionados(){
    return Array.from(document.querySelectorAll('.membro-checkbox:checked')).map(el => el.dataset.nome);
}

// Chamado quando o usuário marca/desmarca um membro
export const onChangeMembros = () => {
    _atualizarAlertaDiariaForm();
};

// ============================================================
// CORREÇÃO 4 (auxiliar): Mostra alerta no formulário
// comparando custo de diárias com MO previsto
// ============================================================
function _atualizarAlertaDiariaForm(){
    const alertEl = document.getElementById('alerta-diaria-form');
    if(!alertEl) return;

    const inicio = document.getElementById('task-inicio')?.value;
    const fim    = document.getElementById('task-fim')?.value;
    const liderId = document.getElementById('task-fornecedor')?.value;

    if(!inicio || !fim || !liderId){ alertEl.classList.add('hidden'); return; }

    const ds   = parseDate(inicio);
    const de   = parseDate(fim);
    const dias = Math.ceil((de - ds) / 86400000) + 1;
    if(dias <= 0){ alertEl.classList.add('hidden'); return; }

    // Diária do líder
    const lider = STATE.forn.find(f => f.id === liderId && f.status === 'ativo');
    if(!lider){ alertEl.classList.add('hidden'); return; }
    const custoDiariaLider = (parseFloat(lider.diaria)||0) * dias;

    // Diárias dos membros marcados
    const custoDiariasMembros = Array.from(document.querySelectorAll('.membro-checkbox:checked'))
        .reduce((acc, el) => acc + (parseFloat(el.dataset.diaria)||0) * dias, 0);

    const custoTotal = custoDiariaLider + custoDiariasMembros;
    if(custoTotal === 0){ alertEl.classList.add('hidden'); return; }

    // Pega MO detalhado ou custo total como referência
    const moEl    = document.getElementById('task-mo');
    const custoEl = document.getElementById('task-custo-total');
    const moPrev  = parseFloat(moEl?.value) || parseFloat(custoEl?.value) || 0;

    let cls, icon, msg;
    if(custoTotal > moPrev){
        cls  = 'bg-red-50 border-red-400 text-red-700';
        icon = 'alert-triangle';
        msg  = `⚠️ Diárias (${fmtBRL(custoTotal)} em ${dias}d) MAIOR que MO previsto (${fmtBRL(moPrev)})`;
    } else if(custoTotal === moPrev){
        cls  = 'bg-yellow-50 border-yellow-400 text-yellow-700';
        icon = 'minus-circle';
        msg  = `Diárias (${fmtBRL(custoTotal)} em ${dias}d) IGUAL ao MO previsto`;
    } else {
        cls  = 'bg-green-50 border-green-400 text-green-700';
        icon = 'check-circle-2';
        msg  = `✓ Diárias (${fmtBRL(custoTotal)} em ${dias}d) dentro do MO previsto (${fmtBRL(moPrev)})`;
    }

    alertEl.innerHTML = `
        <div class="flex items-center gap-2 border rounded px-3 py-2 text-[9px] font-bold uppercase ${cls}">
            <i data-lucide="${icon}" class="w-3 h-3 shrink-0"></i>
            ${msg}
        </div>`;
    alertEl.classList.remove('hidden');
    lucide.createIcons();
}

export const updateInicioStyle = (el) => {
    if(!el) return;
    const fim = document.getElementById('task-fim');
    if(el.value){
        el.classList.add('bg-blue-100','text-blue-800','border-blue-400');
        if(fim){ fim.min=el.value; if(fim.value&&fim.value<el.value) fim.value=el.value; }
    } else {
        el.classList.remove('bg-blue-100','text-blue-800','border-blue-400');
        if(fim) fim.min='';
    }
};

export const handleDepChange = () => {
    const depId = document.getElementById('task-dep').value;
    if(!depId) return;
    const o   = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const dep = o?.tasks?.find(t => t.id===depId);
    if(dep?.fim){
        const el = document.getElementById('task-inicio');
        el.value = dep.fim;
        updateInicioStyle(el);
        calcPERT();
        showToast('Data de início ajustada pela dependência');
    }
};

// ── Salvar Serviço ─────────────────────────────────────────────
export const saveTaskToObra = async () => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);

    // ============================================================
    // CORREÇÃO 2: Lê Custo Total + BDI (novo formulário simplificado)
    // + campos de detalhamento se preenchidos
    // ============================================================
    const custo  = parseFloat(document.getElementById('task-custo-total')?.value) || 0;
    const bdi    = parseFloat(document.getElementById('task-bdi')?.value)         || 0;
    const venda  = custo * (1 + bdi / 100);

    // Detalhamento opcional (MO/MAT/EQ/OUTROS)
    const mo  = parseFloat(document.getElementById('task-mo')?.value)  || 0;
    const mat = parseFloat(document.getElementById('task-mat')?.value) || 0;
    const eq  = parseFloat(document.getElementById('task-eq')?.value)  || 0;
    const ou  = parseFloat(document.getElementById('task-ou')?.value)  || 0;

    // ============================================================
    // CORREÇÃO 3: Guarda o líder + membros selecionados
    // ============================================================
    const membrosIds   = _getMembrosIdsSelecionados();
    const membrosNomes = _getMembrosNomesSelecionados();

    const taskData = {
        modulo:   document.getElementById('task-modulo').value,
        nome:     document.getElementById('task-nome').value,
        // Custo e venda pelo novo modelo simplificado
        valor:       custo,
        valor_venda: venda,
        taxa_pct:    bdi,
        taxa_tipo:   'BDI',
        bdi:         bdi,
        // Detalhamento (se preenchido)
        valor_mo:  mo,
        valor_mat: mat,
        valor_eq:  eq,
        valor_ou:  ou,
        // Equipe
        forn:        document.getElementById('task-fornecedor').value,
        membros_ids: membrosIds,    // IDs dos subordinados marcados
        membros:     membrosNomes,  // Nomes para exibição
        // Datas
        inicio: document.getElementById('task-inicio').value,
        fim:    document.getElementById('task-fim').value,
        otimista:   parseInt(document.getElementById('task-otimista').value)  || 0,
        pessimista: parseInt(document.getElementById('task-pessimista').value)|| 0,
        dep: document.getElementById('task-dep').value
            ? [document.getElementById('task-dep').value] : [],
        atencao: document.getElementById('task-atencao').dataset.active === 'true',
        status: 0
    };

    if(!taskData.modulo || !taskData.nome || !taskData.forn)
        return showToast('DADOS OBRIGATÓRIOS FALTANDO');

    let tasks;
    if(STATE.editingTaskId){
        const old = o.tasks.find(t => t.id === STATE.editingTaskId);
        tasks = o.tasks.map(t => t.id===STATE.editingTaskId ? {...t,...taskData,status:old.status} : t);
        showToast('SERVIÇO ATUALIZADO');
    } else {
        tasks = [...(o.tasks||[]), {id:`T-${Date.now()}`, ...taskData}];
        showToast('SERVIÇO INSERIDO');
    }
    await apiUpdate('obras', STATE.currentObraId, {tasks});
    resetTaskForm();
};

// ── Editar Tarefa (preenche o formulário para edição) ──────────
export const editTask = (id) => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const t = o.tasks.find(x => x.id===id);
    STATE.editingTaskId = id;

    document.getElementById('task-modulo').value = t.modulo;
    document.getElementById('task-nome').value   = t.nome;

    // ============================================================
    // CORREÇÃO 2: Preenche Custo Total + BDI no novo formulário
    // Se o serviço antigo era "empreita", usa o valor como custo total
    // ============================================================
    const custoEl = document.getElementById('task-custo-total');
    const bdiEl   = document.getElementById('task-bdi');
    if(custoEl) custoEl.value = t.valor || '';
    if(bdiEl)   bdiEl.value  = t.taxa_pct || t.bdi || '';

    // Detalhamento (se havia)
    const moEl  = document.getElementById('task-mo');
    const matEl = document.getElementById('task-mat');
    const eqEl  = document.getElementById('task-eq');
    const ouEl  = document.getElementById('task-ou');
    if(moEl)  moEl.value  = t.valor_mo  || '';
    if(matEl) matEl.value = t.valor_mat || '';
    if(eqEl)  eqEl.value  = t.valor_eq  || '';
    if(ouEl)  ouEl.value  = t.valor_ou  || '';

    // Se algum detalhe foi preenchido, abre o painel de detalhamento E trava o custo total
    if(t.valor_mo || t.valor_mat || t.valor_eq || t.valor_ou){
        const painel  = document.getElementById('campos-detalhe-custos');
        const btn     = document.getElementById('btn-toggle-detalhe');
        const custoEl = document.getElementById('task-custo-total');
        if(painel) painel.classList.remove('hidden');
        if(btn) btn.innerHTML = '<i data-lucide="minus-circle" class="w-3 h-3 inline mr-1"></i> Ocultar detalhamento (MO / MAT / EQ / Outros)';
        // Trava o campo custo total — ele é calculado pela soma dos detalhes
        if(custoEl){
            custoEl.readOnly = true;
            custoEl.classList.add('bg-gray-100','text-gray-400','cursor-not-allowed');
            custoEl.classList.remove('bg-white');
            custoEl.title = 'Calculado automaticamente pela soma dos campos abaixo';
        }
        // Liga os eventos de soma nos campos de detalhe
        ['task-mo','task-mat','task-eq','task-ou'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.oninput = () => {
                const mo  = parseFloat(document.getElementById('task-mo')?.value)  || 0;
                const mat = parseFloat(document.getElementById('task-mat')?.value) || 0;
                const eq  = parseFloat(document.getElementById('task-eq')?.value)  || 0;
                const ou  = parseFloat(document.getElementById('task-ou')?.value)  || 0;
                if(custoEl) custoEl.value = (mo+mat+eq+ou).toFixed(2);
                calcTotalTask();
            };
        });
    }

    calcTotalTask();

    // ============================================================
    // CORREÇÃO 3: Preenche o líder e re-carrega os subordinados
    // ============================================================
    document.getElementById('task-fornecedor').value = t.forn;
    // Dispara o carregamento dos subordinados do líder
    onChangeFornecedor();
    // Após carregar, marca os membros que já estavam selecionados
    setTimeout(() => {
        (t.membros_ids || []).forEach(mid => {
            const cb = document.getElementById(`membro-check-${mid}`);
            if(cb) cb.checked = true;
        });
        _atualizarAlertaDiariaForm();
    }, 50);

    // Datas
    const el = document.getElementById('task-inicio');
    el.value = t.inicio || '';
    updateInicioStyle(el);
    document.getElementById('task-fim').value        = t.fim || '';
    document.getElementById('task-otimista').value   = t.otimista || '0';
    document.getElementById('task-pessimista').value = t.pessimista || '0';
    document.getElementById('task-dep').value        = t.dep?.length ? t.dep[0] : '';
    calcPERT();

    // Botão de atenção
    const btnA = document.getElementById('task-atencao');
    btnA.dataset.active = t.atencao ? 'true' : 'false';
    if(t.atencao){
        btnA.classList.add('bg-red-50','text-arcco-red','border-red-500');
        btnA.classList.remove('text-gray-300','border-gray-600');
    } else {
        btnA.classList.remove('bg-red-50','text-arcco-red','border-red-500');
        btnA.classList.add('text-gray-300','border-gray-600');
    }

    // Muda visual do botão para modo edição
    const btn = document.getElementById('btn-save-task');
    btn.innerText = 'ATUALIZAR SERVIÇO';
    btn.classList.add('bg-arcco-black','text-white');
    btn.classList.remove('bg-arcco-lime','text-arcco-black');
    document.getElementById('btn-cancel-edit').classList.remove('hidden');

    // renderObraDetail reescreve o select de fornecedor — por isso
    // guardamos o valor antes e restauramos logo depois do render
    const fornSalvo     = t.forn;
    const membrosSalvos = t.membros_ids || [];

    renderObraDetail(STATE.currentObraId);

    // Restaura o líder no select (que foi recriado pelo renderObraDetail)
    const fSel = document.getElementById('task-fornecedor');
    if(fSel) fSel.value = fornSalvo;

    // Recarrega os subordinados e remarca os checkboxes
    onChangeFornecedor();
    setTimeout(() => {
        membrosSalvos.forEach(mid => {
            const cb = document.getElementById(`membro-check-${mid}`);
            if(cb) cb.checked = true;
        });
        _atualizarAlertaDiariaForm();
    }, 60);

    document.getElementById('task-modulo').scrollIntoView({behavior:'smooth', block:'center'});
};

// ── Reset do formulário de tarefa ──────────────────────────────
export const resetTaskForm = () => {
    STATE.editingTaskId = null;

    // Limpa todos os campos
    ['task-nome','task-custo-total','task-bdi',
     'task-mo','task-mat','task-eq','task-ou'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    // Limpa displays calculados
    const vendaEl = document.getElementById('task-valor-venda-display');
    if(vendaEl) vendaEl.innerText = fmtBRL(0);

    // Fecha o painel de detalhamento E libera o campo custo total
    const painel   = document.getElementById('campos-detalhe-custos');
    const btnDet   = document.getElementById('btn-toggle-detalhe');
    const custoEl  = document.getElementById('task-custo-total');
    if(painel) painel.classList.add('hidden');
    if(btnDet) btnDet.innerHTML = '<i data-lucide="plus-circle" class="w-3 h-3 inline mr-1"></i> Detalhar Custos: MO / Material / Equipamento / Outros';
    if(custoEl){
        custoEl.readOnly = false;
        custoEl.classList.remove('bg-gray-100','text-gray-400','cursor-not-allowed');
        custoEl.classList.add('bg-white');
        custoEl.title = '';
    }
    // Remove os listeners dos campos de detalhe
    ['task-mo','task-mat','task-eq','task-ou'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.oninput = null;
    });

    document.getElementById('task-fornecedor').value = '';

    // Limpa os membros
    const contMembros = document.getElementById('membros-equipe-container');
    if(contMembros){ contMembros.innerHTML = ''; contMembros.classList.add('hidden'); }

    const el = document.getElementById('task-inicio');
    el.value = '';
    updateInicioStyle(el);
    document.getElementById('task-fim').value        = '';
    document.getElementById('task-otimista').value   = '0';
    document.getElementById('task-pessimista').value = '0';
    document.getElementById('task-dep').value        = '';
    calcPERT();

    // Limpa alertas
    const alertDiaria = document.getElementById('alerta-diaria-form');
    if(alertDiaria){ alertDiaria.innerHTML=''; alertDiaria.classList.add('hidden'); }
    const alertSob = document.getElementById('alerta-sobreposicao');
    if(alertSob){ alertSob.innerHTML=''; alertSob.classList.add('hidden'); }

    const btnA = document.getElementById('task-atencao');
    btnA.dataset.active = 'false';
    btnA.classList.remove('bg-red-50','text-arcco-red','border-red-500');
    btnA.classList.add('text-gray-300','border-gray-600');

    const btn = document.getElementById('btn-save-task');
    btn.innerText = 'SALVAR NO CRONOGRAMA';
    btn.classList.remove('bg-arcco-black','text-white');
    btn.classList.add('bg-arcco-lime','text-arcco-black');
    document.getElementById('btn-cancel-edit').classList.add('hidden');

    if(STATE.currentObraId) renderObraDetail(STATE.currentObraId);
};

// Mantido por compatibilidade (setTipoContratacao não é mais usado)
export const setTipoContratacao = (tipo) => {
    // No novo modelo não há mais tipos — mantido para não quebrar imports
    calcTotalTask();
};

export const toggleTaskStatus = async (fId, tId) => {
    const o = STATE.obras.find(x => x.firebaseId===fId);
    const t = o.tasks.find(x => x.id===tId);
    const ns = t.status===2?0:2;
    const tasks = o.tasks.map(x => x.id===tId?{...x,status:ns,concluidoPor:ns===2?STATE.activeUser.name:null}:x);
    await apiUpdate('obras',fId,{tasks});
};

export const deleteTask = async (fId, tId) => {
    if(!confirm('Remover serviço?')) return;
    const o = STATE.obras.find(x => x.firebaseId===fId);
    if(o.tasks.some(x => x.dep?.includes(tId))) return showToast('ERRO: Desvincule a dependência antes.');
    await apiUpdate('obras',fId,{tasks:o.tasks.filter(t => t.id!==tId)});
};

export const toggleAtencao = (btn) => {
    const active = btn.dataset.active==='true';
    btn.dataset.active = (!active).toString();
    if(!active){ btn.classList.add('bg-red-50','text-arcco-red','border-red-500'); btn.classList.remove('text-gray-300','border-gray-600'); }
    else { btn.classList.remove('bg-red-50','text-arcco-red','border-red-500'); btn.classList.add('text-gray-300','border-gray-600'); }
};

// ── Módulos EAP ───────────────────────────────────────────────
export const saveModuloObra = async () => {
    const ind  = document.getElementById('mod-indice').value.trim();
    const nome = document.getElementById('mod-nome').value.trim();
    if(!ind||!nome) return showToast('Preencha Índice e Nome.');
    const newName = `${ind} - ${nome}`;
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    let mods  = [...(o.modulos||[])];
    let tasks = [...(o.tasks||[])];
    if(STATE.editingModuloOldName){
        if(mods.includes(newName)&&newName!==STATE.editingModuloOldName) return showToast('Módulo já existe.');
        mods  = mods.map(m  => m===STATE.editingModuloOldName?newName:m);
        tasks = tasks.map(t => t.modulo===STATE.editingModuloOldName?{...t,modulo:newName}:t);
    } else {
        if(mods.includes(newName)) return showToast('Módulo já cadastrado.');
        mods.push(newName);
    }
    mods = sortModulos(mods);
    await apiUpdate('obras',STATE.currentObraId,{modulos:mods,tasks});
    showToast(STATE.editingModuloOldName?'Módulo Atualizado!':'Módulo Adicionado!');
    cancelEditModulo();
};

export const editModuloObra = (old) => {
    STATE.editingModuloOldName = old;
    const parts = old.match(/^([\d.]+)\s*(?:-\s*)?(.*)$/);
    document.getElementById('mod-indice').value = parts?parts[1]:'';
    document.getElementById('mod-nome').value   = parts?parts[2]:old;
    const btn = document.getElementById('btn-save-mod');
    btn.innerText = 'Atualizar'; btn.classList.replace('bg-arcco-lime','bg-arcco-black'); btn.classList.replace('text-arcco-black','text-white');
    document.getElementById('btn-cancel-mod').classList.remove('hidden');
    document.getElementById('mod-indice').focus();
};

export const cancelEditModulo = () => {
    STATE.editingModuloOldName = null;
    document.getElementById('mod-indice').value = '';
    document.getElementById('mod-nome').value   = '';
    const btn = document.getElementById('btn-save-mod');
    btn.innerText = 'Adicionar'; btn.classList.replace('bg-arcco-black','bg-arcco-lime'); btn.classList.replace('text-white','text-arcco-black');
    document.getElementById('btn-cancel-mod').classList.add('hidden');
};

export const deleteModuloObra = async (nome) => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(o.tasks?.some(t => t.modulo===nome)) return showToast('Remova os serviços deste módulo primeiro.');
    if(!confirm(`Excluir "${nome}"?`)) return;
    await apiUpdate('obras',STATE.currentObraId,{modulos:o.modulos.filter(m => m!==nome)});
};

// ── Config da Obra ────────────────────────────────────────────
export const saveNovaObra = async () => {
    const nome = document.getElementById('new-obra-nome').value;
    const cli  = document.getElementById('new-obra-cliente').value;
    const tipo = document.getElementById('new-obra-tipo').value;
    if(!nome||!cli) return showToast('Preencha nome e cliente');
    await apiAdd('obras',{nome,clienteId:cli,tipo,contrato:'PREÇO FECHADO',taxa_adm:0,tasks:[],compras:[],medicoes:[],diarias:[],modulos:[],status:'ativa',timestamp:Date.now()});
    showToast('PROJETO CRIADO');
    closeModal();
};

export const updateObraConfig = async (fId) => {
    const contrato = document.getElementById('det-edit-contrato').value;
    const taxaEl   = document.getElementById('det-edit-taxa');
    const taxa_adm = taxaEl?parseFloat(taxaEl.value)||0:0;
    await apiUpdate('obras',fId,{contrato,taxa_adm});
    showToast('CONTRATO ATUALIZADO');
};

// ── Compras ───────────────────────────────────────────────────
export function renderComprasList(o){
    const cont = document.getElementById('det-compras-list');
    if(!o.compras?.length){ cont.innerHTML='<div class="p-6 text-center text-[10px] font-bold text-gray-400 uppercase">Nenhum material lançado.</div>'; return; }
    cont.innerHTML = o.compras.map(c => `
        <div class="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 ${c.status==='pendente'?'bg-orange-50/50':''}">
            <div>
                <div class="flex items-center gap-2">
                    <p class="text-xs font-bold text-arcco-black">${c.desc}</p>
                    ${c.status==='pendente'
                        ?`<span class="badge-pendente px-2 py-0.5 rounded text-[9px] font-bold uppercase">Aprovação Pendente</span>`
                        :`<span class="badge-pago px-2 py-0.5 rounded text-[9px] font-bold uppercase">Aprovado</span>`}
                </div>
                <p class="text-[9px] font-bold text-gray-500 uppercase mt-1">
                    <span>Por: ${c.forn}</span> • <span>${fmtDate(c.data)}</span>
                    ${c.aprovadoPor?`• <span class="text-green-600">Aprov. por: ${c.aprovadoPor}</span>`:''}
                </p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                <span class="font-bold text-sm text-arcco-orange">${fmtBRL(c.valor)}</span>
                <div class="flex gap-2">
                    ${c.link?`<a href="${c.link}" target="_blank" class="w-8 h-8 rounded bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-arcco-lime"><i data-lucide="paperclip" class="w-4 h-4"></i></a>`:''}
                    ${c.status==='pendente'?`<button onclick="APP.aprovarCompra('${o.firebaseId}','${c.id}')" class="w-8 h-8 rounded bg-arcco-lime border border-arcco-lime flex items-center justify-center text-arcco-black"><i data-lucide="check" class="w-4 h-4"></i></button>`:''}
                    <button onclick="APP.deleteCompra('${o.firebaseId}','${c.id}')" class="w-8 h-8 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>`).join('');
    lucide.createIcons();
}

export const openModalNovaCompra = () => {
    document.getElementById('compra-desc').value  = '';
    document.getElementById('compra-valor').value = '';
    document.getElementById('compra-data').value  = new Date().toISOString().split('T')[0];
    document.getElementById('compra-link').value  = '';
    openModal('modal-nova-compra');
};

export const saveNovaCompra = async () => {
    const desc = document.getElementById('compra-desc').value;
    const val  = parseFloat(document.getElementById('compra-valor').value)||0;
    const dt   = document.getElementById('compra-data').value;
    const lnk  = document.getElementById('compra-link').value;
    if(!desc||!val) return showToast('Preencha descrição e valor.');
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const nova = {id:`C-${Date.now()}`,desc,valor:val,data:dt,link:lnk,forn:STATE.activeUser.role==='FORNECEDOR'?STATE.activeUser.name:'GESTOR (ARCCO)',status:STATE.activeUser.role==='FORNECEDOR'?'pendente':'aprovado',aprovadoPor:STATE.activeUser.role!=='FORNECEDOR'?STATE.activeUser.name:null};
    await apiUpdate('obras',STATE.currentObraId,{compras:[...(o.compras||[]),nova]});
    showToast(STATE.activeUser.role==='FORNECEDOR'?'MATERIAL ENVIADO PARA APROVAÇÃO!':'DESPESA LANÇADA!');
    closeModal();
};

export const aprovarCompra = async (fId, cId) => {
    const o = STATE.obras.find(x => x.firebaseId===fId);
    const compras = (o.compras||[]).map(c => c.id===cId?{...c,status:'aprovado',aprovadoPor:STATE.activeUser.name}:c);
    await apiUpdate('obras',fId,{compras});
    showToast('COMPRA APROVADA!');
};

export const deleteCompra = async (fId, cId) => {
    if(!confirm('Excluir lançamento?')) return;
    const o = STATE.obras.find(x => x.firebaseId===fId);
    await apiUpdate('obras',fId,{compras:(o.compras||[]).filter(c => c.id!==cId)});
};
