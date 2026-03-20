// ============================================================
// medicoes.js — Medições, Diárias e Pagamentos
// CORREÇÕES / MELHORIAS:
//   - Medição separada por LÍDER de equipe (cada um vê quanto vai receber)
//   - Separação clara: Custo (MO que paga o empreiteiro) vs Venda (receita Arcco)
//   - Margem da Arcco = Venda - Custo (exibida separadamente)
//   - Campo de % de retenção por serviço (valor fica preso até fim da obra)
//   - Quando só há um valor sem discriminação, considera tudo como MO
//   - Seleção de serviços individuais (não só módulos) com % de conclusão
// ============================================================

import { STATE, apiUpdate, fmtBRL, fmtDate } from './config.js';
import { showToast, openModal, closeModal } from './ui.js';

// ── Render principal da aba Medições ─────────────────────────
export function renderMedicoes(){
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;

    const medicoes = o.medicoes||[];
    const diarias  = o.diarias||[];
    const isAdm    = o.contrato==='ADMINISTRAÇÃO';
    const taxa     = parseFloat(o.taxa_adm)||0;

    // Totais do resumo no topo
    const totalDiarias     = diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0);
    const totalVendaRec    = medicoes.filter(m=>m.statusAdm==='recebido').reduce((a,m) => a+(parseFloat(m.totalVenda)||parseFloat(m.custoMedido)||0),0);
    const totalVendaPend   = medicoes.filter(m=>m.statusAdm!=='recebido').reduce((a,m) => a+(parseFloat(m.totalVenda)||parseFloat(m.custoMedido)||0),0);
    const totalRetido      = medicoes.reduce((a,m) => a+(parseFloat(m.totalRetencao)||0),0);
    const totalMOPago      = medicoes.filter(m=>m.statusAdm==='recebido').reduce((a,m) => a+(parseFloat(m.totalMO)||0),0);

    document.getElementById('medicoes-resumo').innerHTML = `
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">MO Pago Empreiteiros</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(totalMOPago)}</p>
            <p class="text-[9px] font-bold text-gray-400 uppercase mt-1">${diarias.length} diárias + medições</p>
        </div>
        <div class="bg-arcco-lime/10 p-5 rounded-xl border border-arcco-lime/40 shadow-sm">
            <p class="text-[9px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3 h-3"></i> ${isAdm?'ADM Recebida':'Venda Recebida'}</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(totalVendaRec)}</p>
            <p class="text-[9px] font-bold text-gray-500 uppercase mt-1">${medicoes.filter(m=>m.statusAdm==='recebido').length} medições</p>
        </div>
        <div class="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm">
            <p class="text-[9px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> Pendente de Recebimento</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(totalVendaPend)}</p>
            <p class="text-[9px] font-bold text-orange-500 uppercase mt-1">${medicoes.filter(m=>m.statusAdm!=='recebido').length} em aberto</p>
        </div>
        ${totalRetido>0?`
        <div class="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm">
            <p class="text-[9px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><i data-lucide="shield" class="w-3 h-3"></i> Retenção Acumulada</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(totalRetido)}</p>
            <p class="text-[9px] font-bold text-blue-500 uppercase mt-1">Será liberado ao fim da obra</p>
        </div>`:''}`;

    // Diárias pendentes (não incluídas em nenhuma medição)
    const diariasPend = diarias.filter(d => !d.medicaoId);
    const contDP = document.getElementById('diarias-pendentes-container');
    const listDP = document.getElementById('diarias-pendentes-list');
    if(diariasPend.length){
        contDP.classList.remove('hidden');
        listDP.innerHTML = diariasPend.map(d => `
            <div class="flex justify-between items-center bg-white p-3 rounded border border-orange-100 shadow-sm">
                <div>
                    <p class="text-xs font-bold text-arcco-black">${d.forn} — ${d.desc||'Diária'}</p>
                    <p class="text-[9px] font-bold text-gray-400 uppercase mt-0.5">${fmtDate(d.data)} • ${d.qtd} diária(s)</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-sm text-arcco-orange">${fmtBRL(d.total)}</span>
                    <button onclick="APP.deleteDiaria('${d.id}')" class="w-7 h-7 rounded bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-100"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                </div>
            </div>`).join('');
    } else { contDP.classList.add('hidden'); }

    // Lista de medições
    const medList = document.getElementById('medicoes-list');
    if(!medicoes.length){
        medList.innerHTML = '<div class="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm font-bold text-gray-400 uppercase">Nenhuma medição registrada ainda.</div>';
        lucide.createIcons();
        return;
    }

    medList.innerHTML = [...medicoes].reverse().map(m => {
        // Monta o breakdown por líder
        const lideresHtml = (m.porLider||[]).map(l => `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div class="flex-1">
                    <p class="text-[10px] font-bold text-arcco-black uppercase">${l.lider}</p>
                    <div class="flex flex-wrap gap-2 mt-1">
                        ${l.servicos.map(s=>`<span class="text-[8px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">${s.nome} — ${s.pct}%</span>`).join('')}
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <p class="text-[9px] font-bold text-gray-500 uppercase">MO a Pagar</p>
                    <p class="font-montserrat font-bold text-base text-arcco-black">${fmtBRL(l.totalMO)}</p>
                    ${l.totalRetencao>0?`<p class="text-[8px] font-bold text-blue-600 mt-0.5">Retenção: ${fmtBRL(l.totalRetencao)}</p>`:''}
                    <p class="font-bold text-sm ${l.liquido<l.totalMO?'text-blue-700':'text-arcco-black'}">${l.totalRetencao>0?`Líquido: ${fmtBRL(l.liquido)}`:''}</p>
                </div>
            </div>`).join('');

        const margem = (parseFloat(m.totalVenda)||0) - (parseFloat(m.totalMO)||0);

        return `
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="bg-gray-50 border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                    <span class="text-[9px] font-bold uppercase px-2 py-1 rounded ${m.periodo==='quinzenal'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'} border">${m.periodo}</span>
                    <p class="font-montserrat font-bold text-base uppercase text-arcco-black mt-2">${fmtDate(m.inicio)} → ${fmtDate(m.fim)}</p>
                    ${m.obs?`<p class="text-[10px] text-gray-500 mt-1">${m.obs}</p>`:''}
                </div>
                <div class="flex flex-col items-end gap-1">
                    <!-- Botão de status de recebimento -->
                    <button onclick="APP.toggleStatusAdm('${m.id}')"
                        class="text-[9px] font-bold uppercase px-3 py-1.5 rounded border transition-colors ${m.statusAdm==='recebido'?'badge-pago hover:bg-red-50 hover:text-red-600 hover:border-red-200':'badge-pendente hover:bg-green-50 hover:text-green-700 hover:border-green-200'}">
                        ${m.statusAdm==='recebido'?'✓ Recebido':'Marcar Recebido'}
                    </button>
                    <!-- Resumo financeiro compacto -->
                    <div class="flex gap-3 text-right mt-1">
                        <div><p class="text-[7px] font-bold text-gray-400 uppercase">MO Empreiteiros</p><p class="font-montserrat font-bold text-sm text-arcco-black">${fmtBRL(m.totalMO||m.custoMedido||0)}</p></div>
                        <div><p class="text-[7px] font-bold text-gray-400 uppercase">Venda (Arcco)</p><p class="font-montserrat font-bold text-sm text-arcco-black">${fmtBRL(m.totalVenda||m.custoMedido||0)}</p></div>
                        ${margem>0?`<div class="bg-arcco-lime/20 px-2 py-1 rounded border border-arcco-lime/40"><p class="text-[7px] font-bold text-gray-600 uppercase">Margem Arcco</p><p class="font-montserrat font-bold text-sm text-arcco-black">${fmtBRL(margem)}</p></div>`:''}
                    </div>
                    ${m.totalRetencao>0?`<p class="text-[9px] font-bold text-blue-600 mt-1">Retenção desta medição: ${fmtBRL(m.totalRetencao)}</p>`:''}
                </div>
            </div>

            <!-- Breakdown por líder -->
            ${lideresHtml?`
            <div class="p-4 space-y-2">
                <p class="text-[9px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><i data-lucide="users" class="w-3 h-3"></i> Pagamento por Equipe</p>
                ${lideresHtml}
            </div>`:''}

            <!-- Rodapé -->
            <div class="bg-gray-50 border-t border-gray-100 p-3 flex justify-end">
                <button onclick="APP.deleteMedicao('${m.id}')" class="text-[10px] font-bold text-gray-400 hover:text-arcco-red uppercase flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i> Excluir Medição</button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

// ── Modal Nova Medição ────────────────────────────────────────
export const openModalNovaMedicao = () => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;

    const tasks   = o.tasks||[];
    const diarias = (o.diarias||[]).filter(d => !d.medicaoId);

    document.getElementById('med-inicio').value = '';
    document.getElementById('med-fim').value    = '';
    document.getElementById('med-obs').value    = '';

    // Agrupa tarefas por módulo para exibir no modal
    const mods = [...new Set(tasks.map(t => t.modulo))];

    document.getElementById('med-etapas-list').innerHTML = mods.length
        ? mods.map(m => {
            const mTasks = tasks.filter(t => t.modulo===m);
            const modId  = `mod-${m.replace(/\W/g,'')}`;

            // Lista de serviços individuais dentro do módulo
            const servicosHtml = mTasks.map((t,i) => {
                const moServico    = parseFloat(t.valor_mo) || parseFloat(t.valor) || 0;
                const vendaServico = parseFloat(t.valor_venda) || parseFloat(t.valor) || 0;

                // ── Calcula quanto JÁ foi medido deste serviço em medições anteriores ──
                // Soma todos os pct deste task em todas as medições já salvas
                const pctJaMedido = (o.medicoes||[]).reduce((acc, med) => {
                    const srv = (med.porLider||[])
                        .flatMap(l => l.servicos||[])
                        .find(s => s.taskId === t.id);
                    return acc + (srv ? parseFloat(srv.pct)||0 : 0);
                }, 0);

                // Máximo que ainda pode ser medido = 100 - já medido (mínimo 0)
                const maxDisponivel = Math.max(0, 100 - pctJaMedido);
                // Valor inicial sugerido: se serviço concluído, sugere o restante; senão 0
                const valorInicial  = t.status===2 ? maxDisponivel : 0;
                // Se já mediu 100%, bloqueia o checkbox
                const jaConcluido   = maxDisponivel === 0;

                const tid = `srv-${m.replace(/\W/g,'')}-${i}`;

                return `
                <div class="med-servico-row ml-4 flex flex-col gap-2 p-3 ${jaConcluido?'bg-gray-50 opacity-60':'bg-white'} rounded border border-gray-100 shadow-sm">
                    <div class="flex items-start gap-2">
                        <input type="checkbox" id="${tid}"
                            class="med-srv-chk mt-0.5 w-4 h-4 accent-arcco-black shrink-0"
                            data-task-id="${t.id}"
                            data-lider="${t.forn||''}"
                            data-nome="${t.nome}"
                            data-mo="${moServico}"
                            data-venda="${vendaServico}"
                            data-pct="${valorInicial}"
                            data-max="${maxDisponivel}"
                            ${jaConcluido?'disabled':''}
                            onchange="APP.calcMedicaoTotal()">
                        <label for="${tid}" class="flex-1 ${jaConcluido?'cursor-not-allowed':'cursor-pointer'}">
                            <p class="text-[10px] font-bold text-arcco-black uppercase leading-tight">${t.nome}</p>
                            <p class="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
                                ${t.forn||'Sem equipe'} • MO: ${fmtBRL(moServico)} • Venda: ${fmtBRL(vendaServico)}
                            </p>
                            <!-- Barra de progresso de medição -->
                            <div class="flex items-center gap-2 mt-1.5">
                                <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div class="h-full bg-arcco-lime rounded-full transition-all"
                                         style="width:${pctJaMedido}%"></div>
                                </div>
                                <span class="text-[8px] font-bold ${jaConcluido?'text-green-600':'text-gray-500'} uppercase shrink-0">
                                    ${jaConcluido
                                        ? '✓ 100% medido'
                                        : pctJaMedido>0
                                            ? `${pctJaMedido}% medido · faltam ${maxDisponivel}%`
                                            : 'Não medido ainda'}
                                </span>
                            </div>
                        </label>
                    </div>
                    <!-- Campos que aparecem ao marcar o serviço -->
                    <div class="med-srv-fields hidden flex-col gap-2 pl-6 pt-1">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                                    % Executado
                                    <span class="text-gray-400 font-normal normal-case ml-1">(máx: ${maxDisponivel}%)</span>
                                </label>
                                <div class="flex items-center gap-1.5">
                                    <input type="number"
                                        class="med-srv-pct text-sm font-bold border border-gray-300 rounded px-2 py-1.5 w-full"
                                        placeholder="${valorInicial}"
                                        min="0" max="${maxDisponivel}" value="${valorInicial}"
                                        oninput="APP._limitarPct(this, ${maxDisponivel})"
                                        onchange="APP.calcMedicaoTotal()">
                                    <span class="text-xs font-bold text-gray-500 shrink-0">%</span>
                                </div>
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Retenção</label>
                                <div class="flex items-center gap-1.5">
                                    <input type="number"
                                        class="med-srv-retencao text-sm font-bold border border-blue-300 bg-blue-50 rounded px-2 py-1.5 w-full"
                                        placeholder="0"
                                        min="0" max="100" value="0"
                                        oninput="APP._limitarPct(this, 100)"
                                        onchange="APP.calcMedicaoTotal()">
                                    <span class="text-xs font-bold text-blue-400 shrink-0">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');

            return `
            <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div class="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-gray-500"></i>
                    <p class="text-[10px] font-bold text-arcco-black uppercase tracking-wider">${m}</p>
                </div>
                <div class="p-2 space-y-2">
                    ${servicosHtml}
                </div>
            </div>`;
        }).join('')
        : '<p class="text-[10px] text-gray-400 font-bold uppercase text-center py-3">Nenhum serviço no cronograma.</p>';

    // Lista de diárias pendentes
    const divDiarias = document.getElementById('med-diarias-list');
    if(diarias.length){
        divDiarias.innerHTML = diarias.map(d => `
            <div class="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                <div>
                    <p class="text-[10px] font-bold text-arcco-black">${d.forn} — ${d.desc||'Diária'}</p>
                    <p class="text-[9px] text-gray-400 uppercase">${fmtDate(d.data)}</p>
                </div>
                <span class="font-bold text-xs text-arcco-orange">${fmtBRL(d.total)}</span>
            </div>`).join('');
        document.getElementById('med-total-diarias').innerText = fmtBRL(diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0));
    } else {
        divDiarias.innerHTML = '<p class="text-[10px] text-gray-400 font-bold uppercase text-center py-2">Sem diárias pendentes.</p>';
        document.getElementById('med-total-diarias').innerText = fmtBRL(0);
    }

    // Zera os totais
    _atualizarDisplayMedicao(0, 0, 0, 0, 0);

    openModal('modal-nova-medicao');
    lucide.createIcons();
};

