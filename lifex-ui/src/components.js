// global state placeholder
export const state = { session:{ role:"admin", name:"Demo User" }, cart:{ items:[], open:false } };

// Utility helpers
export function extractDigits(str=''){
  return (str ?? '').toString().replace(/\D/g,'');
}

export function padRight(str='', len=0, char='0'){
  return (str ?? '').toString().padEnd(len, char).slice(0, len);
}

const llxFormatter = new Intl.NumberFormat('it-IT',{minimumFractionDigits:2, maximumFractionDigits:2});

export function formatCurrency(eur){
  const value = Number.isFinite(eur) ? eur : 0;
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(value);
}

export function formatLLX(value){
  const amount = Number.isFinite(value) ? value : 0;
  return `${llxFormatter.format(amount)} LLX`;
}

export function formatPercent(rate){
  const value = Number.isFinite(rate) ? rate * 100 : 0;
  const normalized = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `${normalized.replace(/\.00$/,'')}%`;
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

export const ACTIVITY_TIERS = [
  {id:'base', label:'Base', min:0, max:499, depositFee:0.10, transferFee:0.02},
  {id:'access', label:'Access', min:500, max:999, depositFee:0.08, transferFee:0.01},
  {id:'royal', label:'Royal', min:1000, max:Infinity, depositFee:0.01, transferFee:0}
];

const activityTierMap = ACTIVITY_TIERS.reduce((acc,tier)=>{
  acc[tier.id] = tier;
  return acc;
},{});

export function ActivityBadge(tier){
  const meta = (tier && typeof tier === 'object') ? tier : activityTierMap[tier] || activityTierMap.base;
  const tooltip = `Fee ricarica ${formatPercent(meta.depositFee)} · transfer ${formatPercent(meta.transferFee)}`;
  const safeTooltip = tooltip.replace(/"/g,'&quot;');
  return `<span class="badge tier-${meta.id}" title="${safeTooltip}">${meta.label}</span>`;
}

function escapeHtml(str=''){
  return (str ?? '').toString().replace(/[&<>"']/g, ch=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch] || ch));
}

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

export function WalletCard({
  balanceLLX=0,
  availableLLX=0,
  pendingPositive=0,
  pendingNegative=0,
  tier=ACTIVITY_TIERS[0],
  nextTier=null,
  progress={ratio:0,current:0,target:0,missing:0},
  streakDays=0,
  promoActive=false
}={}){
  const resolvedTier = (tier && typeof tier === 'object') ? tier : activityTierMap[tier] || ACTIVITY_TIERS[0];
  const currentLLX = llxFormatter.format(progress?.current ?? availableLLX);
  const targetLLX = llxFormatter.format(progress?.target ?? availableLLX);
  const missingLLX = llxFormatter.format(Math.max(0, progress?.missing ?? 0));
  const hasNextTier = Boolean(nextTier);
  const progressRatio = Math.min(Math.max(progress?.ratio ?? 0, 0), 1);
  const progressText = hasNextTier
    ? `${currentLLX} / ${targetLLX} LLX → manca ${missingLLX} LLX a ${nextTier.label}`
    : `${currentLLX} LLX · livello massimo (${resolvedTier.label})`;
  const promoText = promoActive ? '<span class="badge gold promo-badge">Saldo positivo → cash-out gratis</span>' : '';
  return `
    <div class="card wallet-card">
      <div class="wallet-card-header">
        <div class="wallet-card-main">
          <h3>Saldo disponibile</h3>
          <p class="wallet-balance">
            <span class="llx">${formatLLX(availableLLX)}</span>
            <span class="eur">${formatCurrency(availableLLX)}</span>
          </p>
          <p class="micro-copy">1 LLX = 1 € (valuta interna)</p>
        </div>
        <div class="wallet-card-activity">
          <span class="label">Stato Attività</span>
          ${ActivityBadge(resolvedTier)}
          <p class="muted activity-copy">Lo Stato Attività dipende da quanto lasci sul conto disponibile. Più saldo medio mantieni, minori fee applichiamo.</p>
        </div>
      </div>
      <div class="wallet-breakdown">
        <div>
          <span>Saldo contabile</span>
          <strong><span class="llx">${formatLLX(balanceLLX)}</span><span class="eur">${formatCurrency(balanceLLX)}</span></strong>
        </div>
        <div>
          <span>Entrate in attesa</span>
          <strong><span class="llx">${formatLLX(pendingPositive)}</span><span class="eur">${formatCurrency(pendingPositive)}</span></strong>
        </div>
        <div>
          <span>Uscite bloccate</span>
          <strong><span class="llx">${formatLLX(pendingNegative)}</span><span class="eur">${formatCurrency(pendingNegative)}</span></strong>
        </div>
      </div>
      <div class="activity-progress">
        <div class="progress-header">
          <div class="progress-label">${progressText}</div>
          ${promoText}
        </div>
        <div class="progress-bar"><span style="width:${Math.round(progressRatio*100)}%"></span></div>
        <div class="progress-meta">Streak positiva: ${streakDays} giorni</div>
      </div>
    </div>
  `;
}

const defaultTypeLabels = {
  deposit: 'Ricarica LLX',
  transfer: 'Trasferimento',
  cashout: 'Cash-out',
  bonus: 'Bonus',
  hold: 'Blocco',
  withdraw: 'Cash-out',
  adjustment: 'Rettifica'
};

const defaultFeeInfo = {
  deposit: 'Ricarica LLX: fee variabile in base allo Stato Attività.',
  transfer: 'Trasferimento interno: fee variabile in base allo Stato Attività.',
  cashout: 'Cash-out: fee per scaglioni importo (5% / 2% / 0%).',
  bonus: 'Bonus: nessuna fee applicata.',
  hold: 'Blocco cauzionale: importo riservato.'
};

export function LedgerTable(rows=[]){
  const body = rows.map(row=>{
    const amountValue = Number.isFinite(row.amountLLX) ? row.amountLLX : Number(row.amountEUR) || 0;
    const feeValue = Number.isFinite(row.feeLLX) ? row.feeLLX : Math.abs(Number(row.feeEUR) || 0);
    const netFee = feeValue ? -Math.abs(feeValue) : 0;
    const amountClass = amountValue >= 0 ? 'positive' : 'negative';
    const feeClass = netFee >= 0 ? 'positive' : 'negative';
    const when = new Date(row.when);
    const formattedDate = isNaN(when) ? row.when : when.toLocaleString('it-IT',{dateStyle:'short', timeStyle:'short'});
    const typeKey = row.type || 'altro';
    const typeLabel = row.typeLabel || defaultTypeLabels[typeKey] || typeKey;
    const tooltip = row.feeTooltip || defaultFeeInfo[typeKey] || '';
    const safeTooltip = escapeHtml(tooltip);
    const status = statusBadge(row.status);
    return `
      <tr>
        <td><span class="badge ledger-type" title="${safeTooltip}">${typeLabel}</span></td>
        <td>${escapeHtml(row.desc ?? '')}</td>
        <td class="amount ${amountClass}">${formatLLX(amountValue)}</td>
        <td class="amount ${feeClass}">${formatLLX(netFee)}</td>
        <td>${status}</td>
        <td>${formattedDate}</td>
      </tr>`;
  }).join('');
  return `
    <table class="table ledger">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Descrizione</th>
          <th>Importo (LLX)</th>
          <th>Fee (LLX)</th>
          <th>Stato</th>
          <th>Data/Ora</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}
