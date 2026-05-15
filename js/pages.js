// pages.js — todas as páginas da SPA

// ── Login ─────────────────────────────────────────────────────
const LoginPage = {
  render(tab='login') {
    return `
    <div class="login-page">
      <div class="login-card card card-body">
        <div class="login-brand">
          <img src="img/logo.png" class="login-logo" alt="DragonAssist">
          <div class="login-brand-name">DragonAssist</div>
          <div class="login-brand-sub">Sistema de Chamados Técnicos</div>
        </div>
        <div class="login-tabs">
          ${['login','cadastro','recuperar'].map(t=>`
            <div class="login-tab ${tab===t?'active':''}" onclick="LoginPage.tab('${t}')">
              ${{login:'Entrar',cadastro:'Cadastrar',recuperar:'Recuperar'}[t]}
            </div>`).join('')}
        </div>
        <div id="login-err"></div>
        ${tab==='login'    ? this._fLogin()    : ''}
        ${tab==='cadastro' ? this._fCadastro() : ''}
        ${tab==='recuperar'? this._fRecuperar(): ''}
        <div class="login-demo">
          <span class="login-demo-title">Contas de demonstração</span>
          rafael@dragonassist.com / Admin@123 — Diretor de Operações<br>
          carlos@dragonassist.com / Tech@123 — Operador Técnico<br>
          joao@empresa.com / User@123 — Analista de Suporte
          <button class="login-reset-btn" onclick="LoginPage.reset()">Problemas ao entrar? Redefinir dados de demonstração</button>
        </div>
      </div>
    </div>`;
  },

  _fLogin() { return `
    <form onsubmit="LoginPage.doLogin(event)">
      <div class="form-group"><label class="form-label">E-mail</label>
        <input class="input" id="l-email" type="email" required value="rafael@dragonassist.com"></div>
      <div class="form-group"><label class="form-label">Senha</label>
        <input class="input" id="l-senha" type="password" required value="Admin@123"></div>
      <button type="submit" class="btn btn-primary w-full" style="justify-content:center">Entrar</button>
    </form>`; },

  _fCadastro() { return `
    <form onsubmit="LoginPage.doCadastro(event)">
      <div class="form-group"><label class="form-label">Nome</label><input class="input" id="c-nome" required></div>
      <div class="form-group"><label class="form-label">E-mail</label><input class="input" id="c-email" type="email" required></div>
      <div class="form-group"><label class="form-label">Senha</label><input class="input" id="c-senha" type="password" required></div>
      <div class="form-group"><label class="form-label">Perfil</label>
        <select class="input" id="c-perfil">
          <option value="analista">Analista de Suporte</option>
          <option value="operador">Operador Técnico</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary w-full" style="justify-content:center">Criar conta</button>
    </form>`; },

  _fRecuperar() { return `
    <p class="color-secondary t-sm mb-4">Informe o e-mail para receber instruções de recuperação.</p>
    <form onsubmit="LoginPage.doRecuperar(event)">
      <div class="form-group"><label class="form-label">E-mail</label><input class="input" id="r-email" type="email" required></div>
      <button type="submit" class="btn btn-primary w-full" style="justify-content:center">Enviar instruções</button>
    </form>`; },

  tab(t)  { App.navigate('login',{loginTab:t}); },
  reset() { DB.reset(); App.showToast('Dados redefinidos.','info'); Renderer.render(); },

  async doLogin(e) {
    e.preventDefault();
    const btn=e.target.querySelector('button'); btn.disabled=true; btn.textContent='Verificando...';
    Components.clearErr('login-err');
    const r = await Auth.login(document.getElementById('l-email')?.value, document.getElementById('l-senha')?.value);
    if(r.ok) App.navigate('dashboard');
    else { Components.showErr('login-err',r.msg); btn.disabled=false; btn.textContent='Entrar'; }
  },
  async doCadastro(e) {
    e.preventDefault(); Components.clearErr('login-err');
    const r = await Auth.register(
      document.getElementById('c-nome')?.value,
      document.getElementById('c-email')?.value,
      document.getElementById('c-senha')?.value,
      document.getElementById('c-perfil')?.value,
    );
    if(r.ok) { App.navigate('dashboard'); App.showToast('Conta criada.'); }
    else Components.showErr('login-err',r.msg);
  },
  doRecuperar(e) { e.preventDefault(); App.showToast('Se o e-mail estiver cadastrado, as instruções foram enviadas.','info'); },
};

