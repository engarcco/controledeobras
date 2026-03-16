// ============================================================
// ponto.js — Folha de Ponto (Master, Líder e Membro)
// ============================================================

import { STATE, apiUpdate, todayISO, fmtDate, fmtDiaSemana, parseDate } from './config.js';
import { showToast, openModal, closeModal, pontoStatusBadge } from './ui.js';

// ── MASTER: Folha de Ponto ────────────────────────────────────
export const renderMasterPonto = () => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;

    const checkins = o.checkins||[];
    const datas    = [...new Set(checkins.map(c => c.data))].sort().reverse();
    const membros  = [...new Set(checkins.map(c => c.membroNome))].sort();

    const selData   = document.getElementById('ponto-filtro-data');
    const selMembro = document.getElementById('ponto-filtro-membro');
    const prevData   = selData?.value||'';
    const prevMembro = selMembro?.value||'';

    if(selData)   selData.innerHTML   = '<option value="">Todos os dias</option>'   + datas.map(d   => `<option value="${d}" ${d===prevData?'selected':''}>${fmtDate(d)}</option>`).join('');
    if(selMembro) selMembro.innerHTML = '<option value="">Todos os membros</option>'+ membros.map(m => `<option value="${m}" ${m===prevMembro?'selected':''}>${m}</option>`).join('');

    let filtered = checkins;
    if(prevData)   filtered = filtered.filter(c => c.data===prevData);
    if(prevMembro) filtered = filtered.filter(c => c.membroNome===prevMembro);

    const pendentes  = checkins.filter(c => c.statusLider==='aprovado'&&c.statusMaster!=='aprovado'&&c.statusMaster!=='recusado');
    const contPend   = document.getElementById('ponto-pendentes-master');
    const listPend   = document.getElementById('ponto-pendentes-master-list');
    const badge      = document.getElementById('master-ponto-badge');

    if(pendentes.length){
        contPend?.classList.remove('hidden');
        badge?.classList.remove('hidden');
        if(listPend) listPend.innerHTML = pendentes.map(ci => `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                <div>
                    <p class="text-xs font-bold text-arcco-black uppercase">${ci.membroNome}</p>
                    <p class="text-[9px] font-bold text-gray-500 uppercase mt-0.5">${fmtDiaSemana(ci.data)} • ${ci.horario} • <span class="text-blue-600">${ci.atividade}</span></p>
                    <p class="text-[9px] font-bold text-arcco-lime bg-arcco-black px-2 py-0.5 rounded mt-1 inline-block">Aprovado pelo líder: ${ci.liderNome}</p>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button onclick="APP.aprovarCheckin('${ci.id}','aprovado')" class="flex-1 sm:flex-none bg-arcco-lime text-arcco-black font-bold text-xs uppercase px-4 py-2 rounded hover:brightness-95 flex items-center gap-1 justify-center"><i data-lucide="check" class="w-3 h-3"></i> Aprovar</button>
                    <button onclick="APP.aprovarCheckin('${ci.id}','recusado')" class="flex-1 sm:flex-none bg-red-50 border border-red-200 text-arcco-red font-bold uppercase text-xs px-4 py-2 rounded hover:bg-red-100 flex items-center gap-1 justify-center"><i data-lucide="x" class="w-3 h-3"></i> Recusar</button>
                </div>
            </div>`).join('');
    } else {
        contPend?.classList.add('hidden');
        badge?.classList.add('hidden');
    }

    const tabela = document.getElementById('ponto-tabela-master');
    if(!filtered.length){
        if(tabela) tabela.innerHTML = '<div class="p-8 text-center text-sm font-bold text-gray-400 uppercase">Nenhum registro de ponto nesta obra.</div>';
        return;
    }

    const byDate = {};
    [...filtered].sort((a,b) => b.data.localeCompare(a.data)).forEach(ci => {
        if(!byDate[ci.data]) byDate[ci.data]=[];
        byDate[ci.data].push(ci);
    });

    if(tabela) tabela.innerHTML = Object.entries(byDate).map(([data, cis]) => `
        <div class="border-b border-gray-100 last:border-0">
            <div class="bg-gray-50 px-5 py-2.5 flex justify-between items-center">
                <p class="text-[10px] font-bold text-arcco-black uppercase tracking-wider">${fmtDiaSemana(data)}</p>
                <span class="text-[9px] font-bold text-gray-500 uppercase">${cis.filter(c=>c.statusMaster==='aprovado').length}/${cis.length} aprovados</span>
            </div>
            ${cis.map(ci => `
            <div class="px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm uppercase shrink-0">${ci.membroNome.charAt(0)}</div>
                    <div>
                        <p class="text-xs font-bold text-arcco-black uppercase">${ci.membroNome}</p>
                        <p class="text-[9px] font-bold text-gray-500 uppercase mt-0.5">${ci.horario} • ${ci.atividade}</p>
                        <p class="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Líder: ${ci.liderNome}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    ${pontoStatusBadge(ci)}
                    ${ci.statusMaster!=='aprovado'&&ci.statusMaster!=='recusado'&&ci.statusLider==='aprovado'?`
                    <div class="flex gap-1">
                        <button onclick="APP.aprovarCheckin('${ci.id}','aprovado')" class="w-7 h-7 rounded bg-arcco-lime flex items-center justify-center hover:brightness-95" title="Aprovar"><i data-lucide="check" class="w-3 h-3 text-arcco-black"></i></button>
                        <button onclick="APP.aprovarCheckin('${ci.id}','recusado')" class="w-7 h-7 rounded bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100" title="Recusar"><i data-lucide="x" class="w-3 h-3 text-arcco-red"></i></button>
                    </div>`:''}
                    <button onclick="APP.deleteCheckin('${ci.id}')" class="w-7 h-7 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-arcco-red hover:border-red-200 hover:bg-red-50" title="Excluir"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                </div>
            </div>`).join('')}
        </div>`).join('');
    lucide.createIcons();
};

