import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Configuration Check ---
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

let config = null;
if (typeof window.__firebase_config !== 'undefined') {
    // Use user's hardcoded global object from firebase-config.js
    config = window.__firebase_config;
} else if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    // Use platform environment variable (JSON string)
    try { config = JSON.parse(__firebase_config); } catch (e) { console.error("Could not parse Firebase config string."); }
}

const firebaseConfig = config;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// ---------------------------

// Global Firebase service instances and state variables
let db = null;
let auth = null;
let userId = null;
let isAuthReady = false;

// Data Storage
const statsData = {
    // Data for the Radar Chart (Genin vs. Shippuden stats)
    labels: ['Ninjutsu', 'Taijutsu', 'Genjutsu', 'Intelligence', 'Strength', 'Speed', 'Stamina', 'Hand Seals'],
    datasets: [
        {
            label: 'Genin Era (Databook 1)',
            data: [1.5, 2.5, 1, 2.5, 1, 2, 1.5, 2],
            borderColor: 'rgba(167, 139, 250, 0.5)',
            backgroundColor: 'rgba(167, 139, 250, 0.2)',
            pointBackgroundColor: 'rgba(167, 139, 250, 1)',
            borderWidth: 2
        },
        {
            label: 'Shippuden Era (Databook 3)',
            data: [3, 3.5, 2.5, 3, 2.5, 2.5, 2, 3],
            borderColor: 'rgba(109, 40, 217, 1)',
            backgroundColor: 'rgba(109, 40, 217, 0.2)',
            pointBackgroundColor: 'rgba(109, 40, 217, 1)',
            borderWidth: 2
        }
    ]
};

const timelineData = {
    // Data objects for the interactive chronological narrative sections
    childhood: {
        title: "The Reluctant Heiress",
        text: "Born as the eldest daughter of Hiashi Hyuga, Hinata was trained to lead the clan. However, her gentle nature was seen as a weakness. After being defeated by her younger sister Hanabi, she was deemed unsuited for leadership and left to Kurenai Yuhi's care. It was here she began watching Naruto Uzumaki, finding strength in his refusal to give up.",
        stats: "Age: 12 | Rank: Genin | Signature: None yet",
        color: "bg-purple-100"
    },
    chunin: {
        title: "The Chunin Exams",
        text: "A turning point. Facing her prodigy cousin Neji, Hinata refused to withdraw despite being outmatched. Fueled by Naruto's encouragement, she stood her ground, declaring her own nindo. Though she lost the match, she won a victory over her own fears, earning the respect of Naruto and the audience.",
        stats: "Age: 13 | Rank: Genin | Signature: Byakugan Activation",
        color: "bg-purple-200"
    },
    shippuden: {
        title: "Pain's Assault",
        text: "When Pain pinned Naruto down, no one dared to intervene—except Hinata. Knowing she couldn't win, she stepped in to protect him, confessing her love for the first time. Her sacrifice triggered Naruto's transformation into the Six-Tails, ultimately leading to his victory. She showcased the 'Twin Lion Fists' technique.",
        stats: "Age: 16 | Rank: Chunin | Signature: Gentle Step Twin Lion Fists",
        color: "bg-indigo-100"
    },
    war: {
        title: "The Last & The War",
        text: "During the Fourth Great Ninja War, she stood by Naruto after Neji's death, slapping sense back into him when he faltered. Later, in 'The Last', she became the Hamura Chakra recipient, essential in stopping Toneri Otsutsuki and the falling moon. She and Naruto finally shared their first kiss.",
        stats: "Age: 19 | Rank: Chunin/Jonin Level | Signature: Eight Trigrams Sixty-Four Palms",
        color: "bg-indigo-200"
    },
    boruto: {
        title: "Era of Boruto",
        text: "Now a mother to Boruto and Himawari and wife to the Seventh Hokage. She is a master of the Gentle Fist, rumored to have defeated Hanabi in a sparring match to maintain her skills. She is the anchor of the Uzumaki household, blending strictness with immense love.",
        stats: "Age: 32+ | Status: Head of Uzumaki Household | Signature: Mastered Gentle Fist",
        color: "bg-pink-100"
    }
};

