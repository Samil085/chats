const socket = io();

// DOM elementleri
const authForm = document.getElementById('auth-form');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const chatContainer = document.getElementById('chat-container');

const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');

const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const registerAvatar = document.getElementById('register-avatar');
const registerButton = document.getElementById('register-button');

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const groupsList = document.getElementById('groups-list');
const usersList = document.getElementById('users-list');
const notificationSound = document.getElementById('notification-sound');

const createGroupBtn = document.getElementById('create-group');
const createGroupModal = document.getElementById('create-group-modal');
const groupNameInput = document.getElementById('group-name');
const saveGroupBtn = document.getElementById('save-group');
const cancelGroupBtn = document.getElementById('cancel-group');

const groupSearchInput = document.getElementById('group-search');
const userSearchInput = document.getElementById('user-search');

// Kullanıcı bilgileri
let currentUser = null;
let currentChat = null;
let currentChatType = null; // 'private' veya 'group'
let allGroups = [];
let allUsers = [];

// Sayfa yüklendiğinde localStorage'dan kullanıcı bilgilerini kontrol et
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        authForm.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        if (currentUser.isAdmin) {
            createGroupBtn.classList.remove('hidden');
        }
        socket.emit('userConnected', currentUser);
        loadInitialData();
    }
});

// Form geçişleri
loginTab.addEventListener('click', () => {
    loginTab.classList.add('text-purple-500');
    loginTab.classList.remove('text-gray-400');
    registerTab.classList.add('text-gray-400');
    registerTab.classList.remove('text-purple-500');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('text-purple-500');
    registerTab.classList.remove('text-gray-400');
    loginTab.classList.add('text-gray-400');
    loginTab.classList.remove('text-purple-500');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

// Arayüz gösterme/gizleme fonksiyonları
function showLoginInterface() {
    authForm.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    createGroupBtn.classList.add('hidden');
    // Form temizleme
    loginUsername.value = '';
    loginPassword.value = '';
    registerUsername.value = '';
    registerPassword.value = '';
    registerAvatar.value = '';
}

function showChatInterface() {
    authForm.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    if (currentUser?.isAdmin) {
        createGroupBtn.classList.remove('hidden');
    }
    // Mesaj alanını temizle
    messagesContainer.innerHTML = '';
    document.getElementById('chat-subtitle').textContent = 'Sohbet başlatmak için bir kullanıcı veya grup seçin';
}

// Kayıt işlemi
async function register() {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    const avatar = registerAvatar.value.trim();

    if (!username || !password) {
        alert('Lütfen tüm alanları doldurun');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, avatar })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Kayıt başarılı! Giriş yapabilirsiniz.');
            loginTab.click();
            registerUsername.value = '';
            registerPassword.value = '';
            registerAvatar.value = '';
        } else {
            alert(data.error || 'Kayıt sırasında bir hata oluştu');
        }
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('Kayıt sırasında bir hata oluştu');
    }
}

// Giriş işlemi
async function login() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
        alert('Lütfen tüm alanları doldurun');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            socket.emit('userConnected', currentUser);
            showChatInterface();
            await loadInitialData();
        } else {
            alert(data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        alert('Giriş sırasında bir hata oluştu.');
    }
}

// Çıkış işlemi
function logout() {
    if (currentUser) {
        socket.emit('userDisconnected', currentUser);
        localStorage.removeItem('currentUser');
        currentUser = null;
        showLoginInterface();
    }
}

// Başlangıç verilerini yükle
async function loadInitialData() {
    try {
        // Grupları yükle
        const groupsResponse = await fetch('/api/groups');
        allGroups = await groupsResponse.json();
        updateGroupsList(allGroups);

        // Kullanıcıları yükle
        const usersResponse = await fetch('/api/users');
        allUsers = await usersResponse.json();
        updateUsersList(allUsers);

        // Hoş geldin mesajı
        addMessageToUI({
            message: 'DarkChat\'e hoş geldiniz! Mesajlaşmaya başlayabilirsiniz.',
            timestamp: new Date(),
            system: true
        });
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
    }
}

// Mesaj geçmişini yükle
async function loadMessageHistory() {
    try {
        let messages = [];
        if (currentChatType === 'private') {
            const response = await fetch(`/api/messages/private/${currentUser.id}/${currentChat}`);
            messages = await response.json();
        } else if (currentChatType === 'group') {
            const response = await fetch(`/api/messages/group/${currentChat}`);
            messages = await response.json();
        }

        messagesContainer.innerHTML = '';
        messages.forEach(msg => {
            addMessageToUI(msg, msg.from === currentUser.id);
        });
    } catch (error) {
        console.error('Mesaj geçmişi yükleme hatası:', error);
    }
}

// Grup oluşturma
async function createGroup() {
    const name = groupNameInput.value.trim();
    if (!name) return;

    try {
        const response = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                createdBy: currentUser.id
            })
        });

        const data = await response.json();
        if (response.ok) {
            allGroups.push(data);
            updateGroupsList(allGroups);
            createGroupModal.classList.add('hidden');
            groupNameInput.value = '';
        } else {
            alert(data.error || 'Grup oluşturulurken bir hata oluştu');
        }
    } catch (error) {
        console.error('Grup oluşturma hatası:', error);
        alert('Grup oluşturulurken bir hata oluştu');
    }
}

// Arama fonksiyonları
function filterGroups(query) {
    const filtered = allGroups.filter(group =>
        group.name.toLowerCase().includes(query.toLowerCase())
    );
    updateGroupsList(filtered);
}

function filterUsers(query) {
    const filtered = allUsers.filter(user =>
        user.username.toLowerCase().includes(query.toLowerCase())
    );
    updateUsersList(filtered);
}

