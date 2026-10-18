import loveLetters from './letters-data.js';
// This is only a client-side UI gate, not real security. Replace it before a private deployment.
const MINE_UNLOCK_PHRASE = 'change-me-before-use';
// ===== Global State =====
const state = {
    currentPage: 'main',
    currentSeason: 'winter',
    currentTheme: 'auto',
    isMenuOpen: false,
    fallingSpeed: 8,
    editingDreamId: null,
    isEditMode: false,
    dreams: [],
    thenRecords: [],
    sortOrder: {
        dreams: 'desc',
        then: 'desc'
    },
    settings: {
        theme: 'auto',
        season: 'auto'
    },
    mine: {
        isUnlocked: false,
        currentYear: 2026,
        currentMonth: null,
        currentLetter: null,
        favorites: [],
        notes: {},
        chatHistory: [],
        memory: '',
        systemPrompt: 'You are a helpful and caring AI assistant.'
    }
};

// ===== Utility Functions =====
function getCurrentSeason() {
    if (state.settings.season !== 'auto') {
        return state.settings.season;
    }
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

function getSeasonEmoji(season) {
    const emojis = {
        spring: '🌸',
        summer: '💧',
        autumn: '🍁',
        winter: '❄️'
    };
    return emojis[season];
}

function getCurrentTheme() {
    if (state.settings.theme !== 'auto') {
        return state.settings.theme;
    }
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
}

function formatTimestamp(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function updateTimeDisplay() {
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay && state.currentPage === 'main') {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeDisplay.textContent = `${hours}:${minutes}`;
    }
}

// ===== Theme Management =====
function applyTheme() {
    const theme = getCurrentTheme();
    const season = getCurrentSeason();

    state.currentTheme = theme;
    state.currentSeason = season;

    document.body.className = '';
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    document.body.classList.add(season);

    // Update CSS variables
    document.documentElement.style.setProperty('--fall-speed', `${state.fallingSpeed}s`);
}

// ===== Falling Elements =====
function createFallingElement() {
    const particle = document.createElement('div');
    particle.className = 'falling-element';
    particle.textContent = getSeasonEmoji(state.currentSeason);
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.fontSize = `${0.8 + Math.random() * 1}em`;
    const duration = state.fallingSpeed + Math.random() * 2;
    particle.style.animationDuration = `${duration}s`;

    const particlesContainer = document.getElementById('particles');
    if (particlesContainer) {
        particlesContainer.appendChild(particle);
    }

    // If menu is open, slow down this new element immediately
    if (state.isMenuOpen) {
        requestAnimationFrame(() => {
            const animations = particle.getAnimations();
            animations.forEach(anim => {
                anim.playbackRate = 0.3;
            });
        });
    }

    // Remove element when animation ends
    particle.addEventListener('animationend', () => {
        particle.remove();
    });
}

function startFallingElements() {
    setInterval(createFallingElement, 200);
}

function slowDownFalling() {
    const elements = document.querySelectorAll('.falling-element');
    elements.forEach(el => {
        const animations = el.getAnimations();
        animations.forEach(anim => {
            anim.playbackRate = 0.3; // Slow down to 30% speed
        });
    });
}

function speedUpFalling() {
    const elements = document.querySelectorAll('.falling-element');
    elements.forEach(el => {
        const animations = el.getAnimations();
        animations.forEach(anim => {
            anim.playbackRate = 1.0; // Normal speed
        });
    });
}

// ===== Menu Management =====
function openMenu() {
    if (state.isMenuOpen) return;

    state.isMenuOpen = true;
    slowDownFalling();

    const menuContainer = document.getElementById('menu-container');
    const enlargedElement = document.getElementById('enlarged-element');

    enlargedElement.textContent = getSeasonEmoji(state.currentSeason);

    // Force animation restart by resetting and re-applying
    enlargedElement.style.animation = 'none';
    enlargedElement.offsetHeight; // Trigger reflow
    enlargedElement.style.animation = '';

    menuContainer.classList.remove('hidden');
}
function closeMenu() {
    if (!state.isMenuOpen) return;

    state.isMenuOpen = false;
    speedUpFalling();

    const menuContainer = document.getElementById('menu-container');
    menuContainer.classList.add('hidden');
}
function navigateToPage(pageName) {
    // Special handling for Mine
    if (pageName === 'mine') {
        if (!state.mine.isUnlocked) {
            showPasswordModal();
            return;
        } else {
            pageName = 'mine-year';
        }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('visible');
        page.classList.add('hidden');
    });

    // Close menu if going to a page
    if (pageName !== 'main') {
        closeMenu();
        setTimeout(() => {
            const targetPage = document.getElementById(`${pageName}-page`);
            if (targetPage) {
                targetPage.classList.remove('hidden');
                targetPage.classList.add('visible');
            }
        }, 100);
    }

    state.currentPage = pageName;

    // Load data for specific pages
    if (pageName === 'dream-recording') {
        loadDreamList();
    } else if (pageName === 'then') {
        loadThenList();
    } else if (pageName === 'mine-year') {
        loadYearView();
    } else if (pageName === 'mine-month') {
        loadMonthView();
    } else if (pageName === 'mine-letter') {
        loadLetterView();
    }

    // Update chat input bar visibility
    updateChatBubble();
}