const quotes = [
    // Array of motivational quotes for the Shrine section
    "I used to always cry and give up... I made many wrong turns... But you... You helped me find the right path.",
    "I will never go back on my word... because that is my ninja way too!",
    "Because I love you.",
    "You make mistakes... but because of those mistakes... you get the strength to stand up to them. That's why I think you are truly strong.",
    "Stand up, Naruto! Never go back on your word... that is your Ninja Way, right?"
];


/**
 * Initializes Firebase, authenticates the user, and sets up the application based on connectivity.
 * This function must run before any Firestore operations.
 */
async function initFirebase() {
    if (!firebaseConfig) {
        // Handle case where config is missing (running without platform variables/config file)
        console.error("Firebase configuration is missing. Running in local-only mode. The global counter will NOT persist or update.");
        document.getElementById('worship-text').innerText = "Running locally. Global count is disabled.";
        document.getElementById('worship-counter').innerText = "LOCAL";
        document.getElementById('worship-btn').disabled = true;
        document.getElementById('shrine-loading').style.display = 'none';
        
        setupApp(false); // Initialize UI without Firebase backend
        return;
    }

    try {
        // 1. Initialize Firebase Services: Connecting to the project's services.
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // 2. Wait for Authentication State to be Resolved: Ensures we know the user's identity before proceeding.
        await new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    try {
                        if (initialAuthToken) {
                            // Platform authentication: Sign in using a provided custom token.
                            await signInWithCustomToken(auth, initialAuthToken);
                        } else {
                            // Public access: Fallback to anonymous sign-in for tracking and security rules.
                            await signInAnonymously(auth);
                        }
                    } catch (error) {
                        console.error("Firebase Authentication Error:", error);
                    }
                }
                // 3. Finalize Auth state
                userId = auth.currentUser?.uid || 'anonymous';
                document.getElementById('user-id-display').innerText = `User ID: ${userId}`;
                isAuthReady = true;
                unsubscribe();
                resolve();
            });
        });

        console.log("Firebase initialized. User ID:", userId);
        setupApp(true); // Initialize UI with Firebase backend enabled

    } catch (error) {
        // Catches errors during connection/initialization
        console.error("Failed to initialize Firebase or authenticate:", error);
        document.getElementById('worship-text').innerText = "Database connection failed. Check console for details.";
        setupApp(false); // Initialize UI without Firebase backend
    }
}

/**
 * Sets up all front-end interactivity and components once the initial state is known.
 * @param {boolean} isFirebaseReady - True if Firebase services are successfully initialized.
 */
function setupApp(isFirebaseReady) {
    // Initialize static UI components regardless of Firebase status
    initRadarChart();
    initBarChart();
    updateTimeline('childhood');
    setupMobileMenu();
    
    // Initialize Firebase-dependent components
    if (isFirebaseReady) {
        initWorshipCounter(); // Start listening to the global counter
        document.getElementById('worship-btn').addEventListener('click', handleWorshipClick); // Enable click handler
    } else {
        // Disable counter functionality if Firebase is unavailable
        document.getElementById('worship-btn').disabled = true;
        document.getElementById('shrine-loading').style.display = 'none';
    }
}

// --- Firestore Counter Logic ---

/**
 * Gets the document reference for the global worship counter in the public collection.
 * Uses the required public path structure for collaboration.
 * @returns {object|null} The Firestore document reference.
 */
function getWorshipDocRef() {
    if (!db) return null;
    // Public path: /artifacts/{appId}/public/data/worship_data/hinata_counter
    return doc(db, `artifacts/${appId}/public/data/worship_data/hinata_counter`);
}

/**
 * Initializes a real-time listener (onSnapshot) for the global counter.
 * Updates the display whenever the count changes in the database.
 */
