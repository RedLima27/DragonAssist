const Components = {

  renderToast(t) {
    const old = document.getElementById('toast');
    if (old) old.remove();
    if (!t) return;
    const el = document.createElement('div');
    el.id = 'toast';
    el.className = `toast ${t.tipo}`;
    const icon = { success: '&#10003;', error: '&#10005;', info: 'i' }[t.tipo] || '&bull;';
    el.innerHTML = `<span class="toast-icon">${icon}</span>${Utils.esc(t.msg)}`;
    document.body.appendChild(el);
  },

  openModal(title, bodyHtml, onConfirm, confirmLabel = 'Salvar', confirmCls = 'btn-primary') {
    const old = document.getElementById('modal-overlay');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'modal-overlay';
    ov.className = 'modal-overlay';
    ov.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">${Utils.esc(title)}</span>
          <span class="modal-close" id="modal-close-x">&#10005;</span>
        </div>
        <div id="modal-body">${bodyHtml}</div>
        ${onConfirm ? `
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="modal-cancel">Cancelar</button>
          <button class="btn ${confirmCls} btn-sm" id="modal-confirm">${confirmLabel}</button>
        </div>` : ''}
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#modal-close-x').onclick = () => Components.closeModal();
    if (onConfirm) {
      ov.querySelector('#modal-cancel').onclick  = () => Components.closeModal();
      ov.querySelector('#modal-confirm').onclick = onConfirm;
    }
    ov.onclick = e => { if (e.target === ov) Components.closeModal(); };
    setTimeout(() => { const i = ov.querySelector('input,textarea,select'); if (i) i.focus(); }, 50);
  },

  closeModal() {
    const el = document.getElementById('modal-overlay');
    if (el) el.remove();
  },

  showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="inline-error">${Utils.esc(msg)}</div>`;
  },

  clearErr(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  },

  sidebar(page) {
    const user    = Auth.user;
    const abertos = DB.getChamados({}).filter(c => c.status === 'Aberto').length;
    const label   = DB.ENUM.perfilLabel[user?.perfil] || '';
    const nav = (lbl, pg) => `
      <div class="nav-item ${page === pg ? 'active' : ''}" onclick="App.navigate('${pg}')">
        <span class="nav-label">${lbl}</span>
        ${pg === 'chamados' && abertos > 0 ? `<span class="nav-count">${abertos}</span>` : ''}
      </div>`;
    return `
    <div class="sidebar">
      <div class="sidebar-logo">
        <img src="img/logo.png" alt="DragonAssist" class="sidebar-logo-img">
        <div>
          <div class="logo-name">DragonAssist</div>
          <div class="logo-sub">Help Desk</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${nav('Dashboard', 'dashboard')}
        ${nav('Chamados', 'chamados')}
        ${Auth.isDiretor ? nav('Usuários', 'usuarios') : ''}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-role-label">${Utils.esc(label)}</div>
        <div class="user-card" onclick="handleLogout()">
          <div class="avatar avatar-sm" style="background:${Utils.avatarBg(user?.id)}">${Utils.initials(user?.nome)}</div>
          <div>
            <div class="user-card-name truncate">${Utils.esc(user?.nome)}</div>
            <div class="user-card-action">Encerrar sessão</div>
          </div>
        </div>
      </div>
    </div>`;
  },

  pagination(cur, total, fn) {
    if (total <= 1) return '';
    return `
    <div class="pagination">
      <span>${cur} de ${total}</span>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" ${cur === 1 ? 'disabled' : ''} onclick="${fn}(${cur - 1})">Anterior</button>
        <button class="btn btn-secondary btn-sm" ${cur === total ? 'disabled' : ''} onclick="${fn}(${cur + 1})">Próxima</button>
      </div>
    </div>`;
  },
};
