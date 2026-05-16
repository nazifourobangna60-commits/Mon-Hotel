
'use strict';

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
    ADMIN_EMAIL: 'ourorara57@gmail.com',
    ADMIN_PASSWORD: 'Admin@2026',
    APP_NAME: 'LuxeHôtel',
    CURRENCY: '€',
    emailjs_service: 'service_k48oidk',
    emailjs_template: 'template_54fooyf',
    emailjs_public_key: '7oOH5j2AgZf8PSO0u',
    // Firebase placeholders — remplacez par votre configuration Firebase
    firebase_apiKey: 'YOUR_FIREBASE_API_KEY',
    firebase_authDomain: 'YOUR_PROJECT.firebaseapp.com',
    firebase_projectId: 'YOUR_PROJECT_ID',
    firebase_appId: '1:000:web:xxxx',
    firebase_measurementId: '',
};

// ============================================================
// STATE
// ============================================================
let rooms = [];
let reservations = [];
let currentAdmin = null;
let currentUser = null;
let uploadedImages = [];
let editingRoomId = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initDefaultRooms();
    checkSession();
    initFirebase();
    renderRooms();
    updateNavbar();
    setDateConstraints();
    setupDragAndDrop();
    initEmailJS();
    console.log('🏨 LuxeHôtel initialisé');
});

// ============================================================
// SESSION
// ============================================================
function checkSession() {
    const adminRaw = localStorage.getItem('currentAdmin');
    const userRaw = localStorage.getItem('lh_session')
        || localStorage.getItem('currentUser')
        || localStorage.getItem('currentClient');

    if (adminRaw) {
        try { currentAdmin = JSON.parse(adminRaw); } catch(e) {}
    }

    if (userRaw) {
        try { currentUser = JSON.parse(userRaw); } catch(e) {}
    }

    // Vérifier si l'auth est requise (masquer la barrière si connecté)
    const gate = document.getElementById('authGate');
    if (gate) {
        if (currentUser || currentAdmin) {
            gate.style.display = 'none';
        } else {
            gate.style.display = 'flex';
        }
    }
}

