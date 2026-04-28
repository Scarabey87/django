function setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('theme', themeName);
}

function startVipTimer(expiryDateStr) {
    const expiryDate = new Date(expiryDateStr);
    const timerElement = document.getElementById('vip-timer');
    
    if (!timerElement) return;

    const interval = setInterval(() => {
        const now = new Date();
        const distance = expiryDate - now;

        if (distance < 0) {
            clearInterval(interval);
            timerElement.innerHTML = "ИСТЕК";
            location.reload();
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        timerElement.innerHTML = `VIP: ${hours}ч ${minutes}м ${seconds}с`;
    }, 1000);
}

// ========== СОРТИРОВКА И ПОИСК ==========
function sortPeople() {
    const sortValue = document.getElementById('sortSelect').value;
    const grid = document.getElementById('peopleGrid');
    const cards = Array.from(grid.querySelectorAll('.person-card'));
    
    cards.sort((a, b) => {
        switch(sortValue) {
            case 'name-asc':
                return a.dataset.name.localeCompare(b.dataset.name, 'ru');
            case 'name-desc':
                return b.dataset.name.localeCompare(a.dataset.name, 'ru');
            case 'videos':
                return parseInt(b.dataset.videos) - parseInt(a.dataset.videos);
            case 'views':
                return parseInt(b.dataset.views) - parseInt(a.dataset.views);
            case 'category':
                return a.dataset.category.localeCompare(b.dataset.category, 'ru');
            default:
                return 0;
        }
    });
    
    cards.forEach(card => grid.appendChild(card));
}

function searchPeople() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
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
    
    document.getElementById('resultsCount').textContent = visibleCount;
}

// ========== МОДАЛЬНОЕ ОКНО ==========
function showPaymentModal() {
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Admin functions
async function setUserLevel(userId, level, hours) {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    try {
        const response = await fetch('/api/manage-user/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ user_id: userId, level: level, hours: hours })
        });
        const data = await response.json();
        if (data.status === 'success') {
            location.reload();
        } else {
            alert('Ошибка: ' + data.error);
        }
    } catch (error) {
        alert('Ошибка сети: ' + error);
    }
}

async function createCode() {
    const code = document.getElementById('newCode').value;
    if(code.length < 6) {
        alert('Код должен быть минимум 6 символов');
        return;
    }
    
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    try {
        const response = await fetch('/api/create-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ code: code, duration: 24 })
        });
        const data = await response.json();
        if (data.status === 'success') {
            location.reload();
        } else {
            alert('Ошибка: ' + data.error);
        }
    } catch (error) {
        alert('Ошибка сети: ' + error);
    }
}