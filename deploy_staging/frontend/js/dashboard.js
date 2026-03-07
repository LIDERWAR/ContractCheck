document.addEventListener('DOMContentLoaded', async () => {
    // БЕЗ auth.checkAuth - работаем без авторизации
    let pollingTimer = null;

    // Пользователь
    await loadUserInfo();

    async function loadUserInfo() {
        const token = localStorage.getItem('cc_token');
        if (!token) return;

        try {
            const response = await fetch(`${CC_CONFIG.API_URL}/user/info/`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();

                // Update Name
                const displayName = user.first_name || user.username || 'User';
                const nameElements = document.querySelectorAll('.user-name-display');
                nameElements.forEach(el => el.textContent = displayName);

                // Update Subscription & Checks
                const emailElements = document.querySelectorAll('.user-email-display');
                const tierName = user.profile.subscription_tier.toUpperCase() + ' Plan';
                emailElements.forEach(el => el.textContent = tierName);

                // Update Remaining Checks Stat Card
                const checksEl = document.querySelector('.checks-remaining-display') ||
                    document.querySelector('.glass-card .text-3xl'); // Fallback to first stat card value
                if (checksEl) {
                    checksEl.textContent = user.profile.checks_remaining;
                    checksEl.classList.add('checks-remaining-display'); // Add class for future reference
                }

                // Update Subscription badge in card
                const badgeEl = document.querySelector('.subscription-badge-display');
                if (badgeEl) {
                    badgeEl.textContent = 'Тариф ' + user.profile.subscription_tier.charAt(0).toUpperCase() + user.profile.subscription_tier.slice(1);
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    // Logout
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    });

    // Загрузка документов
    await loadDocuments();

    // Mobile Menu Logic
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMenu() {
        const isHidden = sidebar.classList.contains('hidden');

        if (isHidden) {
            // Open
            sidebar.classList.remove('hidden');
            overlay.classList.remove('hidden');
            // Small delay to allow display:block to apply before transition
            setTimeout(() => {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('opacity-0');
            }, 10);
        } else {
            // Close
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('opacity-0');

            // Wait for transition to finish before hiding
            setTimeout(() => {
                sidebar.classList.add('hidden');
                overlay.classList.add('hidden');
            }, 300);
        }
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // Active Menu Logic
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    function updateActiveMenu() {
        const hash = window.location.hash || '#'; // Default to empty/overview

        sidebarLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            // Check if link matches hash, OR if it's the default (#) and hash is empty
            const isActive = linkHref === hash || (hash === '' && linkHref === '#');

            if (isActive) {
                // Active Styles
                link.classList.add('bg-white/10', 'text-white');
                link.classList.remove('text-gray-400', 'hover:bg-white/5');
            } else {
                // Inactive Styles
                link.classList.remove('bg-white/10', 'text-white');
                link.classList.add('text-gray-400', 'hover:bg-white/5', 'hover:text-white');
            }
        });
    }

    // Initialize on load
    updateActiveMenu();

    // Update on hash change
    window.addEventListener('hashchange', updateActiveMenu);

    // Update on click (instant feedback)
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Allow default behavior (navigation) then update
            setTimeout(updateActiveMenu, 10);

            // Also close mobile menu if open
            if (window.innerWidth < 768) {
                toggleMenu();
            }
        });
    });

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    async function loadDocuments() {
        const tableBody = document.getElementById('documents-table-body');
        if (!tableBody) return;

        const token = localStorage.getItem('cc_token');

        if (!token) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Пожалуйста, <a href="login.html" class="text-brand-orange hover:underline">войдите</a>, чтобы видеть ваши документы.</td></tr>';
            return;
        }

        try {
            const response = await fetch(`${CC_CONFIG.API_URL}/documents/`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Сессия истекла. <a href="login.html" class="text-brand-orange hover:underline">Войти снова</a></td></tr>';
                // Опционально: auth.logout();
                return;
            }

            if (!response.ok) throw new Error('Failed');

            const documents = await response.json();
            renderTable(documents);
            updateStats(documents);

            // Polling logic: if any document is pending, poll again in 5 seconds
            const hasPending = documents.some(doc => doc.status === 'pending');
            if (hasPending && !pollingTimer) {
                console.log('--- Start polling for pending documents ---');
                pollingTimer = setInterval(loadDocuments, 5000);
            } else if (!hasPending && pollingTimer) {
                console.log('--- Stop polling: all documents processed ---');
                clearInterval(pollingTimer);
                pollingTimer = null;
                // Also refresh user info to show updated check count
                await loadUserInfo();
            }

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Ошибка загрузки документов</td></tr>';
        }
    }

    function renderTable(documents) {
        const tableBody = document.getElementById('documents-table-body');
        tableBody.innerHTML = '';

        if (documents.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Нет документов</td></tr>';
            return;
        }

        documents.forEach(doc => {
            const safeName = escapeHTML(doc.name || 'Без названия');
            const row = document.createElement('tr');
            row.className = 'border-b border-white/5 table-row-static hover:bg-white/[0.07] hover:bg-opacity-100 hover:shadow-lg hover:border-transparent transition-all duration-200 cursor-pointer relative z-0 hover:z-10';
            row.setAttribute('data-view-id', doc.id);

            row.innerHTML = `
                <td class="px-6 py-4 text-sm" data-label="Документ">${safeName}</td>
                <td class="px-6 py-4 text-sm text-gray-400" data-label="Дата">${new Date(doc.uploaded_at).toLocaleDateString('ru-RU')}</td>
                <td class="px-6 py-4" data-label="Статус">
                    <span class="px-3 py-1 text-xs rounded-full ${doc.status === 'processed' ? 'bg-green-500/20 text-green-400' : doc.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}">
                        ${doc.status === 'processed' ? 'Готов' : doc.status === 'failed' ? 'Ошибка' : '<span class="inline-block animate-spin mr-1">⌛</span> Обработка'}
                    </span>
                </td>
                <td class="px-6 py-4" data-label="Оценка">
                    <div class="flex items-center gap-2">
                        <div class="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-brand-orange to-brand-red" style="width: ${doc.score || 0}%"></div>
                        </div>
                        <span class="text-sm font-bold ${doc.score >= 70 ? 'text-green-400' : doc.score >= 40 ? 'text-yellow-400' : 'text-red-400'}">
                            ${doc.score || 0}/100
                        </span>
                    </div>
                </td>
                <td class="px-6 py-4 text-right" data-label="Действие">
                    <button data-delete-id="${doc.id}" class="delete-btn p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Удалить">
                        <svg class="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function updateStats(documents) {
        const total = documents.length;
        const processed = documents.filter(d => d.status === 'processed').length;
        const avgScore = processed > 0 ? Math.round(documents.reduce((sum, d) => sum + (d.score || 0), 0) / processed) : 0;

        // Safely update elements if they exist
        const elTotal = document.querySelector('.stat-total') || document.getElementById('docs-count');
        if (elTotal) elTotal.textContent = total;

        const elProcessed = document.querySelector('.stat-processed');
        if (elProcessed) elProcessed.textContent = processed;

        const elScore = document.querySelector('.stat-score');
        if (elScore) elScore.textContent = avgScore;
    }

    function viewDocument(id) {
        window.location.href = `document.html?id=${id}`;
    }

    // Custom Modal logic
    function showConfirmModal(title, message, onConfirm) {
        let modal = document.getElementById('custom-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-confirm-modal';
            modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
            modal.innerHTML = `
                <div class="glass-card max-w-sm w-full p-6 rounded-2xl border border-white/10 shadow-2xl transform transition-all scale-100">
                    <h3 class="text-xl font-bold text-white mb-2" id="modal-title"></h3>
                    <p class="text-gray-400 mb-6" id="modal-message"></p>
                    <div class="flex gap-4">
                        <button id="modal-cancel" class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors">Отмена</button>
                        <button id="modal-ok" class="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">Удалить</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        modal.classList.remove('hidden');

        const cancelBtn = document.getElementById('modal-cancel');
        const okBtn = document.getElementById('modal-ok');

        const cleanup = () => {
            modal.classList.add('hidden');
            cancelBtn.removeEventListener('click', onCancel);
            okBtn.removeEventListener('click', onOk);
        };

        const onCancel = () => cleanup();
        const onOk = () => {
            cleanup();
            onConfirm();
        };

        cancelBtn.addEventListener('click', onCancel);
        okBtn.addEventListener('click', onOk);
    }

    async function deleteDocument(id) {
        showConfirmModal('Удалить документ?', 'Вы уверены, что хотите безвозвратно удалить этот файл?', async () => {
            const token = localStorage.getItem('cc_token');
            if (!token) {
                alert('Ошибка: токен не найден. Пожалуйста, войдите снова.');
                return;
            }

            try {
                const url = `${CC_CONFIG.API_URL}/documents/${id}/`;
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    loadDocuments(); // Refresh table
                } else {
                    const errData = await response.json().catch(() => ({}));
                    console.error('Delete failed:', response.status, errData);
                    alert(`Ошибка при удалении: ${errData.error || response.statusText || 'Неизвестная ошибка'}`);
                }
            } catch (error) {
                console.error('Error deleting document:', error);
                alert('Ошибка сети при удалении');
            }
        });
    }

    // Event Delegation for Table Actions
    const tableBody = document.getElementById('documents-table-body');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            const row = e.target.closest('tr[data-view-id]');

            if (deleteBtn) {
                e.stopPropagation();
                const id = deleteBtn.getAttribute('data-delete-id');
                console.log('!!! DELEGATION: Delete clicked for ID:', id);
                deleteDocument(id);
            } else if (row) {
                const id = row.getAttribute('data-view-id');
                console.log('!!! DELEGATION: View clicked for ID:', id);
                viewDocument(id);
            }
        });
    }

    console.log('!!! dashboard.js INITIALIZATION COMPLETE');
    window.viewDocument = viewDocument;
    window.deleteDocument = deleteDocument;
});