// ── Dashboard ─────────────────────────────────────────────────
const DashboardPage = {
  render() {
    const user   = Auth.user;
    const stats  = DB.getStats(user.id, user.perfil);
    const recentes = DB.getChamados({usuario_id:user.id,perfil:user.perfil}).slice(0,6);
    const maxCat = Math.max(...stats.porCategoria.map(c=>c.total),1);
    const catColor = {Hardware:'var(--red-600)',Software:'var(--status-pending-fg)',Rede:'var(--status-done-fg)'};

    return `
    <div class="page-header">
      <div>
        <div class="page-title">${Utils.esc(user.nome.split(' ')[0])}</div>
        <div class="page-subtitle">${DB.ENUM.perfilLabel[user.perfil]}</div>
      </div>
      ${!Auth.isDiretor?`<button class="btn btn-primary" onclick="App.navigate('novo')">Novo Chamado</button>`:''}
    </div>

    <div class="metrics-grid">
      <div class="metric-card" style="border-top-color:var(--border-default)">
        <div class="metric-label">Total</div><div class="metric-value">${stats.total}</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--status-active-fg)">
        <div class="metric-label">Ativos</div><div class="metric-value">${stats.ativos}</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--red-600)">
        <div class="metric-label">Alta Prioridade</div><div class="metric-value">${stats.alta}</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--status-done-fg)">
        <div class="metric-label">Resolvidos</div><div class="metric-value">${stats.resolvidos}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card card-body">
        <div class="t-sm w-semibold mb-4 uppercase color-secondary" style="letter-spacing:.05em">Por Categoria</div>
        ${stats.porCategoria.map(c=>`
          <div class="bar-item">
            <div class="bar-row"><span>${c.cat}</span><span class="bar-row-value">${c.total}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(c.total/maxCat*100)}%;background:${catColor[c.cat]||'var(--gray-600)'}"></div></div>
          </div>`).join('')}
        <div class="sep"></div>
        <div class="flex flex-wrap gap-2">
          ${stats.porStatus.filter(s=>s.total>0).map(s=>`<span class="badge ${Utils.statusBadgeClass(s.st)}">${s.total} ${s.st}</span>`).join('')}
        </div>
      </div>

      <div class="card card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="t-sm w-semibold uppercase color-secondary" style="letter-spacing:.05em">Recentes</div>
          <button class="btn btn-secondary btn-xs" onclick="App.navigate('chamados')">Ver todos</button>
        </div>
        ${recentes.length===0
          ? `<div class="empty-state"><div class="empty-label">Nenhum chamado</div></div>`
          : recentes.map(c=>`
            <div class="recent-item" onclick="App.navigate('detalhe',{chamadoId:${c.id}})">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0 recent-title truncate">#${c.id} ${Utils.esc(c.titulo)}</div>
                ${Utils.statusBadge(c.status)}
              </div>
              <div class="recent-meta">${Utils.esc(c.categoria)} — ${Utils.prioBadge(c.prioridade)} — ${Utils.timeAgo(c.data_abertura)}</div>
            </div>`).join('')
        }
      </div>
    </div>`;
  },
};

