document.addEventListener('DOMContentLoaded', async () => {

    // Auth Check
    const token = localStorage.getItem('cc_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Load User Info
    await loadUserInfo();

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMenu() {
        if (sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            overlay.classList.remove('hidden');
            setTimeout(() => {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('opacity-0');
            }, 10);
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('opacity-0');
            setTimeout(() => {
                sidebar.classList.add('hidden');
                overlay.classList.add('hidden');
            }, 300);
        }
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // Logout
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    });

    async function loadUserInfo() {
        try {
            const response = await fetch(`${CC_CONFIG.API_URL}/user/info/`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();

                // Sidebar
                const nameElements = document.querySelectorAll('.user-name-display');
                nameElements.forEach(el => el.textContent = user.username || 'User');

                const emailElements = document.querySelectorAll('.user-email-display');
                const tier = user.profile.subscription_tier;
                const tierName = tier.toUpperCase() + ' Plan';
                emailElements.forEach(el => el.textContent = tierName);

                const avatarLetter = document.querySelector('.avatar-letter');
                if (avatarLetter) avatarLetter.textContent = (user.username || 'U').charAt(0).toUpperCase();

                // Profile Page Fields
                const emailInput = document.getElementById('user-email-input');
                if (emailInput) emailInput.value = user.email || user.username;

                const checksRemainingEl = document.querySelector('.checks-remaining-display');
                if (checksRemainingEl) checksRemainingEl.textContent = user.profile.checks_remaining;

                const totalChecksEl = document.querySelector('.total-checks-display');
                if (totalChecksEl) totalChecksEl.textContent = user.profile.total_checks_count;

                const badgeEl = document.querySelector('.subscription-badge-display');
                if (badgeEl) badgeEl.textContent = 'Тариф ' + tier.charAt(0).toUpperCase() + tier.slice(1);

                // Progress Bar
                updateProgressBar(user.profile.checks_remaining, tier);
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    function updateProgressBar(remaining, tier) {
        const progressBar = document.getElementById('usage-progress-bar');
        if (!progressBar) return;

        let max = 3; // default for free
        if (tier === 'pro') max = 20;
        if (tier === 'business') max = 100;

        const percentage = Math.min(100, Math.max(0, (remaining / max) * 100));
        progressBar.style.width = percentage + '%';

        // Color coding
        if (percentage < 20) {
            progressBar.classList.remove('from-brand-orange');
            progressBar.classList.add('from-red-500');
        } else {
            progressBar.classList.add('from-brand-orange');
            progressBar.classList.remove('from-red-500');
        }
    }

    // Change Password Form
    const passwordForm = document.getElementById('change-password-form');
    const messageEl = document.getElementById('password-message');

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(passwordForm);
            const current_password = formData.get('current_password');
            const new_password = formData.get('new_password');
            const confirm_password = formData.get('confirm_password');

            if (new_password !== confirm_password) {
                showMessage('Пароли не совпадают', 'error');
                return;
            }

            try {
                const response = await fetch(`${CC_CONFIG.API_URL}/user/change-password/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ current_password, new_password })
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage('Пароль успешно изменен!', 'success');
                    passwordForm.reset();
                } else {
                    showMessage(data.error || 'Ошибка при смене пароля', 'error');
                }
            } catch (error) {
                console.error('Error changing password:', error);
                showMessage('Ошибка сети', 'error');
            }
        });
    }

    function showMessage(text, type) {
        messageEl.textContent = text;
        messageEl.classList.remove('hidden', 'bg-red-500/20', 'text-red-400', 'bg-green-500/20', 'text-green-400', 'border', 'border-red-500/20', 'border-green-500/20');

        if (type === 'error') {
            messageEl.classList.add('bg-red-500/20', 'text-red-400', 'border', 'border-red-500/20');
        } else {
            messageEl.classList.add('bg-green-500/20', 'text-green-400', 'border', 'border-green-500/20');
        }

        messageEl.classList.remove('hidden');

        // Auto hide after 5 seconds if success
        if (type === 'success') {
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, 5000);
        }
    }
});