function initWorshipCounter() {
    if (!isAuthReady || !db) {
            console.error("Firestore not ready for counter listener.");
            return;
    }

    const worshipRef = getWorshipDocRef();
    if (!worshipRef) return;
    
    document.getElementById('shrine-loading').style.display = 'flex'; // Show loading spinner

    onSnapshot(worshipRef, (docSnap) => {
        // Success callback: Update the UI with the latest count
        let currentCount = 0;
        if (docSnap.exists()) {
            currentCount = docSnap.data().totalCount || 0;
        }
        document.getElementById('worship-counter').innerText = currentCount.toLocaleString();
        document.getElementById('worship-btn').disabled = false;
        document.getElementById('worship-text').innerText = "Click the heart to offer support...";
        document.getElementById('shrine-loading').style.display = 'none'; // Hide loading spinner

    }, (error) => {
        // Error callback
        console.error("Error listening to worship counter:", error);
        document.getElementById('worship-text').innerText = "Error loading count. See console.";
        document.getElementById('shrine-loading').style.display = 'none';
    });
}

/**
 * Handles the user clicking the worship button.
 * Uses a Firestore Transaction for safe, atomic increment of the global counter to prevent double-counting.
 */
async function handleWorshipClick() {
    if (!isAuthReady || !db) return;

    const worshipRef = getWorshipDocRef();
    if (!worshipRef) return;

    const btn = document.getElementById('worship-btn');
    btn.disabled = true; // Disable button immediately to prevent rapid spam clicks

    try {
        // Transaction: Ensures the read and write are atomic (sequential and safe).
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(worshipRef);
            let newCount = 1;
            if (docSnap.exists()) {
                const currentData = docSnap.data();
                newCount = (currentData.totalCount || 0) + 1;
            }
            transaction.set(worshipRef, { totalCount: newCount }); // Write the incremented value
        });

        // UI Feedback (on successful write)
        const feedbackText = document.getElementById('worship-text');
        const phrases = ["Sent Chakra!", "Hinata smiles!", "Byakugan activated!", "Gentle Fist Hit!", "Admired!", "Sent Sunflower!"];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        feedbackText.innerText = randomPhrase;
        
        // Button animation feedback
        btn.style.transform = "scale(0.95)";
        setTimeout(() => btn.style.transform = "scale(1)", 100);

        // Particle effect
        const rect = btn.getBoundingClientRect();
        createFloatingHeart(rect.left + rect.width / 2, rect.top + rect.height / 2);

    } catch (error) {
        // Handle failed transaction
        console.error("Transaction failed:", error);
        document.getElementById('worship-text').innerText = "Chakra failed to send. Try again.";
    } finally {
        setTimeout(() => { btn.disabled = false; }, 300); // Re-enable button after animation/cooldown
    }
}


// --- UI/UX & Chart Logic ---

/**
 * Toggles the visibility of the mobile navigation menu.
 */
function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

/**
 * Scrolls the view smoothly to a specific section identified by its ID.
 * Exposed to window for use by inline HTML onclick attributes.
 * @param {string} id - The ID of the HTML section to scroll to.
 */
window.scrollToSection = function(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    document.getElementById('mobile-menu').classList.add('hidden'); // Close mobile menu after navigating
}

/**
 * Attaches the event listener to the mobile menu button.
 */
function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    btn.addEventListener('click', toggleMobileMenu);
}

/**
 * Initializes and configures the Chart.js Radar Chart showing Hinata's attribute growth.
 * Includes logic to toggle visibility between Genin and Shippuden data based on a dropdown selection.
 */
let radarChartInstance = null;
function initRadarChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: statsData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: '#E9D8FD' },
                    grid: { color: '#E9D8FD' },
                    pointLabels: {
                        font: { size: 12, family: "'Quicksand', sans-serif" },
                        color: '#4C1D95'
                    },
                    suggestedMin: 0,
                    suggestedMax: 5
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Event listener for the dropdown selector below the chart
    document.getElementById('stat-toggle').addEventListener('change', (e) => {
        const val = e.target.value;
        // Logic to show/hide datasets based on user selection
        if (val === 'all') {
            radarChartInstance.data.datasets[0].hidden = false;
            radarChartInstance.data.datasets[1].hidden = false;
        } else if (val === 'genin') {
            radarChartInstance.data.datasets[0].hidden = false;
            radarChartInstance.data.datasets[1].hidden = true;
        } else {
            radarChartInstance.data.datasets[0].hidden = true;
            radarChartInstance.data.datasets[1].hidden = false;
        }
        radarChartInstance.update();
    });
}

/**
 * Initializes and configures the Chart.js Bar Chart showing the emphasis on her Jutsu repertoire.
 */
