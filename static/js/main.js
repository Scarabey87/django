// ========== ✅ ФУНКЦИЯ СМЕНЫ ТЕМЫ ==========
function setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('theme', themeName);
}

// ========== ТАЙМЕР VIP ==========
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

// ========== СОРТИРОВКА ==========
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

// ========== ПОИСК ==========
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
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
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

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    // Загрузка сохранённой темы
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }
    
    // Видео плееры
    document.querySelectorAll('video').forEach(video => {
        video.addEventListener('play', function() {
            document.querySelectorAll('video').forEach(v => {
                if (v !== this && !v.paused) v.pause();
            });
        });
        video.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
    });
    
    // Блокировка горячих клавиш
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u', 'c'].includes(e.key.toLowerCase())) {
            if (!document.activeElement.closest('video')) {
                e.preventDefault();
                return false;
            }
        }
    });
    
    // Клик вне модального окна
    window.onclick = function(event) {
        const modal = document.getElementById('paymentModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
});