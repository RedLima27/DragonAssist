// utils.js — formatação, mapeamentos de classe CSS, paginação
const Utils = {
  fmtDate(d)      { if(!d)return'—'; return new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); },
  fmtDateShort(d) { if(!d)return'—'; return new Date(d).toLocaleDateString('pt-BR'); },
  fmtBRL(v)       { return 'R$ '+(parseFloat(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2}); },
  timeAgo(d) {
    if(!d)return''; const m=Math.floor((Date.now()-new Date(d))/60000);
    if(m<1)return'agora'; if(m<60)return`${m}min`; const h=Math.floor(m/60);
    if(h<24)return`${h}h atrás`; return`${Math.floor(h/24)}d atrás`;
  },
  initials(n='') { return n.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase(); },
  avatarBg(id)   { return['#7f1d1d','#991b1b','#b91c1c','#c2410c','#9a3412','#78350f'][(id||0)%6]; },

  // Mapeia status → classe CSS badge
  statusBadgeClass(s) {
    return { 'Aberto':'badge-open','Em Atendimento':'badge-active','Pendente':'badge-pending',
             'Resolvido':'badge-done','Fechado':'badge-closed' }[s]||'badge-closed';
  },
  // Mapeia prioridade → classe CSS
  prioClass(p) { return { Alta:'prio-high', Média:'prio-medium', Baixa:'prio-low' }[p]||''; },

  // Cor do ponto na timeline por ação
  tlDotColor(a) {
    return { 'Chamado aberto':'#60a5fa','Operador assumiu':'#fbbf24','Status alterado':'#c084fc',
             'Observação técnica':'#52525b','Solução registrada':'#4ade80','Chamado fechado':'#27272a' }[a]||'#27272a';
  },

  esc(s)           { if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); },
  statusBadge(s)   { return `<span class="badge ${Utils.statusBadgeClass(s)}">${Utils.esc(s)}</span>`; },
  prioBadge(p)     { return `<span class="${Utils.prioClass(p)} w-semibold t-sm">${Utils.esc(p)}</span>`; },
  paginate(arr,pg,per) { const s=(pg-1)*per; return{items:arr.slice(s,s+per),total:arr.length,pages:Math.ceil(arr.length/per)}; },
};
