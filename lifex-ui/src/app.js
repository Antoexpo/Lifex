import {Topbar, Sidebar, Card, Badge, Button, Table, FormField, Modal, formatCurrency, statusBadge, state, Banner, Tree, WalletCard, LedgerTable, MiniCart, generateClientCode as generateClientCodeUtil, formatLLX, getActivityTier, getCashoutPct} from './components.js';
import {LLX} from './config.js';
import {initRouter} from './router.js';

const main = document.getElementById('main');
const sidebarEl = document.getElementById('sidebar');
const topbarEl = document.getElementById('topbar');
const modalEl = document.getElementById('modal');
let toastContainer = null;
let miniCartInitialized = false;

function escapeHtml(str=''){
  return str.replace(/[&<>]/g, ch=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[ch]));
}

function ensureToastContainer(){
  if(!toastContainer){
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

function showToast(message, variant='info'){
  ensureToastContainer();
  const toast = document.createElement('div');
  const variantClass = variant === 'warn' ? 'warn' : variant === 'error' ? 'err' : '';
  toast.className = `toast ${variantClass}`.trim();
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(()=>{
    toast.remove();
    if(toastContainer && !toastContainer.childElementCount){
      toastContainer.remove();
      toastContainer = null;
    }
  },3200);
}

function generateClientCode(params){
  return generateClientCodeUtil(params);
}

function roundLLX(value){
  const numeric = Number(value);
  if(Number.isNaN(numeric)) return 0;
  return Number(numeric.toFixed(2));
}

function setWalletAvailable(value,{rewardIfPositive=false}={}){
  if(!state.wallet) return;
  const rounded = roundLLX(value);
  state.wallet.available = rounded;
  state.wallet.balance = rounded;
  state.wallet.balanceEUR = rounded;
  state.wallet.tier = getActivityTier(rounded);
  if(rounded < 0){
    state.wallet.positiveStreakDays = 0;
  } else if(rewardIfPositive && LLX.FEES.POSITIVE_BALANCE_REWARD.enabled){
    state.wallet.positiveStreakDays = Math.max(
      state.wallet.positiveStreakDays,
      LLX.FEES.POSITIVE_BALANCE_REWARD.streakDays
    );
  }
}

function registerLedgerEntry(entry){
  if(!state.wallet) return;
  const normalized = {
    id: entry.id || `WL-${Date.now()}`,
    when: entry.when || new Date().toISOString(),
    type: entry.type,
    desc: entry.desc,
    amountEUR: roundLLX(entry.amountEUR),
    feeEUR: roundLLX(entry.feeEUR ?? 0),
    status: entry.status || 'in_attesa',
    currency: entry.currency || LLX.SYMBOL
  };
  state.wallet.ledger = [normalized, ...(state.wallet.ledger || [])];
}

export function previewDeposit(amountLLX){
  const amount = roundLLX(amountLLX);
  const before = Number(state.wallet?.available ?? 0);
  const tier = state.wallet?.tier || getActivityTier(before);
  const pct = LLX.FEES.DEPOSIT_PCT[tier] ?? 0;
  const fee = roundLLX(amount * pct);
  const totalDebit = roundLLX(amount + fee);
  const after = roundLLX(before + amount);
  return {tier, pct, fee, totalDebit, after, before};
}

export function previewTransfer(amountLLX){
  const amount = roundLLX(amountLLX);
  const before = Number(state.wallet?.available ?? 0);
  const tier = state.wallet?.tier || getActivityTier(before);
  const pct = LLX.FEES.TRANSFER_PCT[tier] ?? 0;
  const fee = roundLLX(amount * pct);
  const totalDebit = roundLLX(amount + fee);
  const after = roundLLX(before - totalDebit);
  return {tier, pct, fee, totalDebit, after, before};
}

export function previewCashout(amountLLX){
  const amount = roundLLX(amountLLX);
  const before = Number(state.wallet?.available ?? 0);
  const basePct = getCashoutPct(amount);
  const streakOk = LLX.FEES.POSITIVE_BALANCE_REWARD.enabled && (state.wallet?.positiveStreakDays ?? 0) >= LLX.FEES.POSITIVE_BALANCE_REWARD.streakDays;
  const pct = streakOk ? 0 : basePct;
  const fee = roundLLX(amount * pct);
  const netCredit = roundLLX(amount - fee);
  const after = roundLLX(before - amount);
  return {pct, fee, netCredit, after, before, streakOk};
}

export function doDeposit(amountLLX, method, note){
  const amount = roundLLX(amountLLX);
  const preview = previewDeposit(amount);
  setWalletAvailable(preview.after, {rewardIfPositive:true});
  registerLedgerEntry({
    type: 'deposit',
    desc: method ? `Ricarica ${method}${note ? ` • ${note}` : ''}` : `Ricarica wallet${note ? ` • ${note}` : ''}`,
    amountEUR: amount,
    feeEUR: preview.fee,
    status: 'in_attesa',
    currency: LLX.SYMBOL
  });
  return preview;
}

export function doTransfer(amountLLX, toCode, note){
  const amount = roundLLX(amountLLX);
  const preview = previewTransfer(amount);
  setWalletAvailable(preview.after);
  registerLedgerEntry({
    type: 'transfer',
    desc: `A ${toCode}${note ? ` • ${note}` : ''}`,
    amountEUR: -amount,
    feeEUR: preview.fee,
    status: 'in_attesa',
    currency: LLX.SYMBOL
  });
  return preview;
}

export function doCashout(amountLLX, method, note){
  const amount = roundLLX(amountLLX);
  const preview = previewCashout(amount);
  setWalletAvailable(preview.after);
  registerLedgerEntry({
    type: 'cashout',
    desc: `Cash-out ${method}${note ? ` • ${note}` : ''}${preview.streakOk ? ' • promo: fee 0%' : ''}`,
    amountEUR: -amount,
    feeEUR: preview.fee,
    status: 'in_attesa',
    currency: LLX.SYMBOL
  });
  return preview;
}

async function loadData(){
  const [members, vehicles, orders, payouts, tree, products, wallet] = await Promise.all([
    fetch('./data/members.json').then(r=>r.json()),
    fetch('./data/vehicles.json').then(r=>r.json()),
    fetch('./data/orders.json').then(r=>r.json()),
    fetch('./data/payouts.json').then(r=>r.json()),
    fetch('./data/tree.json').then(r=>r.json()),
    fetch('./data/products.json').then(r=>r.json()),
    fetch('./data/wallet.json').then(r=>r.json())
  ]);
  const currentYear = new Date().getFullYear();
  state.cart = {items:[], open:false};
  const codeMap = {};
  const usedCodes = new Set();
  const normalizedMembers = members.map(member=>{
    let newCode = generateClientCode({fiscalCode: member.fiscalCode, year: currentYear});
    while(usedCodes.has(newCode)){
      newCode = generateClientCode({fiscalCode: '', year: currentYear});
    }
    usedCodes.add(newCode);
    codeMap[member.code] = newCode;
    return {...member, oldCode: member.code, code: newCode};
  });
  state.members = normalizedMembers;
  state.membersIndex = new Map(normalizedMembers.map(m=>[m.code, m]));
  const treeCodeMap = {};
  const normalizedTreeMembers = tree.members.map(node=>{
    let newCode = generateClientCode({fiscalCode: node.fiscalCode, year: currentYear});
    while(usedCodes.has(newCode)){
      newCode = generateClientCode({fiscalCode: '', year: currentYear});
    }
    treeCodeMap[node.code] = newCode;
    usedCodes.add(newCode);
    codeMap[node.code] = newCode;
    return {...node, oldCode: node.code, code: newCode};
  }).map(node=>({
    ...node,
    parentCode: node.parentCode ? treeCodeMap[node.parentCode] : null,
    sponsorCode: node.sponsorCode ? treeCodeMap[node.sponsorCode] : null
  }));
  const rootNode = normalizedTreeMembers.find(node=>node.parentCode===null) || normalizedTreeMembers[0];
  state.tree = {
    ...tree,
    rootCode: rootNode?.code ?? tree.rootCode,
    members: normalizedTreeMembers
  };
  state.treeIndex = new Map(normalizedTreeMembers.map(node=>[node.code, node]));
  state.treeParentMap = new Map(normalizedTreeMembers.map(node=>[node.code, node.parentCode]));
  state.codeMap = codeMap;
  state.vehicles = vehicles;
  state.orders = orders;
  state.payouts = payouts;
  state.products = products;
  const normalizedLedger = (wallet.ledger || []).map(entry=>({
    ...entry,
    type: entry.type === 'withdraw' ? 'cashout' : entry.type,
    amountEUR: Number(entry.amountEUR),
    feeEUR: Number(entry.feeEUR ?? 0),
    currency: entry.currency || LLX.SYMBOL
  }));
  const balance = Number(wallet.balanceEUR ?? 0);
  state.wallet = {
    balance,
    balanceEUR: balance,
    available: balance,
    tier: getActivityTier(balance),
    positiveStreakDays: 30,
    ledger: normalizedLedger
  };
}

function initLayout(){
  topbarEl.innerHTML = Topbar();
  sidebarEl.innerHTML = Sidebar(location.hash||'#/dashboard');
  document.getElementById('sidebar-toggle').addEventListener('click',()=>{
    sidebarEl.classList.toggle('open');
  });
  renderMiniCart();
  initMiniCart();
}

function renderMiniCart(){
  const holder = document.getElementById('mini-cart');
  if(holder){
    holder.innerHTML = MiniCart(state.cart);
  }
}

function initMiniCart(){
  if(miniCartInitialized) return;
  const holder = document.getElementById('mini-cart');
  if(!holder) return;
  holder.addEventListener('click',handleMiniCartClick);
  document.addEventListener('click',handleOutsideClick);
  miniCartInitialized = true;
}

function handleMiniCartClick(e){
  const toggle = e.target.closest('.mini-cart-toggle');
  if(toggle){
    e.preventDefault();
    e.stopPropagation();
    toggleMiniCart();
    return;
  }
  const removeBtn = e.target.closest('.mini-cart-remove');
  if(removeBtn){
    e.preventDefault();
    removeFromCart(removeBtn.dataset.sku);
    return;
  }
  const checkoutBtn = e.target.closest('.mini-cart-checkout');
  if(checkoutBtn){
    e.preventDefault();
    openModal(Modal('checkout-demo','Checkout demo','<p>Checkout non attivo (demo).</p>',
      Button('gold','Chiudi','type="button" id="modal-close"')));
    document.getElementById('modal-close').addEventListener('click',closeModal);
  }
}

function handleOutsideClick(e){
  if(!e.target.closest('.mini-cart') && state.cart.open){
    toggleMiniCart(false);
  }
}

function toggleMiniCart(force){
  if(typeof force==='boolean') state.cart.open = force;
  else state.cart.open = !state.cart.open;
  renderMiniCart();
}

function addToCart(product){
  const existing = state.cart.items.find(item=>item.sku===product.sku);
  if(existing) existing.qty += 1;
  else state.cart.items.push({sku: product.sku, name: product.name, priceEUR: product.priceEUR, qty:1});
  toggleMiniCart(true);
  showToast('Prodotto aggiunto al carrello (demo).','info');
}

function removeFromCart(sku){
  state.cart.items = state.cart.items.filter(item=>item.sku!==sku);
  if(state.cart.items.length===0){
    toggleMiniCart(false);
  } else {
    renderMiniCart();
  }
}

function openModal(html){
  modalEl.innerHTML = html;
  modalEl.classList.add('open');
  modalEl.addEventListener('click',e=>{ if(e.target===modalEl) closeModal(); });
  document.addEventListener('keydown',escClose);
}
function closeModal(){
  modalEl.classList.remove('open');
  modalEl.innerHTML='';
  document.removeEventListener('keydown',escClose);
}
function escClose(e){ if(e.key==='Escape') closeModal(); }

async function renderDashboard(){
  const html = await fetch('./views/dashboard.html').then(r=>r.text());
  main.innerHTML = html;
  const metricsEl = document.getElementById('metrics');
  const activeMembers = state.members?.filter(m=>m.status==='attivo').length || 0;
  const availableVehicles = state.vehicles?.filter(v=>v.status==='disponibile').length || 0;
  const canoni = state.orders?.filter(o=>o.type==='canone').reduce((s,o)=>s+o.amountEUR,0) || 0;
  const payoutsProg = state.payouts?.filter(p=>p.status==='programmato').length || 0;
  metricsEl.innerHTML = [
    Card('Membri attivi', `<strong>${activeMembers}</strong>`),
    Card('Veicoli disponibili', `<strong>${availableVehicles}</strong>`),
    Card('Canoni mese', `<strong>${formatCurrency(canoni)}</strong>`),
    Card('Pagamenti programmati', `<strong>${payoutsProg}</strong>`)
  ].join('');
  const pipelineEl = document.getElementById('pipeline');
  const recentOrders = (state.orders||[]).slice(-5).map(o=>`<li>${o.id} ${statusBadge(o.status)} ${formatCurrency(o.amountEUR)}</li>`).join('');
  const recentPayouts = (state.payouts||[]).slice(-5).map(p=>`<li>${p.id} ${statusBadge(p.status)} ${formatCurrency(p.amountEUR)}</li>`).join('');
  pipelineEl.innerHTML = `<h3>Ultimi ordini</h3><ul>${recentOrders}</ul><h3>Ultimi pagamenti</h3><ul>${recentPayouts}</ul>`;
}

async function renderMembers(){
  const html = await fetch('./views/members.html').then(r=>r.text());
  main.innerHTML = html;
  const bannerSlot = document.getElementById('member-banner');
  if(bannerSlot){
    bannerSlot.innerHTML = Banner('Codici cliente generati dinamicamente: formato LLX+YYYY+6 cifre (da CF).','info');
  }
  const copyBtn = document.getElementById('copy-code-map');
  if(copyBtn){
    copyBtn.addEventListener('click',()=>{
      const entries = Object.entries(state.codeMap||{}).sort((a,b)=>a[0].localeCompare(b[0]));
      const json = JSON.stringify(Object.fromEntries(entries), null, 2);
      openModal(Modal('code-map','Mappa codici',`<pre class="code-map">${escapeHtml(json)}</pre>`,
        `${Button('ghost','Chiudi','type="button" id="modal-close"')} ${Button('gold','Copia','type="button" id="modal-copy"')}`));
      document.getElementById('modal-close').addEventListener('click',closeModal);
      document.getElementById('modal-copy').addEventListener('click',async()=>{
        try {
          await navigator.clipboard.writeText(json);
          showToast('Mappa copiata negli appunti.','info');
        } catch(err){
          showToast('Impossibile copiare automaticamente, selezionare il testo.','warn');
        }
      });
    });
  }
  const search = document.getElementById('member-search');
  const statusSel = document.getElementById('member-status');
  function update(){
    let rows = state.members.filter(m=>{
      const term = search.value.toLowerCase();
      const match = m.code.toLowerCase().includes(term) || m.fullName.toLowerCase().includes(term);
      const statusOk = !statusSel.value || m.status===statusSel.value;
      return match && statusOk;
    });
    const columns=[
      {key:'code',label:'Codice'},
      {key:'fullName',label:'Nome'},
      {key:'rank',label:'Rank'},
      {key:'status',label:'Stato'},
      {key:'volumeMonth',label:'Volume Mese'},
      {key:'walletEUR',label:'Wallet (€)'},
      {key:'actions',label:'Azioni'}
    ];
    rows = rows.map(m=>({
      ...m,
      status: statusBadge(m.status),
      volumeMonth: formatCurrency(m.volumeMonth),
      walletEUR: formatCurrency(m.walletEUR),
      actions: `<button class="btn ghost"><svg width=16 height=16><use href=../public/icons.svg#edit></use></svg></button> <button class="btn ghost"><svg width=16 height=16><use href=../public/icons.svg#trash></use></svg></button>`
    }));
    document.getElementById('members-table').innerHTML = Table(columns,rows);
  }
  search.addEventListener('input',update);
  statusSel.addEventListener('change',update);
  update();
  document.getElementById('member-create').addEventListener('click',()=>{
    // TODO: real form submit
    openModal(Modal('create-member','Crea membro',FormField('Nome','name'),Button('gold','Salva')));
  });
}

async function renderNetwork(){
  const html = await fetch('./views/network.html').then(r=>r.text());
  main.innerHTML = html;
  const treeContainer = document.getElementById('network-tree');
  const searchInput = document.getElementById('network-search');
  const depthSelect = document.getElementById('network-depth');
  const contextEl = document.getElementById('network-context');
  const expandBtn = document.getElementById('network-expand');
  const collapseBtn = document.getElementById('network-collapse');
  const members = state.tree?.members || [];
  const index = state.treeIndex || new Map();
  if(!members.length){
    treeContainer.innerHTML = '<p class="muted">Albero non disponibile.</p>';
    return;
  }
  let activeRoot = state.tree.rootCode;
  const parentMap = state.treeParentMap || new Map();
  function computeGeneration(code, root){
    if(code===root) return 0;
    let gen = 0;
    let cursor = code;
    const visited = new Set();
    while(cursor && cursor!==root && !visited.has(cursor)){
      visited.add(cursor);
      cursor = parentMap.get(cursor);
      gen += 1;
    }
    return cursor===root ? gen : gen;
  }
  function renderTree(){
    const term = searchInput.value.trim().toLowerCase();
    const maxDepth = Number(depthSelect.value||3);
    let rootNode = index.get(state.tree.rootCode);
    activeRoot = state.tree.rootCode;
    if(term){
      const found = members.find(m=>m.code.toLowerCase().includes(term) || m.fullName.toLowerCase().includes(term));
      if(found){
        rootNode = found;
        activeRoot = found.code;
        contextEl.textContent = `Vista su ${found.fullName} (${found.code}) — Generazione 0`;
      } else {
        contextEl.textContent = `Nessun membro trovato per "${term}" — radice principale mostrata.`;
      }
    } else if(rootNode){
      contextEl.textContent = `Nodo radice: ${rootNode.fullName} (${rootNode.code})`;
    }
    if(rootNode){
      treeContainer.innerHTML = Tree({root: rootNode, nodes: members},{maxDepth, highlightCode: activeRoot});
      bindTreeNodes();
    } else {
      treeContainer.innerHTML = '<p class="muted">Nessun nodo trovato.</p>';
    }
  }
  function bindTreeNodes(){
    treeContainer.querySelectorAll('.caret').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        const li = btn.closest('.llx-tree-node');
        if(!li) return;
        li.classList.toggle('expanded');
        const children = li.querySelector(':scope > ul.children');
        if(children){
          children.classList.toggle('collapsed');
        }
      });
    });
    treeContainer.querySelectorAll('.node-line').forEach(line=>{
      line.addEventListener('click',e=>{
        if(e.target.closest('.caret')) return;
        const li = line.closest('.llx-tree-node');
        if(!li) return;
        const code = li.dataset.code;
        const node = index.get(code);
        if(!node) return;
        const parent = node.parentCode ? index.get(node.parentCode) : null;
        const sponsor = node.sponsorCode ? index.get(node.sponsorCode) : null;
        const generation = computeGeneration(node.code, activeRoot);
        const details = `
          <p><strong>Codice:</strong> ${node.code}</p>
          <p><strong>Rank:</strong> ${node.rank}</p>
          <p><strong>Stato:</strong> ${node.status}</p>
          <p><strong>Sponsor:</strong> ${sponsor ? `${sponsor.fullName} (${sponsor.code})` : '—'}</p>
          <p><strong>Parent:</strong> ${parent ? `${parent.fullName} (${parent.code})` : '—'}</p>
          <p><strong>Generazione:</strong> Gen ${generation}</p>
          <p><strong>Volume mese:</strong> ${formatCurrency(node.volumeMonth)}</p>
          <p><strong>Gambe attive:</strong> ${node.legs}</p>
          ${node.legs >= 4 ? '<p class="muted">Slot esauriti (demo).</p>' : ''}
        `;
        openModal(Modal('network-node',node.fullName,details,
          `${Button('gold','Pre-assegna','type="button" id="network-assign"')} ${Button('ghost','Chiudi','type="button" id="modal-close"')}`));
        document.getElementById('modal-close').addEventListener('click',closeModal);
        document.getElementById('network-assign').addEventListener('click',()=>{
          showToast('Pre-assegnazione simulata: nessun salvataggio.','info');
          closeModal();
        });
      });
    });
  }
  function setAll(expand=true){
    treeContainer.querySelectorAll('.llx-tree-node').forEach(li=>{
      const children = li.querySelector(':scope > ul.children');
      if(children){
        if(expand){
          children.classList.remove('collapsed');
          li.classList.add('expanded');
        } else {
          if(li.dataset.depth!=='1'){
            children.classList.add('collapsed');
            li.classList.remove('expanded');
          }
        }
      }
    });
  }
  expandBtn.addEventListener('click',()=>setAll(true));
  collapseBtn.addEventListener('click',()=>setAll(false));
  searchInput.addEventListener('input',renderTree);
  depthSelect.addEventListener('change',renderTree);
  renderTree();
}

