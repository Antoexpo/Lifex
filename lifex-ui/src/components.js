// global state placeholder
export const state = { session:{ role:"admin", name:"Demo User" } };

// Component helpers
export function Topbar() {
  return `\
    <div class="brand">
      <img src="../public/logo.svg" alt="Life Luxury" width="32" height="32"/>
      <span>Life Luxury — LIFEX</span>
    </div>
    <div class="actions">
      <button id="sidebar-toggle" aria-label="Toggle menu">
        <svg width="24" height="24"><use href="../public/icons.svg#dashboard"></use></svg>
      </button>
      <button aria-label="Search">
        <svg width="24" height="24"><use href="../public/icons.svg#search"></use></svg>
      </button>
      <span>${state.session?.name || ''}</span>
    </div>
  `;
}

export function Sidebar(active) {
  const links = [
    {hash:'#/dashboard', icon:'dashboard', label:'Dashboard'},
    {hash:'#/members', icon:'users', label:'Membri'},
    {hash:'#/vehicles', icon:'car', label:'Veicoli'},
    {hash:'#/orders', icon:'orders', label:'Ordini'},
    {hash:'#/payouts', icon:'euro', label:'Pagamenti'},
    {hash:'#/settings', icon:'settings', label:'Impostazioni'}
  ];
  return `<nav class="nav">
    ${links.map(l=>`<a href="${l.hash}" class="${active===l.hash?'active':''}"><svg width="20" height="20"><use href="../public/icons.svg#${l.icon}"></use></svg><span>${l.label}</span></a>`).join('')}
  </nav>`;
}

export const Card = (title, content) => `<div class="card"><h3>${title}</h3>${content}</div>`;

export const Badge = (type, text) => `<span class="badge ${type}">${text}</span>`;

export const Button = (variant, label, attrs='') => `<button class="btn ${variant}" ${attrs}>${label}</button>`;

export function Table(columns, rows, opts={}) {
  const headers = columns.map(c=>`<th data-key="${c.key}">${c.label}</th>`).join('');
  const body = rows.map(r=>`<tr>${columns.map(c=>`<td>${r[c.key]??''}</td>`).join('')}</tr>`).join('');
  return `<table class="table" ${opts.id?`id="${opts.id}"`:''}><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
}

export const FormField = (label,name,value='',type='text') => `\
  <label>${label}<br><input class="input" name="${name}" type="${type}" value="${value}"/></label>`;

export function Modal(id,title,bodyHTML,actionsHTML){
  return `\
    <div class="dialog" role="dialog" aria-modal="true" id="${id}">
      <header>${title}</header>
      <div class="body">${bodyHTML}</div>
      <div class="actions">${actionsHTML}</div>
    </div>`;
}

export function formatCurrency(eur){
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(eur);
}

export function statusBadge(status){
  const map={
    'attivo':'ok','disponibile':'ok','pagato':'ok',
    'sospeso':'warn','noleggiato':'warn','in_attesa':'warn','programmato':'warn',
    'scaduto':'err','manutenzione':'err','rimborsato':'err'
  };
  return Badge(map[status]||'gold',status);
}

