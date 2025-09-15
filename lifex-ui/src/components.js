// global state placeholder
export const state = { session:{ role:"admin", name:"Demo User" }, cart:{ items:[], open:false } };

// Utility helpers
export function extractDigits(str=''){
  return (str ?? '').toString().replace(/\D/g,'');
}

export function padRight(str='', len=0, char='0'){
  return (str ?? '').toString().padEnd(len, char).slice(0, len);
}

export function formatCurrency(eur){
  const value = Number.isFinite(eur) ? eur : 0;
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(value);
}

export function generateClientCode({fiscalCode='', year}){
  const digits = extractDigits(fiscalCode);
  let suffix = '';
  if(digits.length >= 6){
    suffix = digits.slice(-6);
  } else if(digits.length > 0){
    suffix = padRight(digits, 6, '0');
  } else {
    suffix = Array.from({length:6},()=>Math.floor(Math.random()*10)).join('');
  }
  const referenceYear = year ?? new Date().getFullYear();
  return `LLX${referenceYear}${suffix}`;
}

// Component helpers
export function Topbar() {
  return `
    <div class="brand">
      <img src="../public/logo.svg" alt="Life Luxury" width="32" height="32"/>
      <span>Life Luxury — LIFEX</span>
    </div>
    <div class="actions">
      <button id="sidebar-toggle" aria-label="Toggle menu">
        <svg width="24" height="24"><use href="../public/icons.svg#dashboard"></use></svg>
      </button>
      <div id="mini-cart">${MiniCart(state.cart)}</div>
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
    {hash:'#/network', icon:'users', label:'Albero Generazioni'},
    {hash:'#/catalog', icon:'orders', label:'Catalogo'},
    {hash:'#/vehicles', icon:'car', label:'Veicoli'},
    {hash:'#/wallet', icon:'euro', label:'Conto Interno'},
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

export const Banner = (message, variant='info') => `<div class="banner ${variant}">${message}</div>`;

export const Button = (variant, label, attrs='') => `<button class="btn ${variant}" ${attrs}>${label}</button>`;

export function MiniCart(cart={items:[], open:false}){
  const items = Array.isArray(cart.items) ? cart.items : [];
  const count = items.reduce((sum,item)=>sum+(item.qty||0),0);
  const total = items.reduce((sum,item)=>sum+(item.qty||0)*(item.priceEUR||0),0);
  const list = items.map(item=>`
      <li data-sku="${item.sku}">
        <div class="info">
          <strong>${item.name}</strong>
          <span>${item.qty} × ${formatCurrency(item.priceEUR)}</span>
        </div>
        <button class="btn ghost mini-cart-remove" data-sku="${item.sku}" aria-label="Rimuovi ${item.name}">&times;</button>
      </li>
    `).join('');
  return `
    <div class="mini-cart ${cart.open?'open':''}">
      <button class="btn ghost mini-cart-toggle" aria-haspopup="true" aria-expanded="${cart.open?'true':'false'}">
        <svg width="24" height="24"><use href="../public/icons.svg#orders"></use></svg>
        <span class="mini-cart-count">${count}</span>
      </button>
      <div class="mini-cart-dropdown ${cart.open?'open':''}">
        ${count ? `<ul>${list}</ul><div class="mini-cart-total">Totale: ${formatCurrency(total)}</div><button class="btn gold mini-cart-checkout">Procedi all'ordine</button>` : '<p class="muted">Nessun prodotto nel carrello</p>'}
      </div>
    </div>
  `;
}

export function Table(columns, rows, opts={}) {
  const headers = columns.map(c=>`<th data-key="${c.key}">${c.label}</th>`).join('');
  const body = rows.map(r=>`<tr>${columns.map(c=>`<td>${r[c.key]??''}</td>`).join('')}</tr>`).join('');
  return `<table class="table" ${opts.id?`id="${opts.id}"`:''}><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
}

export const FormField = (label,name,value='',type='text') => `
  <label>${label}<br><input class="input" name="${name}" type="${type}" value="${value}"/></label>`;

