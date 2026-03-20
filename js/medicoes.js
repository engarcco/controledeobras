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
    // Entrada/sinal já pago pelo cliente (descontado das medições futuras)
    const entrada          = parseFloat(o.entrada)||0;

    // Aviso no topo da aba medições — mostra os dois fatores em cascata
    const vendaBrutaRender  = (o.tasks||[]).reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
    const descontoRender    = parseFloat(o.desconto)||0;
    const entradaRender     = parseFloat(o.entrada)||0;
    const contratoRender    = Math.max(0, vendaBrutaRender - descontoRender);
    const fatorDescRender   = vendaBrutaRender > 0 ? contratoRender / vendaBrutaRender : 1;
    const fatorEntRender    = contratoRender > 0 ? Math.max(0, contratoRender - entradaRender) / contratoRender : 1;
    const saldoAMedirRender = contratoRender * fatorEntRender;
    const temAjusteRender   = descontoRender > 0 || entradaRender > 0;

    const avisoMedRender = temAjusteRender ? `
        <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 mb-4">
            <i data-lucide="tag" class="w-4 h-4 text-arcco-orange shrink-0 mt-0.5"></i>
            <div class="flex-1">
                <p class="text-[10px] font-bold text-arcco-orange uppercase">Valores das medições — proporcionais ao contrato</p>
                <div class="text-[9px] text-gray-600 mt-2 space-y-1">
                    <div class="flex justify-between"><span>Valor bruto dos serviços:</span><strong>${fmtBRL(vendaBrutaRender)}</strong></div>
                    ${descontoRender>0 ? `<div class="flex justify-between text-arcco-orange"><span>(-) Desconto (${(descontoRender/vendaBrutaRender*100).toFixed(2)}%):</span><strong>- ${fmtBRL(descontoRender)}</strong></div>` : ''}
                    <div class="flex justify-between font-bold border-t border-orange-200 pt-1"><span>= Contrato fechado:</span><strong>${fmtBRL(contratoRender)}</strong></div>
                    ${entradaRender>0 ? `
                    <div class="flex justify-between text-green-700 mt-1"><span>(-) Entrada já paga (${(entradaRender/contratoRender*100).toFixed(1)}%):</span><strong>- ${fmtBRL(entradaRender)}</strong></div>
                    <div class="flex justify-between font-bold border-t border-orange-200 pt-1"><span>= Saldo via medições:</span><strong>${fmtBRL(saldoAMedirRender)}</strong></div>
                    ` : ''}
                </div>
            </div>
        </div>` : '';

    // Injeta o aviso acima do resumo
    const resumoCont = document.getElementById('medicoes-resumo');
    if(resumoCont && resumoCont.parentElement) {
        let avisoEl = document.getElementById('medicoes-aviso-desconto');
        if(!avisoEl){
            avisoEl = document.createElement('div');
            avisoEl.id = 'medicoes-aviso-desconto';
            resumoCont.parentElement.insertBefore(avisoEl, resumoCont);
        }
        avisoEl.innerHTML = avisoMedRender;
        if(descontoRender>0) lucide.createIcons();
    }

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
        </div>`:''}
        ${entrada>0?`
        <div class="bg-green-50 p-5 rounded-xl border border-green-200 shadow-sm">
            <p class="text-[9px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-1"><i data-lucide="hand-coins" class="w-3 h-3"></i> Entrada / Sinal</p>
            <p class="font-montserrat font-black-italic text-2xl text-arcco-black mt-1">${fmtBRL(entrada)}</p>
            <p class="text-[9px] font-bold text-green-500 uppercase mt-1">Já abatido do saldo</p>
        </div>`:''}`;

    // ── Painel de saldo geral da obra ──────────────────────────
    const vendaBrutaSaldo  = (o.tasks||[]).reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
    const descontoSaldo    = parseFloat(o.desconto)||0;
    const contratoTotal    = Math.max(0, vendaBrutaSaldo - descontoSaldo);
    const totalRecebido    = totalVendaRec + entrada;
    const saldoRestante    = Math.max(0, contratoTotal - totalRecebido);
    const pctRecebido      = contratoTotal > 0 ? Math.round(totalRecebido/contratoTotal*100) : 0;

    // Só mostra o painel de saldo se a obra tiver contrato fechado (não ADM)
    if(!isAdm && contratoTotal > 0){
        let saldoEl = document.getElementById('medicoes-saldo-container');
        const medList = document.getElementById('medicoes-list');
        if(!saldoEl && medList){
            saldoEl = document.createElement('div');
            saldoEl.id = 'medicoes-saldo-container';
            medList.parentElement.insertBefore(saldoEl, medList);
        }
        if(saldoEl) saldoEl.innerHTML = `
        <div class="bg-arcco-black rounded-xl p-5 space-y-3 mb-4">
            <div class="flex justify-between items-center">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contrato Total</p>
                <p class="font-montserrat font-bold text-base text-white">${fmtBRL(contratoTotal)}</p>
            </div>
            ${entrada>0?`
            <div class="flex justify-between items-center border-t border-gray-800 pt-3">
                <p class="text-[10px] font-bold text-green-400 uppercase tracking-widest">(-) Entrada / Sinal</p>
                <p class="font-montserrat font-bold text-base text-green-400">- ${fmtBRL(entrada)}</p>
            </div>`:''}
            <div class="flex justify-between items-center border-t border-gray-800 pt-3">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">(-) Medições Recebidas</p>
                <p class="font-montserrat font-bold text-base text-gray-300">- ${fmtBRL(totalVendaRec)}</p>
            </div>
            <div class="flex justify-between items-center border-t border-gray-700 pt-3">
                <p class="text-[10px] font-bold text-arcco-lime uppercase tracking-widest">Saldo a Receber</p>
                <p class="font-montserrat font-black-italic text-2xl text-arcco-lime">${fmtBRL(saldoRestante)}</p>
            </div>
            <div class="w-full h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
                <div class="h-full bg-arcco-lime rounded-full transition-all" style="width:${Math.min(100,pctRecebido)}%"></div>
            </div>
            <p class="text-[9px] font-bold text-gray-500 uppercase text-right">${pctRecebido}% do contrato recebido</p>
        </div>`;
    }

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
                        <div><p class="text-[7px] font-bold text-gray-400 uppercase">Medição MO</p><p class="font-montserrat font-bold text-sm text-arcco-black">${fmtBRL(m.totalMO||m.custoMedido||0)}</p></div>
                        <div><p class="text-[7px] font-bold text-gray-400 uppercase">Medição Arcco</p><p class="font-montserrat font-bold text-sm text-arcco-black">${fmtBRL(m.totalVenda||m.custoMedido||0)}</p></div>
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
            <div class="bg-gray-50 border-t border-gray-100 p-3 flex justify-between items-center">
                <button onclick="APP.editarMedicao('${m.id}')"
                    class="text-[10px] font-bold text-gray-500 hover:text-arcco-black uppercase flex items-center gap-1 border border-gray-300 rounded px-3 py-1.5 hover:bg-white transition-colors">
                    <i data-lucide="edit-3" class="w-3 h-3"></i> Editar Medição
                </button>
                <button onclick="APP.deleteMedicao('${m.id}')"
                    class="text-[10px] font-bold text-gray-400 hover:text-arcco-red uppercase flex items-center gap-1">
                    <i data-lucide="trash-2" class="w-3 h-3"></i> Excluir
                </button>
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

    // ── Dois fatores aplicados em cascata ────────────────────────
    // 1. FATOR DESCONTO: reduz o valor contratado de cada serviço
    //    fatorDesc = contratoFinal / vendaBruta
    //    Ex: 60.000 / 62.397 = 0,9616 → cada R$10.000 vale R$9.616
    //
    // 2. FATOR ENTRADA: do valor já com desconto, quanto ainda falta cobrar
    //    fatorEntrada = 1 − (entrada / contratoFinal)
    //    Ex: 1 − (12.000 / 60.000) = 0,80 → cobrar 80% via medições
    //
    // Valor na medição = bruto × fatorDesc × fatorEntrada
    //    Ex: 10.000 × 0,9616 × 0,80 = R$7.693 a cobrar do cliente
    //    + R$1.923 já quitados pela entrada = R$9.616 (contrato do serviço) ✓
    const vendaBrutaTotal = tasks.reduce((a,t) => a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
    const desconto        = parseFloat(o.desconto)||0;
    const entradaPaga     = parseFloat(o.entrada)||0;
    const contratoFinal   = Math.max(0, vendaBrutaTotal - desconto);
    // Fator 1: desconto proporcional sobre o valor bruto de cada serviço
    const fatorDesc       = vendaBrutaTotal > 0 ? contratoFinal / vendaBrutaTotal : 1;
    // Fator 2: proporção do contrato que ainda falta cobrar (o que a entrada não cobriu)
    const fatorEntrada    = contratoFinal > 0 ? Math.max(0, contratoFinal - entradaPaga) / contratoFinal : 1;
    // Fator combinado: aplica os dois em cascata
    const fatorDesconto   = fatorDesc * fatorEntrada;
    // Porcentagem da entrada sobre o contrato (para mostrar no aviso)
    const pctEntrada      = contratoFinal > 0 ? (entradaPaga / contratoFinal * 100) : 0;

    // Aviso no modal
    const temAjuste = desconto > 0 || entradaPaga > 0;
    const avisoDesconto = temAjuste ? `
        <div class="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-start gap-3 mb-1">
            <i data-lucide="tag" class="w-4 h-4 text-arcco-orange shrink-0 mt-0.5"></i>
            <div>
                <p class="text-[10px] font-bold text-arcco-orange uppercase">Como os valores são calculados</p>
                <div class="text-[9px] text-gray-600 mt-1 space-y-1">
                    <p>Bruto: <strong>${fmtBRL(vendaBrutaTotal)}</strong>
                    ${desconto>0 ? ` → após desconto: <strong>${fmtBRL(contratoFinal)}</strong> (${(fatorDesc*100).toFixed(2)}% do bruto)` : ''}</p>
                    ${entradaPaga>0 ? `
                    <p>Entrada de <strong class="text-green-700">${fmtBRL(entradaPaga)}</strong> = <strong>${pctEntrada.toFixed(1)}%</strong> do contrato já quitado</p>
                    <p class="font-bold text-arcco-black border-t border-orange-200 pt-1">
                        Cada serviço nas medições = valor bruto × ${(fatorDesc*100).toFixed(2)}% × ${(fatorEntrada*100).toFixed(1)}%
                    </p>
                    <p class="text-gray-500">Ex: R$10.000 bruto → R$${(10000*fatorDesc).toFixed(0)} contratado → <strong>R$${(10000*fatorDesconto).toFixed(0)} a cobrar</strong> + R$${(10000*fatorDesc*(1-fatorEntrada)).toFixed(0)} já vieram pela entrada</p>
                    ` : ''}
                </div>
            </div>
        </div>` : '';

    // Agrupa tarefas por módulo para exibir no modal
    const mods = [...new Set(tasks.map(t => t.modulo))];

    document.getElementById('med-etapas-list').innerHTML = mods.length
        ? avisoDesconto + mods.map(m => {
            const mTasks = tasks.filter(t => t.modulo===m);
            const modId  = `mod-${m.replace(/\W/g,'')}`;

            // Lista de serviços individuais dentro do módulo
            const servicosHtml = mTasks.map((t,i) => {
                // MO = o que paga o fornecedor → NÃO é afetado por desconto nem entrada
                const moServicoBruto    = parseFloat(t.valor_mo) || parseFloat(t.valor) || 0;
                const moServico         = moServicoBruto; // sem alteração

                // VENDA = o que cobra do cliente → sofre desconto E entrada em cascata
                // fatorDesc:    reduz pelo desconto proporcional (ex: 96,16%)
                // fatorEntrada: reduz pela entrada proporcional  (ex: 80,00%)
                // Resultado: venda bruta × fatorDesc × fatorEntrada = valor a cobrar na medição
                const vendaServicoBruto = parseFloat(t.valor_venda) || parseFloat(t.valor) || 0;
                const vendaServico      = vendaServicoBruto * fatorDesconto; // fatorDesconto = fatorDesc × fatorEntrada

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
                                ${t.forn||'Sem equipe'}
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

    // Verifica se estamos editando uma medição existente
    const modal       = document.getElementById('modal-nova-medicao');
    const editingId   = modal?.getAttribute('data-editing-id')||'';

    let medicoesFinal;
    if(editingId){
        // Substitui a medição existente mantendo o id e status originais
        const original = (o.medicoes||[]).find(x => x.id===editingId);
        novaMedicao.id        = editingId;
        novaMedicao.statusAdm = original?.statusAdm || 'pendente';
        medicoesFinal = (o.medicoes||[]).map(x => x.id===editingId ? novaMedicao : x);
        modal.removeAttribute('data-editing-id');
        showToast('MEDIÇÃO ATUALIZADA!');
    } else {
        medicoesFinal = [...(o.medicoes||[]), novaMedicao];
        showToast('MEDIÇÃO REGISTRADA!');
    }

    await apiUpdate('obras', STATE.currentObraId, {medicoes:medicoesFinal, diarias:diariasAtualizadas});
    // Atualiza o STATE local imediatamente (sem esperar o onSnapshot)
    // para que renderMedicoes exiba os dados corretos antes do Firebase confirmar
    const obraIdx = STATE.obras.findIndex(x => x.firebaseId===STATE.currentObraId);
    if(obraIdx >= 0){
        STATE.obras[obraIdx] = {...STATE.obras[obraIdx], medicoes:medicoesFinal, diarias:diariasAtualizadas};
    }
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

export const editarMedicao = (medId) => {
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);
    if(!o) return;
    const m = (o.medicoes||[]).find(x => x.id===medId);
    if(!m) return;

    // Abre o modal normalmente (popula serviços, etc.)
    openModalNovaMedicao();

    // Após renderizar, preenche os campos com os dados da medição existente
    setTimeout(() => {
        // Campos de cabeçalho
        const elInicio = document.getElementById('med-inicio');
        const elFim    = document.getElementById('med-fim');
        const elObs    = document.getElementById('med-obs');
        const elPeriodo= document.getElementById('med-periodo');
        if(elInicio)  elInicio.value  = m.inicio||'';
        if(elFim)     elFim.value     = m.fim||'';
        if(elObs)     elObs.value     = m.obs||'';
        if(elPeriodo) elPeriodo.value = m.periodo||'mensal';

        // Remarca os serviços e preenche % e retenção de cada um
        const srvsSalvos = (m.porLider||[]).flatMap(l => l.servicos||[]);
        srvsSalvos.forEach(srv => {
            // Acha o checkbox pelo taskId
            const chk = document.querySelector(`.med-srv-chk[data-task-id="${srv.taskId}"]`);
            if(!chk || chk.disabled) return;
            chk.checked = true;
            APP._toggleCheckinObraRow?.(chk); // mostra os campos
            // Aciona o toggle dos fields manualmente
            const fields = chk.closest('.med-servico-row')?.querySelector('.med-srv-fields');
            if(fields){ fields.classList.remove('hidden'); fields.classList.add('flex'); }
            // Preenche % executado e retenção
            const pctInput = chk.closest('.med-servico-row')?.querySelector('.med-srv-pct');
            const retInput = chk.closest('.med-servico-row')?.querySelector('.med-srv-retencao');
            if(pctInput) pctInput.value = srv.pct||0;
            if(retInput) retInput.value = srv.retPct||0;
        });

        // Recalcula os totais com os valores preenchidos
        APP.calcMedicaoTotal();

        // Marca o id da medição sendo editada para o saveMedicao substituir em vez de criar nova
        document.getElementById('modal-nova-medicao')?.setAttribute('data-editing-id', medId);

        // Muda o título e botão do modal
        const titulo = document.querySelector('#modal-nova-medicao .font-montserrat.font-bold.text-sm');
        if(titulo) titulo.innerText = 'Editar Medição';
        const btnSalvar = document.querySelector('#modal-nova-medicao button[onclick="APP.saveMedicao()"]');
        if(btnSalvar) btnSalvar.innerText = 'Salvar Alterações';
    }, 150);
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

// ── Entrada / Sinal do Cliente ───────────────────────────────
// Salva o valor de entrada pago pelo cliente antes das medições.
// O valor é distribuído proporcionalmente — abate do saldo a receber.
export const saveEntrada = async () => {
    const val = parseFloat(document.getElementById('entrada-valor')?.value)||0;
    const obs = document.getElementById('entrada-obs')?.value||'';
    if(!val || val <= 0) return showToast('Digite um valor válido para a entrada');
    const o = STATE.obras.find(x => x.firebaseId===STATE.currentObraId);

    // Verifica se não ultrapassa o valor do contrato
    const vendaBruta  = (o.tasks||[]).reduce((a,t)=>a+(parseFloat(t.valor_venda)||parseFloat(t.valor)||0),0);
    const desconto    = parseFloat(o.desconto)||0;
    const contrato    = Math.max(0, vendaBruta - desconto);
    if(contrato > 0 && val > contrato){
        return showToast(`Entrada não pode superar o contrato (${fmtBRL(contrato)})`);
    }

    const entradaData = {
        entrada:    val,
        entradaObs: obs,
        entradaEm:  new Date().toISOString().split('T')[0]
    };
    await apiUpdate('obras', STATE.currentObraId, entradaData);
    // Atualiza STATE local imediatamente
    const obraIdxE = STATE.obras.findIndex(x => x.firebaseId===STATE.currentObraId);
    if(obraIdxE >= 0) STATE.obras[obraIdxE] = {...STATE.obras[obraIdxE], ...entradaData};
    showToast('ENTRADA REGISTRADA!');
    closeModal();
    renderMedicoes();
};

export const removerEntrada = async () => {
    if(!confirm('Remover o registro de entrada? O saldo voltará ao valor original.')) return;
    const remData = {entrada:0, entradaObs:'', entradaEm:''};
    await apiUpdate('obras', STATE.currentObraId, remData);
    const obraIdxR = STATE.obras.findIndex(x => x.firebaseId===STATE.currentObraId);
    if(obraIdxR >= 0) STATE.obras[obraIdxR] = {...STATE.obras[obraIdxR], ...remData};
    showToast('ENTRADA REMOVIDA');
    renderMedicoes();
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
