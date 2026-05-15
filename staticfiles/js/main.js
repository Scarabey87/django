// ========== ТЕМЫ ОФОРМЛЕНИЯ ==========
function setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('theme', themeName);
}

// ========== VIP ТАЙМЕР ==========
function startVipTimer(expiryDateStr) {
    const timerElement = document.getElementById('vip-timer');
    const timerElementInline = document.getElementById('vip-timer-inline');
    
    if (!timerElement && !timerElementInline) return;
    
    const expiryDate = new Date(expiryDateStr);
    
    const interval = setInterval(() => {
        const now = new Date();
        const distance = expiryDate - now;
        
        if (distance < 0) {
            clearInterval(interval);
            if (timerElement) timerElement.innerHTML = '⏰ ИСТЕК';
            if (timerElementInline) timerElementInline.innerHTML = '⏰ ИСТЕК';
            setTimeout(() => location.reload(), 2000);
            return;
        }
        
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const timeString = `⏳ ${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
        
        if (timerElement) timerElement.innerHTML = timeString;
        if (timerElementInline) timerElementInline.innerHTML = timeString;
    }, 1000);
}

// ========== СОРТИРОВКА И ПОИСК ==========
function sortPeople() {
    const sortSelect = document.getElementById('sortSelect');
    const grid = document.getElementById('peopleGrid');
    if (!sortSelect || !grid) return;
    
    const sortValue = sortSelect.value;
    const cards = Array.from(grid.querySelectorAll('.person-card'));
    
    cards.sort((a, b) => {
        switch(sortValue) {
            case 'name-asc': return a.dataset.name.localeCompare(b.dataset.name, 'ru');
            case 'name-desc': return b.dataset.name.localeCompare(a.dataset.name, 'ru');
            case 'videos': return parseInt(b.dataset.videos) - parseInt(a.dataset.videos);
            case 'views': return parseInt(b.dataset.views) - parseInt(a.dataset.views);
            case 'category': return a.dataset.category.localeCompare(b.dataset.category, 'ru');
            default: return 0;
        }
    });
    cards.forEach(card => grid.appendChild(card));
}

function searchPeople() {
    const searchInput = document.getElementById('searchInput');
    const resultsCount = document.getElementById('resultsCount');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('.person-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
        const name = card.dataset.name;
        const category = card.dataset.category;
        if (name.includes(searchTerm) || category.includes(searchTerm)) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });
    if (resultsCount) resultsCount.textContent = visibleCount;
}

// ========== МОДАЛЬНОЕ ОКНО ==========
function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'flex';
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'none';
}

// ========== УВЕДОМЛЕНИЕ О VIP ==========
function showVipChangeNotification(isVip) {
    const notification = document.createElement('div');
    notification.className = 'vip-change-notification';
    notification.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
        background: ${isVip ? 'linear-gradient(135deg, #28a745, #20c997)' : 'linear-gradient(135deg, #dc3545, #c82333)'};
        color: white; padding: 20px 40px; border-radius: 50px; font-size: 1.1rem;
        font-weight: 600; z-index: 10000; box-shadow: 0 4px 30px rgba(0,0,0,0.3);
        animation: slideDown 0.5s ease;
    `;
    notification.innerHTML = isVip ? 
        '✅ VIP доступ активирован! Страница обновляется...' : 
        '❌ VIP доступ истёк! Страница обновляется...';
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
}

// ========== ✅ АКТИВАЦИЯ КОДА С ЗАЩИТОЙ ОТ БРУТОФОРСА ==========
document.addEventListener('DOMContentLoaded', function() {
    const activateForm = document.getElementById('activateCodeForm');
    const activationError = document.getElementById('activationError');
    const attemptsWarning = document.getElementById('attemptsWarning');
    const activationBtn = document.getElementById('activationBtn');
    
    if (activateForm) {
        activateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(activateForm);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            const codeInput = document.getElementById('activationCode');
            
            if (!csrfToken) {
                showError('❌ Ошибка CSRF');
                return;
            }
            
            // Блокируем кнопку
            activationBtn.disabled = true;
            activationBtn.textContent = 'Проверка...';
            hideError();
            attemptsWarning.style.display = 'none';
            
            try {
                const response = await fetch('/activate-code/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken },
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.status === 429) {
                    // Rate limit exceeded
                    attemptsWarning.style.display = 'block';
                    showError(`⚠️ ${data.error}`);
                } else if (data.status === 'success') {
                    // Успех
                    showError(data.message, 'success');
                    activateForm.reset();
                    // Перезагрузка через 2 секунды для обновления таймера
                    setTimeout(() => location.reload(), 2000);
                } else {
                    // Ошибка
                    showError(`❌ ${data.error}`);
                    codeInput.value = '';
                    codeInput.focus();
                }
                
            } catch (error) {
                console.error('Ошибка активации:', error);
                showError('❌ Ошибка сети. Попробуйте позже.');
            } finally {
                activationBtn.disabled = false;
                activationBtn.textContent = 'Активировать VIP';
            }
        });
    }
    
    function showError(message, type = 'error') {
        if (activationError) {
            activationError.textContent = message;
            activationError.className = `alert alert-${type}`;
            activationError.style.display = 'block';
        }
    }
    
    function hideError() {
        if (activationError) {
            activationError.style.display = 'none';
        }
    }
    
    // ========== ОПРОС ==========
    const pollForm = document.getElementById('pollForm');
    const pollMessage = document.getElementById('pollMessage');
    
    if (pollForm) {
        pollForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(pollForm);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            
            try {
                const response = await fetch('/poll/submit/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken },
                    body: formData
                });
                const data = await response.json();
                
                if (pollMessage) {
                    pollMessage.textContent = data.message || data.error;
                    pollMessage.className = `poll-message ${data.status === 'success' ? 'success' : 'error'}`;
                    if (data.status === 'success') pollForm.reset();
                    setTimeout(() => { pollMessage.textContent = ''; pollMessage.className = 'poll-message'; }, 5000);
                }
            } catch (error) {
                if (pollMessage) {
                    pollMessage.textContent = '❌ Ошибка сети';
                    pollMessage.className = 'poll-message error';
                }
            }
        });
    }
    
    // ========== ВИДЕО ПЛЕЕРЫ ==========
    const videos = document.querySelectorAll('.standalone-video-player');
    videos.forEach(video => {
        video.addEventListener('play', function() {
            videos.forEach(v => { if (v !== this && !v.paused) v.pause(); });
        });
        video.addEventListener('contextmenu', e => { e.preventDefault(); return false; });
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const video = entry.target;
                        if (video.preload === 'none') { video.preload = 'metadata'; video.load(); }
                        observer.unobserve(video);
                    }
                });
            }, { rootMargin: '200px' });
            observer.observe(video);
        }
    });
    
    // Блокировка горячих клавиш
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u', 'c'].includes(e.key.toLowerCase())) {
            if (!document.activeElement.closest('video')) { e.preventDefault(); return false; }
        }
    });
    
    // Модальное окно - клик вне
    window.onclick = function(event) {
        const modal = document.getElementById('paymentModal');
        if (event.target === modal) modal.style.display = 'none';
    };
});