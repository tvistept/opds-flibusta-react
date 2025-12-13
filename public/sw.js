self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("fetch", event => {
  // ничего не кешируем специально — прокси и так живой
});
