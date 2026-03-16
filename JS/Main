// ============================================================
// main.js — Ponto de entrada do ARCCO HUB
// Importa todos os módulos e monta o objeto global window.APP
//
// COMO USAR: substitua o <script type="module"> inline do HTML por:
//   <script type="module" src="js/main.js"></script>
// ============================================================

// ── Config / State / Helpers (Firebase já iniciado aqui) ─────
import { STATE }    from './config.js';

// ── UI ────────────────────────────────────────────────────────
import { showToast, openModal, closeModal,
         toggleMobileMenu, showMasterSection,
         pontoStatusBadge, switchObraTab, switchFornTab } from './ui.js';

// ── Auth + Sync ───────────────────────────────────────────────
import { setupAuth } from './auth.js';

// ── Obras / Cronograma ────────────────────────────────────────
import { renderMasterObrasGrid, openObraDetail, duplicarObra,
         deleteObraCompleta, renderObraDetail,
         setTipoContratacao, calcTotalTask, calcPERT,
         updateInicioStyle, handleDepChange,
         saveTaskToObra, editTask, resetTaskForm,
         toggleTaskStatus, deleteTask, toggleAtencao,
         saveModuloObra, editModuloObra, cancelEditModulo, deleteModuloObra,
         saveNovaObra, updateObraConfig,
         openModalNovaCompra, saveNovaCompra, aprovarCompra, deleteCompra } from './obras.js';

// ── Medições ─────────────────────────────────────────────────
import { renderMedicoes, openModalNovaMedicao, calcMedicaoTotal,
         saveMedicao, toggleStatusAdm, deleteMedicao,
         openModalNovaDiaria, calcDiaria, saveDiaria, deleteDiaria } from './medicoes.js';

// ── Curvas ────────────────────────────────────────────────────
import { switchCurvaTab, renderCurvaS,
         renderCurvaABC, renderOrcamentoAnalitico } from './curvas.js';

// ── Folha de Ponto ────────────────────────────────────────────
import { renderMasterPonto, aprovarCheckin, deleteCheckin,
         renderFornPontoLider, liderAprovarCheckin,
         abrirCheckin, abrirCheckinObra, _toggleCheckinObraRow,
         saveCheckin as _saveCheckinCore } from './ponto.js';

// ── Fornecedores ──────────────────────────────────────────────
import { renderFornAdmin, toggleLiderSelect,
         openModalManualForn, editForn, saveManualForn,
         submitRegForn, deleteForn, populaSelectManualForn } from './fornecedores.js';

// ── Clientes ─────────────────────────────────────────────────
import { renderClientsList, openModalNovoCliente, editClient,
         saveNovoCliente, deleteClient, populaSelectClientes } from './clientes.js';

// ── Gestores ──────────────────────────────────────────────────
import { openModalGestores, renderListaGestores,
         saveNovoGestor, deleteGestor } from './gestores.js';

// ── Composições ───────────────────────────────────────────────
import { renderComposicoesList, openModalComposicao, editComposicao,
         saveComposicao, deleteComposicao,
         populaSelectComposicoes, aplicarComposicao } from './composicoes.js';

// ── Portais ───────────────────────────────────────────────────
import { renderFornDash, renderFornChecklist, fornToggleStatus } from './portal-forn.js';
import { renderMembroDash }    from './portal-membro.js';
import { renderClienteDash }   from './portal-cliente.js';

// ── Offline ───────────────────────────────────────────────────
import { salvarOffline, sincronizarDados, initOfflineListeners } from './offline.js';

// ═══════════════════════════════════════════════════════════════
// Monta window.APP — objeto público consumido pelo HTML inline
// ═══════════════════════════════════════════════════════════════
window.APP = {
    // UI / Modal
    openModal,
    closeModal,
    showToast,

    // Obras
    openObraDetail,
    duplicarObra,
    deleteObraCompleta,
    updateObraConfig,
    saveNovaObra,

    // Formulário de Tarefa
    setTipoContratacao,
    calcTotalTask,
    calcPERT,
    updateInicioStyle,
    handleDepChange,
    saveTaskToObra,
    editTask,
    resetTaskForm,
    toggleTaskStatus,
    deleteTask,
    toggleAtencao,

    // Módulos EAP
    saveModuloObra,
    editModuloObra,
    cancelEditModulo,
    deleteModuloObra,

    // Compras
    openModalNovaCompra,
    saveNovaCompra,
    aprovarCompra,
    deleteCompra,

    // Medições
    openModalNovaMedicao,
    calcMedicaoTotal,
    saveMedicao,
    toggleStatusAdm,
    deleteMedicao,

    // Diárias
    openModalNovaDiaria,
    calcDiaria,
    saveDiaria,
    deleteDiaria,

    // Curvas S / ABC / Orçamento
    switchCurvaTab,
    renderCurvaS,
    renderCurvaABC,
    renderOrcamentoAnalitico,

    // Folha de Ponto — Master
    renderMasterPonto,
    aprovarCheckin,
    deleteCheckin,

    // Folha de Ponto — Líder / Membro
    renderFornPontoLider,
    liderAprovarCheckin,
    switchFornTab,
    abrirCheckin,
    abrirCheckinObra,
    _toggleCheckinObraRow,

    // saveCheckin com wrapper offline
    saveCheckin: async function (dados, isSync = false) {
        if (!navigator.onLine && !isSync) {
            salvarOffline(dados);
            return;
        }
        return _saveCheckinCore(dados);
    },

    // Usado pelo offline.js na re-sincronização
    _saveCheckinOnline: _saveCheckinCore,

    // Portal Fornecedor
    renderFornDash,
    renderFornChecklist,
    fornToggleStatus,

    // Portal Membro
    renderMembroDash,

    // Portal Cliente
    renderClienteDash,

    // Clientes
    openModalNovoCliente,
    editClient,
    saveNovoCliente,
    deleteClient,

    // Fornecedores / Equipes
    openModalManualForn,
    editForn,
    saveManualForn,
    submitRegForn,
    deleteForn,
    toggleLiderSelect,

    // Gestores
    openModalGestores,
    saveNovoGestor,
    deleteGestor,

    // Composições
    openModalComposicao,
    editComposicao,
    saveComposicao,
    deleteComposicao,
    aplicarComposicao,
};

// ── Expõe funções chamadas diretamente no HTML (onclick="...") ─
window.toggleMobileMenu  = toggleMobileMenu;
window.showMasterSection = showMasterSection;
window.switchObraTab     = switchObraTab;

// ── Inicia autenticação Firebase + watchers Firestore ─────────
setupAuth({
    renderMasterObrasGrid,
    renderObraDetail,
    renderFornAdmin,
    renderClientsList,
    renderFornDash,
    renderMembroDash,
    renderClienteDash,
    populaSelectClientes,
    populaSelectManualForn,
    populaSelectComposicoes,
    renderComposicoesList,
    renderListaGestores,
    showToast,
    showMasterSection,
    switchObraTab,
    switchFornTab,
});

// ── Offline listeners ─────────────────────────────────────────
initOfflineListeners();

// ── Service Worker ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('Sistema Offline Pronto');
                reg.onupdatefound = () => {
                    const w = reg.installing;
                    w.onstatechange = () => {
                        if (w.state === 'installed' && navigator.serviceWorker.controller) {
                            if (confirm('Nova atualização disponível! Deseja carregar agora?')) {
                                window.location.reload();
                            }
                        }
                    };
                };
                sincronizarDados();
            })
            .catch(err => console.log('Erro no Service Worker', err));
    });
}