// ===== Local Storage =====
function saveToStorage() {
    localStorage.setItem('dreams', JSON.stringify(state.dreams));
    localStorage.setItem('thenRecords', JSON.stringify(state.thenRecords));
    localStorage.setItem('settings', JSON.stringify(state.settings));
}

function loadFromStorage() {
    const dreams = localStorage.getItem('dreams');
    const thenRecords = localStorage.getItem('thenRecords');
    const settings = localStorage.getItem('settings');

    if (dreams) state.dreams = JSON.parse(dreams);
    if (thenRecords) state.thenRecords = JSON.parse(thenRecords);
    if (settings) {
        state.settings = JSON.parse(settings);
        // Update radio buttons
        document.querySelector(`input[name="theme"][value="${state.settings.theme}"]`).checked = true;
        document.querySelector(`input[name="season"][value="${state.settings.season}"]`).checked = true;
    }
}

// ===== Dream Recording Functions =====
function loadDreamList() {
    const container = document.getElementById('dream-list');
    container.innerHTML = '';

    if (state.dreams.length === 0) {
        container.innerHTML = '<div class="empty-state">No dreams yet. Tap + to create one.</div>';
        return;
    }

    const sortedDreams = [...state.dreams].sort((a, b) => {
        return state.sortOrder.dreams === 'desc'
            ? b.timestamp - a.timestamp
            : a.timestamp - b.timestamp;
    });

    sortedDreams.forEach(dream => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-title">${dream.title || 'Untitled Dream'}</div>
                <div class="list-item-timestamp">${formatTimestamp(dream.timestamp)}</div>
            </div>
            <button class="delete-btn" data-id="${dream.id}">×</button>
        `;

        // Click on item content to edit
        item.querySelector('.list-item-content').onclick = () => openDreamEdit(dream.id);

        // Click on delete button
        item.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            deleteDream(dream.id);
        };

        container.appendChild(item);
    });
}

function openDreamEdit(dreamId) {
    const dream = state.dreams.find(d => d.id === dreamId);
    if (!dream) return;

    state.editingDreamId = dreamId;
    state.isEditMode = false;

    document.getElementById('dream-title-input').value = dream.title || '';
    document.getElementById('dream-content-input').value = dream.content || '';
    document.getElementById('dream-timestamp').textContent = formatTimestamp(dream.timestamp);
    document.getElementById('dream-edit-save-btn').textContent = 'Edit';

    // Set readonly
    document.getElementById('dream-title-input').readOnly = true;
    document.getElementById('dream-content-input').readOnly = true;

    navigateToPage('dream-edit');
}

function createNewDream() {
    const newDream = {
        id: Date.now(),
        title: '',
        content: '',
        timestamp: Date.now()
    };

    state.dreams.push(newDream);
    saveToStorage();

    state.editingDreamId = newDream.id;
    state.isEditMode = true;

    // Record Then entry
    recordThenEntry();

    // First set up the page state
    const titleInput = document.getElementById('dream-title-input');
    const contentInput = document.getElementById('dream-content-input');
    const timestampDiv = document.getElementById('dream-timestamp');
    const editBtn = document.getElementById('dream-edit-save-btn');

    if (titleInput && contentInput && timestampDiv && editBtn) {
        titleInput.value = '';
        contentInput.value = '';
        timestampDiv.textContent = formatTimestamp(newDream.timestamp);
        editBtn.textContent = 'Save';
        titleInput.readOnly = false;
        contentInput.readOnly = false;
    }

    // Then navigate
    navigateToPage('dream-edit');

    // And focus after navigation completes
    setTimeout(() => {
        const titleInput = document.getElementById('dream-title-input');
        if (titleInput) {
            titleInput.focus();
        }
    }, 200);
}

function toggleEditMode() {
    state.isEditMode = !state.isEditMode;

    const btn = document.getElementById('dream-edit-save-btn');
    const titleInput = document.getElementById('dream-title-input');
    const contentInput = document.getElementById('dream-content-input');

    if (state.isEditMode) {
        btn.textContent = 'Save';
        titleInput.readOnly = false;
        contentInput.readOnly = false;
        titleInput.focus();
    } else {
        btn.textContent = 'Edit';
        titleInput.readOnly = true;
        contentInput.readOnly = true;
        saveDream();
    }
}

function saveDream() {
    const dream = state.dreams.find(d => d.id === state.editingDreamId);
    if (!dream) return;

    dream.title = document.getElementById('dream-title-input').value;
    dream.content = document.getElementById('dream-content-input').value;

    saveToStorage();
}

function deleteDream(dreamId) {
    if (confirm('Are you sure you want to delete this dream?')) {
        state.dreams = state.dreams.filter(d => d.id !== dreamId);
        saveToStorage();
        loadDreamList();
    }
}

// ===== Then Functions =====
function recordThenEntry() {
    const entry = {
        timestamp: Date.now(),
        count: state.thenRecords.length + 1
    };
    state.thenRecords.push(entry);
    saveToStorage();
}

function loadThenList() {
    const container = document.getElementById('then-list');
    container.innerHTML = '';

    if (state.thenRecords.length === 0) {
        container.innerHTML = '<div class="empty-state">No records yet.</div>';
        return;
    }

    const sortedRecords = [...state.thenRecords].sort((a, b) => {
        return state.sortOrder.then === 'desc'
            ? b.timestamp - a.timestamp
            : a.timestamp - b.timestamp;
    });

    sortedRecords.forEach(record => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-timestamp">${formatTimestamp(record.timestamp)}</div>
            <div class="list-item-count">Count: ${record.count}</div>
        `;
        container.appendChild(item);
    });
}

