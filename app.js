// Firebase Configuration (Replace with your actual keys from Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyBw2Bovul4GKX49i5jgmET2mWU8983OQII",
    authDomain: "cabincrew-17a5d.firebaseapp.com",
    projectId: "cabincrew-17a5d",
    storageBucket: "cabincrew-17a5d.firebasestorage.app",
    messagingSenderId: "793809993587",
    appId: "1:793809993587:web:316749dc4c44f7fd730f06",
    measurementId: "G-18XDPWNJQ7",
    databaseURL: "https://cabincrew-17a5d-default-rtdb.firebaseio.com"
};

// Import via window object set in index.html
const { initializeApp, getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } = window.firebaseModular;
const { getDatabase, ref, set, onValue } = window.firebaseModular;

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

let questions = [];
let currentIndex = 0;
let userAnswers = {};
let selectedQuestions = [];
let currentUser = null;
let currentSessionId = null;
let timerInterval = null;
let timeLeft = 3600; // 60 minutes in seconds

const dom = {
    authScreen: document.getElementById('auth-screen'),
    homeScreen: document.getElementById('home-screen'),
    testScreen: document.getElementById('test-screen'),
    resultScreen: document.getElementById('result-screen'),
    authForm: document.getElementById('auth-form'),
    authSubmit: document.getElementById('auth-submit'),
    authError: document.getElementById('auth-error'),
    logoutBtn: document.getElementById('logout-btn'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    userDisplay: document.getElementById('user-display'),
    startBtn: document.getElementById('start-btn'),
    resumeBtn: document.getElementById('resume-btn'),
    restartBtn: document.getElementById('restart-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    finishBtn: document.getElementById('finish-btn'),
    questionText: document.getElementById('question-text'),
    optionsList: document.getElementById('options-list'),
    currentIndex: document.getElementById('current-index'),
    totalQuestions: document.getElementById('total-questions'),
    progressBar: document.getElementById('progress-bar-fill'),
    finalScore: document.getElementById('final-score'),
    correctCount: document.getElementById('correct-count'),
    wrongAnswersList: document.getElementById('wrong-answers-list'),
    timerDisplay: document.getElementById('timer'),
    resultStatus: document.getElementById('result-status')
};

async function init() {
    // Disable start button until questions are loaded
    dom.startBtn.disabled = true;
    dom.startBtn.innerText = "Loading Questions...";

    // Load questions from local JSON
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        questions = await response.json();

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("No questions found in questions.json");
        }

        console.log(`Successfully loaded ${questions.length} questions.`);
        dom.startBtn.disabled = false;
        dom.startBtn.innerText = "Start New Examination";
    } catch (e) {
        console.error("Failed to load questions", e);
        alert("CRITICAL ERROR: Could not load questions.json.\n\nNote: If you are opening index.html directly as a file, please use a local web server (like Live Server) to allow data loading.");
        dom.startBtn.innerText = "Error Loading Data";
    }

    // Auth State Observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            dom.userDisplay.innerText = user.email;
            setupSession(user.uid);
            showScreen(dom.homeScreen);
            checkResume();
        } else {
            currentUser = null;
            showScreen(dom.authScreen);
        }
    });

    // Event Listeners
    dom.authForm.onsubmit = handleAuth;
    dom.logoutBtn.onclick = () => signOut(auth);
    dom.fullscreenBtn.onclick = toggleFullScreen;
    dom.startBtn.onclick = () => startTest(false);
    dom.resumeBtn.onclick = () => startTest(true);
    dom.restartBtn.onclick = () => startTest(false);
    dom.prevBtn.onclick = () => navigate(-1);
    dom.nextBtn.onclick = () => navigate(1);
    dom.finishBtn.onclick = showResults;
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
        dom.fullscreenBtn.innerText = "Exit Full Screen";
    } else {
        document.exitFullscreen();
        dom.fullscreenBtn.innerText = "Full Screen";
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    dom.authError.classList.add('hidden');
    dom.authSubmit.disabled = true;
    dom.authSubmit.innerText = "Verifying Credentials...";

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        let msg = "Invalid email or password.";
        // Friendly security message
        if (error.code === 'auth/user-not-found') msg = "Access Denied: Your account is not authorized.";
        dom.authError.innerText = msg;
        dom.authError.classList.remove('hidden');
        dom.authSubmit.disabled = false;
        dom.authSubmit.innerText = "Sign In";
    }
}

function setupSession(uid) {
    // Generate a unique session ID for this instance
    currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Update the session ID in Realtime Database to enforce single session
    const sessionRef = ref(db, `sessions/${uid}/activeSession`);
    set(sessionRef, currentSessionId);

    // Watch for login on other devices
    onValue(sessionRef, (snapshot) => {
        const remoteSessionId = snapshot.val();
        if (remoteSessionId && remoteSessionId !== currentSessionId) {
            alert("This account was logged in on another device. You have been disconnected.");
            signOut(auth);
            location.reload();
        }
    });
}

