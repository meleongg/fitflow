if(!self.define){let e,s={};const t=(t,n)=>(t=new URL(t+".js",n).href,s[t]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=t,e.onload=s,document.head.appendChild(e)}else e=t,importScripts(t),s()})).then((()=>{let e=s[t];if(!e)throw new Error(`Module ${t} didn’t register its module`);return e})));self.define=(n,a)=>{const i=e||("document"in self?document.currentScript.src:"")||location.href;if(s[i])return;let r={};const c=e=>t(e,i),u={module:{uri:i},exports:r,require:c};s[i]=Promise.all(n.map((e=>u[e]||c(e)))).then((e=>(a(...e),r)))}}define(["./workbox-4754cb34"],(function(e){"use strict";importScripts("fallback-sWItC7PHEMDtK8hugkkNS.js"),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/app-build-manifest.json",revision:"10a905593206a61dd2d60e48472432a6"},{url:"/_next/static/chunks/173-c8304d6c18f5b9ca.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/200-f6bc92a21d38ebf4.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/235-dfd4981a0b5afffb.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/288-405cdcccf0f75b63.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/412-76c60feedf706509.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/4bd1b696-12bb1f6b6b332564.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/517-50e7293924435672.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/618-437e3b035d1c73e8.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/631.56fc1447c02c3dbd.js",revision:"56fc1447c02c3dbd"},{url:"/_next/static/chunks/651-1e05db2a2e765d0a.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/735.0efee747fa2d58e7.js",revision:"0efee747fa2d58e7"},{url:"/_next/static/chunks/795-da6c52b8b0177107.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/912-8046f9b36abdfa45.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/972-95445a26907b77c3.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/(auth-pages)/forgot-password/page-ff0ac359d06c7e9f.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/(auth-pages)/layout-29c03546f30822a9.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/(auth-pages)/sign-in/page-a71f8a2b847dc1e4.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/(auth-pages)/sign-up/page-0d7b16b85ed28d80.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/_not-found/page-448daa42fa6ae797.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/auth/callback/route-d7a5d77de1099351.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/layout-ac5e838baffaeb34.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/page-79735b6b9aa3b032.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/layout-83f84336869e7ef8.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/page-cabe633e770741da.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/reset-password/page-e5cc1c6078eee988.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/sessions/%5Bid%5D/page-576f659ddecfe6fb.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/workouts/%5Bid%5D/edit/page-a0c470c0f9530b3b.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/workouts/%5Bid%5D/page-24051f171bd80303.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/workouts/%5Bid%5D/session/page-954926b62133ec0b.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/workouts/create-workout/page-2643e283a1fe77c7.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/app/protected/workouts/page-47da7f5c1f04a2bf.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/framework-895c1583be5f925a.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/main-app-9ed6d2b4282ebb98.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/main-c4e0e98e941d5f11.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/pages/_app-abffdcde9d309a0c.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/pages/_error-94b8133dd8229633.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-ad76f60c6dc8168a.js",revision:"sWItC7PHEMDtK8hugkkNS"},{url:"/_next/static/css/b2f7e74f8004b14e.css",revision:"b2f7e74f8004b14e"},{url:"/_next/static/css/b3d4df57409b875d.css",revision:"b3d4df57409b875d"},{url:"/_next/static/media/569ce4b8f30dc480-s.p.woff2",revision:"ef6cefb32024deac234e82f932a95cbd"},{url:"/_next/static/media/ba015fad6dcf6784-s.woff2",revision:"8ea4f719af3312a055caf09f34c89a77"},{url:"/_next/static/sWItC7PHEMDtK8hugkkNS/_buildManifest.js",revision:"bb789616639da0e1f120f664d55e3c69"},{url:"/_next/static/sWItC7PHEMDtK8hugkkNS/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/icons/web-app-manifest-192x192.png",revision:"c5996a91fadba3b0d7ccf064f0968b16"},{url:"/icons/web-app-manifest-512x512.png",revision:"cea44df42723f3da915f95dd8915f32b"},{url:"/offline",revision:"sWItC7PHEMDtK8hugkkNS"}],{ignoreURLParametersMatching:[]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({request:e,response:s,event:t,state:n})=>s&&"opaqueredirect"===s.type?new Response(s.body,{status:200,statusText:"OK",headers:s.headers}):s},{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\.(?:mp4)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute((({url:e})=>{if(!(self.origin===e.origin))return!1;const s=e.pathname;return!s.startsWith("/api/auth/")&&!!s.startsWith("/api/")}),new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute((({url:e})=>{if(!(self.origin===e.origin))return!1;return!e.pathname.startsWith("/api/")}),new e.NetworkFirst({cacheName:"others",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET"),e.registerRoute((({url:e})=>!(self.origin===e.origin)),new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600}),{handlerDidError:async({request:e})=>self.fallback(e)}]}),"GET")}));