export function Modal(id,title,bodyHTML,actionsHTML){
  return `
    <div class="dialog" role="dialog" aria-modal="true" id="${id}">
      <header>${title}</header>
      <div class="body">${bodyHTML}</div>
      <div class="actions">${actionsHTML}</div>
    </div>`;
}

export function statusBadge(status){
  const map={
    'attivo':'ok','disponibile':'ok','pagato':'ok','completato':'ok','bonus':'ok',
    'sospeso':'warn','noleggiato':'warn','in_attesa':'warn','programmato':'warn','hold':'warn',
    'scaduto':'err','manutenzione':'err','rimborsato':'err'
  };
  return Badge(map[status]||'gold',status);
}

export function Tree(treeData, options={}){
  const {root, nodes=[]} = treeData || {};
  const {maxDepth=3, highlightCode='', lazy=true} = options;
  if(!root){
    return '<p class="muted">Nessun membro disponibile</p>';
  }
  const byParent = nodes.reduce((acc,node)=>{
    const key = node.parentCode || 'root';
    (acc[key] ||= []).push(node);
    return acc;
  },{});
  function renderNode(node, depth){
    if(!node || depth>maxDepth) return '';
    const children = byParent[node.code] || [];
    const hasChildren = children.length>0 && depth<maxDepth;
    const caret = hasChildren ? `<button class="caret" aria-label="Espandi nodo" data-code="${node.code}"></button>` : '<span class="bullet"></span>';
    const childList = hasChildren ? `<ul class="children ${lazy && depth>1?'collapsed':'expanded'}">${children.map(child=>renderNode(child, depth+1)).join('')}</ul>` : '';
    const volume = formatCurrency(node.volumeMonth||0);
    const expandedClass = depth===1 ? 'expanded' : '';
    return `
      <li class="llx-tree-node ${hasChildren?'has-children':''} ${highlightCode===node.code?'highlight':''} ${expandedClass}" data-code="${node.code}" data-depth="${depth}">
        <div class="node-line">
          ${caret}
          <div class="content">
            <div class="primary">${node.fullName} <span class="code">${node.code}</span></div>
            <div class="meta">${Badge('gold', node.rank)} <span class="status">${statusBadge(node.status)}</span></div>
            <div class="meta">Volume mese: <strong>${volume}</strong> · Gambe attive: <strong>${node.legs}</strong></div>
          </div>
        </div>
        ${childList}
      </li>`;
  }
  return `<ul class="llx-tree" data-root="${root.code}" data-lazy="${lazy}">${renderNode(root,1)}</ul>`;
}

export function WalletCard({balanceEUR=0, availableEUR=0, pendingPositive=0, pendingNegative=0}={}){
  return `
    <div class="card wallet-card">
      <h3>Saldo disponibile</h3>
      <p class="wallet-balance">${formatCurrency(availableEUR || balanceEUR)}</p>
      <div class="wallet-breakdown">
        <div><span>Saldo contabile</span><strong>${formatCurrency(balanceEUR)}</strong></div>
        <div><span>Entrate in attesa</span><strong>${formatCurrency(pendingPositive)}</strong></div>
        <div><span>Uscite bloccate</span><strong>${formatCurrency(Math.abs(pendingNegative))}</strong></div>
      </div>
    </div>
  `;
}

export function LedgerTable(rows=[]){
  const body = rows.map(row=>{
    const amountClass = row.amountEUR >= 0 ? 'positive' : 'negative';
    const when = new Date(row.when);
    const formattedDate = isNaN(when) ? row.when : when.toLocaleString('it-IT',{dateStyle:'short', timeStyle:'short'});
    return `
      <tr>
        <td>${formattedDate}</td>
        <td>${row.type}</td>
        <td>${row.desc}</td>
        <td class="amount ${amountClass}">${formatCurrency(row.amountEUR)}</td>
        <td>${statusBadge(row.status)}</td>
      </tr>`;
  }).join('');
  return `
    <table class="table ledger">
      <thead>
        <tr>
          <th>Data</th>
          <th>Tipo</th>
          <th>Descrizione</th>
          <th>Importo</th>
          <th>Stato</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}