// Bildirim sesi çalma fonksiyonu
function playNotification() {
    notificationSound.play().catch(err => console.error('Bildirim sesi çalınamadı:', err));
}

// Kullanıcı listesini güncelleme
function updateUsersList(users) {
    if (!usersList) return;
    
    usersList.innerHTML = '';
    const sortedUsers = [...users].sort((a, b) => {
        // Online kullanıcıları üste taşı
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        // Sonra alfabetik sırala
        return a.username.localeCompare(b.username);
    });

    // Çevrimiçi ve toplam kullanıcı sayısını hesapla
    const onlineCount = sortedUsers.filter(u => u.status === 'online' && u.id !== currentUser?.id).length;
    const totalCount = sortedUsers.length - (currentUser ? 1 : 0);

    // Başlığı güncelle
    const usersTitle = document.getElementById('users-title');
    if (usersTitle) {
        usersTitle.textContent = `Kullanıcılar (${onlineCount}/${totalCount})`;
    }

    sortedUsers.forEach(user => {
        if (user.id === currentUser?.id) return;
        
        const userElement = document.createElement('div');
        userElement.className = `user-item p-2 hover:bg-gray-700 cursor-pointer rounded-lg mb-2 ${user.status}`;
        userElement.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <img src="${user.avatar || '/images/default-avatar.png'}" alt="${user.username}" 
                         class="w-8 h-8 rounded-full mr-2" onerror="this.src='/images/default-avatar.png'">
                    <div>
                        <div class="font-medium text-white">${user.username}</div>
                        <div class="text-xs ${user.status === 'online' ? 'text-green-400' : 'text-red-400'}">
                            ${user.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                        </div>
                    </div>
                </div>
                <span class="w-3 h-3 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-red-500'} animate-pulse"></span>
            </div>
        `;
        userElement.onclick = () => startPrivateChat(user.id, user.username);
        usersList.appendChild(userElement);
    });
}

// Mesajı UI'a ekleme fonksiyonu
function addMessageToUI(message, isSent = false) {
    const messageElement = document.createElement('div');
    
    if (message.system) {
        messageElement.className = 'message system new-message';
        messageElement.innerHTML = `
            <div class="message-content text-center text-gray-400">
                ${message.message}
            </div>
        `;
    } else {
        messageElement.className = `message ${isSent ? 'sent' : 'received'} new-message`;
        const time = new Date(message.timestamp).toLocaleTimeString();
        const date = new Date(message.timestamp).toLocaleDateString();
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${!isSent ? `
                    <div class="flex items-center gap-2 mb-1">
                        <img src="${message.avatar || '/images/default-avatar.png'}" 
                             alt="${message.fromUsername}" 
                             class="w-6 h-6 rounded-full"
                             onerror="this.src='/images/default-avatar.png'">
                        <div class="text-xs text-purple-400">${message.fromUsername}</div>
                    </div>
                ` : ''}
                <div class="message-text">${message.message}</div>
                <div class="text-xs text-gray-400 mt-1">
                    ${date} ${time}
                </div>
            </div>
        `;
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Bildirim sesi çal (eğer mesaj başkasından geldiyse)
    if (!isSent && !message.system) {
        playNotification();
    }
}

// Grup listesini güncelleme
function updateGroupsList(groups) {
    groupsList.innerHTML = '';
    groups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group-item';
        groupElement.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${group.name}</span>
                <span class="text-xs text-gray-400">${group.members.length} üye</span>
            </div>
        `;
        groupElement.onclick = () => joinGroup(group.id, group.name);
        groupsList.appendChild(groupElement);
    });
}

// Özel sohbet başlatma
function startPrivateChat(userId, username) {
    currentChat = userId;
    currentChatType = 'private';
    document.getElementById('chat-subtitle').textContent = username;
    loadMessageHistory();
}

// Gruba katılma
function joinGroup(groupId, groupName) {
    currentChat = groupId;
    currentChatType = 'group';
    document.getElementById('chat-subtitle').textContent = groupName;
    socket.emit('join_group', groupId);
    loadMessageHistory();
}

// Event listeners
registerButton.addEventListener('click', register);
loginButton.addEventListener('click', login);

document.getElementById('logout-button').addEventListener('click', logout);

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

createGroupBtn.addEventListener('click', () => {
    createGroupModal.classList.remove('hidden');
});

saveGroupBtn.addEventListener('click', createGroup);
cancelGroupBtn.addEventListener('click', () => {
    createGroupModal.classList.add('hidden');
    groupNameInput.value = '';
});

groupSearchInput.addEventListener('input', (e) => filterGroups(e.target.value));
userSearchInput.addEventListener('input', (e) => filterUsers(e.target.value));

// Socket events
socket.on('connect', () => {
    console.log('Sunucuya bağlandı');
    if (currentUser) {
        socket.emit('userConnected', currentUser);
    }
});

socket.on('userList', (users) => {
    console.log('Kullanıcı listesi güncellendi:', users);
    allUsers = users;
    updateUsersList(users);
});

socket.on('privateMessage', (messageData) => {
    if (currentChatType === 'private' && currentChat === messageData.from) {
        addMessageToUI(messageData);
    } else {
        // TODO: Bildirim göster
        playNotification();
    }
});

socket.on('groupMessage', (messageData) => {
    if (currentChatType === 'group' && currentChat === messageData.groupId) {
        addMessageToUI(messageData);
    } else {
        // TODO: Bildirim göster
        playNotification();
    }
});

socket.on('user_status_change', (data) => {
    const userIndex = allUsers.findIndex(u => u.id === data.userId);
    if (userIndex !== -1) {
        allUsers[userIndex].status = data.status;
        updateUsersList(allUsers);
    }
}); 