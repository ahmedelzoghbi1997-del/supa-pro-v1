
// This service worker handles push notifications
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png', // Ensure you have an icon at this path
      badge: '/badge-72x72.png', // Optional badge icon
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
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
