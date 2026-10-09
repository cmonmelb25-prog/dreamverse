importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// This file provides the authoritative "receiving end" for the browser's internal 
// messaging port. It is required by the Firebase Messaging SDK.

firebase.initializeApp({
  apiKey: "AIzaSyChsWRslftLrirNIJRO90bStu4FZuN3yDQ",
  authDomain: "studio-6071976643-3737c.firebaseapp.com",
  projectId: "studio-6071976643-3737c",
  storageBucket: "studio-6071976643-3737c.firebasestorage.app",
  messagingSenderId: "371242700588",
  appId: "1:371242700588:web:9d68f62e5e30303528a689"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
