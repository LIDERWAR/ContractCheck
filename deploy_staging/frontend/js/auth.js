// Настройка URL API: в локальной разработке всегда целимся в порт 8000
// Use central configuration if available, otherwise fallback to dynamic detection
const API_URL = (typeof CC_CONFIG !== 'undefined') ? CC_CONFIG.API_URL : (window.location.hostname.includes('contractcheck.ru')
    ? 'https://contractcheck.ru/api'
    : 'http://127.0.0.1:8000/api');

const auth = {
    // Вспомогательная функция для безопасного парсинга JSON
    async safeJson(response) {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Ответ не является JSON:', text);
            if (text.includes('<!DOCTYPE html>')) {
                throw new Error('Ошибка сервера (получен HTML). Проверьте консоль браузера.');
            }
            throw new Error('Ошибка парсинга ответа сервера');
        }
    },

    async login(email, password) {
        try {
            const response = await fetch(`${API_URL}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, username: email }),
            });

            const data = await this.safeJson(response);

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка входа');
            }

            localStorage.setItem('cc_token', data.token);
            localStorage.setItem('cc_user', JSON.stringify({ username: data.username, email: data.email }));
            window.location.href = 'dashboard.html';
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async socialLogin(provider, code) {
        try {
            const endpoint = provider === 'google' ? '/auth/google/' : '/auth/vk/';
            const callback_url = window.location.origin + window.location.pathname;
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, callback_url }),
            });

            const data = await this.safeJson(response);

            if (!response.ok) {
                throw new Error(data.error || data.detail || 'Ошибка социального входа');
            }

            localStorage.setItem('cc_token', data.key || data.token); // dj-rest-auth returns 'key' by default
            if (data.user) {
                localStorage.setItem('cc_user', JSON.stringify(data.user));
            }
            window.location.href = 'dashboard.html';
            return data;
        } catch (error) {
            console.error(`${provider} social login error:`, error);
            throw error;
        }
    },

    async register(email, password) {
        try {
            const response = await fetch(`${API_URL}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, username: email }),
            });

            const data = await this.safeJson(response);

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации');
            }

            localStorage.setItem('cc_token', data.token);
            localStorage.setItem('cc_user', JSON.stringify({ username: data.username, email: data.email }));
            window.location.href = 'dashboard.html';
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    async logout() {
        try {
            const token = this.getToken();
            if (token) {
                await fetch(`${API_URL}/auth/logout/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`
                    }
                }).catch(err => console.warn('Logout API call failed:', err));
            }
        } finally {
            localStorage.removeItem('cc_token');
            localStorage.removeItem('cc_user');
            window.location.href = 'index.html';
        }
    },

    getToken() {
        return localStorage.getItem('cc_token');
    },

    checkAuth() {
        if (!this.getToken()) {
            window.location.href = 'login.html';
        }
    },

    async fetchWithAuth(endpoint, options = {}) {
        const token = this.getToken();
        if (!token) throw new Error('Токен не найден');

        const headers = {
            'Authorization': `Token ${token}`,
            ...options.headers
        };

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            console.error('!!! 401 UNAUTHORIZED !!!');
            // В продакшене тут лучше делать logout, но для отладки пока оставим
            throw new Error('Сессия истекла. Войдите заново.');
        }

        return response;
    },

    async forgotPassword(email) {
        try {
            const response = await fetch(`${API_URL}/auth/password/reset/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await this.safeJson(response).catch(() => ({}));
                throw new Error(data.error || 'Ошибка запроса. Проверьте ваш email.');
            }

            return true;
        } catch (error) {
            console.error('Forgot password error:', error);
            throw error;
        }
    },

    async resetPassword(uid, token, password) {
        try {
            const response = await fetch(`${API_URL}/auth/password/reset/confirm/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid,
                    token,
                    new_password: password,
                    re_new_password: password
                }),
            });

            if (!response.ok) {
                const data = await this.safeJson(response).catch(() => ({}));
                throw new Error(data.error || 'Ошибка сброса. Ссылка могла устареть.');
            }

            return true;
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    }
};

/**
 * Переключает видимость пароля в поле ввода
 * @param {string} inputId - ID поля ввода
 * @param {HTMLElement} btn - Кнопка переключения
 */
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const svg = btn.querySelector('svg');

    if (input.type === 'password') {
        input.type = 'text';
        // Иконка перечеркнутого глаза
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a3 3 0 014.244 4.244M1.05 1.05l22.9 22.9"></path>';
    } else {
        input.type = 'password';
        // Иконка глаза
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
    }
}
