// Firebase Cloud Messaging Service Worker
// Questo file deve essere nella cartella public/

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtHk4z_uKJw_LTKp0ihkjqDgM2kCe0IuM",
  authDomain: "nomadiqe-622fa.firebaseapp.com",
  projectId: "nomadiqe-622fa",
  storageBucket: "nomadiqe-622fa.firebasestorage.app",
  messagingSenderId: "642815661506",
  appId: "1:642815661506:web:c0002ddec9fe938920b25b",
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload)
  
  const notificationTitle = payload.notification?.title || 'Nuova notifica'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icon.png',
    badge: '/icon.png',
    tag: payload.data?.type || 'notification',
    data: payload.data,
    requireInteraction: false,
    silent: false,
    sound: 'default',
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})


