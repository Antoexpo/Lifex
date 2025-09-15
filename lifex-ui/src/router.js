// Minimal hash router
export function initRouter(routes){
  function render(){
    const hash = location.hash || '#/dashboard';
    const route = hash.replace('#','');
    routes[route]?.();
    // update active link
    document.querySelectorAll('.sidebar a').forEach(a=>{
      if(a.getAttribute('href')===hash) a.classList.add('active');
      else a.classList.remove('active');
    });
  }
  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', render);
}
