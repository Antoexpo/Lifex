const API = 'http://localhost:3000';
const app = document.getElementById('app');

function setTokens(tokens){
  if(tokens.access) localStorage.setItem('access', tokens.access);
  if(tokens.refresh) localStorage.setItem('refresh', tokens.refresh);
}

async function api(path, options={}){
  const headers = options.headers || {};
  const access = localStorage.getItem('access');
  if(access) headers['Authorization'] = 'Bearer ' + access;
  const res = await fetch(API + path, { ...options, headers });
  if(res.status===401 && localStorage.getItem('refresh')){
    const r = await fetch(API + '/auth/refresh', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token: localStorage.getItem('refresh')})});
    if(r.ok){
      const d= await r.json();
      setTokens({access:d.access});
      return api(path, options);
    }
  }
  return res;
}

function navigate(){
  const hash = location.hash || '#login';
  if(hash === '#login') renderLogin();
  if(hash === '#register') renderRegister();
  if(hash === '#home') renderHome();
}

async function renderLogin(){
  app.innerHTML = `<h2>Login</h2>
    <form id="loginForm">
    <input name="email" type="email" placeholder="Email" required />
    <input name="password" type="password" placeholder="Password" required />
    <button type="submit">Login</button>
    </form>
    <p>Or <a href="#register">register</a></p>`;
  document.getElementById('loginForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const form = new FormData(e.target);
    const res = await fetch(API + '/auth/login',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(form))});
    const data = await res.json();
    if(res.ok){
      setTokens(data);
      location.hash = '#home';
    }else{
      alert(data.error?.message || JSON.stringify(data));
    }
  });
}

async function renderRegister(){
  app.innerHTML = `<h2>Register</h2>
    <form id="regForm">
    <input name="email" type="email" placeholder="Email" required />
    <input name="password" type="password" placeholder="Password" required />
    <input name="referralCode" type="text" placeholder="Referral Code" />
    <button type="submit">Create</button>
    </form>
    <p>Have account? <a href="#login">Login</a></p>`;
  document.getElementById('regForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const form = new FormData(e.target);
    const res = await fetch(API + '/auth/register',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(form))});
    const data = await res.json();
    if(res.ok){
      alert('Registered. Your referral code: '+data.referralCode);
      location.hash = '#login';
    }else{
      alert(data.error?.message || JSON.stringify(data));
    }
  });
}

async function renderHome(){
  const res = await api('/me');
  if(res.status!==200){ location.hash='#login'; return; }
  const me = await res.json();
  app.innerHTML = `<nav><a href="#home">Home</a> <a href="#login" id="logout">Logout</a></nav>
  <h2>Welcome ${me.email}</h2>
  <p>Subscription: ${me.subscription}</p>
  <p>Wallet Balance: €${me.wallet}</p>
  <p>Your referral code: ${me.referralCode}</p>
  <button id="pay">Pay Membership</button>`;
  document.getElementById('logout').onclick = ()=>{ localStorage.clear(); };
  document.getElementById('pay').onclick = async ()=>{
    const r = await api('/subscriptions/pay', {method:'POST'});
    const d = await r.json();
    if(r.ok){ alert('Paid until '+d.expireAt); renderHome(); }
    else alert(JSON.stringify(d));
  };
}

window.addEventListener('hashchange', navigate);
navigate();