function updateNavbar() {
    const navUser = document.getElementById('navUser');
    const navAdmin = document.getElementById('navAdmin');

    if (!navUser && !navAdmin) return;

    if (currentAdmin) {
        if (navAdmin) navAdmin.style.display = 'flex';
        if (navUser) navUser.style.display = 'none';
    } else if (currentUser) {
        if (navUser) {
            navUser.style.display = 'flex';
            const nameEl = navUser.querySelector('.nav-user-name');
            const initialsEl = navUser.querySelector('.nav-user-initials');
            const photoEl = navUser.querySelector('.nav-user-avatar img');
            const name = currentUser.name || currentUser.email.split('@')[0];
            if (nameEl) nameEl.textContent = name.split(' ')[0];
            if (initialsEl) initialsEl.textContent = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            if (photoEl && currentUser.profilePhoto) {
                photoEl.src = currentUser.profilePhoto;
                photoEl.style.display = 'block';
                if (initialsEl) initialsEl.style.display = 'none';
            }
        }
        if (navAdmin) navAdmin.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('currentAdmin');
    localStorage.removeItem('lh_session');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentClient');
    currentAdmin = null;
    currentUser = null;
    hideAdminPanel();
    updateNavbar();

    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'flex';

    showToast('Déconnexion réussie', 'success');
}

// ============================================================
// STORAGE
// ============================================================
function loadFromStorage() {
    const savedRooms = localStorage.getItem('lh_rooms');
    const savedReservations = localStorage.getItem('reservations');

    if (savedRooms) {
        try { rooms = JSON.parse(savedRooms); } catch(e) { rooms = []; }
    }

    if (savedReservations) {
        try { reservations = JSON.parse(savedReservations); } catch(e) { reservations = []; }
    }
}

function saveToStorage() {
    localStorage.setItem('lh_rooms', JSON.stringify(rooms));
    localStorage.setItem('reservations', JSON.stringify(reservations));
    // Compatibilité ancien code
    localStorage.setItem('rooms', JSON.stringify(rooms));
    // Si l'admin est connecté et Firebase configuré, pousser les mises à jour
    if (currentAdmin && window._fb && window._fb.db) {
        pushRoomsToFirestore();
    }
}

// ============================================================
// DEFAULT ROOMS (si vide)
// ============================================================
function initDefaultRooms() {
    if (rooms.length > 0) return;

    rooms = [
        {
            id: 1, number: '101', type: 'standard',
            price: 75, status: 'available',
            description: 'Chambre confortable avec vue sur le jardin, équipée d\'un lit double et d\'une salle de bain privée.',
            images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'],
            amenities: { wifi: true, tv: true, minibar: false, jacuzzi: false, ac: true }
        },
        {
            id: 2, number: '201', type: 'deluxe',
            price: 150, status: 'available',
            description: 'Chambre Deluxe spacieuse avec balcon privatif, baignoire et vue panoramique sur la ville.',
            images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80'],
            amenities: { wifi: true, tv: true, minibar: true, jacuzzi: false, ac: true }
        },
        {
            id: 3, number: '301', type: 'suite',
            price: 280, status: 'available',
            description: 'Suite luxueuse avec salon séparé, jacuzzi privatif et service de conciergerie dédié 24h/24.',
            images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&q=80'],
            amenities: { wifi: true, tv: true, minibar: true, jacuzzi: true, ac: true }
        },
        {
            id: 4, number: '401', type: 'presidentielle',
            price: 550, status: 'available',
            description: 'Suite Présidentielle d\'exception avec deux chambres, terrasse privée et butler personnel.',
            images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80'],
            amenities: { wifi: true, tv: true, minibar: true, jacuzzi: true, ac: true }
        },
        {
            id: 5, number: '102', type: 'standard',
            price: 75, status: 'occupied',
            description: 'Chambre standard avec vue sur la piscine et lit queen size.',
            images: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80'],
            amenities: { wifi: true, tv: true, minibar: false, jacuzzi: false, ac: true }
        },
        {
            id: 6, number: '202', type: 'deluxe',
            price: 150, status: 'available',
            description: 'Chambre Deluxe avec dressing, baignoire îlot et accès au salon VIP.',
            images: ['https://images.unsplash.com/photo-1560347876-aeef00ee58a1?w=600&q=80'],
            amenities: { wifi: true, tv: true, minibar: true, jacuzzi: false, ac: true }
        }
    ];

    saveToStorage();
}

// ============================================================
// RENDER ROOMS
// ============================================================
let currentFilter = 'all';

function filterRooms(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.filter-btn[onclick*="'${type}'"]`);
    if (activeBtn) activeBtn.classList.add('active');
    renderRooms();
}

function renderRooms() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;

    const filtered = currentFilter === 'all'
        ? rooms
        : rooms.filter(r => r.type === currentFilter);

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
            <i class="fas fa-bed" style="font-size:2.5rem; opacity:0.3; display:block; margin-bottom:1rem;"></i>
            <h3 style="color:var(--primary);">Aucune chambre disponible</h3>
            <p>Aucune chambre de ce type pour le moment.</p>
        </div>`;
        return;
    }

    grid.innerHTML = filtered.map(room => renderRoomCard(room)).join('');
}

function renderRoomCard(room) {
    const typeLabels = {
        standard: 'Standard', deluxe: 'Deluxe',
        suite: 'Suite', presidentielle: 'Présidentielle'
    };

    const amenityIcons = {
        wifi: { icon: 'wifi', label: 'WiFi' },
        tv: { icon: 'tv', label: 'TV' },
        minibar: { icon: 'martini-glass', label: 'Minibar' },
        jacuzzi: { icon: 'hot-tub-person', label: 'Jacuzzi' },
        ac: { icon: 'wind', label: 'Clim' }
    };

    const images = room.images && room.images.length > 0
        ? room.images
        : ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'];

    const amenitiesHtml = Object.entries(room.amenities || {})
        .filter(([, val]) => val)
        .slice(0, 4)
        .map(([key]) => {
            const a = amenityIcons[key];
            if (!a) return '';
            return `<span class="amenity-tag"><i class="fas fa-${a.icon}"></i> ${a.label}</span>`;
        }).join('');

    const isAvailable = room.status === 'available';

    return `
    <div class="room-card" id="room-${room.id}">
        <div class="room-image-wrap">
            <img class="room-image" src="${escHtml(images[0])}" alt="${escHtml(typeLabels[room.type] || room.type)}"
                onerror="this.src='https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'">
            <div class="room-type-badge">${escHtml(typeLabels[room.type] || room.type)}</div>
            <span class="room-status ${isAvailable ? 'status-available' : 'status-occupied'}">
                ${isAvailable ? '✓ Disponible' : '✗ Occupée'}
            </span>
        </div>
        <div class="room-info">
            <div class="room-number">Chambre ${escHtml(room.number)}</div>
            <div class="room-type">${escHtml(typeLabels[room.type] || room.type)}</div>
            ${room.description ? `<div class="room-desc">${escHtml(room.description)}</div>` : ''}
            <div class="room-amenities">${amenitiesHtml}</div>
            <div class="room-footer">
                <div class="room-price">
                    ${room.price}${CONFIG.CURRENCY}
                    <span>/ nuit</span>
                </div>
                <button class="book-btn" ${!isAvailable ? 'disabled' : ''}
                    onclick="openBookingModal(${room.id})">
                    ${isAvailable ? 'Réserver' : 'Indisponible'}
                </button>
            </div>
        </div>
    </div>`;
}

