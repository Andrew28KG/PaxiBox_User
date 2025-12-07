// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUNxHKkWEc-HQG6ibe8kEtaRFc1eRmRFQ",
  authDomain: "paxibox.firebaseapp.com",
  databaseURL: "https://paxibox-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "paxibox",
  storageBucket: "paxibox.firebasestorage.app",
  messagingSenderId: "994249307432",
  appId: "1:994249307432:web:2cf693e9bddc7f9c9ccc1d",
  measurementId: "G-ZBS33VQ541"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Get form elements
const form = document.getElementById('serialForm');
const serialInput = document.getElementById('serialNumber');
const submitBtn = document.getElementById('submitBtn');
const messageDiv = document.getElementById('message');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const serialNumber = serialInput.value.trim();
    
    if (!serialNumber) {
        showMessage('Please enter a serial number', 'error');
        return;
    }
    
    // Disable form and show loading state
    setLoadingState(true);
    hideMessage();
    
    try {
        // Create a reference to the box serial numbers collection
        const boxSerialNumbersRef = ref(database, 'boxSerialNumbers');
        
        // Push the serial number with timestamp
        const newSerialRef = push(boxSerialNumbersRef);
        await set(newSerialRef, {
            serialNumber: serialNumber,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString()
        });
        
        // Success
        showMessage('Serial number saved successfully!', 'success');
        form.reset();
        
        // Clear message after 3 seconds
        setTimeout(() => {
            hideMessage();
        }, 3000);
        
    } catch (error) {
        console.error('Error saving serial number:', error);
        showMessage('Error saving serial number. Please try again.', 'error');
    } finally {
        setLoadingState(false);
    }
});

function setLoadingState(loading) {
    submitBtn.disabled = loading;
    serialInput.disabled = loading;
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

function hideMessage() {
    messageDiv.style.display = 'none';
    messageDiv.className = 'message';
}