function initBarChart() {
    const ctx = document.getElementById('jutsuBarChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Taijutsu (Gentle Fist)', 'Ninjutsu', 'Genjutsu', 'Kekkei Genkai'],
            datasets: [{
                label: 'Skill Emphasis',
                data: [95, 30, 20, 100],
                backgroundColor: [
                    'rgba(109, 40, 217, 0.8)',
                    'rgba(167, 139, 250, 0.5)',
                    'rgba(167, 139, 250, 0.3)',
                    'rgba(76, 29, 149, 0.9)'
                ],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal bars
            scales: {
                x: { display: false, max: 100 },
                y: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/**
 * Updates the dynamic content area of the timeline section based on the era selected by the user.
 * Also handles highlighting the active button visually.
 * Exposed to window for use by inline HTML onclick attributes.
 * @param {string} eraKey - Key matching one of the keys in `timelineData` ('childhood', 'chunin', etc.).
 */
window.updateTimeline = function(eraKey) {
    const data = timelineData[eraKey];
    const contentDiv = document.getElementById('timeline-content');
    
    // Visual state management for buttons: Remove highlight from all buttons
    document.querySelectorAll('.timeline-btn').forEach(btn => {
        btn.classList.remove('bg-purple-600', 'text-white', 'shadow-md');
        btn.classList.add('bg-white', 'text-purple-600');
    });
    // Find the clicked button and apply the active visual highlight
    const clickedBtn = Array.from(document.querySelectorAll('.timeline-btn')).find(b => b.getAttribute('onclick').includes(eraKey));
    if(clickedBtn) {
        clickedBtn.classList.remove('bg-white', 'text-purple-600');
        clickedBtn.classList.add('bg-purple-600', 'text-white', 'shadow-md');
    }

    // Smooth transition for content update (fade out, change content, fade in)
    contentDiv.style.opacity = '0';
    setTimeout(() => {
        contentDiv.innerHTML = `
            <div class="w-full md:w-1/3 ${data.color} p-8 flex flex-col justify-center items-center text-center">
                <div class="text-6xl mb-4">🟣</div>
                <h3 class="text-2xl font-bold text-purple-900 brand-font">${data.title}</h3>
                <div class="mt-4 bg-white/50 p-3 rounded-lg text-sm text-purple-800 font-mono">
                    ${data.stats}
                </div>
            </div>
            <div class="w-full md:w-2/3 p-8 flex items-center bg-white">
                <p class="text-lg text-gray-700 leading-relaxed">
                    ${data.text}
                </p>
            </div>
        `;
        contentDiv.style.opacity = '1';
    }, 200);
}

/**
 * Selects a random quote from the `quotes` array and displays it in the Shrine section with a fade effect.
 * Exposed to window for use by inline HTML onclick attributes.
 */
window.newQuote = function() {
    const display = document.getElementById('quote-display');
    display.style.opacity = 0;
    setTimeout(() => {
        const r = Math.floor(Math.random() * quotes.length);
        display.innerText = `"${quotes[r]}"`;
        display.style.opacity = 1;
    }, 300);
}

/**
 * Creates a temporary floating 'heart' element (particle effect) when the worship button is clicked.
 * It animates the heart upwards and fades it out from the button's position.
 * @param {number} x - The x-coordinate of the button center.
 * @param {number} y - The y-coordinate of the button center.
 */
function createFloatingHeart(x, y) {
    const heart = document.createElement('div');
    heart.innerText = '💜';
    heart.style.position = 'absolute';
    heart.style.left = (x + window.scrollX - 12) + 'px';
    heart.style.top = (y + window.scrollY - 12) + 'px';
    heart.style.fontSize = '24px';
    heart.style.pointerEvents = 'none';
    heart.style.transition = 'all 1s ease-out';
    heart.style.opacity = '1';
    heart.style.zIndex = '100';
    
    document.body.appendChild(heart);

    setTimeout(() => {
        // Animate up and fade out
        heart.style.transform = 'translateY(-100px)';
        heart.style.opacity = '0';
    }, 50);

    setTimeout(() => {
        heart.remove(); // Clean up the element after the animation finishes
    }, 1000);
}

// Start the application initialization process immediately when the script loads.
initFirebase();