// ===== Event Listeners =====
function initEventListeners() {
    // Click anywhere to open menu (only on main page)
    document.querySelector('.app-container').addEventListener('click', (e) => {
        if (state.currentPage === 'main' && !state.isMenuOpen && !e.target.closest('.menu-container')) {
            openMenu();
        }
    });

    // Click outside menu to close
    document.getElementById('menu-container').addEventListener('click', (e) => {
        if (e.target.id === 'menu-container') {
            closeMenu();
        }
    });

    // Menu options
    document.querySelectorAll('.menu-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = option.dataset.target;
            navigateToPage(target);
        });
    });

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            navigateToPage(target);
        });
    });

    // Add dream button
    document.getElementById('add-dream-btn').addEventListener('click', createNewDream);

    // Edit/Save button
    document.getElementById('dream-edit-save-btn').addEventListener('click', toggleEditMode);

    // Sort buttons - Dreams
    document.querySelector('#dream-recording-page .sort-toggle').addEventListener('click', (e) => {
        if (e.target.classList.contains('sort-btn')) {
            const sortValue = e.target.dataset.sort;
            state.sortOrder.dreams = sortValue;
            e.target.parentElement.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadDreamList();
        }
    });

    // Sort buttons - Then
    document.querySelector('#then-page .sort-toggle').addEventListener('click', (e) => {
        if (e.target.classList.contains('sort-btn')) {
            const sortValue = e.target.dataset.sort;
            state.sortOrder.then = sortValue;
            e.target.parentElement.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadThenList();
        }
    });

    // Settings - Theme
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.settings.theme = e.target.value;
            saveToStorage();
            applyTheme();
        });
    });

    // Settings - Season
    document.querySelectorAll('input[name="season"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.settings.season = e.target.value;
            saveToStorage();
            applyTheme();
            // Recreate falling elements with new season
            document.getElementById('particles').innerHTML = '';
        });
    });
}