async function renderCatalog(){
  const html = await fetch('./views/catalog.html').then(r=>r.text());
  main.innerHTML = html;
  const search = document.getElementById('catalog-search');
  const category = document.getElementById('catalog-category');
  const grid = document.getElementById('catalog-grid');
  const categories = Array.from(new Set((state.products||[]).map(p=>p.category))).sort();
  categories.forEach(cat=>{
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    category.appendChild(opt);
  });
  function renderGrid(){
    const term = search.value.trim().toLowerCase();
    const catVal = category.value;
    const filtered = state.products.filter(product=>{
      const matchesTerm = !term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term);
      const matchesCat = !catVal || product.category===catVal;
      return matchesTerm && matchesCat;
    });
    grid.innerHTML = filtered.map(product=>`
      <div class="card product-card" data-sku="${product.sku}">
        <h3>${product.name}</h3>
        <p class="muted">${product.category}</p>
        <p class="price">${formatCurrency(product.priceEUR)}</p>
        <div class="tags">${(product.tags||[]).map(tag=>Badge('gold',tag)).join(' ')}</div>
        <button class="btn gold add-to-cart" data-sku="${product.sku}">Aggiungi al carrello</button>
      </div>
    `).join('') || '<p class="muted">Nessun prodotto disponibile.</p>';
  }
  grid.addEventListener('click',e=>{
    const btn = e.target.closest('.add-to-cart');
    if(!btn) return;
    const sku = btn.dataset.sku;
    const product = state.products.find(p=>p.sku===sku);
    if(product){
      addToCart(product);
    }
  });
  search.addEventListener('input',renderGrid);
  category.addEventListener('change',renderGrid);
  renderGrid();
}

