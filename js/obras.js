// ============================================================
// obras.js — Obras, Tarefas, Módulos EAP e Cronograma
// ============================================================

import { STATE, apiAdd, apiUpdate, apiDelete, today, parseDate, fmtBRL, fmtDate, todayISO, sortModulos, MOD_COLORS } from './config.js';
import { showToast, showMasterSection, switchObraTab } from './ui.js';
// renderMedicoes, renderMasterPonto, renderCurvas e switchCurvaTab
// são chamadas via window.APP para evitar dependências circulares

// ── Obras Grid ────────────────────────────────────────────────
export function renderMasterObrasGrid(){
    const grid = document.getElementById('master-obras-grid');
    if(!STATE.obras.length){
        grid.innerHTML = '<div class="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200"><p class="text-sm font-bold text-gray-400 uppercase">Nenhum projeto cadastrado.</p></div>';
        return;
    }
    const now = today();

    grid.innerHTML = STATE.obras.map(o => {
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
            <div class="border-t border-gray-100 bg-gray-50 p-3 flex gap-2 mt-auto">
                <button onclick="APP.openObraDetail('${o.firebaseId}')" class="flex-1 bg-arcco-black text-white font-montserrat font-bold text-xs uppercase py-2.5 rounded hover:bg-gray-800 transition-colors shadow-sm">Abrir Gestão</button>
                <button onclick="APP.duplicarObra('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center" title="Duplicar"><i data-lucide="copy" class="w-4 h-4"></i></button>
                <button onclick="APP.deleteObraCompleta('${o.firebaseId}')" class="w-9 h-9 rounded bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:text-arcco-red flex items-center justify-center" title="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();

    setTimeout(() => {
        STATE.obras.forEach(o => {
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

export const duplicarObra = async (id) => {
    const orig = STATE.obras.find(x => x.firebaseId===id);
    if(!orig) return;
    if(!confirm(`Criar cópia de "${orig.nome}"?`)) return;
    const idMap = {};
    const base = Date.now();
    const tasks = (orig.tasks||[]).map((t,i) => { const nid=`T-${base+i}`; idMap[t.id]=nid; return {...t,id:nid,status:0,concluidoPor:null}; });
    tasks.forEach(t => { if(t.dep?.length) t.dep=t.dep.map(d=>idMap[d]||d); });
    await apiAdd('obras',{nome:orig.nome+' (Cópia)',clienteId:orig.clienteId,tipo:orig.tipo,contrato:orig.contrato,taxa_adm:orig.taxa_adm||0,modulos:[...(orig.modulos||[])],tasks,compras:[],medicoes:[],diarias:[],timestamp:base});
    showToast('OBRA DUPLICADA');
};

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

    const fSel = document.getElementById('task-fornecedor');
    fSel.innerHTML = '<option value="">(SELECIONE A EQUIPE)</option>' +
        STATE.forn.filter(f => f.status==='ativo'&&f.vinculo==='MASTER').map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

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

    // Charts
    const done = tasks.filter(t => t.status===2).length;
    const pct  = tasks.length ? Math.round(done/tasks.length*100) : 0;
    document.getElementById('det-pct-text').innerText = `${pct}%`;

    if(STATE.donutChart) STATE.donutChart.destroy();
    const ctxD = document.getElementById('det-chart-donut');
    if(ctxD) STATE.donutChart = new Chart(ctxD,{type:'doughnut',data:{datasets:[{data:[done,tasks.length-done],backgroundColor:['#ccff00','#f4f4f5'],borderWidth:0}]},options:{maintainAspectRatio:false,cutout:'78%',plugins:{tooltip:{enabled:false}}}});

    const phases = {};
    tasks.forEach(t => { if(!phases[t.modulo]) phases[t.modulo]={done:0,total:0}; phases[t.modulo].total++; if(t.status===2) phases[t.modulo].done++; });
    const phLabels = Object.keys(phases);
    if(STATE.barChart) STATE.barChart.destroy();
    const ctxB = document.getElementById('det-chart-bar');
    if(ctxB) STATE.barChart = new Chart(ctxB,{type:'bar',data:{labels:phLabels,datasets:[{label:'Concluído',data:phLabels.map(l=>phases[l].done),backgroundColor:'#111111',barThickness:16,borderRadius:4},{label:'Pendente',data:phLabels.map(l=>phases[l].total-phases[l].done),backgroundColor:'#e4e4e7',barThickness:16,borderRadius:4}]},options:{maintainAspectRatio:false,responsive:true,scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,display:false}},plugins:{legend:{display:false}}}});

    // Alertas
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

// ── Task Row ──────────────────────────────────────────────────
export function renderTaskRow(t, allTasks, o){
    const isBlocked  = t.dep?.some(dId => { const dt=allTasks.find(x=>x.id===dId); return dt&&dt.status!==2; });
    const isEditing  = t.id===STATE.editingTaskId;
    const pertHtml   = getPertHtml(t);
    const isEmpreita = t.tipo_contratacao==='empreita';
    return `
    <div class="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-gray-50 transition-colors ${isEditing?'editing-row':''} ${isBlocked?'alert-blocked':''}">
        <div class="flex-1 flex gap-4 items-start cursor-pointer w-full" onclick="APP.editTask('${t.id}')">
            <div class="mt-1 shrink-0">${t.atencao?`<div class="w-3.5 h-3.5 rounded-full bg-arcco-red animate-pulse shadow"></div>`:`<div class="w-3 h-3 rounded-full bg-gray-300 border border-gray-400"></div>`}</div>
            <div class="flex-1">
                <p class="text-sm font-bold text-arcco-black uppercase">${t.nome} <span class="text-green-600 font-normal ml-2 text-xs hidden sm:inline">${fmtBRL(t.valor_venda||t.valor)}</span></p>
                <div class="flex flex-wrap gap-1 mt-1.5 mb-2">
                    ${isEmpreita
                        ? `<span class="text-[8px] font-bold text-arcco-orange bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><i data-lucide="handshake" class="w-2.5 h-2.5"></i> Empreita: ${fmtBRL(t.valor_empreita||t.valor)}</span>`
                        : `${t.valor_mo?`<span class="text-[8px] font-bold text-gray-500 uppercase border border-gray-200 px-1.5 py-0.5 rounded">MO: ${fmtBRL(t.valor_mo)}</span>`:''}
                           ${t.valor_mat?`<span class="text-[8px] font-bold text-gray-500 uppercase border border-gray-200 px-1.5 py-0.5 rounded">MAT: ${fmtBRL(t.valor_mat)}</span>`:''}
                           ${t.valor_eq?`<span class="text-[8px] font-bold text-gray-500 uppercase border border-gray-200 px-1.5 py-0.5 rounded">EQ: ${fmtBRL(t.valor_eq)}</span>`:''}`}
                    ${t.taxa_pct>0
                        ? t.taxa_tipo==='ADM'
                            ? `<span class="text-[8px] font-bold text-white uppercase bg-gray-800 px-1.5 py-0.5 rounded">ADM: ${t.taxa_pct}%</span>`
                            : `<span class="text-[8px] font-bold text-arcco-black uppercase bg-arcco-lime px-1.5 py-0.5 rounded">BDI: ${t.taxa_pct}%</span>`
                        : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[9px] font-bold text-arcco-black uppercase bg-gray-200 px-2 py-0.5 rounded">${t.forn}</span>
                    <span class="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${fmtDate(t.fim)}</span>
                    ${pertHtml}
                    ${isBlocked?`<span class="text-[9px] font-bold text-arcco-red uppercase bg-red-100 px-2 py-0.5 rounded flex items-center gap-1"><i data-lucide="lock" class="w-3 h-3"></i> TRAVADO</span>`:''}
                    ${t.status===2&&t.concluidoPor?`<span class="text-[9px] font-bold text-green-700 uppercase bg-green-100 px-2 py-0.5 rounded border border-green-200"><i data-lucide="check" class="inline w-3 h-3"></i> ${t.concluidoPor}</span>`:''}
                </div>
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

// ── Task Form ─────────────────────────────────────────────────
export const setTipoContratacao = (tipo) => {
    document.getElementById('task-tipo-contratacao').value = tipo;
    const detEl  = document.getElementById('campos-detalhado');
    const empEl  = document.getElementById('campos-empreita');
    const btnDet = document.getElementById('btn-tipo-detalhado');
    const btnEmp = document.getElementById('btn-tipo-empreita');
    if(tipo==='empreita'){
        detEl.classList.add('hidden'); empEl.classList.remove('hidden');
        btnEmp.classList.replace('bg-white','bg-arcco-orange'); btnEmp.classList.replace('text-gray-500','text-white'); btnEmp.classList.replace('border-gray-300','border-arcco-orange');
        btnDet.classList.replace('bg-arcco-black','bg-white'); btnDet.classList.replace('text-white','text-gray-500'); btnDet.classList.add('border-gray-300'); btnDet.classList.remove('border-arcco-black');
    } else {
        empEl.classList.add('hidden'); detEl.classList.remove('hidden');
        btnDet.classList.replace('bg-white','bg-arcco-black'); btnDet.classList.replace('text-gray-500','text-white'); btnDet.classList.remove('border-gray-300'); btnDet.classList.add('border-arcco-black');
        btnEmp.classList.replace('bg-arcco-orange','bg-white'); btnEmp.classList.replace('text-white','text-gray-500'); btnEmp.classList.replace('border-arcco-orange','border-gray-300');
    }
    calcTotalTask();
};

export const calcTotalTask = () => {
    const tipo = document.getElementById('task-tipo-contratacao')?.value || 'detalhado';
    if(tipo==='empreita'){
        const emp = parseFloat(document.getElementById('task-empreita')?.value)||0;
        const bdi = parseFloat(document.getElementById('task-empreita-bdi')?.value)||0;
        const venda = emp*(1+bdi/100);
        document.getElementById('task-valor').value = emp;
        document.getElementById('task-valor-venda').value = venda;
        document.getElementById('task-empreita-custo-display').innerText = fmtBRL(emp);
        document.getElementById('task-empreita-venda-display').innerText = fmtBRL(venda);
    } else {
        const mo  = parseFloat(document.getElementById('task-mo').value)||0;
        const mat = parseFloat(document.getElementById('task-mat').value)||0;
        const eq  = parseFloat(document.getElementById('task-eq').value)||0;
        const ou  = parseFloat(document.getElementById('task-ou').value)||0;
        const pct = parseFloat(document.getElementById('task-taxa-pct').value)||0;
        const total = mo+mat+eq+ou;
        const venda = total*(1+pct/100);
        document.getElementById('task-valor').value = total;
        document.getElementById('task-valor-venda').value = venda;
        document.getElementById('task-valor-display').innerText = fmtBRL(total);
        document.getElementById('task-venda-display').innerText = fmtBRL(venda);
    }
};

export const calcPERT = () => {
    const s=document.getElementById('task-inicio').value;
    const e=document.getElementById('task-fim').value;
    const disp=document.getElementById('pert-display');
    if(!s||!e){ disp.innerText='---'; return; }
    const [sy,sm,sd]=s.split('-'); const [ey,em,ed]=e.split('-');
    const ds=new Date(sy,sm-1,sd); const de=new Date(ey,em-1,ed);
    const m=Math.round((de-ds)/86400000);
    if(m<0){ disp.innerText='Datas inválidas'; return; }
    const ot=m+(parseInt(document.getElementById('task-otimista').value)||0);
    const pe=m+(parseInt(document.getElementById('task-pessimista').value)||0);
    const te=(ot+4*m+pe)/6;
    const dp=new Date(ds); dp.setDate(dp.getDate()+Math.round(te));
    disp.innerText=`${te.toFixed(1)} dias (${fmtDate(dp.toISOString().split('T')[0])})`;
};

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

export const saveTaskToObra = async () => {
    const o    = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const tipo = document.getElementById('task-tipo-contratacao')?.value || 'detalhado';
    const isEmpreita = tipo==='empreita';
    let mo=0,mat=0,eq=0,ou=0,pct=0,tipoTaxa='BDI',total=0,venda=0;
    if(isEmpreita){
        const emp    = parseFloat(document.getElementById('task-empreita')?.value)||0;
        const bdiEmp = parseFloat(document.getElementById('task-empreita-bdi')?.value)||0;
        total=emp; venda=emp*(1+bdiEmp/100); pct=bdiEmp; ou=emp;
    } else {
        mo  = parseFloat(document.getElementById('task-mo').value)||0;
        mat = parseFloat(document.getElementById('task-mat').value)||0;
        eq  = parseFloat(document.getElementById('task-eq').value)||0;
        ou  = parseFloat(document.getElementById('task-ou').value)||0;
        pct = parseFloat(document.getElementById('task-taxa-pct').value)||0;
        tipoTaxa = document.getElementById('task-taxa-tipo').value;
        total=mo+mat+eq+ou; venda=total*(1+pct/100);
    }
    const taskData = {
        modulo: document.getElementById('task-modulo').value,
        nome:   document.getElementById('task-nome').value,
        tipo_contratacao: tipo,
        valor_mo: isEmpreita?0:mo, valor_mat: isEmpreita?0:mat,
        valor_eq: isEmpreita?0:eq, valor_ou: ou,
        valor_empreita: isEmpreita?total:0,
        valor: total, taxa_tipo: tipoTaxa, taxa_pct: pct, bdi: pct, valor_venda: venda,
        forn:   document.getElementById('task-fornecedor').value,
        inicio: document.getElementById('task-inicio').value,
        fim:    document.getElementById('task-fim').value,
        otimista:   parseInt(document.getElementById('task-otimista').value)||0,
        pessimista: parseInt(document.getElementById('task-pessimista').value)||0,
        dep:    document.getElementById('task-dep').value?[document.getElementById('task-dep').value]:[],
        atencao: document.getElementById('task-atencao').dataset.active==='true',
        status: 0
    };
    if(!taskData.modulo||!taskData.nome||!taskData.forn) return showToast('DADOS OBRIGATÓRIOS FALTANDO');
    let tasks;
    if(STATE.editingTaskId){
        const old = o.tasks.find(t => t.id===STATE.editingTaskId);
        tasks = o.tasks.map(t => t.id===STATE.editingTaskId?{...t,...taskData,status:old.status}:t);
        showToast('SERVIÇO ATUALIZADO');
    } else {
        tasks = [...(o.tasks||[]), {id:`T-${Date.now()}`,...taskData}];
        showToast('SERVIÇO INSERIDO');
    }
    await apiUpdate('obras',STATE.currentObraId,{tasks});
    resetTaskForm();
};

export const editTask = (id) => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const t = o.tasks.find(x => x.id===id);
    STATE.editingTaskId = id;
    document.getElementById('task-modulo').value = t.modulo;
    document.getElementById('task-nome').value   = t.nome;
    const tipo = t.tipo_contratacao||'detalhado';
    setTipoContratacao(tipo);
    if(tipo==='empreita'){
        document.getElementById('task-empreita').value     = t.valor_empreita||t.valor||'';
        document.getElementById('task-empreita-bdi').value = t.taxa_pct||t.bdi||'';
    } else {
        document.getElementById('task-mo').value  = t.valor_mo||'';
        document.getElementById('task-mat').value = t.valor_mat||'';
        document.getElementById('task-eq').value  = t.valor_eq||'';
        document.getElementById('task-ou').value  = t.valor_ou||'';
        document.getElementById('task-taxa-tipo').value = t.taxa_tipo||'BDI';
        document.getElementById('task-taxa-pct').value  = t.taxa_pct!==undefined?t.taxa_pct:(t.bdi||'');
    }
    calcTotalTask();
    document.getElementById('task-fornecedor').value = t.forn;
    const el = document.getElementById('task-inicio'); el.value=t.inicio||''; updateInicioStyle(el);
    document.getElementById('task-fim').value        = t.fim||'';
    document.getElementById('task-otimista').value   = t.otimista||'0';
    document.getElementById('task-pessimista').value = t.pessimista||'0';
    document.getElementById('task-dep').value        = t.dep?.length?t.dep[0]:'';
    calcPERT();
    const btnA = document.getElementById('task-atencao');
    btnA.dataset.active = t.atencao?'true':'false';
    if(t.atencao){ btnA.classList.add('bg-red-50','text-arcco-red','border-red-500'); btnA.classList.remove('text-gray-300','border-gray-600'); }
    else { btnA.classList.remove('bg-red-50','text-arcco-red','border-red-500'); btnA.classList.add('text-gray-300','border-gray-600'); }
    const btn = document.getElementById('btn-save-task');
    btn.innerText = 'ATUALIZAR SERVIÇO'; btn.classList.add('bg-arcco-black','text-white'); btn.classList.remove('bg-arcco-lime','text-arcco-black');
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    renderObraDetail(STATE.currentObraId);
    document.getElementById('task-modulo').scrollIntoView({behavior:'smooth',block:'center'});
};

export const resetTaskForm = () => {
    STATE.editingTaskId = null;
    ['task-nome','task-mo','task-mat','task-eq','task-ou','task-taxa-pct','task-empreita','task-empreita-bdi'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    setTipoContratacao('detalhado');
    calcTotalTask();
    document.getElementById('task-fornecedor').value = '';
    const el = document.getElementById('task-inicio'); el.value=''; updateInicioStyle(el);
    document.getElementById('task-fim').value        = '';
    document.getElementById('task-otimista').value   = '0';
    document.getElementById('task-pessimista').value = '0';
    document.getElementById('task-dep').value        = '';
    calcPERT();
    const btnA = document.getElementById('task-atencao');
    btnA.dataset.active = 'false'; btnA.classList.remove('bg-red-50','text-arcco-red','border-red-500'); btnA.classList.add('text-gray-300','border-gray-600');
    const btn = document.getElementById('btn-save-task');
    btn.innerText = 'SALVAR NO CRONOGRAMA'; btn.classList.remove('bg-arcco-black','text-white'); btn.classList.add('bg-arcco-lime','text-arcco-black');
    document.getElementById('btn-cancel-edit').classList.add('hidden');
    if(STATE.currentObraId) renderObraDetail(STATE.currentObraId);
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

// ── Módulos ───────────────────────────────────────────────────
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
    await apiAdd('obras',{nome,clienteId:cli,tipo,contrato:'PREÇO FECHADO',taxa_adm:0,tasks:[],compras:[],medicoes:[],diarias:[],modulos:[],timestamp:Date.now()});
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