// ===== Initialization =====
function init() {
    loadFromStorage();
    loadMineData();  // 添加这一行
    applyTheme();
    startFallingElements();
    initEventListeners();
    initMineEventListeners();  // 添加这一行
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);

    // Check theme every minute
    setInterval(() => {
        if (state.settings.theme === 'auto') {
            applyTheme();
        }
    }, 60000);
}
// ===== Mine Feature Functions =====

// Password Modal
function showPasswordModal() {
    const modal = document.getElementById('mine-password-modal');
    const input = document.getElementById('mine-password-input');
    const error = document.getElementById('mine-password-error');

    modal.classList.remove('hidden');
    input.value = '';
    error.classList.add('hidden');
    setTimeout(() => input.focus(), 100);
}

function hidePasswordModal() {
    document.getElementById('mine-password-modal').classList.add('hidden');
}

function verifyPassword() {
    const input = document.getElementById('mine-password-input');
    const error = document.getElementById('mine-password-error');

    if (input.value === MINE_UNLOCK_PHRASE) {
        state.mine.isUnlocked = true;
        hidePasswordModal();
        navigateToPage('mine-year');
    } else {
        error.classList.remove('hidden');
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }
}

// Year View
function loadYearView() {
    const grid = document.getElementById('mine-year-grid');
    grid.innerHTML = '';

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    months.forEach((month, index) => {
        const monthNum = index + 1;
        const monthKey = `${state.mine.currentYear}-${String(monthNum).padStart(2, '0')}`;

        // Count letters in this month
        const letterCount = Object.keys(loveLetters).filter(date => date.startsWith(monthKey)).length;

        const card = document.createElement('div');
        card.className = 'month-card';
        if (monthNum === currentMonth && state.mine.currentYear === currentYear) {
            card.classList.add('current-month');
        }

        card.innerHTML = `
            <div class="month-name">${month}</div>
            <div class="month-count">${letterCount} letter${letterCount !== 1 ? 's' : ''}</div>
        `;

        card.onclick = () => {
            state.mine.currentMonth = monthNum;
            navigateToPage('mine-month');
        };

        grid.appendChild(card);
    });

    // Update letter counter
    updateLetterCounter();
}

