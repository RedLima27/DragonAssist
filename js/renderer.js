// renderer.js — Motor de renderização da SPA
const Renderer = {
  render() {
    const { page, loginTab, chamadoId, toast } = App.state;
    const user = Auth.user;

    Components.renderToast(toast);

    // Guarda de rota: redireciona se sessão inconsistente
    if (!user && page !== 'login') { App.navigate('login'); return; }
    if (user  && page === 'login') { App.navigate('dashboard'); return; }

    const root = document.getElementById('root');
    if (!root) return;

    if (page === 'login') {
      root.innerHTML = LoginPage.render(loginTab);
      return;
    }

    // Resolve o conteúdo da página atual
    let content = '';
    if      (page === 'dashboard') content = DashboardPage.render();
    else if (page === 'chamados')  content = ChamadosPage.render();
    else if (page === 'novo')      content = NovoChamadoPage.render();
    else if (page === 'detalhe')   content = DetalhePage.render(chamadoId);
    else if (page === 'usuarios' && Auth.isDiretor) content = UsuariosPage.render();
    else content = `<div class="empty-state"><div class="empty-label">Página não encontrada</div></div>`;

    root.innerHTML = `
      <div class="app-shell">
        ${Components.sidebar(page)}
        <div class="main-content">${content}</div>
      </div>`;
  },
};

// Ação de logout exposta globalmente para o onclick da sidebar
function handleLogout() {
  Auth.logout();
  App.navigate('login');
  Renderer.render();
}

document.addEventListener('DOMContentLoaded', () => {
  App.subscribe(() => Renderer.render());
  App.navigate(Auth.user ? 'dashboard' : 'login');
  Renderer.render();
});
