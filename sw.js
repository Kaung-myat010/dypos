const CACHE_NAME = 'dypos';

const URLS_TO_CACHE = [
  '/dypos/',
    '/dypos/index.html',
    '/dypos/icons/icon-192x192.png',
    '/dypos/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/html5-qrcode'
];

// Install event: Service Worker ကို install လုပ်သည့်အခါ အလုပ်လုပ်သည်။
// ဤနေရာတွင် App Shell ကို cache လုပ်ပါမည်။
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Activate event: Service Worker အသစ် activate ဖြစ်သည့်အခါ အလုပ်လုပ်သည်။
// ဤနေရာတွင် cache အဟောင်းများကို ရှင်းလင်းပါမည်။
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: App က network request တစ်ခုခုပြုလုပ်တိုင်း အလုပ်လုပ်သည်။
// ဤနေရာတွင် Cache-First strategy ကိုသုံးပါမည်။
self.addEventListener('fetch', event => {
  // GET request မဟုတ်လျှင် service worker ကကြားမဝင်ပါ။
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    // 1. Cache ထဲတွင် request နှင့်တူညီသော response ရှိမရှိ ရှာဖွေပါ။
    caches.match(event.request)
      .then(cachedResponse => {
        // 2. Cache ထဲတွင် ရှိလျှင် cache မှ response ကိုပြန်ပေးပါ။
        if (cachedResponse) {
          return cachedResponse;
        }

        // 3. Cache ထဲတွင် မရှိလျှင် network မှတဆင့် သွားယူပါ။
        return fetch(event.request).then(
          networkResponse => {
            // Network မှ response ရလျှင်၊ ၎င်းကို cache ထဲသို့ထည့်ပြီး browser သို့ပြန်ပေးပါ။
            // Response ကို clone လုပ်ရန်လိုအပ်သည်၊ အကြောင်းမှာ response သည် stream ဖြစ်ပြီး တစ်ကြိမ်သာသုံးနိုင်သည်။
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // cross-origin request များကို cache မလုပ်ရန် စစ်ဆေးပါ။
                // cdnjs.cloudflare.com ကဲ့သို့သော CDN များအတွက် ဤစစ်ဆေးမှုကို ဖယ်ရှားနိုင်သည် သို့မဟုတ် ချိန်ညှိနိုင်သည်။
                if (
                  event.request.url.startsWith(self.location.origin) ||
                  event.request.url.includes('cloudflare') ||
                  event.request.url.includes('unpkg')
                ) {
                  cache.put(event.request, responseToCache);
                }
              });
              
            return networkResponse;
          }
        ).catch(error => {
          // Network connection မရှိလျှင် (offline ဖြစ်နေလျှင်) ဤနေရာသို့ရောက်လာမည်။
          // ဤနေရာတွင် offline fallback page တစ်ခုကိုပြသနိုင်သည် (optional)။
          console.error('Fetch failed; returning offline page instead.', error);
          // ဥပမာ - return caches.match('/offline.html');
        });
      })
  );
});