// Atualiza os displays do modal de medição
function _atualizarDisplayMedicao(custoMO, totalVenda, valorAdm, totalDiarias, retencaoTotal){
    const margem = totalVenda - custoMO;
    document.getElementById('med-custo-display').innerText = fmtBRL(custoMO);
    document.getElementById('med-adm-display').innerText   = fmtBRL(valorAdm + totalDiarias);
    document.getElementById('med-total-display').innerText = fmtBRL(totalVenda + valorAdm + totalDiarias - retencaoTotal);

    // Tenta atualizar displays extras (podem não existir em versões antigas do HTML)
    const el = (id) => document.getElementById(id);
    if(el('med-venda-display'))    el('med-venda-display').innerText    = fmtBRL(totalVenda);
    if(el('med-margem-display'))   el('med-margem-display').innerText   = fmtBRL(margem);
    if(el('med-retencao-display')) el('med-retencao-display').innerText = fmtBRL(retencaoTotal);
}

// Recalcula os totais em tempo real ao marcar/desmarcar serviços
export const calcMedicaoTotal = () => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const isAdm = o?.contrato==='ADMINISTRAÇÃO';
    const taxa  = parseFloat(o?.taxa_adm)||0;

    const diarias = (o?.diarias||[]).filter(d => !d.medicaoId);
    const totalDiarias = diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0);

    let custoMO      = 0;
    let totalVenda   = 0;
    let retencaoTotal= 0;

    // Mostra os campos de % e retenção ao marcar
    document.querySelectorAll('.med-srv-chk').forEach(chk => {
        const fields = chk.closest('.med-servico-row')?.querySelector('.med-srv-fields');
        if(fields){
            if(chk.checked){ fields.classList.remove('hidden'); fields.classList.add('flex'); }
            else             { fields.classList.add('hidden');    fields.classList.remove('flex'); }
        }
        if(!chk.checked) return;

        const mo      = parseFloat(chk.dataset.mo)    || 0;
        const venda   = parseFloat(chk.dataset.venda) || 0;
        const row     = chk.closest('.med-servico-row');
        const pct     = parseFloat(row?.querySelector('.med-srv-pct')?.value)      || 0;
        const retPct  = parseFloat(row?.querySelector('.med-srv-retencao')?.value) || 0;

        const moServico    = mo * (pct/100);
        const vendaServico = venda * (pct/100);
        const retencao     = moServico * (retPct/100);

        custoMO       += moServico;
        totalVenda    += vendaServico;
        retencaoTotal += retencao;
    });

    const valorAdm = isAdm ? (custoMO + totalVenda) * (taxa/100) : 0;
    _atualizarDisplayMedicao(custoMO, totalVenda, valorAdm, totalDiarias, retencaoTotal);
};

