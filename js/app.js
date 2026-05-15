const Auth = (() => {
  const KEY = 'dragonassist_session';
  const get  = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const set  = u  => localStorage.setItem(KEY, JSON.stringify(u));
  const clear= ()  => localStorage.removeItem(KEY);

  return {
    get user() {
      const s = get(); if (!s?.id) return null;
      const db = DB.findUserById(s.id);
      if (!db || !db.ativo) { clear(); return null; }
      return { ...s, perfil: db.perfil, nome: db.nome };
    },
    get isDiretor()  { return this.user?.perfil === 'diretor'; },
    get isOperador() { const p = this.user?.perfil; return p === 'operador' || p === 'diretor'; },

    async login(email, senha) {
      const lock = DB.checkLock(email);
      if (lock.locked) return { ok:false, msg:`Conta bloqueada. Tente em ${lock.secsLeft}s.` };

      const u = DB._findRaw(email);
      if (!u) { await Crypto.hash(senha); return { ok:false, msg:'Credenciais inválidas' }; }

      const match = await Crypto.hash(senha) === u.senhaHash;
      if (!match) {
        DB.recordFail(email);
        const l = DB.checkLock(email);
        if (l.locked) return { ok:false, msg:'Conta bloqueada por 5 minutos.' };
        return { ok:false, msg:`Credenciais inválidas. ${Math.max(0, 5 - u.loginAttempts)} tentativa(s) restante(s).` };
      }

      DB.recordSuccess(email);
      set({ id: u.id });
      return { ok:true };
    },

    async register(nome, email, senha, perfil) {
      if (!nome?.trim() || !email?.trim() || !senha) return { ok:false, msg:'Preencha todos os campos' };
      if (senha.length < 6)                           return { ok:false, msg:'Senha mínima: 6 caracteres' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok:false, msg:'E-mail inválido' };
      const u = await DB.createUser({ nome, email, senha, perfil });
      if (!u) return { ok:false, msg:'E-mail já cadastrado' };
      set({ id: u.id });
      return { ok:true };
    },

    logout() { clear(); },
  };
})();

const App = (() => {
  let _s = {
    page:'login', loginTab:'login', chamadoId:null,
    filtros:{ status:'', prioridade:'', categoria:'', busca:'' },
    toast:null,
  };
  const subs = [];
  const notify = () => subs.forEach(f => f(_s));

  return {
    get state() { return _s; },
    subscribe(f) { subs.push(f); },
    navigate(page, extra={}) {
      _s = { ..._s, page, ...extra };
      if (page !== 'detalhe') _s.chamadoId = null;
      notify(); window.scrollTo(0,0);
    },
    setFiltro(k, v) {
      _s.filtros = { ..._s.filtros, [k]: _s.filtros[k] === v ? '' : v };
      if (k !== 'busca') notify();
    },
    showToast(msg, tipo='success') {
      _s.toast = { msg, tipo }; notify();
      setTimeout(() => { _s.toast = null; notify(); }, 3400);
    },
  };
})();
