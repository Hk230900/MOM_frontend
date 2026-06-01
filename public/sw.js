self.addEventListener('push', function(event) {
  let data = { title: 'MOM Reminder', body: 'You have a scheduled calendar reminder.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'MOM Reminder', body: event.data.text() };
    }
  }
  
  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard/calendar'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data ? event.notification.data.url : '/dashboard/calendar';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      // If a dashboard window is already open, focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf(urlToOpen) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
