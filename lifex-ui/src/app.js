import {Topbar, Sidebar, Card, Badge, Button, Table, FormField, Modal, formatCurrency, statusBadge, state} from './components.js';
import {initRouter} from './router.js';

const main = document.getElementById('main');
const sidebarEl = document.getElementById('sidebar');
const topbarEl = document.getElementById('topbar');
const modalEl = document.getElementById('modal');

async function loadData(){
  const [members,vehicles,orders,payouts] = await Promise.all([
    fetch('./data/members.json').then(r=>r.json()),
    fetch('./data/vehicles.json').then(r=>r.json()),
    fetch('./data/orders.json').then(r=>r.json()),
    fetch('./data/payouts.json').then(r=>r.json())
  ]);
  state.members=members; state.vehicles=vehicles; state.orders=orders; state.payouts=payouts;
}

function initLayout(){
  topbarEl.innerHTML = Topbar();
  sidebarEl.innerHTML = Sidebar(location.hash||'#/dashboard');
  document.getElementById('sidebar-toggle').addEventListener('click',()=>{
    sidebarEl.classList.toggle('open');
  });
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

// Renderers
async function renderDashboard(){
  const html = await fetch('./views/dashboard.html').then(r=>r.text());
  main.innerHTML = html;
  const metricsEl = document.getElementById('metrics');
  const activeMembers = state.members.filter(m=>m.status==='attivo').length;
  const availableVehicles = state.vehicles.filter(v=>v.status==='disponibile').length;
  const canoni = state.orders.filter(o=>o.type==='canone').reduce((s,o)=>s+o.amountEUR,0);
  const payoutsProg = state.payouts.filter(p=>p.status==='programmato').length;
  metricsEl.innerHTML = [
    Card('Membri attivi', `<strong>${activeMembers}</strong>`),
    Card('Veicoli disponibili', `<strong>${availableVehicles}</strong>`),
    Card('Canoni mese', `<strong>${formatCurrency(canoni)}</strong>`),
    Card('Pagamenti programmati', `<strong>${payoutsProg}</strong>`)
  ].join('');
  const pipelineEl = document.getElementById('pipeline');
  const recentOrders = state.orders.slice(-5).map(o=>`<li>${o.id} ${statusBadge(o.status)} ${formatCurrency(o.amountEUR)}</li>`).join('');
  const recentPayouts = state.payouts.slice(-5).map(p=>`<li>${p.id} ${statusBadge(p.status)} ${formatCurrency(p.amountEUR)}</li>`).join('');
  pipelineEl.innerHTML = `<h3>Ultimi ordini</h3><ul>${recentOrders}</ul><h3>Ultimi pagamenti</h3><ul>${recentPayouts}</ul>`;
}

async function renderMembers(){
  const html = await fetch('./views/members.html').then(r=>r.text());
  main.innerHTML = html;
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
    state.vehicles.forEach(v=>counts[v.status]++);
    cardsEl.innerHTML = [
      Card('Disponibile',counts.disponibile),
      Card('Noleggiato',counts.noleggiato),
      Card('Manutenzione',counts.manutenzione)
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

// Boot
(async function(){
  await loadData();
  initLayout();
  initRouter({
    '/dashboard': renderDashboard,
    '/members': renderMembers,
    '/vehicles': renderVehicles,
    '/orders': renderOrders,
    '/payouts': renderPayouts,
    '/settings': renderSettings
  });
})();

// TODO: integrate real auth and API calls