async function renderVehicles(){
  const html = await fetch('./views/vehicles.html').then(r=>r.text());
  main.innerHTML = html;
  const cat = document.getElementById('vehicle-category');
  const statusSel = document.getElementById('vehicle-status');
  const cardsEl = document.getElementById('vehicle-cards');
  function update(){
    const rows = state.vehicles.filter(v=>{
      const okCat=!cat.value||v.category===cat.value;
      const okStatus=!statusSel.value||v.status===statusSel.value;
      return okCat&&okStatus;
    }).map(v=>({
      ...v,
      status: statusBadge(v.status),
      monthlyFeeEUR: formatCurrency(v.monthlyFeeEUR),
      depositEUR: formatCurrency(v.depositEUR)
    }));
    const columns=[
      {key:'plate',label:'Targa'},
      {key:'model',label:'Modello'},
      {key:'brand',label:'Brand'},
      {key:'category',label:'Categoria'},
      {key:'status',label:'Stato'},
      {key:'monthlyFeeEUR',label:'Canone'},
      {key:'depositEUR',label:'Deposito'}
    ];
    document.getElementById('vehicles-table').innerHTML = Table(columns,rows);
    const counts={disponibile:0,noleggiato:0,manutenzione:0};
    state.vehicles.forEach(v=>counts[v.status] = (counts[v.status]||0)+1);
    cardsEl.innerHTML = [
      Card('Disponibile',counts.disponibile||0),
      Card('Noleggiato',counts.noleggiato||0),
      Card('Manutenzione',counts.manutenzione||0)
    ].join('');
  }
  cat.addEventListener('change',update);
  statusSel.addEventListener('change',update);
  update();
}