// Month View
function loadMonthView() {
    const grid = document.getElementById('mine-month-grid');
    const title = document.getElementById('mine-month-title');
    grid.innerHTML = '';

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    title.textContent = `${monthNames[state.mine.currentMonth - 1]} ${state.mine.currentYear}`;

    // Get first day of month and total days
    const firstDay = new Date(state.mine.currentYear, state.mine.currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(state.mine.currentYear, state.mine.currentMonth, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell empty';
        grid.appendChild(cell);
    }

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${state.mine.currentYear}-${String(state.mine.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cellDate = new Date(state.mine.currentYear, state.mine.currentMonth - 1, day);
        const hasLetter = loveLetters[dateKey];
        const isFuture = cellDate > today;

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.textContent = day;

        if (hasLetter && !isFuture) {
            cell.classList.add('has-letter');
            if (hasLetter.special) {
                cell.classList.add('special-day');
            }
            cell.onclick = () => {
                state.mine.currentLetter = dateKey;
                navigateToPage('mine-letter');
            };
        } else if (isFuture) {
            cell.classList.add('disabled');
        }

        grid.appendChild(cell);
    }

    // Special: Add Feb 29 (our magical day)
    if (state.mine.currentMonth === 2) {
        const specialKey = `${state.mine.currentYear}-02-29`;
        if (loveLetters[specialKey]) {
            const cell = document.createElement('div');
            cell.className = 'day-cell has-letter special-day';
            cell.textContent = 29;
            cell.onclick = () => {
                state.mine.currentLetter = specialKey;
                navigateToPage('mine-letter');
            };
            grid.appendChild(cell);
        }
    }
}

// Letter View
function loadLetterView() {
    const letter = loveLetters[state.mine.currentLetter];
    if (!letter) return;

    document.getElementById('letter-title').textContent = letter.title;
    document.getElementById('letter-date').textContent = letter.date;
    document.getElementById('letter-content').textContent = letter.content;

    // Load note
    const note = state.mine.notes[state.mine.currentLetter] || '';
    document.getElementById('letter-note').value = note;

    // Update favorite button
    updateFavoriteButton();
}

function updateFavoriteButton() {
    const btn = document.getElementById('letter-favorite-btn');
    const isFavorite = state.mine.favorites.includes(state.mine.currentLetter);

    if (isFavorite) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

function toggleFavorite() {
    const index = state.mine.favorites.indexOf(state.mine.currentLetter);

    if (index > -1) {
        state.mine.favorites.splice(index, 1);
    } else {
        state.mine.favorites.push(state.mine.currentLetter);
    }

    updateFavoriteButton();
    saveMineData();
}

function saveNote() {
    const note = document.getElementById('letter-note').value;
    state.mine.notes[state.mine.currentLetter] = note;
    saveMineData();

    // Visual feedback
    const btn = document.getElementById('save-note-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saved ✓';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 1500);
}

function updateLetterCounter() {
    const counter = document.getElementById('letter-counter');
    const totalLetters = Object.keys(loveLetters).length;
    counter.textContent = `${totalLetters} 💌`;
}

// ==================== CHAT FUNCTIONS ====================

// Get current session
function getCurrentSession() {
    if (!state.mine.chatSessions) state.mine.chatSessions = [];
    return state.mine.chatSessions.find(s => s.id === state.mine.currentSessionId) || null;
}

// Create new session
function createSession(letterKey = null) {
    const prevSession = getCurrentSession();
    if (prevSession && prevSession.messages.length >= 4) {
        extractAutoMemory(prevSession);
    }

    const session = {
        id: 's_' + Date.now(),
        title: letterKey ? `💌 ${loveLetters[letterKey]?.title || 'Letter'}` : 'New Chat',
        messages: [],
        summary: '',
        letterKey: letterKey,
        createdAt: Date.now()
    };
    state.mine.chatSessions.unshift(session);
    state.mine.currentSessionId = session.id;
    saveMineData();
    renderSessionList();
    loadChatMessages();
    return session;
}

// Switch session
function switchSession(sessionId) {
    state.mine.currentSessionId = sessionId;
    saveMineData();
    renderSessionList();
    loadChatMessages();
    // Auto-close sidebar on mobile
    if (window.innerWidth <= 600) {
        document.getElementById('chat-sidebar').classList.add('collapsed');
    }
}

// Delete session
function deleteSession(sessionId) {
    state.mine.chatSessions = state.mine.chatSessions.filter(s => s.id !== sessionId);
    if (state.mine.currentSessionId === sessionId) {
        state.mine.currentSessionId = state.mine.chatSessions[0]?.id || null;
    }
    saveMineData();
    renderSessionList();
    loadChatMessages();
}

// Render session list in sidebar
function renderSessionList() {
    const list = document.getElementById('session-list');
    if (!list) return;
    list.innerHTML = '';

    (state.mine.chatSessions || []).forEach(session => {
        const item = document.createElement('div');
        item.className = `session-item${session.id === state.mine.currentSessionId ? ' active' : ''}`;

        const titleSpan = document.createElement('span');
        titleSpan.textContent = session.title;
        titleSpan.style.cssText = 'overflow:hidden; text-overflow:ellipsis; flex:1;';
        item.appendChild(titleSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-session';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteSession(session.id); };
        item.appendChild(deleteBtn);

        item.onclick = () => switchSession(session.id);
        list.appendChild(item);
    });
}

// Chat bubble visibility
function updateChatBubble() {
    const bar = document.getElementById('chat-input-bar');
    if (state.currentPage.startsWith('mine')) {
        bar.classList.remove('hidden');
    } else {
        bar.classList.add('hidden');
    }
}

// Open / Close chat modal
function openChatModal() {
    document.getElementById('chat-modal').classList.remove('hidden');
    // Collapse sidebar on mobile
    if (window.innerWidth <= 600) {
        document.getElementById('chat-sidebar').classList.add('collapsed');
    }
    renderSessionList();
    loadChatMessages();
    loadChatSettings();
}

function closeChatModal() {
    document.getElementById('chat-modal').classList.add('hidden');
}

// Render messages for current session
function loadChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    const session = getCurrentSession();
    if (!session) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:2rem;">Start a new conversation ✨</div>';
        return;
    }

    session.messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `chat-message ${msg.role}`;
        div.textContent = msg.content;
        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
}

// Settings
function loadChatSettings() {
    document.getElementById('chat-memory').value = state.mine.memory || '';
    document.getElementById('chat-system-prompt').value = state.mine.systemPrompt || 'You are a helpful and caring AI assistant.';
    document.getElementById('chat-model').value = state.mine.model || 'openai/gpt-4o';
    document.getElementById('chat-auto-memory').value = state.mine.autoMemory || '';
}

function toggleChatSettings() {
    document.getElementById('chat-settings-panel').classList.toggle('hidden');
}

function saveChatSettings() {
    state.mine.memory = document.getElementById('chat-memory').value;
    state.mine.systemPrompt = document.getElementById('chat-system-prompt').value;
    state.mine.model = document.getElementById('chat-model').value;
    saveMineData();

    const btn = document.getElementById('save-chat-settings');
    const orig = btn.textContent;
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = orig; }, 1500);
}

