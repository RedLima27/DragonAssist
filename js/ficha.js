// ficha.js — Ficha Técnica operacional (peças, serviços, SLA, custo)
const Ficha = {
  _draft: { id:null, pecas:[], servicos:[] },

  render(c) {
    const user   = Auth.user;
    const canEdit= Auth.isOperador && c.status!=='Fechado' &&
                   (Auth.isDiretor || c.tecnico_id===user.id);
    const f      = c.ficha||{};
    const pecas  = f.pecas||[];
    const servs  = f.servicos||[];
    const sla    = this._sla(f.sla_vence, c.status);

    return `
    <div class="ficha-wrap">
      <div class="ficha-header">
        <div>
          <div class="ficha-header-title">Ficha Técnica</div>
          <div class="ficha-header-sub">Dados operacionais e financeiros do atendimento</div>
        </div>
        ${canEdit?`<button class="btn btn-secondary btn-sm" onclick="Ficha.openEditor(${c.id})">Editar</button>`:''}
      </div>

      <div class="ficha-meta">
        <div class="ficha-field">
          <div class="ficha-field-label">Ticket Externo</div>
          <div class="ficha-field-value mono">${f.ticket_externo||'<span class="color-tertiary">—</span>'}</div>
        </div>
        <div class="ficha-field">
          <div class="ficha-field-label">SLA Definido</div>
          <div class="ficha-field-value">${f.sla_horas?f.sla_horas+'h':'—'}</div>
        </div>
        <div class="ficha-field">
          <div class="ficha-field-label">Vencimento SLA</div>
          <div class="ficha-field-value">
            ${f.sla_vence?`<span class="badge ${sla.cls}">${sla.label} ${Utils.fmtDate(f.sla_vence)}</span>`:'—'}
          </div>
        </div>
      </div>

      <div class="ficha-cost-bar">
        <div class="ficha-cost-item">
          <span class="ficha-cost-label">Custo de Peças</span>
          <span class="ficha-cost-value">${Utils.fmtBRL(this._sumPecas(pecas))}</span>
        </div>
        <span class="ficha-cost-sep">+</span>
        <div class="ficha-cost-item">
          <span class="ficha-cost-label">Custo de Serviços</span>
          <span class="ficha-cost-value">${Utils.fmtBRL(this._sumServs(servs))}</span>
        </div>
        <span class="ficha-cost-sep">=</span>
        <div class="ficha-cost-item ficha-cost-total">
          <span class="ficha-cost-label">Total do Chamado</span>
          <span class="ficha-total-amount">${Utils.fmtBRL(f.custo_total||0)}</span>
        </div>
      </div>

      ${this._tblPecas(pecas)}
      ${this._tblServs(servs)}

      ${f.observacao_financeira?`<div class="ficha-obs"><span>Obs.:</span><span>${Utils.esc(f.observacao_financeira)}</span></div>`:''}
    </div>`;
  },

  _tblPecas(pecas) {
    return `
    <div class="ficha-section-header">
      <span class="ficha-section-title">Peças e Equipamentos</span>
    </div>
    ${pecas.length===0?'<div class="ficha-empty">Nenhuma peça registrada</div>':`
    <table class="ficha-table">
      <thead><tr>
        <th>Descrição</th><th class="col-num">Qtd</th><th>Nr. Série</th>
        <th>Fornecedor</th><th class="col-right">Custo Unit.</th>
        <th class="col-right">Frete</th><th class="col-right">Subtotal</th>
      </tr></thead>
      <tbody>
        ${pecas.map(p=>{
          const sub=(parseFloat(p.custo)||0)*(parseInt(p.qtd)||1)+(parseFloat(p.frete)||0);
          return`<tr>
            <td class="w-semibold">${Utils.esc(p.nome)}</td>
            <td class="col-num">${p.qtd}</td>
            <td class="mono t-sm color-secondary">${p.num_serie||'—'}</td>
            <td class="color-secondary">${Utils.esc(p.fornecedor||'—')}</td>
            <td class="col-right">${Utils.fmtBRL(p.custo)}</td>
            <td class="col-right">${parseFloat(p.frete)>0?Utils.fmtBRL(p.frete):'—'}</td>
            <td class="col-right ficha-subtotal">${Utils.fmtBRL(sub)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`}`;
  },

  _tblServs(servs) {
    return `
    <div class="ficha-section-header" style="margin-top:0;border-top:1px solid var(--border-subtle)">
      <span class="ficha-section-title">Serviços Prestados</span>
    </div>
    ${servs.length===0?'<div class="ficha-empty">Nenhum serviço registrado</div>':`
    <table class="ficha-table">
      <thead><tr>
        <th>Descrição</th><th class="col-num">Horas</th>
        <th class="col-right">Valor/h</th><th class="col-right">Subtotal</th>
      </tr></thead>
      <tbody>
        ${servs.map(s=>{
          const sub=(parseFloat(s.horas)||0)*(parseFloat(s.custo_hora)||0);
          return`<tr>
            <td class="w-semibold">${Utils.esc(s.nome)}</td>
            <td class="col-num">${s.horas}h</td>
            <td class="col-right">${Utils.fmtBRL(s.custo_hora)}</td>
            <td class="col-right ficha-subtotal">${Utils.fmtBRL(sub)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`}`;
  },

  openEditor(id) {
    const c = DB.getChamadoById(id); if(!c)return;
    const f = c.ficha||{};
    this._draft = { id, pecas:JSON.parse(JSON.stringify(f.pecas||[])), servicos:JSON.parse(JSON.stringify(f.servicos||[])) };

    Components.openModal('Editar Ficha Técnica', this._editorHtml(f), ()=>this._save(id), 'Salvar', 'btn-primary');
  },

  _editorHtml(f) {
    return `
    <div style="max-height:65vh;overflow-y:auto;padding-right:4px">
      <div id="ficha-err"></div>
      <div class="grid-2 mb-4">
        <div class="form-group">
          <label class="form-label">Ticket Externo</label>
          <input class="input" id="fe-ticket" value="${Utils.esc(f.ticket_externo||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">SLA (horas)</label>
          <select class="input" id="fe-sla">
            ${[2,4,8,12,24,48,72].map(h=>`<option value="${h}" ${f.sla_horas==h?'selected':''}>${h}h</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="flex items-center justify-between mb-3">
        <span class="form-label">Peças e Equipamentos</span>
        <button class="btn btn-secondary btn-xs" onclick="Ficha._addPeca()">+ Peça</button>
      </div>
      <div id="fe-pecas">${this._pecaRows(this._draft.pecas)}</div>

      <div class="flex items-center justify-between mb-3 mt-4">
        <span class="form-label">Serviços</span>
        <button class="btn btn-secondary btn-xs" onclick="Ficha._addServ()">+ Serviço</button>
      </div>
      <div id="fe-servs">${this._servRows(this._draft.servicos)}</div>

      <div class="form-group mt-4">
        <label class="form-label">Observação Financeira</label>
        <textarea class="input" id="fe-obs" rows="2">${Utils.esc(f.observacao_financeira||'')}</textarea>
      </div>
    </div>`;
  },

  _pecaRows(pecas) {
    if(!pecas.length) return '<p class="color-tertiary t-sm" style="margin-bottom:8px">Nenhuma peça.</p>';
    return pecas.map((p,i)=>`
      <div class="ficha-editor-row">
        <div class="ficha-editor-row-header">
          <span class="t-sm w-semibold">Peça #${i+1}</span>
          <button class="btn btn-danger btn-xs" onclick="Ficha._rmPeca(${i})">Remover</button>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Descrição</label>
            <input class="input" value="${Utils.esc(p.nome||'')}" oninput="Ficha._draft.pecas[${i}].nome=this.value"></div>
          <div class="form-group"><label class="form-label">Qtd</label>
            <input class="input" type="number" min="1" value="${p.qtd||1}" oninput="Ficha._draft.pecas[${i}].qtd=parseInt(this.value)||1"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Nr. Série</label>
            <input class="input" value="${Utils.esc(p.num_serie||'')}" oninput="Ficha._draft.pecas[${i}].num_serie=this.value"></div>
          <div class="form-group"><label class="form-label">Fornecedor</label>
            <input class="input" value="${Utils.esc(p.fornecedor||'')}" oninput="Ficha._draft.pecas[${i}].fornecedor=this.value"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Custo Unit. (R$)</label>
            <input class="input" type="number" min="0" step="0.01" value="${p.custo||''}" oninput="Ficha._draft.pecas[${i}].custo=parseFloat(this.value)||0"></div>
          <div class="form-group"><label class="form-label">Frete (R$)</label>
            <input class="input" type="number" min="0" step="0.01" value="${p.frete||''}" oninput="Ficha._draft.pecas[${i}].frete=parseFloat(this.value)||0"></div>
        </div>
      </div>`).join('');
  },

  _servRows(servs) {
    if(!servs.length) return '<p class="color-tertiary t-sm" style="margin-bottom:8px">Nenhum serviço.</p>';
    return servs.map((s,i)=>`
      <div class="ficha-editor-row">
        <div class="ficha-editor-row-header">
          <span class="t-sm w-semibold">Serviço #${i+1}</span>
          <button class="btn btn-danger btn-xs" onclick="Ficha._rmServ(${i})">Remover</button>
        </div>
        <div class="form-group"><label class="form-label">Descrição</label>
          <input class="input" value="${Utils.esc(s.nome||'')}" oninput="Ficha._draft.servicos[${i}].nome=this.value"></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Horas</label>
            <input class="input" type="number" min="0.5" step="0.5" value="${s.horas||''}" oninput="Ficha._draft.servicos[${i}].horas=parseFloat(this.value)||0"></div>
          <div class="form-group"><label class="form-label">Valor/h (R$)</label>
            <input class="input" type="number" min="0" step="0.01" value="${s.custo_hora||''}" oninput="Ficha._draft.servicos[${i}].custo_hora=parseFloat(this.value)||0"></div>
        </div>
      </div>`).join('');
  },

  _addPeca() { this._draft.pecas.push({nome:'',qtd:1,num_serie:'',fornecedor:'',custo:0,frete:0}); document.getElementById('fe-pecas').innerHTML=this._pecaRows(this._draft.pecas); },
  _rmPeca(i) { this._draft.pecas.splice(i,1); document.getElementById('fe-pecas').innerHTML=this._pecaRows(this._draft.pecas); },
  _addServ() { this._draft.servicos.push({nome:'',horas:0,custo_hora:0}); document.getElementById('fe-servs').innerHTML=this._servRows(this._draft.servicos); },
  _rmServ(i) { this._draft.servicos.splice(i,1); document.getElementById('fe-servs').innerHTML=this._servRows(this._draft.servicos); },

  _save(id) {
    const ticket = document.getElementById('fe-ticket')?.value.trim()||'';
    const slaH   = parseInt(document.getElementById('fe-sla')?.value)||8;
    const obs    = document.getElementById('fe-obs')?.value.trim()||'';
    const c      = DB.getChamadoById(id);
    const vence  = c ? new Date(new Date(c.data_abertura).getTime()+slaH*3600000).toISOString() : null;

    const r = DB.saveFicha(id,{ ticket_externo:ticket,sla_horas:slaH,sla_vence:vence,
      pecas:this._draft.pecas, servicos:this._draft.servicos, observacao_financeira:obs },
      Auth.user.id, Auth.user.perfil);

    if(!r.ok){ App.showToast(r.msg,'error'); return; }
    Components.closeModal(); App.showToast('Ficha salva.'); Renderer.render();
  },

  _sumPecas(p) { return (p||[]).reduce((s,x)=>(s+(parseFloat(x.custo)||0)*(parseInt(x.qtd)||1)+(parseFloat(x.frete)||0)),0); },
  _sumServs(s) { return (s||[]).reduce((a,x)=>(a+(parseFloat(x.horas)||0)*(parseFloat(x.custo_hora)||0)),0); },
  _sla(vence, status) {
    if(!vence) return {cls:'badge-closed',label:''};
    if(['Resolvido','Fechado'].includes(status)) return {cls:'badge-done',label:''};
    const d=new Date(vence)-Date.now();
    if(d<0)             return {cls:'badge-red',   label:'Vencido —'};
    if(d<7200000)       return {cls:'badge-active', label:'Urgente —'};
    return                     {cls:'badge-done',   label:''};
  },
};
