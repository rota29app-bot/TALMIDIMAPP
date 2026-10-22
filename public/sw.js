// ROTA29 PWA — online first, sem cache de login, usuários ou dados privados.
const CACHE="rota29-static-v1";
self.addEventListener("install", event => {
  // Fallback offline disponível mesmo sem visita prévia à página.
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(["/offline.html", "/brand/rota29-icon.svg", "/brand/rota29-symbol-negative.svg"]))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  // Toda navegação e autenticação vêm sempre da rede.
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(()=>caches.match("/offline.html")
      .then(res=>res||new Response("ROTA29 indisponível sem conexão.",{status:503}))));
    return;
  }
  // Somente mídia estática pública; nunca API, HTML, Google Auth, Supabase.
  if(!/\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2|css|js)$/i.test(url.pathname))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok&&response.type==="basic"){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch{
      return await caches.match(request)||Response.error();
    }
  })());
});
