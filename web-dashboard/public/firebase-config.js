const firebaseConfig = {
  apiKey: "AIzaSyA4LgTu0sUyzC_eleQhasUQEQ7b3jNBcJE",
  authDomain: "vajrasafe.firebaseapp.com",
  databaseURL: "https://vajrasafe-default-rtdb.firebaseio.com",
  projectId: "vajrasafe",
  storageBucket: "vajrasafe.firebasestorage.app",
  messagingSenderId: "600593884908",
  appId: "1:600593884908:web:496c3c243a21bd749727c9",
  measurementId: "G-BLY7MZ9FKE"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();