function toggleSidebar() {
    const sidebar = document.getElementById('chat-sidebar');
    sidebar.classList.toggle('collapsed');
}

function closeSidebarOnMobile() {
    if (window.innerWidth <= 600) {
        document.getElementById('chat-sidebar').classList.add('collapsed');
    }
}

// Build context messages for API call
function buildContextMessages(session, newMessage) {
    const msgs = [];

    // 1. System prompt + memory + auto memory + letter context
    let sys = state.mine.systemPrompt || 'You are a helpful and caring AI assistant.';
    if (state.mine.memory) sys += `\n\n[User Memory]\n${state.mine.memory}`;
    if (state.mine.autoMemory) sys += `\n\n[Conversation History Summary]\n${state.mine.autoMemory}`;
    if (session.letterKey && loveLetters[session.letterKey]) {
        const l = loveLetters[session.letterKey];
        sys += `\n\n[Current Letter]\nTitle: ${l.title} (${l.date})\n${l.content}`;
    }
    msgs.push({ role: 'system', content: sys });

    // 2. Session summary
    if (session.summary) {
        msgs.push({ role: 'system', content: `[Earlier in this conversation]\n${session.summary}` });
    }

    // 3. Last 8 rounds = 16 messages
    const recent = session.messages.slice(-16);
    msgs.push(...recent);

    // 4. New message
    msgs.push({ role: 'user', content: newMessage });
    return msgs;
}