// ============================================================
// BOOKING MODAL
// ============================================================
let selectedRoomId = null;

function openBookingModal(roomId) {
    // Vérifier auth
    if (!currentUser && !currentAdmin) {
        const gate = document.getElementById('authGate');
        if (gate) gate.style.display = 'flex';
        return;
    }

    const room = rooms.find(r => r.id === roomId);
    if (!room || room.status !== 'available') {
        showToast('Cette chambre n\'est pas disponible', 'error');
        return;
    }

    selectedRoomId = roomId;

    // Pré-remplir avec les infos utilisateur
    if (currentUser) {
        const nameEl = document.getElementById('guestName');
        const emailEl = document.getElementById('guestEmail');
        const phoneEl = document.getElementById('guestPhone');
        if (nameEl && currentUser.name) nameEl.value = currentUser.name;
        if (emailEl && currentUser.email) emailEl.value = currentUser.email;
        if (phoneEl && currentUser.phone) phoneEl.value = currentUser.phone;
    }

    // Titre de la modal
    const titleEl = document.getElementById('bookingRoomTitle');
    if (titleEl) titleEl.textContent = `Chambre ${room.number} — ${getTypeLabel(room.type)}`;

    document.getElementById('totalPrice').textContent = '0' + CONFIG.CURRENCY;
    document.getElementById('bookingModal').classList.add('active');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('active');
    selectedRoomId = null;
    const form = document.getElementById('bookingForm');
    if (form) form.reset();
}

function calculateTotal() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    if (!checkIn || !checkOut || !selectedRoomId) return;

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    const days = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (days <= 0) {
        document.getElementById('totalPrice').textContent = '⚠ Dates invalides';
        return;
    }

    const total = days * room.price;
    document.getElementById('totalPrice').textContent = total.toLocaleString('fr-FR') + CONFIG.CURRENCY;
}

function handleBooking(e) {
    e.preventDefault();
    if (!selectedRoomId) return;

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return;

    const guestName = document.getElementById('guestName').value.trim();
    const guestEmail = document.getElementById('guestEmail').value.trim();
    const guestPhone = document.getElementById('guestPhone').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guests = document.getElementById('guests').value;

    // Validation
    if (!guestName || !guestEmail || !checkIn || !checkOut) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        showToast('La date de départ doit être après la date d\'arrivée', 'error');
        return;
    }

    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * room.price;

    // Créer la réservation
    const reservation = {
        id: 'RES-' + Date.now(),
        roomId: room.id,
        room: `Chambre ${room.number} — ${getTypeLabel(room.type)}`,
        roomType: room.type,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        guests: parseInt(guests),
        nights,
        price: totalPrice,
        totalPrice: totalPrice + CONFIG.CURRENCY,
        status: 'confirmed',
        date: new Date().toLocaleDateString('fr-FR'),
        userId: currentUser?.id || null
    };

    reservations.push(reservation);

    // Marquer chambre comme occupée
    room.status = 'occupied';
    room.currentGuest = guestName;
    room.checkOut = checkOut;

    saveToStorage();

    // Push reservation to Firestore when available
    pushReservationToFirestore(reservation).catch?.(() => {});

    // Notif admin
    sendAdminNotification({
        title: 'Nouvelle réservation',
        message: `${guestName} a réservé la chambre ${room.number} du ${formatDate(checkIn)} au ${formatDate(checkOut)}`,
        icon: 'calendar-check',
        timestamp: new Date().toISOString(),
        type: 'reservation',
        read: false
    });

    closeBookingModal();
    renderRooms();

    // Si admin panel ouvert
    if (document.getElementById('adminPanel')?.classList.contains('active')) {
        renderAdminRooms();
        renderAdminReservations();
        updateAdminStats();
    }

    showToast(`Réservation confirmée ! Chambre ${room.number} réservée.`, 'success');
}