export const aprovarCheckin = async (ciId, status) => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const checkins = (o.checkins||[]).map(c => c.id===ciId?{...c,statusMaster:status,masterNome:STATE.activeUser.name,masterEm:todayISO()}:c);
    await apiUpdate('obras',STATE.currentObraId,{checkins});
    showToast(status==='aprovado'?'CHECK-IN APROVADO!':'CHECK-IN RECUSADO');
    renderMasterPonto();
};

export const deleteCheckin = async (ciId) => {
    if(!confirm('Excluir este registro de ponto?')) return;
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    await apiUpdate('obras',STATE.currentObraId,{checkins:(o.checkins||[]).filter(c => c.id!==ciId)});
    showToast('REGISTRO EXCLUÍDO');
    renderMasterPonto();
};

// ── LÍDER: Folha de Ponto ─────────────────────────────────────
export const renderFornPontoLider = () => {
    const cont = document.getElementById('fornecedor-ponto');
    if(!cont) return;

    const liderId       = STATE.activeUser.id;
    const membrosEquipe = STATE.forn.filter(f => f.vinculo===liderId&&f.status==='ativo');
    const membroIds     = membrosEquipe.map(m => m.id);
    const membroNomes   = membrosEquipe.map(m => m.nome);

    const todosCi = [];
    STATE.obras.forEach(o => {
        (o.checkins||[]).forEach(ci => {
            if(membroIds.includes(ci.membroId)||membroNomes.includes(ci.membroNome)){
                todosCi.push({...ci, obraId:o.firebaseId, obraNome:o.nome});
            }
        });
    });

    const pendentes = todosCi.filter(c => c.statusLider!=='aprovado'&&c.statusLider!=='recusado');
    const historico = todosCi.filter(c => c.statusLider==='aprovado'||c.statusLider==='recusado').sort((a,b) => b.data.localeCompare(a.data));

    cont.innerHTML = `
        <div class="space-y-6">
            <div>
                <h3 class="font-montserrat font-bold text-xl uppercase text-arcco-black">Folha de Ponto</h3>
                <p class="text-xs text-gray-500 font-bold uppercase mt-0.5">Aprovação de presença da sua equipe</p>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm"><p class="text-[9px] font-bold text-gray-400 uppercase">Membros</p><p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${membrosEquipe.length}</p></div>
                <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center shadow-sm"><p class="text-[9px] font-bold text-orange-500 uppercase">Pendentes</p><p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${pendentes.length}</p></div>
                <div class="bg-arcco-lime/10 border border-arcco-lime/40 rounded-xl p-4 text-center shadow-sm"><p class="text-[9px] font-bold text-gray-600 uppercase">Aprovados Hoje</p><p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${todosCi.filter(c=>c.statusLider==='aprovado'&&c.data===todayISO()).length}</p></div>
            </div>
            ${pendentes.length ? `
            <div class="bg-orange-50 border border-orange-200 rounded-xl overflow-hidden">
                <div class="bg-orange-100 px-5 py-3 flex items-center gap-2">
                    <i data-lucide="alert-circle" class="w-4 h-4 text-orange-700"></i>
                    <span class="text-xs font-bold text-orange-700 uppercase">Check-ins Aguardando sua Aprovação</span>
                </div>
                <div class="p-4 space-y-3">
                    ${pendentes.map(ci => `
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg border border-orange-200 shadow-sm">
                        <div>
                            <p class="text-xs font-bold text-arcco-black uppercase">${ci.membroNome}</p>
                            <p class="text-[9px] font-bold text-gray-500 uppercase mt-0.5">${fmtDiaSemana(ci.data)} • ${ci.horario}</p>
                            <p class="text-[9px] font-bold text-blue-600 mt-0.5">${ci.atividade} — <span class="text-gray-500">${ci.obraNome}</span></p>
                        </div>
                        <div class="flex gap-2 w-full sm:w-auto">
                            <button onclick="APP.liderAprovarCheckin('${ci.id}','${ci.obraId}','aprovado')" class="flex-1 sm:flex-none bg-arcco-lime text-arcco-black font-bold text-xs uppercase px-4 py-2 rounded hover:brightness-95 flex items-center gap-1 justify-center"><i data-lucide="check" class="w-3 h-3"></i> Confirmar</button>
                            <button onclick="APP.liderAprovarCheckin('${ci.id}','${ci.obraId}','recusado')" class="flex-1 sm:flex-none bg-red-50 border border-red-200 text-arcco-red font-bold uppercase text-xs px-4 py-2 rounded hover:bg-red-100 flex items-center gap-1 justify-center"><i data-lucide="x" class="w-3 h-3"></i> Recusar</button>
                        </div>
                    </div>`).join('')}
                </div>
            </div>` : `
            <div class="bg-green-50 border border-green-200 p-5 rounded-xl flex items-center gap-4">
                <div class="bg-green-100 p-2 rounded-full text-green-600"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div>
                <div><h4 class="text-xs font-bold text-green-800 uppercase">Tudo em dia!</h4><p class="text-xs text-green-700">Nenhum check-in pendente de aprovação.</p></div>
            </div>`}
            ${historico.length ? `
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="bg-gray-50 border-b border-gray-200 px-5 py-3"><p class="text-xs font-bold text-arcco-black uppercase tracking-wider">Histórico da Equipe</p></div>
                <div class="divide-y divide-gray-100">
                    ${historico.slice(0,30).map(ci => `
                    <div class="px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs uppercase shrink-0">${ci.membroNome.charAt(0)}</div>
                            <div>
                                <p class="text-xs font-bold text-arcco-black uppercase">${ci.membroNome}</p>
                                <p class="text-[9px] font-bold text-gray-500 uppercase">${fmtDate(ci.data)} • ${ci.horario} • ${ci.obraNome}</p>
                            </div>
                        </div>
                        ${pontoStatusBadge(ci)}
                    </div>`).join('')}
                </div>
            </div>` : ''}
        </div>`;
    lucide.createIcons();
};

