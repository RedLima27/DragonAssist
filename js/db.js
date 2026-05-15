
const Crypto = {
  async hash(str) {
    const encoded = new TextEncoder().encode(str);
    const buf     = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
};

/*
 * ENUM: fonte única de verdade para valores permitidos.
 * Qualquer dado entrando no banco é validado contra estas listas.
 * Alterar aqui reflete automaticamente em toda a aplicação.
 */
const ENUM = {
  // Perfis públicos (cadastro via formulário não pode criar 'diretor')
  perfil:        ['analista', 'operador', 'diretor'],
  perfilPublico: ['analista', 'operador'],

  // Labels de exibição para cada perfil
  perfilLabel: {
    diretor:  'Diretor de Operações',
    operador: 'Operador Técnico',
    analista: 'Analista de Suporte',
  },

  categoria:  ['Hardware', 'Software', 'Rede'],
  prioridade: ['Baixa', 'Média', 'Alta'],
  status:     ['Aberto', 'Em Atendimento', 'Pendente', 'Resolvido', 'Fechado'],

  /*
   * Máquina de estados: define quais transições são permitidas por status.
   * Impede saltos inválidos (ex: Fechado → Aberto) sem passar pelo banco.
   */
  transicoes: {
    'Aberto':         ['Em Atendimento', 'Pendente', 'Resolvido'],
    'Em Atendimento': ['Pendente', 'Resolvido'],
    'Pendente':       ['Em Atendimento', 'Resolvido'],
    'Resolvido':      ['Fechado'],
    'Fechado':        [],
  },

  // Ações válidas no histórico — enum garante integridade do audit trail
  acao: [
    'Chamado aberto',
    'Operador assumiu',
    'Status alterado',
    'Observação técnica',
    'Solução registrada',
    'Chamado fechado',
  ],
};

const DB = (() => {
  const STORAGE_KEY = 'dragonassist_v2';

  /*
   * Hashes SHA-256 pré-computados das senhas do seed.
   * Gerados via: node -e "require('crypto').createHash('sha256').update('Admin@123').digest('hex')"
   * Em runtime, o login recalcula e compara — nunca armazena texto puro.
   */
  const SEED_HASHES = {
    admin: 'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7', // Admin@123
    tech:  'ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99', // Tech@123
    user:  '3e7c19576488862816f13b512cacf3e4ba97dd97243ea0bd6a2ad1642d86ba72', // User@123
  };

  // Dataset inicial — carregado quando não há dados no localStorage
  const defaultData = {
    usuarios: [
      { id:1, nome:'Rafael Mendes',   email:'rafael@dragonassist.com',  senhaHash:SEED_HASHES.admin, perfil:'diretor',  ativo:true, criado:'2024-01-01T00:00:00', loginAttempts:0, lockedUntil:null },
      { id:2, nome:'Carlos Oliveira', email:'carlos@dragonassist.com',  senhaHash:SEED_HASHES.tech,  perfil:'operador', ativo:true, criado:'2024-01-05T00:00:00', loginAttempts:0, lockedUntil:null },
      { id:3, nome:'Maria Santos',    email:'maria@dragonassist.com',   senhaHash:SEED_HASHES.tech,  perfil:'operador', ativo:true, criado:'2024-01-08T00:00:00', loginAttempts:0, lockedUntil:null },
      { id:4, nome:'João Silva',      email:'joao@empresa.com',         senhaHash:SEED_HASHES.user,  perfil:'analista', ativo:true, criado:'2024-02-01T00:00:00', loginAttempts:0, lockedUntil:null },
      { id:5, nome:'Ana Costa',       email:'ana@empresa.com',          senhaHash:SEED_HASHES.user,  perfil:'analista', ativo:true, criado:'2024-02-10T00:00:00', loginAttempts:0, lockedUntil:null },
    ],
    chamados: [
      {
        id:1, titulo:'Computador não liga após queda de energia',
        descricao:'Após a queda de energia, o equipamento parou de responder. Cabo e tomada verificados — funcionam com outros dispositivos.',
        categoria:'Hardware', prioridade:'Alta', status:'Em Atendimento',
        solucao:null, usuario_id:4, tecnico_id:2,
        data_abertura:'2024-06-01T09:15:00', data_resolucao:null,
        ficha:{ ticket_externo:'TKT-2024-0891', sla_horas:8, sla_vence:'2024-06-01T17:15:00',
          pecas:[{ nome:'Fonte ATX 600W', qtd:1, num_serie:'FNT-TX600-2241', fornecedor:'TechSuprimentos Ltda', custo:189.90, frete:25.00 }],
          servicos:[], custo_total:214.90, observacao_financeira:'Aprovado pelo gestor em 01/06' },
      },
      {
        id:2, titulo:'Erro de acesso negado no sistema de RH',
        descricao:'Módulo de ponto eletrônico retorna HTTP 403 ao tentar acessar. Funcionava corretamente até sexta-feira.',
        categoria:'Software', prioridade:'Alta', status:'Aberto',
        solucao:null, usuario_id:5, tecnico_id:null,
        data_abertura:'2024-06-03T11:30:00', data_resolucao:null,
        ficha:{ ticket_externo:'', sla_horas:4, sla_vence:'2024-06-03T15:30:00',
          pecas:[], servicos:[], custo_total:0, observacao_financeira:'' },
      },
      {
        id:3, titulo:'Degradação de throughput — rede 3º andar (ala norte)',
        descricao:'Download medido em 0.8 Mbps contra SLA de 50 Mbps. Afeta todos os 12 terminais da ala norte.',
        categoria:'Rede', prioridade:'Média', status:'Pendente',
        solucao:null, usuario_id:4, tecnico_id:3,
        data_abertura:'2024-05-28T14:00:00', data_resolucao:null,
        ficha:{ ticket_externo:'TKT-2024-0854', sla_horas:24, sla_vence:'2024-05-29T14:00:00',
          pecas:[{ nome:'Switch Gerenciado 24p', qtd:1, num_serie:'SW-MG24-8831', fornecedor:'NetDistrib S.A.', custo:1250.00, frete:85.00 }],
          servicos:[{ nome:'Configuração de rede', horas:2, custo_hora:150.00 }],
          custo_total:1635.00, observacao_financeira:'Aguardando PO financeiro' },
      },
      {
        id:4, titulo:'Impressora HP LaserJet — falha no reconhecimento de cartucho',
        descricao:'Cartucho 85A original instalado, firmware reporta "Cartucho incompatível".',
        categoria:'Hardware', prioridade:'Baixa', status:'Resolvido',
        solucao:'Reset de firmware via modo de manutenção (cancelar + power). Cartucho reconhecido após ciclo de reset.',
        usuario_id:5, tecnico_id:2,
        data_abertura:'2024-05-20T10:00:00', data_resolucao:'2024-05-21T16:00:00',
        ficha:{ ticket_externo:'TKT-2024-0720', sla_horas:48, sla_vence:'2024-05-22T10:00:00',
          pecas:[{ nome:'Cartucho HP 85A Original', qtd:1, num_serie:'', fornecedor:'HP Store Brasil', custo:89.00, frete:0 }],
          servicos:[{ nome:'Visita técnica presencial', horas:1, custo_hora:120.00 }],
          custo_total:209.00, observacao_financeira:'Concluído dentro do SLA' },
      },
      {
        id:5, titulo:'VPN corporativa — falha de autenticação pós-atualização Windows',
        descricao:'Cisco AnyConnect retorna "Authentication failed" após KB5034127. Afeta todos os usuários remotos.',
        categoria:'Rede', prioridade:'Alta', status:'Fechado',
        solucao:'Desinstalado AnyConnect 4.10, instalado 5.0.04032. Certificado raiz atualizado via GPO.',
        usuario_id:4, tecnico_id:3,
        data_abertura:'2024-05-15T08:45:00', data_resolucao:'2024-05-16T09:00:00',
        ficha:{ ticket_externo:'TKT-2024-0699', sla_horas:4, sla_vence:'2024-05-15T12:45:00',
          pecas:[], servicos:[{ nome:'Reconfiguração VPN / Certificado', horas:1.5, custo_hora:150.00 }],
          custo_total:225.00, observacao_financeira:'Cobrado via contrato de suporte N° CS-2024-011' },
      },
      {
        id:6, titulo:'Excel 365 — travamento ao processar planilha de alta densidade',
        descricao:'Planilha com 50.000 linhas congela a aplicação após ~30s. Memória disponível: 8 GB RAM.',
        categoria:'Software', prioridade:'Média', status:'Aberto',
        solucao:null, usuario_id:5, tecnico_id:null,
        data_abertura:'2024-06-04T15:00:00', data_resolucao:null,
        ficha:{ ticket_externo:'', sla_horas:8, sla_vence:'2024-06-04T23:00:00',
          pecas:[], servicos:[], custo_total:0, observacao_financeira:'' },
      },
    ],
    historico: [
      { id:1,  chamado_id:1, autor_id:4, acao:'Chamado aberto',     descricao:'Chamado registrado por João Silva',                                                data:'2024-06-01T09:15:00' },
      { id:2,  chamado_id:1, autor_id:2, acao:'Operador assumiu',   descricao:'Carlos Oliveira assumiu o atendimento',                                            data:'2024-06-01T10:00:00' },
      { id:3,  chamado_id:1, autor_id:2, acao:'Status alterado',    descricao:'Aberto → Em Atendimento',                                                          data:'2024-06-01T10:05:00' },
      { id:4,  chamado_id:1, autor_id:2, acao:'Observação técnica', descricao:'Fonte de alimentação com defeito confirmado. Aguardando peça (ATX 600W).',         data:'2024-06-01T14:30:00' },
      { id:5,  chamado_id:3, autor_id:4, acao:'Chamado aberto',     descricao:'Chamado registrado por João Silva',                                                data:'2024-05-28T14:00:00' },
      { id:6,  chamado_id:3, autor_id:3, acao:'Operador assumiu',   descricao:'Maria Santos assumiu o atendimento',                                               data:'2024-05-29T09:00:00' },
      { id:7,  chamado_id:3, autor_id:3, acao:'Status alterado',    descricao:'Aberto → Pendente — aguardando substituição de switch',                            data:'2024-05-29T11:00:00' },
      { id:8,  chamado_id:4, autor_id:5, acao:'Chamado aberto',     descricao:'Chamado registrado por Ana Costa',                                                 data:'2024-05-20T10:00:00' },
      { id:9,  chamado_id:4, autor_id:2, acao:'Operador assumiu',   descricao:'Carlos Oliveira assumiu o atendimento',                                            data:'2024-05-20T11:00:00' },
      { id:10, chamado_id:4, autor_id:2, acao:'Solução registrada', descricao:'Reset de firmware aplicado. Cartucho reconhecido.',                                data:'2024-05-21T16:00:00' },
      { id:11, chamado_id:4, autor_id:2, acao:'Status alterado',    descricao:'Em Atendimento → Resolvido',                                                       data:'2024-05-21T16:05:00' },
      { id:12, chamado_id:5, autor_id:4, acao:'Chamado aberto',     descricao:'Chamado registrado por João Silva',                                                data:'2024-05-15T08:45:00' },
      { id:13, chamado_id:5, autor_id:3, acao:'Operador assumiu',   descricao:'Maria Santos assumiu o atendimento',                                               data:'2024-05-15T09:30:00' },
      { id:14, chamado_id:5, autor_id:3, acao:'Solução registrada', descricao:'AnyConnect 5.0 instalado. Certificado atualizado via GPO.',                        data:'2024-05-16T08:30:00' },
      { id:15, chamado_id:5, autor_id:3, acao:'Status alterado',    descricao:'Em Atendimento → Resolvido',                                                       data:'2024-05-16T08:35:00' },
      { id:16, chamado_id:5, autor_id:4, acao:'Chamado fechado',    descricao:'Solicitante confirmou resolução e encerrou o chamado',                             data:'2024-05-16T09:00:00' },
      { id:17, chamado_id:6, autor_id:5, acao:'Chamado aberto',     descricao:'Chamado registrado por Ana Costa',                                                 data:'2024-06-04T15:00:00' },
    ],
    nextIds: { usuario:6, chamado:7, historico:18 },
  };

  // Carrega do localStorage; se corrompido ou ausente, usa defaultData
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultData));
    } catch {
      return JSON.parse(JSON.stringify(defaultData));
    }
  }

  function persist(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

  // Sanitiza string: remove whitespace das extremidades e limita tamanho
  function sanitize(s, max = 500) {
    return typeof s === 'string' ? s.trim().slice(0, max) : '';
  }

  // Lança erro descritivo se o valor não constar na whitelist
  function assertEnum(value, list, field) {
    if (!list.includes(value))
      throw new Error(`Valor inválido para "${field}": recebido "${value}", esperado um de [${list.join(', ')}]`);
  }

  // Remove campos sensíveis antes de retornar um usuário para a UI
  function publicUser(u) {
    if (!u) return null;
    const { senhaHash, loginAttempts, lockedUntil, ...safe } = u;
    return safe;
  }

  let _d = load();

  return {
    ENUM,

    // Restaura o dataset padrão — útil para reset de demonstração
    reset() {
      _d = JSON.parse(JSON.stringify(defaultData));
      persist(_d);
    },

    // ── Usuários ───────────────────────────────────────────────────

    /*
     * _findRaw: retorna o objeto completo com senhaHash.
     * Uso restrito ao módulo de autenticação (app.js).
     * Não deve ser chamado de páginas ou componentes.
     */
    _findRaw(email) {
      return _d.usuarios.find(
        u => u.email === sanitize(email).toLowerCase() && u.ativo
      ) || null;
    },

    findUserById(id) { return publicUser(_d.usuarios.find(u => u.id === id) || null); },
    getAllUsers()     { return _d.usuarios.map(publicUser); },

    // Verifica se a conta está bloqueada por tentativas excessivas
    checkLock(email) {
      const u = _d.usuarios.find(u => u.email === sanitize(email).toLowerCase());
      if (!u) return { locked: false };
      if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) {
        const secsLeft = Math.ceil((new Date(u.lockedUntil) - Date.now()) / 1000);
        return { locked: true, secsLeft };
      }
      return { locked: false };
    },

    // Incrementa contador de falhas; bloqueia após 5 tentativas
    recordFail(email) {
      const u = _d.usuarios.find(u => u.email === sanitize(email).toLowerCase());
      if (!u) return;
      u.loginAttempts = (u.loginAttempts || 0) + 1;
      if (u.loginAttempts >= 5)
        u.lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      persist(_d);
    },

    // Reseta contadores após login bem-sucedido
    recordSuccess(email) {
      const u = _d.usuarios.find(u => u.email === sanitize(email).toLowerCase());
      if (!u) return;
      u.loginAttempts = 0;
      u.lockedUntil   = null;
      persist(_d);
    },

    /*
     * createUser: perfil forçado via whitelist perfilPublico.
     * O diretor só pode ser criado pelo painel administrativo
     * (que bypassa essa restrição explicitamente).
     */
    async createUser({ nome, email, senha, perfil, forcePerfile = false }) {
      const perfilFinal = forcePerfile && ENUM.perfil.includes(perfil)
        ? perfil
        : (ENUM.perfilPublico.includes(perfil) ? perfil : 'analista');

      const em = sanitize(email).toLowerCase();
      if (_d.usuarios.find(u => u.email === em)) return null;

      const senhaHash = await Crypto.hash(senha);
      const u = {
        id: _d.nextIds.usuario++,
        nome: sanitize(nome, 120),
        email: em,
        senhaHash,
        perfil: perfilFinal,
        ativo: true,
        criado: new Date().toISOString(),
        loginAttempts: 0,
        lockedUntil: null,
      };
      _d.usuarios.push(u);
      persist(_d);
      return publicUser(u);
    },

    toggleUserAtivo(id) {
      const u = _d.usuarios.find(u => u.id === id);
      if (!u) return null;
      u.ativo = !u.ativo;
      persist(_d);
      return publicUser(u);
    },

    deleteUser(id) {
      const i = _d.usuarios.findIndex(u => u.id === id);
      if (i < 0) return false;
      _d.usuarios.splice(i, 1);
      persist(_d);
      return true;
    },

    // ── Chamados ───────────────────────────────────────────────────

    /*
     * getChamados: aplica isolamento por perfil antes de qualquer filtro.
     * Analista enxerga apenas os próprios chamados.
     * Operador e Diretor enxergam todos.
     */
    getChamados({ usuario_id, perfil, status, prioridade, categoria, busca } = {}) {
      let list = [..._d.chamados];

      if (perfil === 'analista') list = list.filter(c => c.usuario_id === usuario_id);

      if (status     && ENUM.status.includes(status))         list = list.filter(c => c.status === status);
      if (prioridade && ENUM.prioridade.includes(prioridade)) list = list.filter(c => c.prioridade === prioridade);
      if (categoria  && ENUM.categoria.includes(categoria))   list = list.filter(c => c.categoria === categoria);

      if (busca) {
        const b = sanitize(busca, 200).toLowerCase();
        list = list.filter(c =>
          c.titulo.toLowerCase().includes(b) ||
          c.descricao.toLowerCase().includes(b)
        );
      }

      return list.sort((a, b) => new Date(b.data_abertura) - new Date(a.data_abertura));
    },

    getChamadoById(id) {
      return _d.chamados.find(c => c.id === Number(id)) || null;
    },

    createChamado({ titulo, descricao, categoria, prioridade, usuario_id }) {
      assertEnum(categoria,  ENUM.categoria,  'categoria');
      assertEnum(prioridade, ENUM.prioridade, 'prioridade');

      const c = {
        id: _d.nextIds.chamado++,
        titulo:    sanitize(titulo, 200),
        descricao: sanitize(descricao, 3000),
        categoria,
        prioridade,
        status:    'Aberto',
        solucao:   null,
        usuario_id,
        tecnico_id:     null,
        data_abertura:  new Date().toISOString(),
        data_resolucao: null,
        ficha: {
          ticket_externo: '', sla_horas: 8, sla_vence: null,
          pecas: [], servicos: [], custo_total: 0, observacao_financeira: '',
        },
      };
      _d.chamados.push(c);
      persist(_d);
      return c;
    },

    /*
     * updateChamadoStatus: valida enum + transição + autorização.
     * Três camadas de proteção antes de qualquer escrita.
     */
    updateChamadoStatus(id, status, uid, perfil) {
      assertEnum(status, ENUM.status, 'status');

      const c = _d.chamados.find(c => c.id === Number(id));
      if (!c) return { ok: false, msg: 'Chamado não encontrado' };

      const permitidos = ENUM.transicoes[c.status] || [];
      if (!permitidos.includes(status))
        return { ok: false, msg: `Transição "${c.status}" → "${status}" não permitida` };

      if (status === 'Fechado') {
        if (c.usuario_id !== uid && perfil !== 'diretor')
          return { ok: false, msg: 'Apenas o solicitante pode fechar o chamado' };
      } else {
        if (!['operador', 'diretor'].includes(perfil))
          return { ok: false, msg: 'Permissão insuficiente' };
        if (perfil === 'operador' && c.tecnico_id !== uid)
          return { ok: false, msg: 'Você não é o operador responsável por este chamado' };
      }

      c.status = status;
      if (['Resolvido', 'Fechado'].includes(status))
        c.data_resolucao = new Date().toISOString();

      persist(_d);
      return { ok: true, chamado: c };
    },

    assumirChamado(id, uid, perfil) {
      if (!['operador', 'diretor'].includes(perfil))
        return { ok: false, msg: 'Permissão insuficiente' };

      const c = _d.chamados.find(c => c.id === Number(id));
      if (!c) return { ok: false, msg: 'Chamado não encontrado' };
      if (c.tecnico_id) return { ok: false, msg: 'Chamado já possui responsável' };

      c.tecnico_id = uid;
      c.status     = 'Em Atendimento';
      persist(_d);
      return { ok: true, chamado: c };
    },

    registrarSolucao(id, solucao, uid, perfil) {
      if (!['operador', 'diretor'].includes(perfil))
        return { ok: false, msg: 'Permissão insuficiente' };

      const c = _d.chamados.find(c => c.id === Number(id));
      if (!c) return { ok: false, msg: 'Chamado não encontrado' };
      if (perfil === 'operador' && c.tecnico_id !== uid)
        return { ok: false, msg: 'Você não é o operador responsável' };
      if (['Resolvido', 'Fechado'].includes(c.status))
        return { ok: false, msg: 'Chamado já encerrado' };

      c.solucao         = sanitize(solucao, 3000);
      c.status          = 'Resolvido';
      c.data_resolucao  = new Date().toISOString();
      persist(_d);
      return { ok: true, chamado: c };
    },

    addObservacao(id, descricao, uid, perfil) {
      if (!['operador', 'diretor'].includes(perfil))
        return { ok: false, msg: 'Permissão insuficiente' };

      const c = _d.chamados.find(c => c.id === Number(id));
      if (!c) return { ok: false, msg: 'Chamado não encontrado' };
      if (perfil === 'operador' && c.tecnico_id !== uid)
        return { ok: false, msg: 'Você não é o operador responsável' };
      if (c.status === 'Fechado')
        return { ok: false, msg: 'Chamado encerrado — não é possível adicionar observações' };

      return this.addHistorico({ chamado_id: id, autor_id: uid, acao: 'Observação técnica', descricao });
    },

    // Persiste a ficha técnica, recalculando custo total automaticamente
    saveFicha(id, ficha, uid, perfil) {
      if (!['operador', 'diretor'].includes(perfil))
        return { ok: false, msg: 'Permissão insuficiente' };

      const c = _d.chamados.find(c => c.id === Number(id));
      if (!c) return { ok: false, msg: 'Chamado não encontrado' };
      if (perfil === 'operador' && c.tecnico_id && c.tecnico_id !== uid)
        return { ok: false, msg: 'Você não é o operador responsável' };

      const custoPecas = (ficha.pecas || []).reduce((acc, p) => {
        return acc + (parseFloat(p.custo) || 0) * (parseInt(p.qtd) || 1) + (parseFloat(p.frete) || 0);
      }, 0);

      const custoServicos = (ficha.servicos || []).reduce((acc, s) => {
        return acc + (parseFloat(s.horas) || 0) * (parseFloat(s.custo_hora) || 0);
      }, 0);

      c.ficha = { ...ficha, custo_total: Math.round((custoPecas + custoServicos) * 100) / 100 };
      persist(_d);
      return { ok: true, ficha: c.ficha };
    },

    // ── Histórico ──────────────────────────────────────────────────

    getHistorico(chamado_id) {
      return _d.historico
        .filter(h => h.chamado_id === Number(chamado_id))
        .sort((a, b) => new Date(a.data) - new Date(b.data));
    },

    addHistorico({ chamado_id, autor_id, acao, descricao }) {
      // Ação fora do enum é descartada silenciosamente (não quebra o fluxo)
      if (!ENUM.acao.includes(acao)) return null;

      const h = {
        id:         _d.nextIds.historico++,
        chamado_id: Number(chamado_id),
        autor_id,
        acao,
        descricao:  sanitize(descricao, 1000),
        data:       new Date().toISOString(),
      };
      _d.historico.push(h);
      persist(_d);
      return h;
    },

    // ── Estatísticas ───────────────────────────────────────────────

    getStats(uid, perfil) {
      let list = _d.chamados;
      if (perfil === 'analista') list = list.filter(c => c.usuario_id === uid);

      return {
        total:      list.length,
        ativos:     list.filter(c => !['Resolvido', 'Fechado'].includes(c.status)).length,
        resolvidos: list.filter(c => ['Resolvido', 'Fechado'].includes(c.status)).length,
        alta:       list.filter(c => c.prioridade === 'Alta' && !['Resolvido', 'Fechado'].includes(c.status)).length,
        porCategoria: ENUM.categoria.map(cat => ({
          cat, total: list.filter(c => c.categoria === cat).length,
        })),
        porStatus: ENUM.status.map(st => ({
          st, total: list.filter(c => c.status === st).length,
        })),
      };
    },
  };
})();
