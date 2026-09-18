
// This service worker handles push notifications for Web Push API
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_err) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'المحاسب الزراعي';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-icon.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || {
      dateOfArrival: Date.now(),
      url: '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && 'focus' in client) {
          var clientUrl = new URL(client.url, self.location.origin);
          if (clientUrl.origin === self.location.origin) {
            if ('navigate' in client) {
              client.navigate('/');
            }
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
