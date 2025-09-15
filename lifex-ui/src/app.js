import {Topbar, Sidebar, Card, Badge, Button, Table, FormField, Modal, formatCurrency, statusBadge, state, Banner, Tree, WalletCard, LedgerTable, MiniCart, formatLLX, formatPercent, ACTIVITY_TIERS, generateClientCode as generateClientCodeUtil} from './components.js';
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
  const typeLabels = {deposit:'Ricarica LLX', transfer:'Trasferimento', cashout:'Cash-out', bonus:'Bonus', hold:'Blocco'};
  const normalizedLedger = (wallet.ledger || []).map(entry=>{
    const normalizedType = entry.type === 'withdraw' ? 'cashout' : entry.type;
    const amountLLX = Number.isFinite(entry.amountLLX) ? entry.amountLLX : Number(entry.amountEUR) || 0;
    const feeLLX = Number.isFinite(entry.feeLLX) ? entry.feeLLX : Math.abs(Number(entry.feeEUR) || 0);
    const netLLX = Number.isFinite(entry.netLLX) ? entry.netLLX : Number((amountLLX - feeLLX).toFixed(2));
    return {
      ...entry,
      type: normalizedType,
      typeLabel: entry.typeLabel || typeLabels[normalizedType] || normalizedType,
      amountLLX,
      feeLLX,
      netLLX,
      amountEUR: amountLLX,
      feeEUR: feeLLX
    };
  });
  const toAmount = value => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
  };
  const rawBalance = Number(wallet.balanceLLX ?? wallet.balanceEUR ?? 0);
  const normalizedBalance = Number.isFinite(rawBalance) ? toAmount(rawBalance) : 0;
  const pendingLedger = normalizedLedger.filter(entry=>entry.status==='in_attesa');
  const holdsFromLedger = pendingLedger
    .filter(entry=>entry.type==='hold')
    .reduce((sum, entry)=>sum + Math.abs(Number(entry.amountLLX ?? entry.netLLX ?? 0)), 0);
  const pendingOutFromLedger = pendingLedger
    .filter(entry=>entry.type==='transfer' || entry.type==='cashout')
    .reduce((sum, entry)=>sum + Math.abs(Number(entry.netLLX ?? entry.amountLLX ?? 0)), 0);
  const pendingInFromLedger = pendingLedger
    .filter(entry=>entry.type==='deposit')
    .reduce((sum, entry)=>sum + Math.max(0, Number(entry.amountLLX ?? entry.netLLX ?? 0)), 0);
  const positiveStreakDays = toAmount(wallet.positiveStreakDays ?? wallet.streakPositiveDays ?? 0);
  const confirmedCreditsValue = Number(wallet.confirmedCredits);
  const confirmedDebitsValue = Number(wallet.confirmedDebits);
  const hasConfirmedBreakdown = Number.isFinite(confirmedCreditsValue) || Number.isFinite(confirmedDebitsValue);
  const confirmedNet = hasConfirmedBreakdown
    ? (Number.isFinite(confirmedCreditsValue) ? confirmedCreditsValue : 0) - (Number.isFinite(confirmedDebitsValue) ? confirmedDebitsValue : 0)
    : Number(wallet.confirmed ?? normalizedBalance ?? 0);
  const holds = ('holds' in wallet)
    ? toAmount(wallet.holds)
    : toAmount(holdsFromLedger);
  const pendingIn = ('pendingIn' in wallet)
    ? toAmount(wallet.pendingIn)
    : toAmount(pendingInFromLedger);
  const pendingOut = ('pendingOut' in wallet)
    ? toAmount(wallet.pendingOut)
    : toAmount(pendingOutFromLedger);
  const walletState = {
    balanceLLX: normalizedBalance,
    balanceEUR: normalizedBalance,
    balance: normalizedBalance,
    ledger: normalizedLedger,
    streakPositiveDays: positiveStreakDays,
    positiveStreakDays,
    confirmed: toAmount(confirmedNet),
    holds,
    pendingIn,
    pendingOut
  };
  if(hasConfirmedBreakdown){
    walletState.confirmedCredits = toAmount(Number.isFinite(confirmedCreditsValue) ? confirmedCreditsValue : 0);
    walletState.confirmedDebits = toAmount(Number.isFinite(confirmedDebitsValue) ? confirmedDebitsValue : 0);
  }
  state.wallet = walletState;
  state.walletCounter = state.wallet.ledger.length;
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
  const operationLabels = { deposit: 'Ricarica LLX', transfer: 'Trasferimento', cashout: 'Cash-out' };
  const cashoutBrackets = [
    {id:'low', min:0, max:499.99, rate:0.05, label:'< 500 LLX'},
    {id:'mid', min:500, max:999.99, rate:0.02, label:'500–999 LLX'},
    {id:'high', min:1000, max:Infinity, rate:0, label:'≥ 1000 LLX'}
  ];

  function roundLLX(value){
    const numeric = Number(value);
    if(!Number.isFinite(numeric)) return NaN;
    return Math.round(numeric * 100) / 100;
  }

  function getEffectiveAvailable(currentState=state){
    const wallet = currentState.wallet || {};
    const hasBreakdown = wallet.confirmedCredits != null || wallet.confirmedDebits != null;
    const confirmedCredits = Number(wallet.confirmedCredits ?? 0) || 0;
    const confirmedDebits = Number(wallet.confirmedDebits ?? 0) || 0;
    const baseConfirmed = hasBreakdown
      ? confirmedCredits - confirmedDebits
      : Number(wallet.confirmed ?? wallet.balance ?? wallet.balanceLLX ?? 0) || 0;
    const holds = Number(wallet.holds ?? 0) || 0;
    const pendingOut = Number(wallet.pendingOut ?? 0) || 0;
    // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    return roundLLX(baseConfirmed - holds - pendingOut);
  }

  function getActivityTierFromEff(currentState=state){
    const eff = getEffectiveAvailable(currentState);
    // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    if(eff >= 1000) return ACTIVITY_TIERS.find(t=>t.id==='royal') || ACTIVITY_TIERS[ACTIVITY_TIERS.length-1];
    if(eff >= 500) return ACTIVITY_TIERS.find(t=>t.id==='access') || ACTIVITY_TIERS[1] || ACTIVITY_TIERS[0];
    return ACTIVITY_TIERS.find(t=>t.id==='base') || ACTIVITY_TIERS[0];
  }

  const POSITIVE_STREAK_THRESHOLD = 30;

  function getPositiveStreakDays(){
    return Number(state.wallet?.positiveStreakDays ?? state.wallet?.streakPositiveDays ?? 0) || 0;
  }

  function hasPositiveBalanceReward(){
    return getPositiveStreakDays() >= POSITIVE_STREAK_THRESHOLD;
  }

  function getNextTier(tier){
    const idx = ACTIVITY_TIERS.findIndex(t=>t.id===tier.id);
    return idx>=0 && idx<ACTIVITY_TIERS.length-1 ? ACTIVITY_TIERS[idx+1] : null;
  }

  function computeProgress(tier, available){
    const nextTier = getNextTier(tier);
    if(!nextTier){
      return {ratio:1,current:available,target:available,missing:0,nextTier:null};
    }
    const span = (nextTier.min ?? available) - (tier.min ?? 0);
    const ratio = span <= 0 ? 1 : Math.min(Math.max((available - (tier.min ?? 0)) / span, 0), 1);
    const missing = Math.max(0, (nextTier.min ?? available) - available);
    return {ratio, current:available, target:nextTier.min, missing, nextTier};
  }

  function computeStats(){
    const pendingPositive = roundLLX(state.wallet.pendingIn ?? 0);
    const holdsValue = roundLLX(state.wallet.holds ?? 0);
    const pendingOutValue = roundLLX(state.wallet.pendingOut ?? 0);
    const pendingNegativeRaw = -((holdsValue || 0) + (pendingOutValue || 0));
    const pendingNegative = Math.abs(pendingNegativeRaw) < 0.005 ? 0 : roundLLX(pendingNegativeRaw);
    const available = getEffectiveAvailable(state); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    return {pendingPositive: pendingPositive || 0, pendingNegative, available, holds: holdsValue, pendingOut: pendingOutValue};
  }

  function getCashoutBracket(amount){
    const gross = Number(amount) || 0;
    return cashoutBrackets.find(bracket=>gross >= (bracket.min ?? 0) && gross <= bracket.max) || cashoutBrackets[cashoutBrackets.length-1];
  }

  function previewDeposit(amount, currentState=state){
    const tier = getActivityTierFromEff(currentState); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    const effBefore = getEffectiveAvailable(currentState); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    const cleanAmount = roundLLX(amount);
    if(!Number.isFinite(cleanAmount) || cleanAmount <= 0){
      return {
        valid:false,
        reason:'Inserisci un importo maggiore di zero.',
        type:'deposit',
        label:operationLabels.deposit,
        availableBefore: effBefore,
        tierId: tier.id,
        tierLabel: tier.label,
        pendingInImpact: 0,
        pendingOutImpact: 0,
        totalDebit: 0
      };
    }
    const feeRate = tier.depositFee;
    const feeLLX = roundLLX(cleanAmount * feeRate);
    const totalDebit = roundLLX(cleanAmount + feeLLX);
    const amountSigned = cleanAmount;
    const netLLX = roundLLX(amountSigned - feeLLX);
    const effAfter = roundLLX(effBefore + cleanAmount);
    return {
      valid:true,
      type:'deposit',
      label: operationLabels.deposit,
      amount: cleanAmount,
      amountSigned,
      feeRate,
      feeLLX,
      totalDebit,
      netLLX,
      resultingBalance: effAfter,
      availableBefore: effBefore,
      tierId: tier.id,
      tierLabel: tier.label,
      feeTooltip: `Stato ${tier.label}: fee ricarica ${formatPercent(feeRate)}.`,
      promoActive: false,
      pendingInImpact: cleanAmount,
      pendingOutImpact: 0,
      effAfter
    };
  }

  function previewTransfer(amount, currentState=state){
    const tier = getActivityTierFromEff(currentState); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    const effBefore = getEffectiveAvailable(currentState); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    const cleanAmount = roundLLX(amount);
    if(!Number.isFinite(cleanAmount) || cleanAmount <= 0){
      return {
        valid:false,
        reason:'Inserisci un importo maggiore di zero.',
        type:'transfer',
        label:operationLabels.transfer,
        availableBefore: effBefore,
        tierId: tier.id,
        tierLabel: tier.label,
        pendingOutImpact: 0,
        totalDebit: 0
      };
    }
    const feeRate = tier.transferFee;
    const feeLLX = roundLLX(cleanAmount * feeRate);
    const totalOut = roundLLX(cleanAmount + feeLLX);
    if(totalOut > effBefore + 0.005){
      return {
        valid:false,
        reason:`Totale ${formatLLX(totalOut)} supera il saldo disponibile (${formatLLX(effBefore)}).`,
        type:'transfer',
        label:operationLabels.transfer,
        availableBefore: effBefore,
        tierId: tier.id,
        tierLabel: tier.label,
        pendingOutImpact: 0,
        totalDebit: totalOut
      };
    }
    const amountSigned = -cleanAmount;
    const netLLX = roundLLX(amountSigned - feeLLX);
    const effAfter = roundLLX(effBefore - totalOut);
    return {
      valid:true,
      type:'transfer',
      label: operationLabels.transfer,
      amount: cleanAmount,
      amountSigned,
      feeRate,
      feeLLX,
      totalDebit: totalOut,
      netLLX,
      resultingBalance: effAfter,
      availableBefore: effBefore,
      tierId: tier.id,
      tierLabel: tier.label,
      feeTooltip: `Stato ${tier.label}: fee trasferimento ${formatPercent(feeRate)}.`,
      promoActive: false,
      pendingOutImpact: totalOut,
      effAfter
    };
  }

  function previewCashout(amount, currentState=state){
    const effBefore = getEffectiveAvailable(currentState); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    const promoActive = hasPositiveBalanceReward();
    const cleanAmount = roundLLX(amount);
    if(!Number.isFinite(cleanAmount) || cleanAmount <= 0){
      return {
        valid:false,
        reason:'Inserisci un importo maggiore di zero.',
        type:'cashout',
        label:operationLabels.cashout,
        availableBefore: effBefore,
        promoActive,
        pendingOutImpact: 0,
        totalDebit: 0,
        streakOk: promoActive
      };
    }
    const bracket = getCashoutBracket(cleanAmount);
    const feeRate = promoActive ? 0 : bracket.rate;
    const feeLLX = roundLLX(cleanAmount * feeRate);
    const totalOut = roundLLX(cleanAmount + feeLLX);
    if(cleanAmount > effBefore + 0.005){
      return {
        valid:false,
        reason:`Importo ${formatLLX(cleanAmount)} supera il saldo disponibile (${formatLLX(effBefore)}).`,
        type:'cashout',
        label:operationLabels.cashout,
        availableBefore: effBefore,
        promoActive,
        pendingOutImpact: 0,
        totalDebit: totalOut,
        bracket,
        streakOk: promoActive
      };
    }
    const amountSigned = -cleanAmount;
    const netLLX = roundLLX(amountSigned - feeLLX);
    const effAfter = roundLLX(effBefore - cleanAmount);
    const feeTooltip = promoActive
      ? 'Promo saldo positivo attiva: cash-out gratuito.'
      : `Cash-out ${bracket.label}: fee ${formatPercent(feeRate)}.`;
    return {
      valid:true,
      type:'cashout',
      label: operationLabels.cashout,
      amount: cleanAmount,
      amountSigned,
      feeRate,
      feeLLX,
      totalDebit: totalOut,
      netLLX,
      resultingBalance: effAfter,
      availableBefore: effBefore,
      tierId: null,
      tierLabel: null,
      feeTooltip,
      promoActive,
      bracket,
      pendingOutImpact: cleanAmount,
      effAfter,
      streakOk: promoActive
    };
  }

  function renderDistinta(container, preview, context={}){
    if(!container) return;
    if(!preview || !preview.valid){
      const reason = preview?.reason || 'Inserisci un importo per vedere la distinta costi.';
      container.classList.remove('final');
      container.innerHTML = `<p class="muted">${escapeHtml(reason)}</p>`;
      return;
    }
    const feePercent = formatPercent(preview.feeRate ?? 0);
    const feeValue = preview.feeLLX ? formatLLX(-preview.feeLLX) : formatLLX(0);
    const netClass = preview.netLLX >= 0 ? 'positive' : 'negative';
    const netValue = formatLLX(preview.netLLX);
    const resultValue = formatLLX(preview.resultingBalance);
    const currentValue = formatLLX(preview.availableBefore);
    const tierRow = preview.tierLabel ? `<li><span>Stato Attività</span><strong>${escapeHtml(preview.tierLabel)}</strong></li>` : '';
    const bracketRow = preview.bracket?.label ? `<li><span>Fascia cash-out</span><strong>${escapeHtml(preview.bracket.label)}</strong></li>` : '';
    const promoBadge = preview.type==='cashout' && preview.promoActive && preview.feeRate === 0
      ? '<span class="badge gold promo-badge">Saldo positivo → cash-out gratis</span>'
      : '';
    const finalNote = context.final ? '<p class="muted success">Operazione registrata in attesa di approvazione.</p>' : '';
    container.classList.toggle('final', Boolean(context.final));
    container.innerHTML = `
      <h4>Distinta operazione</h4>
      ${promoBadge}
      <ul class="distinta-list">
        <li><span>Operazione</span><strong>${escapeHtml(preview.label)}</strong></li>
        ${tierRow}
        ${bracketRow}
        <li><span>Importo</span><strong class="llx">${formatLLX(preview.amount)}</strong></li>
        <li><span>Fee</span><strong class="llx">${feeValue}</strong><em>${feePercent}</em></li>
        <li><span>Netto conto</span><strong class="llx ${netClass}">${netValue}</strong></li>
        <li><span>Saldo attuale</span><strong class="llx">${currentValue}</strong></li>
        <li><span>Saldo risultante</span><strong class="llx">${resultValue}</strong></li>
      </ul>
      ${finalNote}
    `;
  }

  function addLedgerEntry(entry){
    state.walletCounter += 1;
    const id = `L-${String(state.walletCounter).padStart(3,'0')}`;
    state.wallet.ledger = [{...entry, id}, ...state.wallet.ledger];
    renderWalletUI();
  }

  function buildLedgerEntry(type, data, preview){
    const method = (data.method || '').trim();
    const note = (data.notes || '').trim();
    let desc = '';
    if(type==='deposit'){
      desc = method ? `Ricarica via ${method}` : 'Ricarica LLX';
    } else if(type==='transfer'){
      desc = `Trasferimento a ${preview.recipient || data.recipient}`;
    } else {
      desc = method ? `Cash-out verso ${method}` : 'Cash-out';
    }
    if(note){
      desc += ` — ${note}`;
    }
    return {
      when: new Date().toISOString(),
      type,
      status: 'in_attesa',
      desc,
      typeLabel: operationLabels[type],
      amountLLX: preview.amountSigned,
      feeLLX: preview.feeLLX,
      netLLX: preview.netLLX,
      feeRate: preview.feeRate,
      feeTooltip: preview.feeTooltip,
      promoActive: preview.promoActive,
      amountEUR: preview.amountSigned,
      feeEUR: preview.feeLLX
    };
  }

  function recordDeposit(preview, data){
    const entry = buildLedgerEntry('deposit', data, preview);
    if(Number.isFinite(preview.pendingInImpact)){
      const current = Number(state.wallet.pendingIn ?? 0) || 0;
      state.wallet.pendingIn = roundLLX(current + Math.max(0, preview.pendingInImpact || 0));
    }
    addLedgerEntry(entry);
  }

  function recordTransfer(preview, data){
    const entry = buildLedgerEntry('transfer', data, preview);
    const impact = Math.abs(preview.pendingOutImpact ?? 0);
    if(impact){
      const current = Number(state.wallet.pendingOut ?? 0) || 0;
      state.wallet.pendingOut = roundLLX(current + impact); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    }
    addLedgerEntry(entry);
  }

  function recordCashout(preview, data){
    const entry = buildLedgerEntry('cashout', data, preview);
    const impact = Math.abs(preview.pendingOutImpact ?? 0);
    if(impact){
      const current = Number(state.wallet.pendingOut ?? 0) || 0;
      state.wallet.pendingOut = roundLLX(current + impact); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    }
    addLedgerEntry(entry);
  }

  function renderWalletUI(){
    const stats = computeStats();
    const tier = getActivityTierFromEff(state); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
    const progress = computeProgress(tier, stats.available);
    const promoActive = hasPositiveBalanceReward();
    const confirmedBalance = Number(state.wallet.confirmed ?? state.wallet.balanceLLX) || 0;
    cardContainer.innerHTML = WalletCard({
      balanceLLX: confirmedBalance,
      availableLLX: stats.available,
      pendingPositive: stats.pendingPositive,
      pendingNegative: stats.pendingNegative,
      tier,
      nextTier: progress.nextTier,
      progress,
      streakDays: getPositiveStreakDays(),
      promoActive
    });
    ledgerContainer.innerHTML = LedgerTable(state.wallet.ledger);
  }

  function openWalletModal(type){
    let title='';
    let form='';
    if(type==='deposit'){
      title='Ricarica LLX';
      form=`<form id="wallet-form" class="wallet-form">
        <label>Importo (LLX)<br><input class="input" name="amount" type="number" min="0" step="0.01" required></label>
        <label>Metodo<br><select class="input" name="method">
          <option value="Bonifico">Bonifico</option>
          <option value="Carta">Carta</option>
          <option value="Wallet esterno">Wallet esterno</option>
        </select></label>
        <label>Note<br><input class="input" name="notes" placeholder="Note interne"></label>
      </form>`;
    } else if(type==='transfer'){
      title='Trasferisci LLX';
      const options = (state.members || []).map(m=>`<option value="${m.code}">${escapeHtml(m.fullName)} (${m.code})</option>`).join('');
      form=`<form id="wallet-form" class="wallet-form">
        <label>Importo (LLX)<br><input class="input" name="amount" type="number" min="0" step="0.01" required></label>
        <label>Destinatario<br><input class="input" name="recipient" list="wallet-members" placeholder="Codice cliente" required></label>
        <datalist id="wallet-members">${options}</datalist>
        <label>Note<br><input class="input" name="notes" placeholder="Motivazione"></label>
      </form>`;
    } else {
      title='Cash-out';
      form=`<form id="wallet-form" class="wallet-form">
        <label>Importo (LLX)<br><input class="input" name="amount" type="number" min="0" step="0.01" required></label>
        <label>Metodo<br><select class="input" name="method">
          <option value="IBAN">IBAN</option>
          <option value="Carta">Carta</option>
          <option value="Wallet esterno">Wallet esterno</option>
        </select></label>
        <label>Note<br><input class="input" name="notes" placeholder="Note"></label>
      </form>`;
    }
    const distintaBox = '<div class="distinta" id="wallet-distinta"><p class="muted">Inserisci un importo per vedere la distinta costi.</p></div>';
    openModal(Modal('wallet-modal',title,`${form}${distintaBox}`,
      `${Button('gold','Conferma','type="button" id="wallet-submit" disabled')} ${Button('ghost','Annulla','type="button" id="modal-close"')}`));
    const formEl = document.getElementById('wallet-form');
    const submitBtn = document.getElementById('wallet-submit');
    const closeBtn = document.getElementById('modal-close');
    const distintaEl = document.getElementById('wallet-distinta');
    let currentPreview = null;

    function updatePreview(){
      const amountValue = formEl.elements['amount']?.value;
      let preview;
      if(type==='deposit') preview = previewDeposit(amountValue, state);
      else if(type==='transfer') preview = previewTransfer(amountValue, state);
      else preview = previewCashout(amountValue, state);
      if(type==='transfer'){
        const recipient = formEl.elements['recipient']?.value?.trim();
        if(!recipient){
          preview = {...preview, valid:false, reason:'Inserisci un codice destinatario valido.'};
        } else if(!state.membersIndex?.has(recipient)){
          preview = {...preview, valid:false, reason:'Destinatario non trovato in anagrafica.'};
        } else if(preview.valid){
          preview.recipient = recipient;
        }
      }
      renderDistinta(distintaEl, preview, {final:false});
      if(preview.valid){
        currentPreview = preview;
        submitBtn.disabled = false;
      } else {
        currentPreview = null;
        submitBtn.disabled = true;
      }
    }

    formEl.addEventListener('input', updatePreview);
    formEl.addEventListener('change', updatePreview);
    closeBtn.addEventListener('click', closeModal);
    updatePreview();

    submitBtn.addEventListener('click', ()=>{
      if(!currentPreview){
        showToast('Controlla i dati inseriti prima di continuare.','warn');
        return;
      }
      if(type==='transfer'){
        const recipient = currentPreview.recipient;
        if(!recipient || !state.membersIndex?.has(recipient)){
          showToast('Destinatario non valido.','warn');
          return;
        }
      }
      if(type!=='deposit'){
        const latestAvailable = getEffectiveAvailable(state); // PERCENT FIX: use availableEff (confirmed - holds - pendingOut)
        const totalImpact = Math.abs(currentPreview.pendingOutImpact ?? 0);
        if(totalImpact > latestAvailable + 0.005){
          showToast('Saldo disponibile insufficiente per completare l\'operazione.','warn');
          updatePreview();
          return;
        }
      }
      const data = Object.fromEntries(new FormData(formEl).entries());
      // TODO: sostituire con chiamata API reale per registrare l'operazione sul backend
      if(type==='deposit') recordDeposit(currentPreview, data);
      else if(type==='transfer') recordTransfer(currentPreview, data);
      else recordCashout(currentPreview, data);
      renderDistinta(distintaEl, currentPreview, {final:true});
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registrato';
      Array.from(formEl.elements).forEach(el=>{ el.disabled = true; });
      closeBtn.textContent = 'Chiudi';
      showToast('Operazione registrata in attesa di approvazione (demo).','info');
    });
  }

  document.getElementById('wallet-deposit')?.addEventListener('click',()=>openWalletModal('deposit'));
  document.getElementById('wallet-transfer')?.addEventListener('click',()=>openWalletModal('transfer'));
  document.getElementById('wallet-cashout')?.addEventListener('click',()=>openWalletModal('cashout'));
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
