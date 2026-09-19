
// This service worker handles push notifications for Web Push API
self.addEventListener('push', function(event) {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_err) {
      payload = { body: event.data.text() };
    }
  }

  // دعم قراءة البيانات سواء كانت مغلّفة داخل payload.data أو payload.notification أو مباشرة في payload
  const innerData = payload.data || payload.notification || payload;

  const title = innerData.title || payload.title || 'المحاسب الزراعي';
  const body = innerData.body || payload.body || 'لديك إشعار جديد';

  const options = {
    body: body,
    // روابط كاملة ومباشرة لمنع فشل التحميل أو المربع الأبيض في الخلفية
    icon: innerData.icon || 'https://supa-pro-v1.vercel.app/icon-192x192.png',
    badge: innerData.badge || 'https://supa-pro-v1.vercel.app/badge-icon.png',
    vibrate: innerData.vibrate || payload.vibrate || [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      url: innerData.route || innerData.url || payload.url || '/',
      table: innerData.table || payload.table || ''
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
