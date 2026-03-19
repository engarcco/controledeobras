// ============================================================
// ui.js — Toast, Modal helpers, Navegação e Menus
// ============================================================

export const showToast = (msg) => {
    const t = document.getElementById('toast');
    document.getElementById('toast-text').innerText = msg;
    t.classList.remove('translate-x-[150%]');
    setTimeout(() => t.classList.add('translate-x-[150%]'), 3000);
};

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

export const showMasterSection = (sec) => {
    // Adicionado 'orcamentos' na lista de seções
    ['dash','obra-detail','fornecedores','clientes','composicoes', 'orcamentos'].forEach(s => {
        document.getElementById(`master-section-${s}`)?.classList.add('hidden');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active','border-arcco-lime','text-white'));
    
    // Mapeamento atualizado para a navegação
    const map = {dash:'Obras', orcamentos:'Orçamentos', composicoes:'Composições', fornecedores:'Equipes', clientes:'Clientes'};
    const lbl = map[sec];
    
    Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.innerText.trim()===lbl)?.classList.add('active','border-arcco-lime','text-white');

    // Navegação Mobile (Bottom e Dropdown)
    document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.remove('bg-gray-800','text-white'));
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
    lucide.createIcons();
};

export const switchObraTab = (tab) => {
    ['cronograma','curvas','medicoes','ponto','compras'].forEach(t => {
        document.getElementById(`obra-tab-${t}`)?.classList.add('hidden');
    });
    document.querySelectorAll('.obra-tab-btn').forEach(b => {
        b.classList.remove('active-tab','border-arcco-lime','text-arcco-black');
        b.classList.add('border-transparent','text-gray-400');
    });
    document.getElementById(`obra-tab-${tab}`)?.classList.remove('hidden');
    lucide.createIcons();
};

// Expondo para o escopo global
window.toggleMobileMenu = toggleMobileMenu;
window.showMasterSection = showMasterSection;
window.switchObraTab = switchObraTab;