// Parse SSE stream helper
function parseSSEContent(text) {
    let content = '';
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
                const p = JSON.parse(data);
                const c = p.choices?.[0]?.delta?.content || p.choices?.[0]?.message?.content;
                if (c) content += c;
            } catch (e) { }
        }
    }
    // Fallback: try direct JSON
    if (!content) {
        try {
            const p = JSON.parse(text);
            content = p.content || p.choices?.[0]?.message?.content || '';
        } catch (e) { }
    }
    return content;
}

// Send chat message (streaming)
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    let session = getCurrentSession();
    if (!session) session = createSession(state.mine.currentLetter || null);

    // Add user message & render
    session.messages.push({ role: 'user', content: message });
    input.value = '';
    input.style.height = 'auto';
    loadChatMessages();

    // Update session title from first message
    if (session.messages.filter(m => m.role === 'user').length === 1) {
        session.title = message.slice(0, 25) + (message.length > 25 ? '…' : '');
        renderSessionList();
    }

    // Show typing indicator
    const typingEl = document.getElementById('typing-indicator');
    const sendBtn = document.getElementById('chat-send-btn');
    typingEl.classList.remove('hidden');
    sendBtn.disabled = true;

    const contextMessages = buildContextMessages(session, message);
    // Remove duplicate — buildContextMessages already adds the new message
    contextMessages.pop();

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...contextMessages, { role: 'user', content: message }],
                model: state.mine.model || 'openai/gpt-4o'
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantContent = '';

        // Create assistant bubble
        const container = document.getElementById('chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message assistant';
        container.appendChild(msgDiv);
        typingEl.classList.add('hidden');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            assistantContent += delta;
                            msgDiv.textContent = assistantContent;
                            container.scrollTop = container.scrollHeight;
                        }
                    } catch (e) { }
                }
            }
        }

        // Fallback if no streaming chunks received
        if (!assistantContent) {
            assistantContent = parseSSEContent(buffer) || 'No response received.';
            msgDiv.textContent = assistantContent;
        }

        // Save
        session.messages.push({ role: 'assistant', content: assistantContent });

        // Auto-summarize if needed (>20 messages, every 4 new messages)
        if (session.messages.length > 20 && session.messages.length % 4 === 0) {
            summarizeOlderMessages(session);
        }

        saveMineData();

    } catch (error) {
        typingEl.classList.add('hidden');
        const container = document.getElementById('chat-messages');
        const errDiv = document.createElement('div');
        errDiv.className = 'chat-message assistant';
        errDiv.style.color = '#e74c3c';
        errDiv.textContent = `⚠️ Error: ${error.message}`;
        container.appendChild(errDiv);
        session.messages.pop(); // Remove failed user message
        saveMineData();
    } finally {
        sendBtn.disabled = false;
    }
}

// Summarize older messages (sliding window)
async function summarizeOlderMessages(session) {
    const oldMsgs = session.messages.slice(0, -16);
    if (oldMsgs.length < 4) return;

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: 'Summarize this conversation concisely, preserving key facts and emotions. Under 300 words. Use the same language as the conversation.' },
                    ...oldMsgs,
                    { role: 'user', content: 'Summarize the above conversation.' }
                ],
                model: 'openai/gpt-4o-mini'
            })
        });

        if (response.ok) {
            const text = await response.text();
            const summary = parseSSEContent(text);
            if (summary) {
                session.summary = session.summary ? session.summary + '\n\n' + summary : summary;
                session.messages = session.messages.slice(-16);
                saveMineData();
            }
        }
    } catch (e) { console.error('Summary failed:', e); }
}