export const liderAprovarCheckin = async (ciId, obraId, status) => {
    const o = STATE.obras.find(x => x.firebaseId===obraId);
    const checkins = (o.checkins||[]).map(c => c.id===ciId?{...c,statusLider:status,liderNome:STATE.activeUser.name,liderEm:todayISO()}:c);
    await apiUpdate('obras',obraId,{checkins});
    showToast(status==='aprovado'?'PRESENÇA CONFIRMADA!':'RECUSADO');
    renderFornPontoLider();
};

// ── Check-in (Membro / Líder) ─────────────────────────────────
export const abrirCheckin = () => _abrirCheckinModal(null);
export const abrirCheckinObra = (obraId) => _abrirCheckinModal(obraId);

const _abrirCheckinModal = (preObraId) => {
    const isMembro = STATE.activeUser.role==='MEMBRO';
    const isLider  = STATE.activeUser.role==='FORNECEDOR';
    const liderId  = isLider?STATE.activeUser.id:STATE.activeUser.vinculo;

    const obrasDisponiveis = STATE.obras.filter(o =>
        o.tasks?.some(t => t.forn===liderId||(isMembro&&t.forn===STATE.activeUser.id))
    );

    const obrasJaFez = new Set();
    STATE.obras.forEach(o =>
        (o.checkins||[]).forEach(c => {
            if(c.membroId===STATE.activeUser.id&&c.data===todayISO()) obrasJaFez.add(o.firebaseId);
        })
    );

    const obrasHtml = obrasDisponiveis.map((o,i) => {
        const jaFez  = obrasJaFez.has(o.firebaseId);
        const checked = preObraId===o.firebaseId?'checked':'';
        return `
        <div class="checkin-obra-row flex items-start gap-3 p-3 rounded-lg border ${jaFez?'border-arcco-lime/40 bg-arcco-lime/5':'border-gray-200 bg-white'} transition-colors">
            <input type="checkbox" id="co-${i}" class="checkin-obra-chk mt-0.5 w-4 h-4 accent-arcco-black shrink-0" value="${o.firebaseId}" ${checked} ${jaFez?'disabled':''} onchange="APP._toggleCheckinObraRow(this)">
            <label for="co-${i}" class="flex-1 cursor-pointer ${jaFez?'opacity-60 cursor-not-allowed':''}">
                <p class="text-xs font-bold text-arcco-black uppercase">${o.nome}</p>
                ${jaFez?`<span class="text-[8px] font-bold text-arcco-black bg-arcco-lime px-1.5 py-0.5 rounded uppercase">Já registrado hoje</span>`:''}
            </label>
            <div class="checkin-obra-fields hidden flex-col gap-2 w-full mt-2">
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="text-[8px] font-bold text-gray-500 uppercase">Entrada</label><input type="time" class="checkin-hora-entrada text-xs font-bold" value="07:00"></div>
                    <div><label class="text-[8px] font-bold text-gray-500 uppercase">Saída (opcional)</label><input type="time" class="checkin-hora-saida text-xs" placeholder="--:--"></div>
                </div>
                <div><label class="text-[8px] font-bold text-gray-500 uppercase">Atividade do dia</label><input type="text" class="checkin-atividade text-xs" placeholder="Ex: Assentamento de piso..."></div>
            </div>
        </div>`;
    }).join('');

    document.getElementById('checkin-modal-body').innerHTML = `
        <div class="bg-arcco-lime/10 p-4 rounded-lg border border-arcco-lime/30 text-center mb-2">
            <p class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Data de hoje</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p>
        </div>
        <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase block mb-2">Obras de hoje <span class="text-gray-400 font-normal normal-case">(selecione uma ou mais)</span></label>
            <div class="space-y-2 max-h-80 overflow-y-auto pr-1" id="checkin-obras-list">
                ${obrasHtml||'<p class="text-xs text-gray-400 text-center py-4">Nenhuma obra ativa disponível.</p>'}
            </div>
        </div>
        <p class="text-[10px] text-gray-400 uppercase font-bold bg-gray-50 p-3 rounded border">Seu check-in precisa ser confirmado pelo Empreiteiro e pelo Gestor Arcco.</p>`;

    if(preObraId){
        setTimeout(() => {
            const chk = document.querySelector(`.checkin-obra-chk[value="${preObraId}"]`);
            if(chk) _toggleCheckinObraRow(chk);
        }, 50);
    }

    openModal('modal-checkin');
    lucide.createIcons();
};