function checkResume() {
    if (!currentUser) return;
    const saved = localStorage.getItem(`test_state_${currentUser.uid}`);
    if (saved) {
        dom.resumeBtn.classList.remove('hidden');
    } else {
        dom.resumeBtn.classList.add('hidden');
    }
}

function startTest(resume = false) {
    if (resume) {
        const saved = JSON.parse(localStorage.getItem(`test_state_${currentUser.uid}`));
        selectedQuestions = saved.selectedQuestions;
        currentIndex = saved.currentIndex;
        userAnswers = saved.userAnswers;
        timeLeft = saved.timeLeft || 3600;
    } else {
        selectedQuestions = shuffle(questions).slice(0, 100).map(q => {
            const correctText = q.options[q.correctAnswer.charCodeAt(0) - 65];
            const shuffledOptions = shuffle([...q.options]);
            const newCorrectIndex = shuffledOptions.indexOf(correctText);
            return {
                ...q,
                shuffledOptions,
                newCorrectAnswer: String.fromCharCode(65 + newCorrectIndex)
            };
        });
        currentIndex = 0;
        userAnswers = {};
        timeLeft = 3600;
    }

    showScreen(dom.testScreen);
    renderQuestion();
    startTimer();

    // Try to enter full screen for immersive experience
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    } catch (e) {
        console.warn("Fullscreen request failed", e);
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Time's up! Your test will be submitted automatically.");
            showResults();
        }

        // Save time every 10 seconds to reduce local storage writes but keep it relatively fresh
        if (timeLeft % 10 === 0) saveState();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    dom.timerDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (timeLeft < 300) { // 5 minutes warning
        dom.timerDisplay.style.color = "var(--error)";
        dom.timerDisplay.style.fontWeight = "700";
    } else {
        dom.timerDisplay.style.color = "white";
        dom.timerDisplay.style.fontWeight = "400";
    }
}

function renderQuestion() {
    const q = selectedQuestions[currentIndex];
    dom.questionText.innerText = q.question;
    dom.optionsList.innerHTML = '';

    q.shuffledOptions.forEach((opt, i) => {
        const char = String.fromCharCode(65 + i);
        const div = document.createElement('div');
        div.className = `option-item ${userAnswers[currentIndex] === char ? 'selected' : ''}`;
        div.innerHTML = `
            <div class="option-marker">${char}</div>
            <div class="option-content">${opt}</div>
        `;
        div.onclick = () => selectOption(char);
        dom.optionsList.appendChild(div);
    });

    dom.currentIndex.innerText = currentIndex + 1;
    dom.totalQuestions.innerText = selectedQuestions.length;
    dom.progressBar.style.width = `${((currentIndex + 1) / selectedQuestions.length) * 100}%`;

    dom.prevBtn.disabled = currentIndex === 0;

    const isAnswered = !!userAnswers[currentIndex];
    dom.nextBtn.disabled = !isAnswered;
    dom.finishBtn.disabled = !isAnswered;

    dom.nextBtn.classList.toggle('hidden', currentIndex === selectedQuestions.length - 1);
    dom.finishBtn.classList.toggle('hidden', currentIndex !== selectedQuestions.length - 1);

    saveState();
}

function selectOption(char) {
    userAnswers[currentIndex] = char;
    renderQuestion();
}

function navigate(dir) {
    currentIndex += dir;
    renderQuestion();
}

function showResults() {
    if (timerInterval) clearInterval(timerInterval);
    let correct = 0;
    dom.wrongAnswersList.innerHTML = '';

    selectedQuestions.forEach((q, i) => {
        const userSelection = userAnswers[i];
        if (userSelection === q.newCorrectAnswer) {
            correct++;
        } else {
            const div = document.createElement('div');
            div.className = 'wrong-item';
            div.innerHTML = `
                <div class="wrong-q">${q.question}</div>
                <div class="user-ans">Your answer: <span style="color: #ef4444">${userSelection ? q.shuffledOptions[userSelection.charCodeAt(0) - 65] : 'None'}</span></div>
                <div class="correct-ans">Correct answer: ${q.shuffledOptions[q.newCorrectAnswer.charCodeAt(0) - 65]}</div>
            `;
            dom.wrongAnswersList.appendChild(div);
        }
    });

    const score = Math.round((correct / selectedQuestions.length) * 100);
    dom.finalScore.innerText = score;
    dom.correctCount.innerText = correct;

    if (score >= 80) {
        dom.resultStatus.innerText = "PASSED";
        dom.resultStatus.style.color = "var(--success)";
    } else {
        dom.resultStatus.innerText = "FAILED";
        dom.resultStatus.style.color = "var(--error)";
    }

    localStorage.removeItem(`test_state_${currentUser.uid}`);
    showScreen(dom.resultScreen);
}

function saveState() {
    if (!currentUser) return;
    localStorage.setItem(`test_state_${currentUser.uid}`, JSON.stringify({
        selectedQuestions,
        currentIndex,
        userAnswers,
        timeLeft
    }));
}

function showScreen(screen) {
    [dom.authScreen, dom.homeScreen, dom.testScreen, dom.resultScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
    screen.classList.add('active');
}

function shuffle(array) {
    let m = array.length, t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

init();