// Salva a medição com breakdown por líder
export const saveMedicao = async () => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;

    const isAdm = o.contrato==='ADMINISTRAÇÃO';
    const taxa  = parseFloat(o.taxa_adm)||0;
    const diarias = (o.diarias||[]).filter(d => !d.medicaoId);
    const totalDiarias = diarias.reduce((a,d) => a+(parseFloat(d.total)||0),0);

    // Agrega por líder
    const porLiderMap = {};
    let custoMOTotal   = 0;
    let totalVendaGlobal = 0;
    let retencaoGlobal   = 0;
    let temServico = false;

    document.querySelectorAll('.med-srv-chk:checked').forEach(chk => {
        temServico  = true;
        const row   = chk.closest('.med-servico-row');
        const lider = chk.dataset.lider || 'Sem equipe';
        const nome  = chk.dataset.nome  || '';
        const mo    = parseFloat(chk.dataset.mo)    || 0;
        const venda = parseFloat(chk.dataset.venda) || 0;
        const pct   = parseFloat(row?.querySelector('.med-srv-pct')?.value) || 0;
        const retPct= parseFloat(row?.querySelector('.med-srv-retencao')?.value) || 0;

        const moServico    = mo    * (pct/100);
        const vendaServico = venda * (pct/100);
        const retencao     = moServico * (retPct/100);

        if(!porLiderMap[lider]) porLiderMap[lider] = { lider, servicos:[], totalMO:0, totalVenda:0, totalRetencao:0, liquido:0 };
        porLiderMap[lider].servicos.push({ taskId: chk.dataset.taskId, nome, pct:Math.round(pct), retPct:Math.round(retPct) });
        porLiderMap[lider].totalMO       += moServico;
        porLiderMap[lider].totalVenda    += vendaServico;
        porLiderMap[lider].totalRetencao += retencao;
        porLiderMap[lider].liquido        = porLiderMap[lider].totalMO - porLiderMap[lider].totalRetencao;

        custoMOTotal      += moServico;
        totalVendaGlobal  += vendaServico;
        retencaoGlobal    += retencao;
    });

    if(!temServico) return showToast('SELECIONE PELO MENOS UM SERVIÇO');

    const valorAdm   = isAdm ? (custoMOTotal + totalVendaGlobal) * (taxa/100) : 0;
    const medicaoId  = `M-${Date.now()}`;
    const porLider   = Object.values(porLiderMap);

    const novaMedicao = {
        id:         medicaoId,
        periodo:    document.getElementById('med-periodo').value,
        inicio:     document.getElementById('med-inicio').value,
        fim:        document.getElementById('med-fim').value,
        // Valores separados
        totalMO:         custoMOTotal,       // o que vai pagar os empreiteiros
        totalVenda:      totalVendaGlobal,   // receita da Arcco
        totalRetencao:   retencaoGlobal,     // valor retido como garantia
        custoMedido:     custoMOTotal,       // retrocompatibilidade
        totalDiarias,
        valorAdm,
        porLider,                            // breakdown por líder
        statusAdm:  'pendente',
        obs:        document.getElementById('med-obs').value,
        criadoPor:  STATE.activeUser.name,
        timestamp:  Date.now()
    };

    // Marca as diárias como incluídas nesta medição
    const diariasAtualizadas = (o.diarias||[]).map(d => !d.medicaoId ? {...d, medicaoId} : d);
    const medicoes = [...(o.medicoes||[]), novaMedicao];

    await apiUpdate('obras', STATE.currentObraId, {medicoes, diarias:diariasAtualizadas});
    showToast('MEDIÇÃO REGISTRADA!');
    closeModal();
    renderMedicoes();
};