// ============================================================
// DATE CONSTRAINTS
// ============================================================
function setDateConstraints() {
    const today = new Date().toISOString().split('T')[0];
    const checkInEl = document.getElementById('checkIn');
    const checkOutEl = document.getElementById('checkOut');
    if (checkInEl) checkInEl.min = today;
    if (checkOutEl) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        checkOutEl.min = tomorrow.toISOString().split('T')[0];
    }

    if (checkInEl) {
        checkInEl.addEventListener('change', () => {
            if (checkOutEl) {
                const next = new Date(checkInEl.value);
                next.setDate(next.getDate() + 1);
                checkOutEl.min = next.toISOString().split('T')[0];
                if (checkOutEl.value && checkOutEl.value <= checkInEl.value) {
                    checkOutEl.value = next.toISOString().split('T')[0];
                }
                calculateTotal();
            }
        });
    }
}

// ============================================================
// ADMIN LOGIN (modal)
// ============================================================
function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

function togglePassword() {
    const input = document.getElementById('adminPassword');
    const icon = document.querySelector('.toggle-password');
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;

    if (password === CONFIG.ADMIN_PASSWORD) {
        currentAdmin = { email: CONFIG.ADMIN_EMAIL, name: 'Administrateur' };
        localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin));
        closeLoginModal();
        openAdminPanel();
        showToast('Connexion administrateur réussie', 'success');
    } else {
        showToast('Mot de passe incorrect', 'error');
    }
}

// ============================================================
// ADMIN PANEL
// ============================================================
function openAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) panel.classList.add('active');
    updateAdminStats();
    renderAdminRooms();
    renderAdminReservations();
    loadAdminNotifications();
}

function hideAdminPanel() {
    const panel = document.getElementById('adminPanel');
    if (panel) panel.classList.remove('active');
}

function showAdminSection(section) {
    document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));

    const activeLink = event?.target?.closest('a');
    if (activeLink) activeLink.classList.add('active');

    const sections = ['dashboard', 'rooms', 'reservations', 'clients'];
    sections.forEach(s => {
        const el = document.getElementById(s + 'Section');
        if (el) el.style.display = s === section ? 'block' : 'none';
    });

    if (section === 'dashboard') updateAdminStats();
    else if (section === 'rooms') renderAdminRooms();
    else if (section === 'reservations') renderAdminReservations();
    else if (section === 'clients') renderAdminClients();
}