// Extract auto-memory when creating new session
async function extractAutoMemory(session) {
    if (session.messages.length < 4) return;

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: 'Extract key facts about the user from this conversation: preferences, personality, events, goals. Under 200 words. Same language as conversation. Output facts only.' },
                    ...session.messages.slice(-20),
                    { role: 'user', content: 'Extract key facts about me from our conversation.' }
                ],
                model: 'openai/gpt-4o-mini'
            })
        });

        if (response.ok) {
            const text = await response.text();
            const extracted = parseSSEContent(text);
            if (extracted) {
                const ts = new Date().toLocaleDateString();
                state.mine.autoMemory = (state.mine.autoMemory || '') + `\n--- ${ts} ---\n${extracted}`;
                if (state.mine.autoMemory.length > 2000) {
                    state.mine.autoMemory = state.mine.autoMemory.slice(-2000);
                }
                saveMineData();
            }
        }
    } catch (e) { console.error('Auto-memory failed:', e); }
}

// ==================== STORAGE ====================

function saveMineData() {
    localStorage.setItem('mineData', JSON.stringify(state.mine));
}

function loadMineData() {
    const data = localStorage.getItem('mineData');
    if (data) {
        const parsed = JSON.parse(data);
        state.mine.favorites = parsed.favorites || [];
        state.mine.notes = parsed.notes || {};
        state.mine.memory = parsed.memory || '';
        state.mine.autoMemory = parsed.autoMemory || '';
        state.mine.systemPrompt = parsed.systemPrompt || 'You are a helpful and caring AI assistant.';
        state.mine.model = parsed.model || 'openai/gpt-4o';
        state.mine.chatSessions = parsed.chatSessions || [];
        state.mine.currentSessionId = parsed.currentSessionId || null;

        // Migrate old chatHistory → chatSessions
        if (parsed.chatHistory && parsed.chatHistory.length > 0 && (!parsed.chatSessions || parsed.chatSessions.length === 0)) {
            state.mine.chatSessions = [{
                id: 's_migrated',
                title: 'Previous Chat',
                messages: parsed.chatHistory,
                summary: '',
                letterKey: null,
                createdAt: Date.now()
            }];
            state.mine.currentSessionId = 's_migrated';
        }

        // Always reset navigation state
        state.mine.isUnlocked = false;
        state.mine.currentYear = 2026;
        state.mine.currentMonth = null;
        state.mine.currentLetter = null;
    }
}

// ==================== EVENT LISTENERS ====================

function initMineEventListeners() {
    // Password modal
    document.getElementById('mine-password-submit').addEventListener('click', verifyPassword);
    document.getElementById('mine-password-cancel').addEventListener('click', hidePasswordModal);
    document.getElementById('mine-password-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPassword();
    });

    // Letter actions
    document.getElementById('letter-favorite-btn').addEventListener('click', toggleFavorite);
    document.getElementById('save-note-btn').addEventListener('click', saveNote);

    // Chat input bar - tap to open chat modal
    document.getElementById('chat-bar-input').addEventListener('click', openChatModal);
    document.getElementById('chat-bar-settings').addEventListener('click', openChatModal);

    // Chat modal
    document.getElementById('chat-close-btn').addEventListener('click', closeChatModal);
    document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    document.getElementById('chat-input').addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });
    document.getElementById('chat-settings-toggle').addEventListener('click', toggleChatSettings);
    document.getElementById('save-chat-settings').addEventListener('click', saveChatSettings);
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        createSession(state.mine.currentLetter || null);
        closeSidebarOnMobile();
    });
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);

    // Close sidebar when clicking chat area on mobile
    document.getElementById('chat-messages').addEventListener('click', closeSidebarOnMobile);
    document.getElementById('chat-input').addEventListener('focus', closeSidebarOnMobile);

    // Close modals on background click
    document.getElementById('mine-password-modal').addEventListener('click', (e) => {
        if (e.target.id === 'mine-password-modal') hidePasswordModal();
    });
    document.getElementById('chat-modal').addEventListener('click', (e) => {
        if (e.target.id === 'chat-modal') closeChatModal();
    });
}

// Start app
document.addEventListener('DOMContentLoaded', init);