async function renderOrders(){
  const html = await fetch('./views/orders.html').then(r=>r.text());
  main.innerHTML = html;
  const statusSel=document.getElementById('order-status');
  const typeSel=document.getElementById('order-type');
  const periodInput=document.getElementById('order-period');
  function update(){
    let rows=state.orders.filter(o=>{
      const okStatus=!statusSel.value||o.status===statusSel.value;
      const okType=!typeSel.value||o.type===typeSel.value;
      const okPeriod=!periodInput.value||o.createdAt.startsWith(periodInput.value);
      return okStatus && okType && okPeriod;
    });
    const total=rows.reduce((s,o)=>s+o.amountEUR,0);
    document.getElementById('orders-total').textContent = `Totale: ${formatCurrency(total)}`;
    rows=rows.map(o=>({
      ...o,
      status: statusBadge(o.status),
      amountEUR: formatCurrency(o.amountEUR)
    }));
    const columns=[
      {key:'id',label:'ID'},
      {key:'memberId',label:'Membro'},
      {key:'vehicleId',label:'Veicolo'},
      {key:'type',label:'Tipo'},
      {key:'amountEUR',label:'Importo'},
      {key:'status',label:'Stato'},
      {key:'createdAt',label:'Creato'}
    ];
    document.getElementById('orders-table').innerHTML = Table(columns,rows);
  }
  statusSel.addEventListener('change',update);
  typeSel.addEventListener('change',update);
  periodInput.addEventListener('input',update);
  update();
}