function updateAdminStats() {
    const totalRoomsEl = document.getElementById('totalRooms');
    const availableRoomsEl = document.getElementById('availableRooms');
    const occupiedRoomsEl = document.getElementById('occupiedRooms');
    const totalRevenueEl = document.getElementById('totalRevenue');

    if (totalRoomsEl) totalRoomsEl.textContent = rooms.length;
    if (availableRoomsEl) availableRoomsEl.textContent = rooms.filter(r => r.status === 'available').length;
    if (occupiedRoomsEl) occupiedRoomsEl.textContent = rooms.filter(r => r.status === 'occupied').length;

    if (totalRevenueEl) {
        const total = reservations.reduce((sum, r) => sum + (r.price || 0), 0);
        totalRevenueEl.textContent = total.toLocaleString('fr-FR') + CONFIG.CURRENCY;
    }

    // Activité récente
    const actDiv = document.getElementById('recentActivity');
    if (actDiv) {
        if (reservations.length === 0) {
            actDiv.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Aucune activité récente</p>';
        } else {
            actDiv.innerHTML = [...reservations].reverse().slice(0, 5).map(r => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.9rem 0;border-bottom:1px solid var(--border);">
                <div>
                    <strong>${escHtml(r.guestName)}</strong> — ${escHtml(r.room || '')}
                    <br><small style="color:var(--text-muted);">${r.date || ''} · ${r.nights || 0} nuit(s)</small>
                </div>
                <span style="color:var(--accent);font-weight:700;font-size:1rem;">${(r.price || 0).toLocaleString('fr-FR')}${CONFIG.CURRENCY}</span>
            </div>`).join('');
        }
    }
}

function renderAdminRooms() {
    const tbody = document.getElementById('adminRoomsTable');
    if (!tbody) return;

    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Aucune chambre</td></tr>';
        return;
    }

    tbody.innerHTML = rooms.map(room => `
    <tr>
        <td><img src="${escHtml(room.images?.[0] || '')}" alt=""
            style="width:60px;height:60px;object-fit:cover;border-radius:8px;"
            onerror="this.style.display='none'"></td>
        <td><strong>${escHtml(room.number)}</strong></td>
        <td>${escHtml(getTypeLabel(room.type))}</td>
        <td style="font-weight:600;">${room.price}${CONFIG.CURRENCY}</td>
        <td><span class="status-badge badge-${room.status}">${room.status === 'available' ? 'Disponible' : 'Occupée'}</span></td>
        <td>
            <div class="action-btns">
                <button class="action-btn edit-btn" onclick="editRoom(${room.id})" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteRoom(${room.id})" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
                ${room.status === 'occupied' ? `
                <button class="action-btn" style="background:#d1fae5;color:#065f46;" onclick="checkoutRoom(${room.id})" title="Check-out">
                    <i class="fas fa-check"></i>
                </button>` : ''}
            </div>
        </td>
    </tr>`).join('');
}

function renderAdminReservations() {
    const container = document.getElementById('reservationsList');
    if (!container) return;

    if (reservations.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Aucune réservation</p>';
        return;
    }

    container.innerHTML = [...reservations].reverse().map(r => {
        const room = rooms.find(rm => rm.id === r.roomId);
        return `
        <div style="background:var(--light);padding:1.5rem;border-radius:12px;margin-bottom:1rem;border-left:4px solid var(--accent);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
                <div>
                    <h4 style="margin-bottom:0.4rem;">${escHtml(r.guestName)}</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;">
                        <i class="fas fa-bed"></i> ${escHtml(r.room || 'N/A')}<br>
                        <i class="fas fa-calendar"></i> ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)} (${r.nights} nuit${r.nights > 1 ? 's' : ''})<br>
                        <i class="fas fa-users"></i> ${r.guests} personne(s) &nbsp;
                        <i class="fas fa-envelope"></i> ${escHtml(r.guestEmail || '')} &nbsp;
                        ${r.guestPhone ? `<i class="fas fa-phone"></i> ${escHtml(r.guestPhone)}` : ''}
                    </p>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:1.4rem;font-weight:800;color:var(--accent);">${(r.price || 0).toLocaleString('fr-FR')}${CONFIG.CURRENCY}</div>
                    <span class="status-badge badge-${r.status}">${getStatusLabel(r.status)}</span>
                    ${room?.status === 'occupied' && r.roomId ? `
                    <br><button onclick="checkoutRoom(${r.roomId})"
                        style="margin-top:0.5rem;padding:0.45rem 1rem;background:var(--success);color:white;border:none;border-radius:7px;cursor:pointer;font-size:0.8rem;font-weight:600;">
                        <i class="fas fa-check"></i> Check-out
                    </button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderAdminClients() {
    const container = document.getElementById('clientsList');
    if (!container) return;

    const users = JSON.parse(localStorage.getItem('lh_users') || '[]');

    if (users.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">Aucun client inscrit</p>';
        return;
    }

    container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
        <thead>
            <tr style="background:var(--light);">
                <th style="padding:0.9rem 1rem;text-align:left;font-size:0.78rem;text-transform:uppercase;color:var(--text-muted);">Nom</th>
                <th style="padding:0.9rem 1rem;text-align:left;font-size:0.78rem;text-transform:uppercase;color:var(--text-muted);">E-mail</th>
                <th style="padding:0.9rem 1rem;text-align:left;font-size:0.78rem;text-transform:uppercase;color:var(--text-muted);">Pays</th>
                <th style="padding:0.9rem 1rem;text-align:left;font-size:0.78rem;text-transform:uppercase;color:var(--text-muted);">Téléphone</th>
                <th style="padding:0.9rem 1rem;text-align:left;font-size:0.78rem;text-transform:uppercase;color:var(--text-muted);">Inscription</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(u => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:0.9rem 1rem;">
                    <div style="display:flex;align-items:center;gap:0.6rem;">
                        <div style="width:34px;height:34px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;">
                            ${(u.name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <strong>${escHtml(u.name || '—')}</strong>
                    </div>
                </td>
                <td style="padding:0.9rem 1rem;font-size:0.875rem;">${escHtml(u.email || '—')}</td>
                <td style="padding:0.9rem 1rem;font-size:0.875rem;">${escHtml(u.country || '—')}</td>
                <td style="padding:0.9rem 1rem;font-size:0.875rem;">${escHtml(u.phone || '—')}</td>
                <td style="padding:0.9rem 1rem;font-size:0.875rem;color:var(--text-muted);">${u.registrationDate ? new Date(u.registrationDate).toLocaleDateString('fr-FR') : '—'}</td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

// ============================================================
// ROOM MANAGEMENT
// ============================================================
function showAddRoomModal() {
    editingRoomId = null;
    const form = document.getElementById('addRoomForm');
    if (form) form.reset();
    uploadedImages = [];
    const preview = document.getElementById('imagePreview');
    if (preview) preview.innerHTML = '';
    document.getElementById('addRoomModal').classList.add('active');
}

function closeAddRoomModal() {
    document.getElementById('addRoomModal').classList.remove('active');
    uploadedImages = [];
}

function handleAddRoom(e) {
    e.preventDefault();

    const number = document.getElementById('roomNumber').value.trim();
    const type = document.getElementById('roomType').value;
    const price = parseInt(document.getElementById('roomPrice').value);
    const desc = document.getElementById('roomDesc').value.trim();

    if (!number || !type || !price) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    if (rooms.find(r => r.number === number)) {
        showToast('Ce numéro de chambre existe déjà', 'error');
        return;
    }

    const newRoom = {
        id: Date.now(),
        number, type, price, description: desc,
        status: 'available',
        images: uploadedImages.length > 0 ? [...uploadedImages] : [getDefaultImage(type)],
        amenities: { wifi: true, tv: true, minibar: type !== 'standard', jacuzzi: type === 'suite' || type === 'presidentielle', ac: true }
    };

    rooms.push(newRoom);
    saveToStorage();
    renderRooms();
    renderAdminRooms();
    updateAdminStats();
    closeAddRoomModal();
    showToast(`Chambre ${number} ajoutée avec succès`, 'success');
}

function editRoom(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    editingRoomId = roomId;
    document.getElementById('editRoomId').value = room.id;
    document.getElementById('editRoomNumber').value = room.number;
    document.getElementById('editRoomType').value = room.type;
    document.getElementById('editRoomPrice').value = room.price;
    document.getElementById('editRoomDesc').value = room.description || '';
    document.getElementById('editRoomStatus').value = room.status;
    document.getElementById('editRoomModal').classList.add('active');
}

function closeEditRoomModal() {
    document.getElementById('editRoomModal').classList.remove('active');
    editingRoomId = null;
}

function handleEditRoom(e) {
    e.preventDefault();

    const roomId = parseInt(document.getElementById('editRoomId').value);
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    room.number = document.getElementById('editRoomNumber').value.trim();
    room.type = document.getElementById('editRoomType').value;
    room.price = parseInt(document.getElementById('editRoomPrice').value);
    room.description = document.getElementById('editRoomDesc').value.trim();
    room.status = document.getElementById('editRoomStatus').value;

    if (room.status === 'available') {
        room.currentGuest = null;
        room.checkOut = null;
    }

    saveToStorage();
    renderRooms();
    renderAdminRooms();
    updateAdminStats();
    closeEditRoomModal();
    showToast('Chambre modifiée avec succès', 'success');
}

function deleteRoom(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (!confirm(`Supprimer la chambre ${room.number} ? Cette action est irréversible.`)) return;

    rooms = rooms.filter(r => r.id !== roomId);
    saveToStorage();
    renderRooms();
    renderAdminRooms();
    updateAdminStats();
    showToast('Chambre supprimée', 'success');
}

function checkoutRoom(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    room.status = 'available';
    room.currentGuest = null;
    room.checkOut = null;

    // Marquer réservation comme terminée
    const res = reservations.find(r => r.roomId === roomId && r.status === 'confirmed');
    if (res) res.status = 'completed';

    saveToStorage();
    renderRooms();
    renderAdminRooms();
    renderAdminReservations();
    updateAdminStats();
    showToast('Check-out effectué — chambre disponible', 'success');
}

// ============================================================
// IMAGE UPLOAD
// ============================================================
function handleImageUpload(event) {
    const files = event.target.files;
    if (files) processFiles(files);
}

function processFiles(files) {
    [...files].forEach(file => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 8 * 1024 * 1024) { showToast('Image trop volumineuse (max 8MB)', 'error'); return; }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImages.push(e.target.result);
            renderImagePreview();
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    preview.innerHTML = uploadedImages.map((img, i) => `
    <div class="preview-item">
        <img src="${img}" alt="Preview ${i + 1}">
        <button class="remove-image" onclick="removeImage(${i})" title="Supprimer">&times;</button>
    </div>`).join('');
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreview();
}

function setupDragAndDrop() {
    const zone = document.getElementById('uploadZone');
    if (!zone) return;

    ['dragover', 'dragenter'].forEach(ev => {
        zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); });
    });

    ['dragleave', 'dragend'].forEach(ev => {
        zone.addEventListener(ev, () => zone.classList.remove('dragover'));
    });

    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        processFiles(e.dataTransfer.files);
    });
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function sendAdminNotification(notification) {
    const notifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    notifs.unshift(notification);
    if (notifs.length > 50) notifs.splice(50);
    localStorage.setItem('admin_notifications', JSON.stringify(notifs));
    loadAdminNotifications();
    // Push to Firestore for centralized notifications (Cloud Functions can watch this)
    if (window._fb && window._fb.db) {
        try {
            window._fb.db.collection('admin_notifications').add({
                ...notification,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error('Erreur push admin notification', err));
        } catch (e) {
            console.error('Erreur sendAdminNotification firestore', e);
        }
    }
}

function loadAdminNotifications() {
    const notifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    const container = document.getElementById('notificationList');
    if (!container) return;

    if (notifs.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1.5rem;font-size:0.875rem;">Aucune notification</p>';
        return;
    }

    container.innerHTML = notifs.slice(0, 10).map(n => `
    <div class="notification-item">
        <i class="fas fa-${n.icon || 'bell'}"></i>
        <div>
            <div style="font-weight:600;margin-bottom:0.2rem;">${escHtml(n.title)}</div>
            <div style="font-size:0.82rem;color:var(--text-muted);">${escHtml(n.message)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">${n.timestamp ? new Date(n.timestamp).toLocaleString('fr-FR') : ''}</div>
        </div>
    </div>`).join('');
}

function toggleNotifications() {
    document.getElementById('notificationPanel')?.classList.toggle('active');
}

// ============================================================
// CONTACT FORM
// ============================================================
function handleContact(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const templateParams = {
        from_name: formData.get('name')?.toString().trim() || 'Client',
        from_email: formData.get('email')?.toString().trim() || '',
        subject: formData.get('subject')?.toString().trim() || 'Nouveau message depuis le site',
        message: formData.get('message')?.toString().trim() || '',
        admin_email: CONFIG.ADMIN_EMAIL,
        sent_at: new Date().toLocaleString('fr-FR'),
    };

    if (typeof emailjs !== 'undefined'
        && CONFIG.emailjs_service
        && CONFIG.emailjs_template
        && CONFIG.emailjs_public_key
        && CONFIG.emailjs_public_key !== 'YOUR_PUBLIC_KEY') {
        emailjs.send(CONFIG.emailjs_service, CONFIG.emailjs_template, templateParams)
            .then(() => {
                saveContactMessage(templateParams);
                showToast('Message envoyé ! Nous vous répondrons rapidement.', 'success');
                form.reset();
            })
            .catch(error => {
                console.error('EmailJS envoi échoué', error);
                saveContactMessage(templateParams);
                showToast('Erreur lors de l’envoi. Votre message a été sauvegardé localement.', 'danger');
            });
    } else {
        saveContactMessage(templateParams);
        showToast('EmailJS non configuré. Le message est sauvegardé localement.', 'warning');
        form.reset();
        console.warn('EmailJS non configuré. Remplacez CONFIG.emailjs_public_key par votre clé publique EmailJS.');
    }
}

function saveContactMessage(message) {
    const stored = JSON.parse(localStorage.getItem('lh_contact_messages') || '[]');
    stored.unshift({ ...message, timestamp: new Date().toISOString() });
    if (stored.length > 100) stored.splice(100);
    localStorage.setItem('lh_contact_messages', JSON.stringify(stored));
    sendAdminNotification({
        title: 'Nouveau message contact',
        message: `${message.from_name} · ${message.subject}`,
        icon: 'envelope',
        timestamp: Date.now(),
    });
}

function initEmailJS() {
    if (typeof emailjs !== 'undefined'
        && CONFIG.emailjs_public_key
        && CONFIG.emailjs_public_key !== 'YOUR_PUBLIC_KEY') {
        emailjs.init(CONFIG.emailjs_public_key);
    } else if (typeof emailjs !== 'undefined') {
        console.warn('EmailJS trouvé mais la clé publique n’est pas configurée.');
    }
}

// ============================================================
// FIREBASE / FIRESTORE (optional)
// ============================================================
function initFirebase() {
    // Check if Firebase SDK is loaded and user provided config
    if (typeof firebase === 'undefined') {
        console.info('Firebase non chargé — synchronisation en temps réel désactivée.');
        return;
    }

    if (!CONFIG.firebase_apiKey || CONFIG.firebase_apiKey === 'YOUR_FIREBASE_API_KEY') {
        console.info('Firebase non configuré dans CONFIG. Ajoutez vos clés pour activer la sync.');
        return;
    }

    try {
        const fbConfig = {
            apiKey: CONFIG.firebase_apiKey,
            authDomain: CONFIG.firebase_authDomain,
            projectId: CONFIG.firebase_projectId,
            appId: CONFIG.firebase_appId,
            measurementId: CONFIG.firebase_measurementId,
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(fbConfig);
        }

        window._fb = {
            app: firebase.app(),
            auth: firebase.auth(),
            db: firebase.firestore(),
        };

        subscribeToFirestoreRooms();
        subscribeToFirestoreReservations();
        console.log('Firebase initialisé — synchronisation activée');
    } catch (err) {
        console.error('Erreur initialisation Firebase', err);
    }
}

function pushRoomsToFirestore() {
    if (!window._fb || !window._fb.db) return;
    const docRef = window._fb.db.collection('luxe_hotel_meta').doc('rooms');
    docRef.set({ rooms: rooms, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(err => console.error('Erreur pushRoomsToFirestore', err));
}

function pushReservationToFirestore(reservation) {
    if (!window._fb || !window._fb.db) return;
    try {
        return window._fb.db.collection('reservations').doc(reservation.id).set(reservation);
    } catch (e) {
        console.error('Erreur pushReservationToFirestore', e);
    }
}

function subscribeToFirestoreReservations() {
    if (!window._fb || !window._fb.db) return;
    window._fb.db.collection('reservations').onSnapshot(snap => {
        const docs = [];
        snap.forEach(d => docs.push(d.data()));
        if (Array.isArray(docs) && docs.length >= 0) {
            reservations = docs;
            saveToStorage();
            // Update views
            renderRooms();
            if (document.getElementById('adminPanel')?.classList.contains('active')) {
                renderAdminReservations && renderAdminReservations();
                updateAdminStats && updateAdminStats();
            }
            console.log('Reservations synchronisées depuis Firestore');
        }
    }, err => console.error('Firestore reservations onSnapshot error', err));
}

function subscribeToFirestoreRooms() {
    if (!window._fb || !window._fb.db) return;
    const docRef = window._fb.db.collection('luxe_hotel_meta').doc('rooms');
    docRef.onSnapshot(doc => {
        if (!doc.exists) return;
        try {
            const data = doc.data();
            if (data && Array.isArray(data.rooms)) {
                rooms = data.rooms;
                saveToStorage();
                renderRooms();
                console.log('Rooms synchronisées depuis Firestore');
            }
        } catch (e) {
            console.error('Erreur lecture rooms Firestore', e);
        }
    }, err => console.error('Firestore onSnapshot error', err));
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.className = 'toast ' + type + ' show';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// ============================================================
// AUTH GATE
// ============================================================
function closeAuthGate() {
    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'none';
}

function goToRegister() {
    window.location.href = 'login.html?tab=register';
}

function goToLogin() {
    window.location.href = 'login.html';
}

// ============================================================
// HELPERS
// ============================================================
function getTypeLabel(type) {
    const labels = {
        standard: 'Standard', deluxe: 'Deluxe',
        suite: 'Suite', presidentielle: 'Présidentielle'
    };
    return labels[type] || capitalize(type);
}

function getStatusLabel(status) {
    const labels = {
        confirmed: 'Confirmée', pending: 'En attente',
        cancelled: 'Annulée', completed: 'Terminée'
    };
    return labels[status] || status;
}

function getDefaultImage(type) {
    const images = {
        standard: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
        deluxe: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
        suite: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&q=80',
        presidentielle: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80'
    };
    return images[type] || images.standard;
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}

// ============================================================
// GLOBAL ERROR HANDLING
// ============================================================
window.addEventListener('error', (e) => {
    console.error('Erreur globale:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promesse rejetée:', e.reason);
});