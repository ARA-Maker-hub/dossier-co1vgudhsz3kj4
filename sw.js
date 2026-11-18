/* Service worker du carnet : affiche la notification quand le service d'envoi pousse un signal (sans contenu). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  e.waitUntil(self.registration.showNotification('Brigade des chats', {
    body: 'Un nouveau procès-verbal vous attend, stagiaire Rosato.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'pv-du-jour'
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) { if ('focus' in l[i]) return l[i].focus(); }
    return self.clients.openWindow('./');
  }));
});
