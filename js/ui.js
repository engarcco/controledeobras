// ============================================================
// ui.js — Toast, Modal helpers, Navegação e Menus
// ============================================================

// ── Toast ─────────────────────────────────────────────────────
export const showToast = (msg) => {
    const t = document.getElementById('toast');
    document.getElementById('toast-text').innerText = msg;
    t.classList.remove('translate-x-[150%]');
    setTimeout(() => t.classList.add('translate-x-[150%]'), 3000);
};

// ── Modal helpers ─────────────────────────────────────────────
export const openModal = (id) => {
    const el = document.getElementById(id);
    if(el){ el.classList.remove('hidden'); el.classList.add('flex'); }
};

export const closeModal = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('flex');
    });
};

// ── Mobile menu toggle ─────────────────────────────────────────
export const toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu');
    const btn  = document.getElementById('mobile-menu-btn');
    if(!menu) return;
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    btn.innerHTML = isOpen
        ? '<i data-lucide="menu" class="w-6 h-6"></i>'
        : '<i data-lucide="x" class="w-6 h-6"></i>';
    lucide.createIcons();
};
window.toggleMobileMenu = toggleMobileMenu;

// ── Master section nav ────────────────────────────────────────
export const showMasterSection = (sec) => {
    ['dash','obra-detail','fornecedores','clientes','composicoes','finalizadas','historico'].forEach(s => {
        document.getElementById(`master-section-${s}`)?.classList.add('hidden');
    });

    // Desktop nav active state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active','border-arcco-lime','text-white'));
    const map = {dash:'Obras',composicoes:'Composições',fornecedores:'Equipes',clientes:'Clientes',finalizadas:'Finalizadas',historico:'Histórico'};
    const lbl = map[sec];
    Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.innerText.trim()===lbl)?.classList.add('active','border-arcco-lime','text-white');

    // Mobile dropdown nav
    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.remove('bg-gray-800','text-white');
        btn.classList.add('text-gray-300');
    });
    Array.from(document.querySelectorAll('.mob-nav-btn'))
        .find(b => b.innerText.trim().startsWith(lbl||'__'))
        ?.classList.add('bg-gray-800','text-white');

    // Mobile bottom nav
    document.querySelectorAll('.mob-bottom-btn').forEach(btn => {
        btn.classList.remove('text-arcco-lime');
        btn.classList.add('text-gray-500');
    });
    if(lbl){
        Array.from(document.querySelectorAll('.mob-bottom-btn'))
            .find(b => b.querySelector('span')?.innerText.trim()===lbl)
            ?.classList.replace('text-gray-500','text-arcco-lime');
    }

    document.getElementById(`master-section-${sec}`)?.classList.remove('hidden');
    // Renderiza dinamicamente as seções especiais ao abrir
    if(sec==='finalizadas') window.APP?.renderObrasFinalizadasGrid?.();
    if(sec==='historico')   window.APP?.renderHistoricoIntelligence?.();
    lucide.createIcons();
};
window.showMasterSection = showMasterSection;

// ── Badge status ponto ────────────────────────────────────────
export const pontoStatusBadge = (ci) => {
    if(ci.statusMaster==='aprovado')
        return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded badge-pago flex items-center gap-1"><i data-lucide="shield-check" class="w-2.5 h-2.5"></i> Aprovado</span>`;
    if(ci.statusMaster==='recusado')
        return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Recusado</span>`;
    if(ci.statusLider==='aprovado')
        return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded badge-parcial flex items-center gap-1"><i data-lucide="clock" class="w-2.5 h-2.5"></i> Ag. Master</span>`;
    if(ci.statusLider==='recusado')
        return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Rec. Líder</span>`;
    return `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded badge-pendente flex items-center gap-1"><i data-lucide="clock" class="w-2.5 h-2.5"></i> Ag. Líder</span>`;
};

// ── Obra tab switcher ─────────────────────────────────────────
export const switchObraTab = (tab) => {
    ['cronograma','curvas','medicoes','ponto','compras'].forEach(t => {
        document.getElementById(`obra-tab-${t}`)?.classList.add('hidden');
    });
    document.querySelectorAll('.obra-tab-btn').forEach(b => {
        b.classList.remove('active-tab','border-arcco-lime','text-arcco-black');
        b.classList.add('border-transparent','text-gray-400');
    });
    document.getElementById(`obra-tab-${tab}`)?.classList.remove('hidden');
    const active = Array.from(document.querySelectorAll('.obra-tab-btn')).find(b => b.getAttribute('onclick').includes(`'${tab}'`));
    if(active){
        active.classList.add('active-tab','border-arcco-lime','text-arcco-black');
        active.classList.remove('border-transparent','text-gray-400');
    }
    // Renderiza conteúdo da aba — com retry progressivo se STATE ainda não carregou
    const _tryRender = (fn, attempts=0) => {
        const obraId = window.APP?.STATE?.currentObraId;
        const obra   = window.APP?.STATE?.obras?.find(o => o.firebaseId===obraId);
        if(obra){ fn(); }
        else if(attempts < 8){ setTimeout(() => _tryRender(fn, attempts+1), 400); }
    };
    if(tab==='medicoes') _tryRender(() => window.APP?.renderMedicoes?.());
    if(tab==='ponto')    _tryRender(() => window.APP?.renderMasterPonto?.());
    if(tab==='curvas')   _tryRender(() => window.APP?.renderCurvaS?.());
    if(tab==='compras')  _tryRender(() => {
        const o = window.APP?.STATE?.obras?.find(x => x.firebaseId===window.APP?.STATE?.currentObraId);
        window.APP?.renderComprasList?.(o);
    });
    lucide.createIcons();
}
window.switchObraTab = switchObraTab;

// ── Forn tab switcher ─────────────────────────────────────────
export const switchFornTab = (tab) => {
    ['obras','ponto'].forEach(t => {
        const content = document.getElementById(t==='obras'?'fornecedor-content':'fornecedor-ponto');
        if(content) content.classList.add('hidden');
    });
    document.querySelectorAll('.forn-tab').forEach(b => {
        b.classList.remove('active-forn-tab','border-arcco-lime','text-white');
        b.classList.add('border-transparent','text-gray-500');
    });
    const activeContent = document.getElementById(tab==='obras'?'fornecedor-content':'fornecedor-ponto');
    if(activeContent) activeContent.classList.remove('hidden');
    const activeBtn = Array.from(document.querySelectorAll('.forn-tab')).find(b => b.getAttribute('onclick').includes(`'${tab}'`));
    if(activeBtn){
        activeBtn.classList.add('active-forn-tab','border-arcco-lime','text-white');
        activeBtn.classList.remove('border-transparent','text-gray-500');
    }
    // Renderiza o conteúdo da aba ao abrir
    if(tab === 'ponto') window.APP?.renderFornPontoLider?.();
};

// ── Click fora do menu mobile fecha ───────────────────────────
document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobile-menu');
    const btn  = document.getElementById('mobile-menu-btn');
    if(!menu || menu.classList.contains('hidden')) return;
    if(!menu.contains(e.target) && !btn.contains(e.target)) {
        toggleMobileMenu();
    }
});
