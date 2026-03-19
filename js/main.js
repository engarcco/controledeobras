// ============================================================
// main.js — Ponto de entrada ÚNICO do ARCCO HUB
// ============================================================
import { STATE } from './config.js';
import { setupAuth } from './auth.js';
import { 
    showToast, openModal, closeModal, 
    toggleMobileMenu, showMasterSection, 
    pontoStatusBadge, switchObraTab, switchFornTab 
} from './ui.js';

// Importações de Obras
import { 
    renderMasterObrasGrid, openObraDetail, duplicarObra, 
    deleteObraCompleta, renderObraDetail, saveNovaObra,
    updateTeamSelection, calcBudgetValidation 
} from './obras.js';

// Importações de Medições
import { 
    renderMedicoes, openModalNovaMedicao, calcMedicaoTotal, 
    saveMedicao, toggleStatusAdm, deleteMedicao, 
    openModalNovaDiaria, calcDiaria, saveDiaria, deleteDiaria 
} from './medicoes.js';

// Importações de Curvas e Gráficos
import { switchCurvaTab, renderCurvaS, renderCurvaABC, renderOrcamentoAnalitico } from './curvas.js';

// Importações de Ponto Eletrônico
import { 
    renderMasterPonto, aprovarCheckin, deleteCheckin, 
    renderFornPontoLider, liderAprovarCheckin, 
    abrirCheckin, abrirCheckinObra, _toggleCheckinObraRow, 
    saveCheckin as _saveCheckinCore 
} from './ponto.js';

// Importações de Fornecedores/Equipes
import { 
    renderFornAdmin, toggleLiderSelect, openModalManualForn, 
    editForn, saveManualForn, submitRegForn, 
    deleteForn, populaSelectManualForn 
} from './fornecedores.js';

// Importações de Clientes
import { 
    renderClientsList, openModalNovoCliente, editClient, 
    saveNovoCliente, deleteClient, populaSelectClientes 
} from './clientes.js';

// Importações de Gestores e Composições
import { openModalGestores, renderListaGestores, saveNovoGestor, deleteGestor } from './gestores.js';
import { 
    renderComposicoesList, openModalComposicao, editComposicao, 
    saveComposicao, deleteComposicao, populaSelectComposicoes, aplicarComposicao 
} from './composicoes.js';

// Portais e Offline
import { renderFornDash, renderFornChecklist, fornToggleStatus } from './portal-forn.js';
import { renderMembroDash } from './portal-membro.js';
import { renderClienteDash } from './portal-cliente.js';
import { salvarOffline, sincronizarDados, initOfflineListeners } from './offline.js';

// OBJETO GLOBAL APP - O que o HTML enxerga
window.APP = {
    // UI e Geral
    showToast, openModal, closeModal, showMasterSection,
    
    // Obras
    renderMasterObrasGrid, renderObraDetail, openObraDetail, 
    saveNovaObra, duplicarObra, deleteObraCompleta,
    updateTeamSelection, calcBudgetValidation,

    // Medições
    renderMedicoes, openModalNovaMedicao, calcMedicaoTotal,
    saveMedicao, toggleStatusAdm, deleteMedicao,
    openModalNovaDiaria, calcDiaria, saveDiaria, deleteDiaria,

    // Curvas e Ponto
    switchCurvaTab, renderCurvaS, renderCurvaABC, renderOrcamentoAnalitico,
    renderMasterPonto, aprovarCheckin, deleteCheckin,
    renderFornPontoLider, liderAprovarCheckin,
    abrirCheckin, abrirCheckinObra, _toggleCheckinObraRow,
    
    // Lógica de Ponto Offline/Online
    saveCheckin: async function (dados, isSync = false) {
        if (!navigator.onLine && !isSync) {
            salvarOffline(dados);
            return;
        }
        return _saveCheckinCore(dados);
    },

    // Clientes e Fornecedores
    renderClientsList, openModalNovoCliente, editClient, saveNovoCliente, deleteClient, populaSelectClientes,
    renderFornAdmin, openModalManualForn, editForn, saveManualForn, deleteForn, 
    toggleLiderSelect, populaSelectManualForn, submitRegForn,

    // Gestores e Composições
    openModalGestores, renderListaGestores, saveNovoGestor, deleteGestor,
    renderComposicoesList, openModalComposicao, editComposicao, saveComposicao, 
    deleteComposicao, populaSelectComposicoes, aplicarComposicao,

    // Portais
    renderFornDash, renderFornChecklist, fornToggleStatus,
    renderMembroDash, renderClienteDash
};

// Funções que ficam soltas no Windows para botões simples
window.toggleMobileMenu = toggleMobileMenu;
window.showMasterSection = showMasterSection;
window.switchObraTab = switchObraTab;
window.switchFornTab = switchFornTab;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    initOfflineListeners();
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

// SERVICE WORKER (PWA / Offline)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Arcco Hub: Modo Offline Ativado');
                sconizarDados();
            })
            .catch(err => console.log('Erro Service Worker:', err));
    });
}
