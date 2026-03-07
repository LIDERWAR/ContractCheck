document.addEventListener('DOMContentLoaded', async () => {
    let pollingTimer = null;

    // Auth Check
    const token = localStorage.getItem('cc_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let userTier = 'free';

    // User Info
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
                if (user.profile && user.profile.subscription_tier) {
                    userTier = user.profile.subscription_tier;
                }

                // Update Name
                const nameElements = document.querySelectorAll('.user-name-display');
                nameElements.forEach(el => el.textContent = user.username || 'User');

                // Update Subscription
                const emailElements = document.querySelectorAll('.user-email-display');
                if (user.profile && user.profile.subscription_tier) {
                    const tierName = user.profile.subscription_tier.toUpperCase() + ' Plan';
                    emailElements.forEach(el => el.textContent = tierName);
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (!docId) {
        alert('ID документа не указан');
        window.location.href = 'dashboard.html';
        return;
    }

    await loadDocumentDetails(docId, token);

    async function loadDocumentDetails(id, token) {
        try {
            const response = await fetch(`${CC_CONFIG.API_URL}/documents/${id}/`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (response.status === 401) {
                console.error('Unauthorized access - please log in again');
                localStorage.removeItem('cc_token');
                window.location.href = 'login.html';
                return;
            }

            if (response.status === 404) {
                alert('Документ не найден или у вас нет прав доступа');
                window.location.href = 'dashboard.html';
                return;
            }

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const doc = await response.json();
            renderDocument(doc);

            // Polling logic
            if (doc.status === 'pending' && !pollingTimer) {
                console.log('--- Start polling for document details ---');
                pollingTimer = setInterval(() => loadDocumentDetails(id, token), 5000);
            } else if (doc.status !== 'pending' && pollingTimer) {
                console.log('--- Stop polling: analysis complete ---');
                clearInterval(pollingTimer);
                pollingTimer = null;
            }
        } catch (error) {
            console.error('Error loading document details:', error);
            const nameEl = document.getElementById('doc-name');
            if (nameEl) nameEl.textContent = 'Ошибка загрузки';
        }
    }

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

    function renderDocument(doc) {
        // Basic Info
        const nameEl = document.getElementById('doc-name');
        if (nameEl) nameEl.textContent = doc.name || 'Без названия';

        const dateEl = document.getElementById('doc-date');
        if (dateEl && doc.uploaded_at) {
            dateEl.textContent = new Date(doc.uploaded_at).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

        // Status
        const statusEl = document.getElementById('doc-status');
        if (statusEl) {
            statusEl.textContent = doc.status === 'processed' ? 'Готов' : doc.status === 'failed' ? 'Ошибка' : 'Обработка';
            statusEl.className = `px-3 py-1 rounded-lg text-white inline-block text-sm ${doc.status === 'processed' ? 'bg-green-500/20 text-green-400' :
                doc.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                }`;
        }

        // Score & Icon Logic
        const score = doc.score || 0;
        const scoreEl = document.getElementById('doc-score');
        if (scoreEl) scoreEl.textContent = `${score}/100`;

        // Icon Logic
        const iconContainer = document.getElementById('score-icon-container');
        if (iconContainer) {
            let colorClass = 'text-red-500';
            let borderColorClass = 'border-red-500';
            let iconSvg = `
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>`;

            if (score >= 80) {
                colorClass = 'text-green-500';
                borderColorClass = 'border-green-500';
                iconSvg = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            } else if (score >= 50) {
                colorClass = 'text-yellow-500';
                borderColorClass = 'border-yellow-500';
                iconSvg = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
            }

            iconContainer.className = `w-16 h-16 rounded-full border-4 ${borderColorClass} flex items-center justify-center ${colorClass}`;
            iconContainer.innerHTML = iconSvg;
        }

        // Downloads
        const downloadBtn = document.getElementById('download-pdf-btn');
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                if (doc.file) {
                    const link = document.createElement('a');
                    link.href = doc.file;
                    link.download = doc.name || 'document';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    alert('Файл недоступен');
                }
            };
        }

        const downloadImprovedBtn = document.getElementById('download-improved-btn');
        if (downloadImprovedBtn) {
            // Если Free план - показываем заблокированную кнопку
            if (userTier === 'free') {
                downloadImprovedBtn.classList.remove('hidden');
                downloadImprovedBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    Доступно в PRO
                `;
                downloadImprovedBtn.className = "w-full py-3 bg-gray-500/10 text-gray-400 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5";
                downloadImprovedBtn.onclick = () => {
                    alert('Скачивание исправленных документов доступно только в тарифах PRO и Business.');
                    window.location.href = 'profile.html';
                };
            }
            // Если платный план и файл есть
            else if (doc.improved_file) {
                downloadImprovedBtn.classList.remove('hidden');
                downloadImprovedBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Скачать улучшенную версию
                `;
                downloadImprovedBtn.className = "w-full py-3 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl font-bold transition flex items-center justify-center gap-2";
                downloadImprovedBtn.onclick = () => {
                    const link = document.createElement('a');
                    link.href = doc.improved_file;
                    link.download = `improved_${doc.name || 'document'}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };
            } else {
                downloadImprovedBtn.classList.add('hidden');
            }
        }

        // Summary
        const summaryEl = document.getElementById('doc-summary');
        if (summaryEl) summaryEl.textContent = doc.summary || 'Нет описания.';

        // Risks
        const risksList = document.getElementById('risks-list');
        if (risksList) {
            risksList.innerHTML = '';
            let risks = doc.risks;
            if (typeof risks === 'string') {
                try { risks = JSON.parse(risks); } catch (e) { }
            }

            if (Array.isArray(risks) && risks.length > 0) {
                risks.forEach(risk => {
                    const div = document.createElement('div');
                    div.className = 'p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4 items-start';

                    const safeTitle = escapeHTML(risk.title || risk.risk || 'Риск');
                    const safeDesc = escapeHTML(risk.description || risk.recommendation || '');

                    div.innerHTML = `
                        <div class="mt-1 w-6 h-6 flex-shrink-0 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 text-xs font-bold">!</div>
                        <div>
                            <h4 class="font-bold text-white text-sm mb-1">${safeTitle}</h4>
                            <p class="text-xs text-gray-400">${safeDesc}</p>
                        </div>
                    `;
                    risksList.appendChild(div);
                });
            } else {
                risksList.innerHTML = '<div class="p-4 rounded-xl bg-white/5 border border-white/5 text-center text-gray-500">Риски не найдены</div>';
            }
        }

        // Recommendations
        const recommendationsList = document.getElementById('recommendations-list');
        if (recommendationsList) {
            recommendationsList.innerHTML = '';
            let recs = doc.recommendations;
            if (typeof recs === 'string') {
                try { recs = JSON.parse(recs); } catch (e) { }
            }

            if (Array.isArray(recs) && recs.length > 0) {
                recs.forEach(rec => {
                    const div = document.createElement('div');
                    div.className = 'p-5 rounded-xl bg-brand-orange/5 border border-brand-orange/10';

                    const safeTitle = escapeHTML(rec.title || 'Рекомендация');
                    const safeDesc = escapeHTML(rec.description || '');
                    const safeClause = escapeHTML(rec.clause_example || '');

                    let clauseHtml = safeClause ? `
                        <div class="mt-3 bg-black/30 p-3 rounded-lg border border-white/5 font-mono text-sm text-gray-300">
                            <div class="text-xs text-brand-orange mb-1 font-bold uppercase">Пример формулировки:</div>
                            "${safeClause}"
                        </div>` : '';

                    div.innerHTML = `
                        <h4 class="font-bold text-brand-orange text-md mb-2 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            ${safeTitle}
                        </h4>
                        <p class="text-sm text-gray-300 leading-relaxed">${safeDesc}</p>
                        ${clauseHtml}
                    `;
                    recommendationsList.appendChild(div);
                });
            } else {
                recommendationsList.innerHTML = '<div class="p-4 rounded-xl bg-white/5 border border-white/5 text-center text-gray-500">Рекомендации отсутствуют</div>';
            }
        }
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

        const cleanup = () => {
            modal.classList.add('hidden');
            document.getElementById('modal-cancel').onclick = null;
            document.getElementById('modal-ok').onclick = null;
        };

        document.getElementById('modal-cancel').onclick = cleanup;
        document.getElementById('modal-ok').onclick = () => {
            cleanup();
            onConfirm();
        };
    }

    async function deleteCurrentDocument() {
        showConfirmModal('Удалить этот документ?', 'Вы уверены, что хотите безвозвратно удалить файл?', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            const token = localStorage.getItem('cc_token');

            if (!id || !token) return;

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
                    window.location.href = 'dashboard.html';
                } else {
                    const errData = await response.json().catch(() => ({}));
                    alert(`Ошибка при удалении: ${errData.error || response.statusText || 'Неизвестная ошибка'}`);
                }
            } catch (e) {
                console.error('Network error during delete:', e);
                alert('Ошибка сети при удалении');
            }
        });
    }

    window.deleteCurrentDocument = deleteCurrentDocument;
});