// ── Lista de Chamados ─────────────────────────────────────────
const ChamadosPage = {
  pg: 1,
  render() {
    const user = Auth.user;
    const f    = App.state.filtros;
    const all  = DB.getChamados({usuario_id:user.id,perfil:user.perfil,...f});
    const {items,total,pages} = Utils.paginate(all, this.pg, 18);

    const chip = (lbl,fk,v) =>
      `<button class="chip ${f[fk]===v?'active':''}" onclick="ChamadosPage.setF('${fk}','${v}')">${lbl}</button>`;

    return `
    <div class="page-header">
      <div><div class="page-title">Chamados</div><div class="page-subtitle">${total} resultado(s)</div></div>
      ${!Auth.isDiretor?`<button class="btn btn-primary" onclick="App.navigate('novo')">Novo Chamado</button>`:''}
    </div>

    <div class="search-bar">
      <span class="search-icon">&#128269;</span>
      <input class="search-input" placeholder="Buscar chamado..." value="${Utils.esc(f.busca)}" oninput="ChamadosPage.setBusca(this.value)">
    </div>

    <div class="filter-row mb-2">
      <span class="filter-label">Status</span>
      ${chip('Todos','status','')}
      ${DB.ENUM.status.map(s=>chip(s,'status',s)).join('')}
    </div>
    <div class="filter-row mb-4">
      <span class="filter-label">Prioridade</span>
      ${DB.ENUM.prioridade.map(p=>chip(p,'prioridade',p)).join('')}
      <span class="filter-label" style="margin-left:8px">Categoria</span>
      ${DB.ENUM.categoria.map(c=>chip(c,'categoria',c)).join('')}
    </div>

    <div class="table-wrap">
      ${items.length===0
        ? `<div class="empty-state"><div class="empty-label">Nenhum chamado encontrado</div></div>`
        : `<table>
          <thead><tr>
            <th class="col-id">ID</th><th>Título</th><th>Categoria</th>
            <th>Prioridade</th><th>Status</th><th class="col-date">Abertura</th>
            ${Auth.isOperador?'<th>Solicitante</th>':''}
            ${!Auth.isOperador?'<th>Operador</th>':''}
          </tr></thead>
          <tbody>
            ${items.map(c=>{
              const sol=DB.findUserById(c.usuario_id);
              const tec=DB.findUserById(c.tecnico_id);
              return `<tr class="row-clickable" onclick="App.navigate('detalhe',{chamadoId:${c.id}})">
                <td class="mono color-tertiary t-sm col-id">#${c.id}</td>
                <td style="max-width:220px"><span class="truncate w-semibold" style="display:block">${Utils.esc(c.titulo)}</span></td>
                <td class="color-secondary">${Utils.esc(c.categoria)}</td>
                <td>${Utils.prioBadge(c.prioridade)}</td>
                <td>${Utils.statusBadge(c.status)}</td>
                <td class="color-secondary t-sm col-date">${Utils.fmtDateShort(c.data_abertura)}</td>
                ${Auth.isOperador?`<td class="color-secondary">${sol?Utils.esc(sol.nome.split(' ')[0]):'—'}</td>`:''}
                ${!Auth.isOperador?`<td class="color-secondary">${tec?Utils.esc(tec.nome.split(' ')[0]):'<span class="color-tertiary">Não atribuído</span>'}</td>`:''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>`
      }
    </div>
    ${Components.pagination(this.pg, pages, 'ChamadosPage.goTo')}`;
  },

  setF(k,v)  { App.setFiltro(k,v); this.pg=1; Renderer.render(); },
  setBusca(v){ App.state.filtros.busca=v; this.pg=1; Renderer.render(); },
  goTo(p)    { ChamadosPage.pg=p; Renderer.render(); },
};

// ── Novo Chamado ──────────────────────────────────────────────
const NovoChamadoPage = {
  render() {
    return `
    <div style="max-width:560px">
      <div class="flex items-center gap-3 mb-5">
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('chamados')">Voltar</button>
        <div><div class="page-title t-lg">Novo Chamado</div>
          <div class="page-subtitle">Descreva o problema para a equipe técnica</div>
        </div>
      </div>
      <div class="card card-body">
        <div id="nc-err"></div>
        <div class="form-group"><label class="form-label">Título</label>
          <input class="input" id="nc-titulo" placeholder="Descrição breve do problema"></div>
        <div class="form-group"><label class="form-label">Descrição</label>
          <textarea class="input" id="nc-desc" rows="5" placeholder="Detalhe o problema, quando ocorreu e o que já foi tentado"></textarea></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Categoria</label>
            <select class="input" id="nc-cat">${DB.ENUM.categoria.map(c=>`<option>${c}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Prioridade</label>
            <select class="input" id="nc-prio">${DB.ENUM.prioridade.map(p=>`<option${p==='Média'?' selected':''}>${p}</option>`).join('')}</select>
          </div>
        </div>
        <div class="flex gap-2" style="justify-content:flex-end">
          <button class="btn btn-secondary" onclick="App.navigate('chamados')">Cancelar</button>
          <button class="btn btn-primary" onclick="NovoChamadoPage.submit()">Abrir Chamado</button>
        </div>
      </div>
    </div>`;
  },
  submit() {
    const titulo   = document.getElementById('nc-titulo')?.value.trim();
    const descricao= document.getElementById('nc-desc')?.value.trim();
    const categoria= document.getElementById('nc-cat')?.value;
    const prioridade=document.getElementById('nc-prio')?.value;
    Components.clearErr('nc-err');
    if(!titulo||!descricao){ Components.showErr('nc-err','Título e descrição são obrigatórios.'); return; }
    const user = Auth.user;
    try {
      const c = DB.createChamado({titulo,descricao,categoria,prioridade,usuario_id:user.id});
      DB.addHistorico({chamado_id:c.id,autor_id:user.id,acao:'Chamado aberto',descricao:`Chamado registrado por ${user.nome}`});
      App.showToast(`Chamado #${c.id} registrado.`);
      App.navigate('detalhe',{chamadoId:c.id});
    } catch(e) { Components.showErr('nc-err',e.message); }
  },
};

// ── Detalhe do Chamado ────────────────────────────────────────
const DetalhePage = {
  render(id) {
    const c = DB.getChamadoById(id);
    if(!c) return `<div class="empty-state"><div class="empty-label">Chamado não encontrado</div></div>`;

    const user  = Auth.user;
    if(user.perfil==='analista' && c.usuario_id!==user.id)
      return `<div class="empty-state"><div class="empty-label">Acesso não autorizado</div></div>`;

    const sol  = DB.findUserById(c.usuario_id);
    const tec  = DB.findUserById(c.tecnico_id);
    const hist = DB.getHistorico(id);
    const obs  = hist.filter(h=>h.acao==='Observação técnica');

    const isOwner   = user.id===c.usuario_id;
    const isTech    = Auth.isDiretor||(Auth.isOperador&&c.tecnico_id===user.id);
    const canAssume = Auth.isOperador && !c.tecnico_id;
    const canClose  = isOwner && c.status==='Resolvido';
    const canAct    = isTech && c.status!=='Fechado';
    const nextStatus= (DB.ENUM.transicoes[c.status]||[]).filter(s=>s!=='Fechado');

    return `
    <div style="max-width:860px">
      <button class="btn btn-secondary btn-sm mb-5" onclick="App.navigate('chamados')">Voltar</button>

      <div class="card card-body mb-4">
        <div class="detail-header-meta">
          <span class="mono color-tertiary t-sm">#${c.id}</span>
          ${Utils.statusBadge(c.status)}
          ${Utils.prioBadge(c.prioridade)}
          <span class="badge badge-closed">${Utils.esc(c.categoria)}</span>
        </div>
        <div class="detail-title">${Utils.esc(c.titulo)}</div>
        <div class="detail-description">${Utils.esc(c.descricao)}</div>
        ${c.solucao?`
          <div class="solution-box mt-4">
            <div class="t-sm w-semibold mb-2" style="color:var(--status-done-fg)">Solução Aplicada</div>
            <div class="t-sm color-secondary" style="white-space:pre-wrap">${Utils.esc(c.solucao)}</div>
          </div>`:''
        }
      </div>

      <div class="detail-actions">
        ${canAssume?`<button class="btn btn-primary btn-sm" onclick="DetalhePage.assumir(${c.id})">Assumir Chamado</button>`:''}
        ${canClose ?`<button class="btn btn-success btn-sm" onclick="DetalhePage.fechar(${c.id})">Confirmar e Fechar</button>`:''}
        ${canAct&&nextStatus.length?`
          <select class="input" style="width:auto;font-size:var(--text-sm);padding:5px 10px"
            onchange="DetalhePage.changeStatus(${c.id},this.value);this.value=''">
            <option value="" disabled selected>Alterar status</option>
            ${nextStatus.map(s=>`<option value="${s}">${s}</option>`).join('')}
          </select>`:''
        }
        ${canAct?`<button class="btn btn-secondary btn-sm" onclick="DetalhePage.modalObs(${c.id})">Observação</button>`:''}
        ${canAct&&c.status!=='Resolvido'?`<button class="btn btn-secondary btn-sm" onclick="DetalhePage.modalSolucao(${c.id})">Registrar Solução</button>`:''}
      </div>

      <div class="detail-grid">
        <div class="card card-body">
          <div class="t-sm w-semibold uppercase color-secondary mb-3" style="letter-spacing:.05em">Informações</div>
          <div class="info-row"><span class="info-key">Solicitante</span><span>${sol?Utils.esc(sol.nome):'—'}</span></div>
          <div class="info-row"><span class="info-key">Operador</span>
            <span>${tec?Utils.esc(tec.nome):'<span class="color-tertiary">Não atribuído</span>'}</span></div>
          <div class="info-row"><span class="info-key">Abertura</span>
            <span class="t-sm color-secondary">${Utils.fmtDate(c.data_abertura)}</span></div>
          <div class="info-row"><span class="info-key">Resolução</span>
            <span class="t-sm color-secondary">${c.data_resolucao?Utils.fmtDate(c.data_resolucao):'—'}</span></div>

          <div class="t-sm w-semibold uppercase color-secondary mt-5 mb-3" style="letter-spacing:.05em">Observações Técnicas (${obs.length})</div>
          ${obs.length===0
            ? `<p class="color-tertiary t-sm italic">Nenhuma observação registrada</p>`
            : obs.map(o=>{
                const a=DB.findUserById(o.autor_id);
                return `<div class="obs-box">
                  <div class="obs-author">${a?Utils.esc(a.nome):'Operador'}</div>
                  <div class="t-sm" style="line-height:1.6;white-space:pre-wrap">${Utils.esc(o.descricao)}</div>
                  <div class="obs-date">${Utils.fmtDate(o.data)}</div>
                </div>`;
              }).join('')
          }
        </div>

        <div class="card card-body">
          <div class="t-sm w-semibold uppercase color-secondary mb-3" style="letter-spacing:.05em">Histórico (${hist.length})</div>
          <div class="timeline">
            ${hist.map((h,i)=>{
              const a=DB.findUserById(h.autor_id);
              return `<div class="tl-item" ${i===hist.length-1?'style="border-left-color:transparent"':''}>
                <div class="tl-dot" style="background:${Utils.tlDotColor(h.acao)}"></div>
                <div class="tl-body">
                  <div class="tl-action" style="color:${Utils.tlDotColor(h.acao)}">${Utils.esc(h.acao)}</div>
                  <div class="tl-desc">${Utils.esc(h.descricao)}</div>
                  <div class="tl-meta">${a?Utils.esc(a.nome):'Sistema'} — ${Utils.fmtDate(h.data)}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      ${Ficha.render(c)}
    </div>`;
  },

  assumir(id) {
    const u=Auth.user; const r=DB.assumirChamado(id,u.id,u.perfil);
    if(!r.ok){App.showToast(r.msg,'error');return;}
    DB.addHistorico({chamado_id:id,autor_id:u.id,acao:'Operador assumiu',descricao:`${u.nome} assumiu o atendimento`});
    DB.addHistorico({chamado_id:id,autor_id:u.id,acao:'Status alterado',descricao:'Aberto → Em Atendimento'});
    App.showToast('Chamado assumido.'); Renderer.render();
  },
  fechar(id) {
    const u=Auth.user; const r=DB.updateChamadoStatus(id,'Fechado',u.id,u.perfil);
    if(!r.ok){App.showToast(r.msg,'error');return;}
    DB.addHistorico({chamado_id:id,autor_id:u.id,acao:'Chamado fechado',descricao:'Solicitante confirmou resolução'});
    App.showToast('Chamado encerrado.'); Renderer.render();
  },
  changeStatus(id,status) {
    const u=Auth.user; const c=DB.getChamadoById(id); const prev=c?.status;
    const r=DB.updateChamadoStatus(id,status,u.id,u.perfil);
    if(!r.ok){App.showToast(r.msg,'error');Renderer.render();return;}
    DB.addHistorico({chamado_id:id,autor_id:u.id,acao:'Status alterado',descricao:`${prev} → ${status}`});
    App.showToast('Status atualizado.'); Renderer.render();
  },
  modalObs(id) {
    Components.openModal('Nova Observação Técnica',`
      <div id="obs-err"></div>
      <div class="form-group"><label class="form-label">Observação</label>
        <textarea class="input" id="obs-txt" rows="5"></textarea></div>`,
    ()=>{
      const txt=document.getElementById('obs-txt')?.value.trim();
      if(!txt){Components.showErr('obs-err','Digite a observação.');return;}
      const u=Auth.user; const r=DB.addObservacao(id,txt,u.id,u.perfil);
      if(!r){App.showToast('Permissão negada.','error');Components.closeModal();return;}
      Components.closeModal(); App.showToast('Observação registrada.'); Renderer.render();
    },'Adicionar');
  },
  modalSolucao(id) {
    Components.openModal('Registrar Solução',`
      <p class="color-secondary t-sm mb-4">O chamado será marcado como Resolvido.</p>
      <div id="sol-err"></div>
      <div class="form-group"><label class="form-label">Solução aplicada</label>
        <textarea class="input" id="sol-txt" rows="5"></textarea></div>`,
    ()=>{
      const txt=document.getElementById('sol-txt')?.value.trim();
      if(!txt){Components.showErr('sol-err','Descreva a solução.');return;}
      const u=Auth.user; const r=DB.registrarSolucao(id,txt,u.id,u.perfil);
      if(!r.ok){App.showToast(r.msg,'error');Components.closeModal();return;}
      DB.addHistorico({chamado_id:id,autor_id:u.id,acao:'Solução registrada',descricao:txt});
      DB.addHistorico({chamado_id:id,autor_id:u.id,acao:'Status alterado',descricao:'Em Atendimento → Resolvido'});
      Components.closeModal(); App.showToast('Solução registrada.'); Renderer.render();
    },'Confirmar','btn-success');
  },
};

// ── Usuários (Diretor) ────────────────────────────────────────
const UsuariosPage = {
  render() {
    const users = DB.getAllUsers();
    const pBadge= {diretor:'badge-red',operador:'badge-open',analista:'badge-done'};
    return `
    <div class="page-header">
      <div><div class="page-title">Usuários</div><div class="page-subtitle">${users.length} cadastrado(s)</div></div>
      <button class="btn btn-primary" onclick="UsuariosPage.modalNovo()">Novo Usuário</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Nome</th><th>E-mail</th><th>Perfil</th>
          <th>Desde</th><th>Status</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${users.map(u=>`<tr>
            <td>
              <div class="flex items-center gap-2">
                <div class="avatar avatar-sm" style="background:${Utils.avatarBg(u.id)}">${Utils.initials(u.nome)}</div>
                <span class="w-semibold">${Utils.esc(u.nome)}</span>
                ${u.id===Auth.user?.id?'<span class="color-tertiary t-sm italic">(você)</span>':''}
              </div>
            </td>
            <td class="color-secondary t-sm">${Utils.esc(u.email)}</td>
            <td><span class="badge ${pBadge[u.perfil]||'badge-closed'}">${DB.ENUM.perfilLabel[u.perfil]||u.perfil}</span></td>
            <td class="color-secondary t-sm">${Utils.fmtDateShort(u.criado)}</td>
            <td><span class="badge ${u.ativo?'badge-done':'badge-red'}">${u.ativo?'Ativo':'Inativo'}</span></td>
            <td>
              <div class="flex gap-1">
                ${u.id!==Auth.user?.id?`
                  <button class="btn btn-secondary btn-xs" onclick="UsuariosPage.toggle(${u.id})">${u.ativo?'Desativar':'Ativar'}</button>
                  <button class="btn btn-danger btn-xs" onclick="UsuariosPage.del(${u.id})">Excluir</button>
                `:'—'}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  },

  modalNovo() {
    Components.openModal('Novo Usuário',`
      <div id="nu-err"></div>
      <div class="form-group"><label class="form-label">Nome</label><input class="input" id="nu-nome"></div>
      <div class="form-group"><label class="form-label">E-mail</label><input class="input" id="nu-email" type="email"></div>
      <div class="form-group"><label class="form-label">Senha inicial</label><input class="input" id="nu-senha" type="password"></div>
      <div class="form-group"><label class="form-label">Perfil</label>
        <select class="input" id="nu-perfil">
          ${DB.ENUM.perfil.map(p=>`<option value="${p}">${DB.ENUM.perfilLabel[p]}</option>`).join('')}
        </select>
      </div>`,
    async ()=>{
      const nome  =document.getElementById('nu-nome')?.value.trim();
      const email =document.getElementById('nu-email')?.value.trim();
      const senha =document.getElementById('nu-senha')?.value;
      const perfil=document.getElementById('nu-perfil')?.value;
      Components.clearErr('nu-err');
      if(!nome||!email||!senha){Components.showErr('nu-err','Preencha todos os campos.');return;}
      if(senha.length<6){Components.showErr('nu-err','Senha mínima: 6 caracteres.');return;}
      const u=await DB.createUser({nome,email,senha,perfil,forcePerfile:true});
      if(!u){Components.showErr('nu-err','E-mail já cadastrado.');return;}
      Components.closeModal(); App.showToast('Usuário criado.'); Renderer.render();
    },'Criar Usuário');
  },

  toggle(id) { DB.toggleUserAtivo(id); App.showToast('Status atualizado.'); Renderer.render(); },
  del(id) {
    const u=DB.findUserById(id);
    if(!confirm(`Excluir "${u?.nome}"? Esta ação não pode ser desfeita.`)) return;
    DB.deleteUser(id); App.showToast('Usuário excluído.'); Renderer.render();
  },
};