export const toggleStatusAdm = async (medId) => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const medicoes = (o.medicoes||[]).map(m => {
        if(m.id!==medId) return m;
        return {...m, statusAdm:m.statusAdm==='recebido'?'pendente':'recebido', recebidoPor:STATE.activeUser.name, recebidoEm:new Date().toISOString().split('T')[0]};
    });
    await apiUpdate('obras', STATE.currentObraId, {medicoes});
    showToast('STATUS ATUALIZADO!');
    renderMedicoes();
};

export const deleteMedicao = async (medId) => {
    if(!confirm('Excluir esta medição? As diárias vinculadas voltarão para pendentes.')) return;
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const medicoes = (o.medicoes||[]).filter(m => m.id!==medId);
    const diarias  = (o.diarias||[]).map(d => d.medicaoId===medId ? {...d, medicaoId:null} : d);
    await apiUpdate('obras', STATE.currentObraId, {medicoes, diarias});
    showToast('MEDIÇÃO EXCLUÍDA');
    renderMedicoes();
};


// ── Limita o campo de % ao máximo permitido em tempo real ────
// Chamado pelo oninput de cada campo de % no modal de medição
export const _limitarPct = (input, maximo) => {
    // Impede digitar valor acima do máximo
    let val = parseFloat(input.value);
    if(isNaN(val)) return;
    if(val > maximo){
        input.value = maximo;
        // Feedback visual: borda vermelha rápida para indicar que foi cortado
        input.classList.add('border-red-400','bg-red-50');
        setTimeout(() => input.classList.remove('border-red-400','bg-red-50'), 800);
    }
    if(val < 0) input.value = 0;
};

// ── Diárias ───────────────────────────────────────────────────
export const openModalNovaDiaria = () => {
    document.getElementById('diaria-forn').innerHTML =
        '<option value="">(SELECIONE)</option>' +
        STATE.forn.filter(f => f.status==='ativo').map(f =>
            `<option value="${f.nome}" data-diaria="${f.diaria||0}">${f.nome}</option>`
        ).join('');
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
    const o   = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    const nova = {id:`D-${Date.now()}`, forn, data, qtd, unit, total:qtd*unit, desc, medicaoId:null};
    await apiUpdate('obras', STATE.currentObraId, {diarias:[...(o.diarias||[]), nova]});
    showToast('DIÁRIA LANÇADA!');
    closeModal();
    renderMedicoes();
};

export const deleteDiaria = async (dId) => {
    if(!confirm('Excluir este lançamento de diária?')) return;
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    await apiUpdate('obras', STATE.currentObraId, {diarias:(o.diarias||[]).filter(d => d.id!==dId)});
    showToast('DIÁRIA EXCLUÍDA');
    renderMedicoes();
};
