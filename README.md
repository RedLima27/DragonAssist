# DragonAssist

Sistema de gestão de chamados técnicos com fichas operacionais, controle de acesso por hierarquia e rastreamento completo de atendimentos.

---

## Visão Geral

Aplicação web SPA (Single Page Application) construída com HTML5, CSS3 e JavaScript ES6+ sem dependências externas. Toda a lógica de persistência, autenticação e renderização é resolvida no cliente, tornando o sistema agnóstico a infraestrutura de backend.

---

## Arquitetura

### Separação de responsabilidades

| Camada | Arquivo(s) | Responsabilidade |
|---|---|---|
| Dados | `db.js` | Persistência, validação de enums, isolamento por perfil |
| Autenticação | `app.js` | Sessão, hash de senha, rate limiting |
| Estado | `app.js` | Estado global, roteamento, notificação de subscribers |
| Renderização | `renderer.js` | Guarda de rota, montagem do shell |
| Interface | `pages.js`, `components.js`, `ficha.js` | Páginas e componentes reutilizáveis |
| Utilitários | `utils.js` | Formatação, escape de HTML, paginação |
| Estilo | `css/*.css` | Design system modular por contexto |

### Fluxo de dados

```
Ação do usuário
      |
   pages.js         captura evento, valida input
      |
    db.js           aplica regras de negócio, persiste
      |
   app.js           atualiza estado global
      |
 renderer.js        re-renderiza a interface
```

### Estado global

O módulo `App` em `app.js` centraliza o estado da aplicação. Qualquer componente que precise reagir a mudanças se inscreve via `App.subscribe()`. A navegação entre páginas ocorre via `App.navigate()`, que dispara notificações para todos os subscribers.

### Segurança de rotas

O `renderer.js` intercepta cada renderização e verifica se o usuário possui sessão ativa e nível de permissão adequado antes de montar o conteúdo da página.

---

## Design System

O CSS é dividido em arquivos por contexto, sem redundâncias:

| Arquivo | Conteúdo |
|---|---|
| `tokens.css` | Variáveis de cor, tipografia, espaçamento e forma — fonte única de verdade |
| `base.css` | Reset, utilitários atômicos, animações globais |
| `layout.css` | Shell, sidebar, cabeçalho de página |
| `components.css` | Botões, inputs, cards, badges, tabelas, modais, toast, timeline |
| `pages.css` | Estilos exclusivos de páginas (login, dashboard, detalhe) |
| `ficha.css` | Módulo de ficha técnica operacional |

Valores de `border-radius` limitados a `4px` em toda a interface. Avatares são a única exceção (`border-radius: 9999px`). Nenhum componente usa sombras decorativas.

---

## Hierarquia de Perfis

| Perfil | Descrição | Permissões |
|---|---|---|
| Diretor de Operações | Acesso total ao sistema | Gerencia usuários, visualiza e opera todos os chamados, edita fichas técnicas |
| Operador Técnico | Gestão de atendimentos | Assume chamados, altera status, registra soluções e observações, edita fichas |
| Analista de Suporte | Solicitante | Abre chamados, acompanha os próprios, confirma resolução e encerra |

Regras aplicadas em duas camadas: na UI (elementos ocultados por perfil) e no banco de dados `db.js` (validação antes de qualquer escrita).

---

## Máquina de Estados — Chamados

As transições de status são controladas por uma whitelist explícita. Saltos inválidos são rejeitados antes de qualquer escrita no banco.

```
Aberto
  |-- Em Atendimento
  |     |-- Pendente
  |     |     `-- Em Atendimento
  |     `-- Resolvido
  |           `-- Fechado  (somente o solicitante)
  |-- Pendente
  `-- Resolvido
```

---

## Segurança

**Autenticação**
- Senhas armazenadas como hash SHA-256 via Web Crypto API nativa
- Sessão persistida por ID do usuário — perfil sempre relido do banco, nunca do localStorage
- Bloqueio automático após 5 tentativas consecutivas de login incorretas (duração: 5 minutos)

**Autorização**
- Isolamento de dados por perfil na camada de banco (`db.js`)
- Validação de enums em todas as operações de escrita
- Sanitização de inputs via `Utils.esc()` para prevenção de XSS

---

## Ficha Técnica

Cada chamado possui uma ficha operacional preenchida por operadores e diretores:

| Campo | Descrição |
|---|---|
| Ticket Externo | Referência para sistemas de terceiros |
| SLA | Prazo de atendimento em horas com indicador de vencimento |
| Peças e Equipamentos | Descrição, quantidade, número de série, fornecedor, custo e frete |
| Serviços | Descrição, horas trabalhadas, valor por hora |
| Custo Total | Calculado automaticamente a partir de peças e serviços |
| Observação Financeira | Campo livre para número de PO, aprovações e referências contratuais |

---

## Como Executar

O sistema não requer instalação de dependências, compilação ou servidor de aplicação.

**Live Server (recomendado para desenvolvimento)**

Abra a pasta no Visual Studio Code e use a extensão Live Server (ritwickdey.LiveServer). Clique com o botão direito em `index.html` e selecione "Open with Live Server".

**Python**

```bash
python -m http.server 8080
```

**Node.js**

```bash
npx serve .
```

Abrir `index.html` via `file://` pode não funcionar em alguns navegadores devido a restrições de `localStorage`. O uso de um servidor local é recomendado.

---

## Contas de Demonstração

| E-mail | Senha | Perfil |
|---|---|---|
| rafael@dragonassist.com | Admin@123 | Diretor de Operações |
| carlos@dragonassist.com | Tech@123 | Operador Técnico |
| maria@dragonassist.com | Tech@123 | Operador Técnico |
| joao@empresa.com | User@123 | Analista de Suporte |
| ana@empresa.com | User@123 | Analista de Suporte |

Caso o login falhe após atualizar os arquivos, clique em "Redefinir dados de demonstração" na tela de login para limpar o `localStorage` e restaurar o dataset padrão.

---

## Estrutura de Arquivos

```
/
├── index.html
├── img/
│   └── logo.png
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── pages.css
│   └── ficha.css
└── js/
    ├── db.js
    ├── app.js
    ├── utils.js
    ├── components.js
    ├── ficha.js
    ├── pages.js
    └── renderer.js
```

---

## Stack

- JavaScript ES6+ (sem frameworks, sem transpiler)
- CSS3 com Custom Properties
- Web Storage API para persistência
- SubtleCrypto API para hashing (SHA-256)
- Google Fonts: Inter e JetBrains Mono