async function renderPayouts(){
  const html = await fetch('./views/payouts.html').then(r=>r.text());
  main.innerHTML = html;
  const list=document.getElementById('payouts-list');
  const rows=state.payouts.map(p=>({
    ...p,
    status: statusBadge(p.status),
    amountEUR: formatCurrency(p.amountEUR)
  }));
  const columns=[
    {key:'period',label:'Periodo'},
    {key:'memberId',label:'Membro'},
    {key:'amountEUR',label:'Importo'},
    {key:'status',label:'Stato'},
    {key:'scheduledFor',label:'Programmato per'}
  ];
  list.innerHTML = Table(columns,rows);
}

async function renderSettings(){
  const html = await fetch('./views/settings.html').then(r=>r.text());
  main.innerHTML = html;
}

async function renderWallet(){
  const html = await fetch('./views/wallet.html').then(r=>r.text());
  main.innerHTML = html;
  const cardContainer = document.getElementById('wallet-card');
  const ledgerContainer = document.getElementById('wallet-ledger');
  function computeStats(){
    const pending = (state.wallet?.ledger || []).filter(entry=>entry.status==='in_attesa');
    let pendingPositive = 0;
    let pendingNegative = 0;
    pending.forEach(entry=>{
      const amount = Number(entry.amountEUR) || 0;
      const fee = Number(entry.feeEUR ?? 0);
      if(amount >= 0){
        pendingPositive += amount;
      } else {
        if(entry.type === 'transfer'){
          pendingNegative += amount - fee;
        } else {
          pendingNegative += amount;
        }
      }
    });
    return {
      pendingPositive: roundLLX(pendingPositive),
      pendingNegative: roundLLX(pendingNegative)
    };
  }
  function renderWalletUI(){
    const stats = computeStats();
    cardContainer.innerHTML = WalletCard({
      balance: state.wallet.balance,
      available: state.wallet.available,
      pendingPositive: stats.pendingPositive,
      pendingNegative: stats.pendingNegative,
      tier: state.wallet.tier,
      eurRate: LLX.EUR_RATE,
      streakDays: state.wallet.positiveStreakDays
    });
    ledgerContainer.innerHTML = LedgerTable(state.wallet.ledger);
  }
  function renderBreakdown(type, preview, amount){
    if(!preview){
      return '<div class="distinta"><p class="muted">Inserisci un importo LLX per generare la distinta.</p></div>';
    }
    const tierKey = preview.tier || state.wallet.tier;
    const tierInfo = LLX.ACTIVITY_TIERS[tierKey] || LLX.ACTIVITY_TIERS.BASE;
    const pctValue = typeof preview.pct === 'number' ? preview.pct : 0;
    const feePct = `${(pctValue * 100).toFixed(2)}%`;
    const feeRow = `<div class="row"><span>Fee</span><strong class="llx">${formatLLX(preview.fee)}</strong></div>`;
    const amountRow = type === 'cashout'
      ? `<div class="row"><span>Netto accreditato</span><strong class="llx">${formatLLX(preview.netCredit)}</strong></div>`
      : `<div class="row"><span>Totale addebitato</span><strong class="llx">${formatLLX(preview.totalDebit)}</strong></div>`;
    const rewardBadge = preview.streakOk ? '<span class="badge reward">Cash-out gratuito — saldo positivo</span>' : '';
    const requested = roundLLX(amount);
    return `
      <div class="distinta">
        <h4>Distinta Operazione</h4>
        <div class="row"><span>Importo richiesto</span><strong class="llx">${formatLLX(requested)}</strong></div>
        <div class="row"><span>Stato Attività</span><strong>${tierInfo.name}</strong></div>
        <div class="row"><span>Fee %</span><strong>${feePct}</strong></div>
        ${feeRow}
        ${amountRow}
        <div class="row"><span>Saldo</span><strong class="llx">${formatLLX(preview.before)} → ${formatLLX(preview.after)}</strong></div>
        ${rewardBadge ? `<div class="row reward-row">${rewardBadge}</div>` : ''}
      </div>
    `;
  }
  function openWalletModal(type){
    let title='';
    let form='';
    if(type==='deposit'){
      title='Ricarica LLX';
      form=`<form id="wallet-form" class="wallet-form">
        <label>Importo (LLX)<br><input class="input" name="amount" type="number" min="0" step="0.01" required></label>
        <label>Metodo<br><select class="input" name="method" required>
          <option value="">Seleziona</option>
          <option>Bonifico</option>
          <option>Carta</option>
          <option>Wallet esterno</option>
        </select></label>
        <label>Note<br><input class="input" name="notes" placeholder="Note interne"></label>
        <div id="wallet-breakdown"></div>
      </form>`;
    } else if(type==='transfer'){
      title='Trasferisci LLX';
      const options = state.members.map(m=>`<option value="${m.code}">${m.fullName} (${m.code})</option>`).join('');
      form=`<form id="wallet-form" class="wallet-form">
        <label>Importo (LLX)<br><input class="input" name="amount" type="number" min="0" step="0.01" required></label>
        <label>Destinatario<br><input class="input" name="recipient" list="wallet-members" placeholder="Codice cliente" required></label>
        <datalist id="wallet-members">${options}</datalist>
        <label>Note<br><input class="input" name="notes" placeholder="Motivazione"></label>
        <div id="wallet-breakdown"></div>
      </form>`;
    } else {
      title='Cash-out';
      form=`<form id="wallet-form" class="wallet-form">
        <label>Importo (LLX)<br><input class="input" name="amount" type="number" min="0" step="0.01" required></label>
        <label>Metodo<br><select class="input" name="method" required>
          <option value="">Seleziona</option>
          <option>IBAN</option>
          <option>Carta Business</option>
          <option>Sportello partner</option>
        </select></label>
        <label>Note<br><input class="input" name="notes" placeholder="Note per l'operatore"></label>
        <div id="wallet-breakdown"></div>
      </form>`;
    }
    openModal(Modal('wallet-modal',title,form,
      `${Button('gold','Conferma','type="button" id="wallet-submit"')} ${Button('ghost','Annulla','type="button" id="modal-close"')}`));
    const closeBtn = document.getElementById('modal-close');
    if(closeBtn){
      closeBtn.addEventListener('click',closeModal);
    }
    const formEl = document.getElementById('wallet-form');
    const breakdownEl = document.getElementById('wallet-breakdown');
    let lastPreview = null;
    function updateBreakdown(){
      const amount = parseFloat(formEl.elements.amount.value);
      if(!amount || amount <= 0){
        lastPreview = null;
        breakdownEl.innerHTML = renderBreakdown(type, null, amount);
        return;
      }
      if(type==='deposit'){
        lastPreview = previewDeposit(amount);
      } else if(type==='transfer'){
        lastPreview = previewTransfer(amount);
      } else {
        lastPreview = previewCashout(amount);
      }
      breakdownEl.innerHTML = renderBreakdown(type, lastPreview, amount);
    }
    formEl.addEventListener('input',e=>{
      if(e.target.name==='amount'){
        updateBreakdown();
      }
    });
    updateBreakdown();
    const submitBtn = document.getElementById('wallet-submit');
    submitBtn.addEventListener('click',()=>{
      const formData = new FormData(formEl);
      const data = Object.fromEntries(formData.entries());
      const amount = parseFloat(data.amount);
      if(!amount || amount <= 0){
        showToast('Inserire un importo valido.','warn');
        return;
      }
      if(type==='transfer'){
        const recipient = data.recipient?.trim();
        if(!recipient || !state.members.some(m=>m.code===recipient)){
          showToast('Codice destinatario non valido.','warn');
          return;
        }
      }
      if(type==='transfer'){ // ensure fee + amount <= saldo
        const preview = lastPreview || previewTransfer(amount);
        if(preview.totalDebit > state.wallet.available + 1e-6){
          showToast('Importo + fee superiore al saldo disponibile.','warn');
          return;
        }
      }
      if(type==='cashout'){
        if(amount > state.wallet.available + 1e-6){
          showToast('Importo superiore al saldo disponibile.','warn');
          return;
        }
      }
      if(type!=='transfer' && data.method?.trim()===''){
        showToast('Seleziona un metodo valido.','warn');
        return;
      }
      let preview;
      if(type==='deposit'){
        preview = lastPreview || previewDeposit(amount);
        doDeposit(amount, data.method, data.notes?.trim());
        showToast(`Ricarica registrata: ${formatLLX(amount)} (fee ${formatLLX(preview.fee)}).`,'info');
      } else if(type==='transfer'){
        preview = lastPreview || previewTransfer(amount);
        doTransfer(amount, data.recipient?.trim(), data.notes?.trim());
        showToast(`Trasferimento inviato: ${formatLLX(amount)} + fee ${formatLLX(preview.fee)}.`, 'info');
      } else {
        preview = lastPreview || previewCashout(amount);
        doCashout(amount, data.method, data.notes?.trim());
        showToast(`Cash-out richiesto: ${formatLLX(amount)} · netto ${formatLLX(preview.netCredit)}.`, 'info');
      }
      renderWalletUI();
      closeModal();
    });
  }
  document.getElementById('wallet-deposit').addEventListener('click',()=>openWalletModal('deposit'));
  document.getElementById('wallet-transfer').addEventListener('click',()=>openWalletModal('transfer'));
  document.getElementById('wallet-cashout').addEventListener('click',()=>openWalletModal('cashout'));
  renderWalletUI();
}

// Boot
(async function(){
  await loadData();
  initLayout();
  initRouter({
    '/dashboard': renderDashboard,
    '/members': renderMembers,
    '/network': renderNetwork,
    '/catalog': renderCatalog,
    '/vehicles': renderVehicles,
    '/wallet': renderWallet,
    '/orders': renderOrders,
    '/payouts': renderPayouts,
    '/settings': renderSettings
  });
})();

// TODO: integrate real auth and API calls