export const _toggleCheckinObraRow = (chk) => {
    const row    = chk.closest('.checkin-obra-row');
    const fields = row.querySelector('.checkin-obra-fields');
    if(!fields) return;
    if(chk.checked){
        fields.classList.remove('hidden'); fields.classList.add('flex');
        row.classList.add('border-arcco-black','bg-gray-50'); row.classList.remove('border-gray-200','bg-white');
    } else {
        fields.classList.add('hidden'); fields.classList.remove('flex');
        row.classList.remove('border-arcco-black','bg-gray-50'); row.classList.add('border-gray-200','bg-white');
    }
};

export const saveCheckin = async () => {
    const isMembro = STATE.activeUser.role==='MEMBRO';
    const isLider  = STATE.activeUser.role==='FORNECEDOR';
    const liderId  = isLider?STATE.activeUser.id:STATE.activeUser.vinculo;
    const lider    = STATE.forn.find(f => f.id===liderId);

    const rows = document.querySelectorAll('.checkin-obra-chk:checked:not(:disabled)');
    if(!rows.length) return showToast('SELECIONE PELO MENOS UMA OBRA');

    let salvos = 0;
    for(const chk of rows){
        const obraId  = chk.value;
        const row     = chk.closest('.checkin-obra-row');
        const entrada = row.querySelector('.checkin-hora-entrada')?.value||'07:00';
        const saida   = row.querySelector('.checkin-hora-saida')?.value||'';
        const ativ    = row.querySelector('.checkin-atividade')?.value?.trim()||'';

        if(!ativ){ showToast(`DESCREVA A ATIVIDADE para ${row.querySelector('p')?.innerText||'a obra'}`); return; }

        const o = STATE.obras.find(x => x.firebaseId===obraId);
        if(!o) continue;

        const novoCI = {
            id:           `CI-${Date.now()}-${salvos}`,
            membroId:     STATE.activeUser.id,
            membroNome:   STATE.activeUser.name,
            liderNome:    lider?.nome||STATE.activeUser.liderNome||'',
            liderId,
            obraId,
            data:         todayISO(),
            horario:      entrada,
            horarioSaida: saida,
            atividade:    ativ,
            statusLider:  isLider?'aprovado':'pendente',
            liderNomeAprov: isLider?STATE.activeUser.name:'',
            liderEm:      isLider?todayISO():'',
            statusMaster: 'pendente',
            criadoEm:     new Date().toISOString()
        };

        await apiUpdate('obras',obraId,{checkins:[...(o.checkins||[]),novoCI]});
        salvos++;
    }

    showToast(salvos>1?`${salvos} CHECK-INS REGISTRADOS!`:'CHECK-IN REGISTRADO! Aguardando confirmação.');
    closeModal();

    if(isMembro){ const { renderMembroDash } = await import('./portal-membro.js'); renderMembroDash(); }
    if(isLider) { const { renderFornDash }   = await import('./portal-forn.js');   renderFornDash(); }
};
