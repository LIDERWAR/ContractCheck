// --- Custom Modal System ---
window.showAlert = function (title, message) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.innerHTML = `
        <div class="custom-modal-card">
            <h3 class="custom-modal-title">
                <svg class="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                ${title}
            </h3>
            <div class="custom-modal-body">${message}</div>
            <div class="custom-modal-footer">
                <button class="custom-modal-btn custom-modal-btn-primary" id="alert-ok">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
    overlay.querySelector('#alert-ok').onclick = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };
};

window.showConfirm = function (title, message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.innerHTML = `
        <div class="custom-modal-card">
            <h3 class="custom-modal-title">
                <svg class="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${title}
            </h3>
            <div class="custom-modal-body">${message}</div>
            <div class="custom-modal-footer">
                <button class="custom-modal-btn custom-modal-btn-secondary" id="confirm-cancel">Отмена</button>
                <button class="custom-modal-btn custom-modal-btn-primary" id="confirm-ok">Да, продолжить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    const close = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#confirm-ok').onclick = () => { close(); if (onConfirm) onConfirm(); };
    overlay.querySelector('#confirm-cancel').onclick = () => { close(); if (onCancel) onCancel(); };
};

document.addEventListener('DOMContentLoaded', async () => {
    // --- Logger Helper ---
    function log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const fullMsg = `[${timestamp}] ${msg}`;
        if (type === 'error') console.error(fullMsg);
        else console.log(fullMsg);
    }

    log('>>> Main Script Loaded');

    // --- Configuration ---
    const CONFIG = {
        API_URL: (typeof CC_CONFIG !== 'undefined') ? CC_CONFIG.API_URL : (window.location.hostname.includes('contractcheck.ru') ? 'https://contractcheck.ru/api' : 'http://127.0.0.1:8000/api'),
        ENDPOINTS: {
            HEALTH: '/health/',
            ANALYZE: '/analyze/',
            LOGOUT: '/auth/logout/'
        },
        SELECTORS: {
            NAV_LOGIN_BTN: 'nav a[href="login.html"]',
            NAV_CONTAINER: 'nav',
            DROP_ZONE: '#drop-zone',
            FILE_INPUT: '#file-input',
            CAMERA_INPUT: '#camera-input',
            LOADING_STATE: '#loading-state',
            LOADING_TEXT: '#loading-text',
            RESULTS_SECTION: '#results-section',
            CLOSE_RESULTS_BTN: '#close-results',
            DOWNLOAD_BTN: '#download-pdf-btn', // Will need to add ID to HTML
            CONSULT_BTN: '#consult-btn',       // Will need to add ID to HTML
            CONTACTS_LINK: 'a[href="#"]',     // Need to be specific if possible
            SCORE_VALUE: '#score-value',
            SUMMARY_TEXT: '#summary-text',
            RISKS_CONTAINER: '#risks-container'
        }
    };

    // --- State ---
    let state = {
        token: null,
        user: null,
        currentDocument: null
    };

    // --- Initialization ---
    await loadHTMLComponents();
    init();

    function init() {
        checkHealth();
        initAuth();
        initNavigation();
        initUserDropdown();
        initFileUpload();
        initResultsModal();
        initAnimations();
    }

    // --- Health Check ---
    function checkHealth() {
        fetch(`${CONFIG.API_URL}${CONFIG.ENDPOINTS.HEALTH}`)
            .then(r => r.json())
            .then(d => log(`Backend Health: ${d.status}`))
            .catch(e => log(`Backend Health Check Failed: ${e.message}`, 'error'));
    }

    // --- Component Loader ---
    async function loadHTMLComponents() {
        try {
            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                const response = await fetch('components/header.html');
                if (response.ok) {
                    headerPlaceholder.outerHTML = await response.text();
                    setActiveNav();
                    initMobileMenu();
                }
            }

            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                const response = await fetch('components/footer.html');
                if (response.ok) {
                    footerPlaceholder.outerHTML = await response.text();
                }
            }
        } catch (error) {
            log('Error loading components: ' + error.message, 'error');
        }
    }

    function setActiveNav() {
        const navContainer = document.getElementById('main-nav-links');
        if (!navContainer) return;

        const links = navContainer.querySelectorAll('a.nav-link');
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        let bestMatch = null;

        links.forEach(link => {
            const linkHref = link.getAttribute('href');
            const linkPage = linkHref.split('#')[0] || 'index.html';

            if (linkPage === currentPath) {
                if (linkHref === currentPath + window.location.hash) {
                    bestMatch = link;
                } else if (!bestMatch && linkPage === currentPath && !linkHref.includes('#')) {
                    bestMatch = link;
                }
            }
        });

        if (bestMatch) {
            bestMatch.classList.add('nav-link-active', 'text-brand-orange', 'border-b-2', 'border-brand-orange', 'pb-1');
            bestMatch.classList.remove('hover:text-brand-orange', 'transition-colors', 'duration-200');
        }
    }

    // --- Auth Logic ---
    async function initAuth() {
        try {
            if (typeof auth !== 'undefined') {
                state.token = auth.getToken();
                const userStr = localStorage.getItem('cc_user');
                if (userStr && userStr !== 'undefined') {
                    try {
                        state.user = JSON.parse(userStr);
                    } catch (e) {
                        log('Error parsing cc_user, will fetch from server', 'warn');
                    }
                }

                log(`Auth Status: ${state.token ? 'Token Found' : 'Guest'}`);

                // If we have a token but no user data, fetch it
                if (state.token && !state.user) {
                    log('Token present but user data missing, fetching...');
                    await syncUserInfo();
                } else {
                    updateAuthUI();
                }
            } else {
                log('Auth module not found!', 'error');
            }
        } catch (e) {
            log(`Auth init error: ${e.message}`, 'error');
        }
    }

    async function syncUserInfo() {
        if (!state.token) return;
        try {
            const response = await auth.fetchWithAuth('/user/info/');
            if (response.ok) {
                const userData = await response.json();
                state.user = userData;
                localStorage.setItem('cc_user', JSON.stringify(userData));
                log('User data synchronized from server');
                updateAuthUI();
            } else if (response.status === 401) {
                log('Invalid token detected during sync, logging out...', 'warn');
                auth.logout();
            }
        } catch (error) {
            log('Failed to sync user info: ' + error.message, 'error');
            updateAuthUI(); // Still call it to show at least "User" if logged in
        }
    }

    function updateAuthUI() {
        // Desktop elements
        const loginBtn = document.getElementById('desktop-login-btn') || document.querySelector(CONFIG.SELECTORS.NAV_LOGIN_BTN);
        const userDropdown = document.getElementById('user-profile-dropdown');

        // Mobile elements
        const mobileLoginBtn = document.getElementById('mobile-auth-login');
        const mobileLogoutBtn = document.getElementById('mobile-auth-logout');

        if (state.token) {
            // Authenticated State - Desktop
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userDropdown) {
                userDropdown.classList.remove('hidden');

                // Populate user data
                const btnAvatar = userDropdown.querySelector('.user-avatar');
                const btnName = userDropdown.querySelector('#user-profile-btn .user-name');
                const menuName = userDropdown.querySelector('#user-dropdown-menu .user-name');
                const menuEmail = userDropdown.querySelector('.user-email');

                let displayName = 'Пользователь';
                let initial = 'U';
                let displayEmail = '';

                if (state.user) {
                    // Try to find any name
                    displayName = state.user.username || state.user.first_name || state.user.email || 'Пользователь';

                    // If it's an email-like string, use the prefix
                    if (displayName && displayName.includes('@')) {
                        displayName = displayName.split('@')[0];
                    }

                    // Capitalize first letter for avatar
                    initial = displayName.charAt(0).toUpperCase();

                    // Email or plan for the small text in dropdown
                    displayEmail = state.user.email ||
                        (state.user.profile ? `Тариф: ${state.user.profile.subscription_tier}` : '');
                } else if (state.token) {
                    // Logged in but user data is somehow missing from state
                    displayName = 'Аккаунт';
                    initial = 'A';
                }

                if (btnAvatar) btnAvatar.textContent = initial;
                if (btnName) btnName.textContent = displayName;
                if (menuName) menuName.textContent = displayName;
                if (menuEmail) menuEmail.textContent = displayEmail;
            }

            // Authenticated State - Mobile
            if (mobileLoginBtn) {
                mobileLoginBtn.textContent = 'Кабинет';
                mobileLoginBtn.href = 'dashboard.html';
            }
            if (mobileLogoutBtn) {
                mobileLogoutBtn.classList.remove('hidden');
            }
        } else {
            // Unauthenticated State - Desktop
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userDropdown) userDropdown.classList.add('hidden');

            // Unauthenticated State - Mobile
            if (mobileLoginBtn) {
                mobileLoginBtn.textContent = 'Войти';
                mobileLoginBtn.href = 'login.html';
            }
            if (mobileLogoutBtn) {
                mobileLogoutBtn.classList.add('hidden');
            }
        }
    }

    async function handleLogout() {
        showConfirm('Выход', 'Вы уверены, что хотите выйти из аккаунта?', async () => {
            if (typeof auth !== 'undefined') {
                await auth.logout();
                updateAuthUI(); // Should redirect anyway
            }
        });
    }

    // --- Navigation & Inactive Buttons ---
    function initMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-menu-overlay');
        const closeBtn = document.getElementById('mobile-menu-close');

        if (!btn || !overlay || !closeBtn) return;

        // Move the overlay to the body to escape stacking context issues
        if (overlay.parentNode !== document.body) {
            document.body.appendChild(overlay);
        }

        function openMenu() {
            overlay.classList.remove('translate-x-full');
            overlay.classList.add('translate-x-0');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        function closeMenu() {
            overlay.classList.add('translate-x-full');
            overlay.classList.remove('translate-x-0');
            document.body.style.overflow = '';
        }

        btn.addEventListener('click', openMenu);
        closeBtn.addEventListener('click', closeMenu);

        // Close when clicking links inside the menu
        const links = overlay.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    function initUserDropdown() {
        const toggleBtn = document.getElementById('user-dropdown-toggle');
        const container = document.getElementById('user-profile-btn');
        const menu = document.getElementById('user-dropdown-menu');

        if (!toggleBtn || !menu || !container) return;

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent default link behavior if any wrapper issue
            const isOpen = !menu.classList.contains('opacity-0');

            if (isOpen) {
                // Close
                menu.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
                container.classList.remove('border-brand-orange/30');
            } else {
                // Open
                menu.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
                container.classList.add('border-brand-orange/30');
            }
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
                container.classList.remove('border-brand-orange/30');
            }
        });
    }

    function initNavigation() {
        // Fix "Contacts" link - find links with href="#" and text "Контакты"
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            if (link.textContent.trim() === 'Контакты' && link.getAttribute('href') === '#') {
                link.href = 'mailto:support@contractcheck.ru';
                link.title = 'Написать в поддержку';
            }
        });

        // Делегирование события клика для всех кнопок выхода (в сайдбаре, шапке и т.д.)
        document.addEventListener('click', (e) => {
            const logoutBtn = e.target.closest('.logout-btn') || e.target.closest('#logout-btn');
            if (logoutBtn) {
                e.preventDefault();
                handleLogout();
            }
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;

                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // --- File Upload Logic ---
    let pendingFiles = [];

    function initFileUpload() {
        const dropZone = document.querySelector(CONFIG.SELECTORS.DROP_ZONE);
        const fileInput = document.querySelector(CONFIG.SELECTORS.FILE_INPUT);
        const cameraInput = document.querySelector(CONFIG.SELECTORS.CAMERA_INPUT);

        if (!dropZone || !fileInput) return;

        // Ensure input covers the zone
        fileInput.style.display = 'block';
        fileInput.style.opacity = '0';
        fileInput.style.position = 'absolute';
        fileInput.style.inset = '0';
        fileInput.style.zIndex = '100';

        fileInput.addEventListener('click', e => e.stopPropagation());

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                pendingFiles = files;
                uploadFiles();
            }
        });

        // Camera input handling
        if (cameraInput) {
            cameraInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    pendingFiles.push(file);
                    // After camera capture, ask if user wants to add more
                    showCameraPrompt();
                }
            });
        }
    }

    function showCameraPrompt() {
        const count = pendingFiles.length;
        showConfirm('Добавить еще?', `Страница ${count} добавлена. Хотите сфотографировать еще одну страницу?`, () => {
            const cameraInput = document.querySelector(CONFIG.SELECTORS.CAMERA_INPUT);
            if (cameraInput) cameraInput.click();
        }, () => {
            // On cancel or "No", proceed to upload
            uploadFiles();
        });

        // Re-implementing the prompt logic to match showConfirm signature (message, onConfirm)
        // Wait, showConfirm only takes onConfirm. Let's adjust it for "No" case or just call upload on choice.
    }

    function updateDetailStatus(text, show = true) {
        const el = document.getElementById('page-checker-status');
        if (el) {
            el.textContent = text;
            el.style.opacity = show ? '1' : '0';
        }
    }

    function uploadFiles() {
        if (pendingFiles.length === 0) return;

        const uploadingState = document.getElementById('uploading-state');
        const aiLoadingState = document.getElementById('loading-state');
        const aiBaseState = document.getElementById('analysis-base-state');
        const analysisWarning = document.getElementById('analysis-warning');

        // Шаг 3 элементы
        const resultContainer = document.getElementById('result-visual-container');
        const resultBaseState = document.getElementById('result-base-state');
        const resultActionState = document.getElementById('result-action-state');
        const viewResultBtn = document.getElementById('view-result-btn');

        log(`Starting upload of ${pendingFiles.length} files`);

        // Скролл к секции процесса
        const howItWorks = document.getElementById('how-it-works');
        if (howItWorks) {
            howItWorks.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Показываем состояние загрузки в первом блоке
        if (uploadingState) {
            uploadingState.classList.remove('hidden');
            uploadingState.style.opacity = '1';
        }

        const step1Bar = document.getElementById('step1-progress-bar-fill');
        const step1Text = document.getElementById('step1-progress-text');
        const step1Status = document.getElementById('step1-detail-status');

        function updateStep1(percent, status) {
            if (step1Bar) step1Bar.style.width = `${percent}%`;
            if (step1Text) step1Text.textContent = `${Math.round(percent)}%`;
            if (step1Status) step1Status.textContent = status;
        }

        const formData = new FormData();
        pendingFiles.forEach(file => {
            formData.append('files', file);
        });

        // Clear for next time
        const totalSize = pendingFiles.reduce((acc, f) => acc + f.size, 0);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${CONFIG.API_URL}${CONFIG.ENDPOINTS.ANALYZE}`, true);

        if (state.token) {
            xhr.setRequestHeader('Authorization', `Token ${state.token}`);
        }
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                updateStep1(percentComplete, `Загрузка: ${pendingFiles.length} стр. (${Math.round(e.loaded / 1024)}KB)...`);
                updateDetailStatus(`Загрузка файлов...`, true);
            }
        };

        xhr.onload = async () => {
            // Reset pending list after upload attempt
            const uploadedFilesCount = pendingFiles.length;
            const uploadedSize = totalSize;
            pendingFiles = [];

            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                state.currentDocument = data;
                state.currentDocument.size = uploadedSize; // For simulation

                updateStep1(100, "Файлы загружены. Ожидаем OCR...");

                setTimeout(async () => {
                    if (uploadingState) {
                        uploadingState.style.opacity = '0';
                        setTimeout(() => uploadingState.classList.add('hidden'), 500);
                    }

                    const step2Card = document.getElementById('analysis-visual-container').closest('.glass-card');
                    if (step2Card) step2Card.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    if (aiBaseState) aiBaseState.classList.add('opacity-0');
                    if (aiLoadingState) {
                        aiLoadingState.classList.remove('opacity-0');
                        aiLoadingState.classList.remove('pointer-events-none');
                    }
                    if (analysisWarning) analysisWarning.classList.remove('hidden');

                    if (data.is_guest) {
                        runGuestSimulation(document.getElementById('progress-bar-fill'), document.getElementById('progress-text'), aiLoadingState, aiBaseState, analysisWarning, resultContainer, resultBaseState, resultActionState, viewResultBtn);
                    } else {
                        await pollForPreparation(data.id, document.getElementById('progress-bar-fill'), document.getElementById('progress-text'));
                    }
                }, 1500);
            } else {
                const errorData = JSON.parse(xhr.responseText);
                showAlert('Ошибка загрузки', errorData.error || 'Не удалось загрузить файлы');
                resetUI();
            }
        };

        xhr.onerror = () => {
            pendingFiles = [];
            showAlert('Ошибка сети', 'Не удалось связаться с сервером. Проверьте интернет-соединение.');
            resetUI();
        };

        xhr.send(formData);
    }

    function runGuestSimulation(progressBarFill, progressText, aiLoadingState, aiBaseState, analysisWarning, resultContainer, resultBaseState, resultActionState, viewResultBtn) {
        log(`Guest simulation started`);
        let progress = 0;
        // Берем размер из данных или из локального файла, если данных нет
        const sizeValue = (state.currentDocument && state.currentDocument.size) ? state.currentDocument.size : 500000;
        const estTotalPages = Math.max(2, Math.ceil(sizeValue / 300000));

        const simulationInterval = setInterval(() => {
            const increment = progress < 40 ? 0.6 : (progress < 80 ? 0.3 : 0.1);
            progress += increment;

            if (progress <= 100 && progressBarFill && progressText) {
                const displayProgress = Math.min(100, progress);
                progressBarFill.style.width = `${displayProgress}%`;

                const safeTotalPages = (estTotalPages && !isNaN(estTotalPages)) ? estTotalPages : 2;
                const currentPage = Math.max(1, Math.min(safeTotalPages, Math.ceil((displayProgress / 100) * safeTotalPages)));

                if (displayProgress < 40) {
                    progressText.textContent = `${Math.floor(displayProgress)}% (Загрузка ИИ-моделей...)`;
                    updateDetailStatus(`Чтение документа: стр. ${currentPage} из ${safeTotalPages}...`, true);
                } else if (displayProgress < 98) {
                    progressText.textContent = `${Math.floor(displayProgress)}% (Глубокий аудит рисков...)`;
                    updateDetailStatus(`Проверено ${currentPage} из ${safeTotalPages} стр. | Поиск скрытых угроз...`, true);
                } else {
                    progressText.textContent = '100% (Анализ завершен)';
                    updateDetailStatus(`Все ${safeTotalPages} стр. проверены!`, true);
                }
            }

            if (progress >= 100) {
                clearInterval(simulationInterval);
                setTimeout(() => {
                    if (aiLoadingState) aiLoadingState.classList.add('opacity-0');
                    if (aiBaseState) aiBaseState.classList.remove('opacity-0');
                    if (analysisWarning) analysisWarning.classList.add('hidden');
                    const dummyData = {
                        score: 70,
                        summary: "Договор содержит риски в части неустойки.",
                        risks: [{ title: "Риск 1", description: "Описание" }],
                        status: 'processed'
                    };
                    showResults(dummyData);
                    if (resultContainer) {
                        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        if (resultBaseState) resultBaseState.classList.add('opacity-0');
                        if (resultActionState) resultActionState.classList.remove('hidden');
                        if (viewResultBtn) {
                            viewResultBtn.onclick = () => { window.location.href = 'register.html'; };
                        }
                    }
                }, 1000);
            }
        }, 150);
    }

    // Опрос готовности документа (Parsing -> Awaiting Analysis)
    async function pollForPreparation(docId, progressBarFill, progressText) {
        let pollCount = 0;
        const maxPolls = 60; // 1 минута

        const poll = async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/documents/${docId}/`, {
                    headers: { 'Authorization': `Token ${state.token}`, 'Accept': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.status === 'awaiting_analysis') {
                        log(`Document prepared: ${data.total_pages} pages`);
                        updateDetailStatus(`Структура определена: ${data.total_pages} стр.`, true);

                        if (progressText) {
                            progressText.textContent = `Документ готов к анализу.`;
                        }

                        // Плавная пауза перед переходом к ИИ
                        setTimeout(async () => {
                            await startAIAnalysis(docId, progressBarFill, progressText, data.total_pages);
                        }, 1000);
                        return;
                    } else if (data.status === 'failed') {
                        showAlert('Ошибка обработки', data.summary || 'Неизвестная ошибка');
                        resetUI();
                        return;
                    }

                    pollCount++;
                    if (pollCount < maxPolls) {
                        const parsingSteps = [
                            "Читаем структуру...",
                            "Распознаем текст...",
                            "Определяем количество страниц...",
                            "Подготовка к ИИ-анализу..."
                        ];
                        const currentStep = parsingSteps[Math.min(pollCount % parsingSteps.length, parsingSteps.length - 1)];
                        updateDetailStatus(currentStep, true);
                        if (progressText) progressText.textContent = `Парсинг документа...`;
                        setTimeout(poll, 1500);
                    } else {
                        showAlert('Таймаут', 'Превышено время ожидания обработки документа. Попробуйте загрузить файл еще раз.');
                        resetUI();
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
                setTimeout(poll, 3000);
            }
        };

        poll();
    }

    // Запуск и опрос AI анализа
    async function startAIAnalysis(docId, progressBarFill, progressText, totalPagesRaw = 1) {
        const totalPages = parseInt(totalPagesRaw, 10) || 1;
        function getDetailStatus(progress) {
            const aiSteps = [
                "Анализируем риски...",
                "Проверяем юридическую чистоту...",
                "Ищем скрытые условия...",
                "Формируем рекомендации...",
                "Проверяем неустойки и пени...",
                "Сверка с ГК РФ..."
            ];

            const safeTotalPages = (totalPages && !isNaN(totalPages)) ? totalPages : 1;
            // Расчет текущей страницы на основе прогресса
            const currentPage = Math.max(1, Math.min(safeTotalPages, Math.ceil((progress / 95) * safeTotalPages)));
            const stepIndex = Math.floor((progress / 100) * aiSteps.length);
            const stepText = aiSteps[Math.min(stepIndex, aiSteps.length - 1)];

            return `Проверено ${currentPage} из ${safeTotalPages} стр. | ${stepText}`;
        }
        try {
            const startResponse = await fetch(`${CONFIG.API_URL}/documents/${docId}/analyze/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${state.token}`, 'Accept': 'application/json' }
            });

            if (!startResponse.ok) {
                const err = await startResponse.json();
                showAlert('Ошибка анализа', err.error || 'Ошибка сервера');
                resetUI();
                return;
            }

            log(`AI analysis started for ${docId}`);

            let aiProgress = 0;
            const progressInterval = setInterval(() => {
                if (aiProgress < 95) {
                    // Очень плавный прирост
                    const increment = aiProgress < 50 ? 0.3 : (aiProgress < 85 ? 0.15 : 0.05);
                    aiProgress += increment;

                    if (progressBarFill && progressText) {
                        progressBarFill.style.width = `${Math.min(95, aiProgress)}%`;
                        progressText.textContent = `${Math.floor(Math.min(95, aiProgress))}% (ИИ выполняет глубокий аудит...)`;
                        const status = getDetailStatus(aiProgress);
                        updateDetailStatus(status, true);
                    }
                }
            }, 150);

            // Опрос окончательного статуса
            const pollFinal = async () => {
                try {
                    const response = await fetch(`${CONFIG.API_URL}/documents/${docId}/`, {
                        headers: { 'Authorization': `Token ${state.token}`, 'Accept': 'application/json' }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'processed') {
                            clearInterval(progressInterval);
                            if (progressBarFill && progressText) {
                                progressBarFill.style.width = '100%';
                                progressText.textContent = '100% (Анализ завершен!)';
                                updateDetailStatus(`Все ${totalPages} страниц проверены!`, true);
                            }

                            setTimeout(() => {
                                // Вместо редиректа — показываем блок "Шаг 3" (результат)
                                const aiLoadingState = document.getElementById('loading-state');
                                const resultActionState = document.getElementById('result-action-state');
                                const resultBaseState = document.getElementById('result-base-state');
                                const viewResultBtn = document.getElementById('view-result-btn');
                                const resultContainer = document.getElementById('result-visual-container');

                                if (aiLoadingState) aiLoadingState.classList.add('opacity-0');

                                if (resultContainer) {
                                    if (resultBaseState) resultBaseState.classList.add('opacity-0');
                                    if (resultActionState) {
                                        resultActionState.classList.remove('hidden');
                                        resultActionState.classList.add('flex'); // Показываем блок
                                    }

                                    if (viewResultBtn) {
                                        viewResultBtn.onclick = () => {
                                            if (state.token) {
                                                window.location.href = `document.html?id=${docId}`;
                                            } else {
                                                window.location.href = 'register.html';
                                            }
                                        };
                                    }

                                    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                } else {
                                    // Резерв если блок не найден
                                    if (state.token) {
                                        window.location.href = `document.html?id=${docId}`;
                                    } else {
                                        showResults(data);
                                    }
                                }
                            }, 1000);
                            return;
                        } else if (data.status === 'failed') {
                            clearInterval(progressInterval);
                            showAlert('Результат анализа', data.summary || 'Попробуйте позже.');
                            resetUI();
                            return;
                        }

                        setTimeout(pollFinal, 3000);
                    }
                } catch (e) {
                    setTimeout(pollFinal, 5000);
                }
            };

            pollFinal();

        } catch (error) {
            console.error('AI Start error:', error);
            resetUI();
        }
    }

    function resetUI() {
        const aiLoadingState = document.getElementById('loading-state');
        const aiBaseState = document.getElementById('analysis-base-state');
        const analysisWarning = document.getElementById('analysis-warning');
        const uploadingState = document.getElementById('uploading-state');

        if (aiLoadingState) aiLoadingState.classList.add('opacity-0');
        if (aiBaseState) aiBaseState.classList.remove('opacity-0');
        if (analysisWarning) analysisWarning.classList.add('hidden');
        if (uploadingState) {
            uploadingState.classList.add('opacity-0');
            setTimeout(() => uploadingState.classList.add('hidden'), 300);
        }
    }

    // --- Results Modal Logic ---
    function initResultsModal() {
        const closeBtn = document.querySelector(CONFIG.SELECTORS.CLOSE_RESULTS_BTN);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.querySelector(CONFIG.SELECTORS.RESULTS_SECTION).classList.add('hidden');
            });
        }

        // Wire up buttons - these need to be found DYNAMICALLY or ensure IDs exist
        // We will add IDs in the next step (updating index.html)
        // But we can delegate or search by class/text for now if needed.
        // Better to wait for updated HTML. But let's add listeners assuming IDs will be there.

        const downloadBtn = document.getElementById('download-pdf-btn'); // Will add this ID
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                if (state.currentDocument && state.currentDocument.file) {
                    const link = document.createElement('a');
                    link.href = state.currentDocument.file;
                    link.download = state.currentDocument.name || 'document.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    showAlert('Ошибка', 'Документ не найден или ссылка недоступна.');
                }
            });
        }
        // Note: I will use event delegation for these in case they are dynamic or IDs missing
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#download-pdf-btn')) {
                handleDownload();
            }
            if (e.target.closest('#consult-btn')) {
                window.location.href = 'mailto:support@contractcheck.ru?subject=Юридическая консультация';
            }
        });
    }

    function handleDownload() {
        if (state.currentDocument && state.currentDocument.file) {
            const link = document.createElement('a');
            link.href = state.currentDocument.file;
            link.download = state.currentDocument.name || 'document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            showAlert('Ошибка', 'Документ не найден.');
        }
    }

    function showResults(data) {
        const modal = document.querySelector(CONFIG.SELECTORS.RESULTS_SECTION);
        if (!modal) return;

        if (data.status === 'failed') {
            showAlert('Ошибка анализа', data.summary || 'Сервер недоступен.');
            return;
        }

        const isGuest = !state.token;
        const guestBanner = document.getElementById('guest-promo-banner');
        const saveNotice = document.getElementById('save-notice');
        const downloadBtn = document.getElementById('download-pdf-btn');

        if (guestBanner) {
            if (isGuest) {
                guestBanner.classList.remove('hidden');
            } else {
                guestBanner.classList.add('hidden');
            }
        }

        if (saveNotice) {
            if (isGuest) {
                saveNotice.classList.add('hidden');
            } else {
                saveNotice.classList.remove('hidden');
                // Ensure inline-flex is back if it was removed
                saveNotice.classList.add('inline-flex');
            }
        }

        if (downloadBtn) {
            if (isGuest) {
                downloadBtn.classList.add('hidden');
            } else {
                downloadBtn.classList.remove('hidden');
            }
        }

        // Populate Data
        const score = data.score || 0;
        const pagesProcessed = data.pages_processed || 0;
        const totalPages = data.total_pages || 0;

        const pageCountEl = document.getElementById('page-count-display');
        if (pageCountEl) {
            pageCountEl.textContent = ''; // Clear
            if (totalPages > 0) {
                const span = document.createElement('span');
                span.className = 'text-brand-orange font-medium ml-1';
                if (pagesProcessed < totalPages) {
                    span.textContent = `• Проверено ${pagesProcessed} из ${totalPages} стр. (Лимит тарифа)`;
                } else {
                    span.className = 'text-gray-400 ml-1';
                    span.textContent = `• Проверен весь текст (${totalPages} стр.)`;
                }
                pageCountEl.appendChild(document.createTextNode(' '));
                pageCountEl.appendChild(span);
            }
        }

        const scoreValueEl = document.querySelector(CONFIG.SELECTORS.SCORE_VALUE);
        const iconContainer = document.getElementById('score-icon-container');

        // Determine Color & Icon
        let colorClass = 'text-red-500';
        let borderColorClass = 'border-red-500';
        let iconSvg = `
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`; // Red X

        if (score >= 80) {
            colorClass = 'text-green-500';
            borderColorClass = 'border-green-500';
            iconSvg = `
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>`; // Green Check
        } else if (score >= 50) {
            colorClass = 'text-yellow-500';
            borderColorClass = 'border-yellow-500';
            iconSvg = `
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>`; // Yellow Warning
        }

        // Apply Styles
        scoreValueEl.className = `text-4xl font-bold ${colorClass}`;
        scoreValueEl.textContent = `${score}/100`;

        if (iconContainer) {
            iconContainer.className = `w-16 h-16 rounded-full border-4 ${borderColorClass} flex items-center justify-center ${colorClass}`;
            iconContainer.innerHTML = iconSvg;
        }

        document.querySelector(CONFIG.SELECTORS.SUMMARY_TEXT).textContent = data.summary || 'Нет описания';

        const risksContainer = document.querySelector(CONFIG.SELECTORS.RISKS_CONTAINER);
        risksContainer.innerHTML = '';

        if (data.risks && data.risks.length > 0) {
            data.risks.forEach(risk => {
                const riskEl = document.createElement('div');
                riskEl.className = 'bg-white/5 rounded-xl p-4 border border-white/5';

                const flexDiv = document.createElement('div');
                flexDiv.className = 'flex items-start gap-3';

                const bullet = document.createElement('div');
                bullet.className = 'mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0';

                const contentDiv = document.createElement('div');

                const h4 = document.createElement('h4');
                h4.className = 'font-bold text-white text-sm mb-1';
                h4.textContent = risk.title || risk.risk || 'Риск';

                const p = document.createElement('p');
                p.className = 'text-gray-400 text-xs';
                p.textContent = risk.description || risk.recommendation || '';

                contentDiv.appendChild(h4);
                contentDiv.appendChild(p);
                flexDiv.appendChild(bullet);
                flexDiv.appendChild(contentDiv);
                riskEl.appendChild(flexDiv);

                risksContainer.appendChild(riskEl);
            });
        } else {
            risksContainer.innerHTML = '<p class="text-gray-500 italic">Рисков не обнаружено.</p>';
        }

        modal.classList.remove('hidden');
    }

    // --- Animations ---
    function initAnimations() {
        const reveals = document.querySelectorAll('.reveal');
        function checkScroll() {
            reveals.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight - 50) {
                    el.classList.add('visible');
                }
            });
        }
        window.addEventListener('scroll', checkScroll);
        setTimeout(checkScroll, 100);
        checkScroll();
    }

    // --- PAYMENT INTEGRATION ---
    window.startPayment = async function (plan_id) {
        const token = localStorage.getItem('cc_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Show loading state if needed
            const btn = event?.target;
            const originalText = btn ? btn.innerText : '';
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'Загрузка...';
            }

            const response = await fetch(`${CC_CONFIG.API_URL}/payment/create/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan_id })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.payment_url) {
                    window.location.href = data.payment_url;
                }
            } else {
                const errorData = await response.json();
                const msg = errorData.details
                    ? `Ошибка: ${errorData.error}\nДетали: ${errorData.details}`
                    : (errorData.error || 'Ошибка при создании платежа');
                window.showAlert('Ошибка платежа', msg);
            }


            if (btn) {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        } catch (error) {
            console.error('Payment error:', error);
            window.showAlert('Ошибка сети', 'Не удалось связаться с платежным шлюзом. Попробуйте позже.');
        }
    };

    window.chooseStarterPlan = function () {
        if (localStorage.getItem('cc_token')) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'register.html';
        }
    };

    initAnimations();
});
