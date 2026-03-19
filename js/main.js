// ============================================================
// main.js — Ponto de entrada do ARCCO HUB
// ============================================================

import { STATE }    from './config.js';
import { showToast, openModal, closeModal,
         toggleMobileMenu, showMasterSection,
         pontoStatusBadge, switchObraTab, switchFornTab } from './ui.js';
import { setupAuth } from './auth.js';

// Importações ajustadas para o novo obras.js
import { 
    renderMasterObrasGrid, openObraDetail, duplicarObra, 
    deleteObraCompleta, renderObraDetail,
    updateTeamSelection, calcBudgetValidation
} from './obras.js';

import { renderMedicoes, openModalNovaMedicao, calcMedicaoTotal,
         saveMedicao, toggleStatusAdm, deleteMedicao,
         openModalNovaDiaria, calcDiaria, saveDiaria, deleteDiaria } from './medicoes.js';

import { switchCurvaTab, renderCurvaS,
         renderCurvaABC, renderOrcamentoAnalitico } from './curvas.js';

import { renderMasterPonto, aprovarCheckin, deleteCheckin,
         renderFornPontoLider, liderAprovarCheckin,
         abrirCheckin, abrirCheckinObra, _toggleCheckinObraRow,
         saveCheckin as _saveCheckinCore } from './ponto.js';

import { renderFornAdmin, toggleLiderSelect,
         openModalManualForn, editForn, saveManualForn,
         submitRegForn, deleteForn, populaSelectManualForn } from './fornecedores.js';

import { renderClientsList, openModalNovoCliente, editClient,
         saveNovoCliente, deleteClient, populaSelectClientes } from './clientes.js';

import { openModalGestores, renderListaGestores,
         saveNovoGestor, deleteGestor } from './gestores.js';

import { renderComposicoesList, openModalComposicao, editComposicao,
         saveComposicao, deleteComposicao,
         populaSelectComposicoes, aplicarComposicao } from './composicoes.js';

import { renderFornDash, renderFornChecklist, fornToggleStatus } from './portal-forn.js';
import { renderMembroDash }    from './portal-membro.js';
import { renderClienteDash }   from './portal-cliente.js';
import { salvarOffline, sincronizarDados, initOfflineListeners } from './offline.js';

window.APP = {
    openModal,
    closeModal,
    showToast,
    openObraDetail,
    duplicarObra,
    deleteObraCompleta,
    updateTeamSelection, // Função nova
    calcBudgetValidation, // Função nova
    
    // As funções abaixo precisam ser reintegradas no obras.js caso você as use no HTML
    // saveTaskToObra, 
    // deleteTask,

    openModalNovaMedicao,
    calcMedicaoTotal,
    saveMedicao,
    toggleStatusAdm,
    deleteMedicao,
    openModalNovaDiaria,
    calcDiaria,
    saveDiaria,
    deleteDiaria,
    switchCurvaTab,
    renderCurvaS,
    renderCurvaABC,
    renderOrcamentoAnalitico,
    renderMasterPonto,
    aprovarCheckin,
    deleteCheckin,
    renderFornPontoLider,
    liderAprovarCheckin,
    switchFornTab,
    abrirCheckin,
    abrirCheckinObra,
    _toggleCheckinObraRow,
    saveCheckin: async function (dados, isSync = false) {
        if (!navigator.onLine && !isSync) {
            salvarOffline(dados);
            return;
        }
        return _saveCheckinCore(dados);
    },
    _saveCheckinOnline: _saveCheckinCore,
    renderFornDash,
    renderFornChecklist,
    fornToggleStatus,
    renderMembroDash,
    renderClienteDash,
    openModalNovoCliente,
    editClient,
    saveNovoCliente,
    deleteClient,
    openModalManualForn,
    editForn,
    saveManualForn,
    submitRegForn,
    deleteForn,
    toggleLiderSelect,
    openModalGestores,
    saveNovoGestor,
    deleteGestor,
    openModalComposicao,
    editComposicao,
    saveComposicao,
    deleteComposicao,
    aplicarComposicao,
};

window.toggleMobileMenu  = toggleMobileMenu;
window.showMasterSection = showMasterSection;
window.switchObraTab     = switchObraTab;

window.APP.renderMasterObrasGrid   = renderMasterObrasGrid;
window.APP.renderObraDetail        = renderObraDetail;
window.APP.renderFornAdmin         = renderFornAdmin;
window.APP.renderClientsList       = renderClientsList;
window.APP.renderFornDash          = renderFornDash;
window.APP.renderMembroDash        = renderMembroDash;
window.APP.renderClienteDash       = renderClienteDash;
window.APP.populaSelectClientes    = populaSelectClientes;
window.APP.populaSelectManualForn  = populaSelectManualForn;
window.APP.populaSelectComposicoes = populaSelectComposicoes;
window.APP.renderComposicoesList   = renderComposicoesList;
window.APP.renderListaGestores     = renderListaGestores;

setupAuth();
initOfflineListeners();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Sistema Offline Pronto');
                sincronizarDados();
            })
            .catch(err => console.log('Erro no Service Worker', err));
    });
}
