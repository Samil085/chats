const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Veri dosyaları
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// JSON dosyalarını oluştur
const usersFile = path.join(DATA_DIR, 'users.json');
const groupsFile = path.join(DATA_DIR, 'groups.json');
const messagesFile = path.join(DATA_DIR, 'messages.json');
const adminsFile = path.join(DATA_DIR, 'admin.json');

// Varsayılan JSON dosyalarını oluştur
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');
if (!fs.existsSync(groupsFile)) fs.writeFileSync(groupsFile, '[]');
if (!fs.existsSync(messagesFile)) fs.writeFileSync(messagesFile, '[]');

// Veri işlemleri
function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'darkchat-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

// API Routes
app.post('/api/register', async (req, res) => {
    const { username, password, avatar } = req.body;
    const users = readJsonFile(usersFile) || [];

    // Kullanıcı adı kontrolü
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    // Şifre hash'leme
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yeni kullanıcı oluştur
    const newUser = {
        id: `user_${Date.now()}`,
        username,
        password: hashedPassword,
        avatar: avatar || '/images/default-avatar.png',
        isAdmin: false,
        createdAt: new Date()
    };

    users.push(newUser);
    writeJsonFile(usersFile, users);

    // Hassas bilgileri çıkar
    const { password: _, ...safeUser } = newUser;
    res.json(safeUser);

    // Yeni kullanıcı eklendiğinde tüm kullanıcılara güncel listeyi gönder
    updateAndSendUserList();
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readJsonFile(usersFile) || [];
    const admins = readJsonFile(adminsFile) || { admins: [] };

    // Normal kullanıcı girişi
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        const { password: _, ...safeUser } = user;
        return res.json(safeUser);
    }

    // Admin girişi
    const admin = admins.admins.find(a => a.username === username);
    if (admin && await bcrypt.compare(password, admin.password)) {
        return res.json({
            id: `admin_${Date.now()}`,
            username,
            isAdmin: true
        });
    }

    res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
});

app.post('/api/groups', (req, res) => {
    const { name, createdBy } = req.body;
    const groups = readJsonFile(groupsFile) || [];
    const users = readJsonFile(usersFile) || [];

    const creator = users.find(u => u.id === createdBy);
    if (!creator?.isAdmin) {
        return res.status(403).json({ error: 'Sadece adminler grup oluşturabilir' });
    }

    const newGroup = {
        id: `group_${Date.now()}`,
        name,
        createdBy,
        members: [],
        createdAt: new Date()
    };

    groups.push(newGroup);
    writeJsonFile(groupsFile, groups);
    res.json(newGroup);
});

app.get('/api/groups', (req, res) => {
    const groups = readJsonFile(groupsFile) || [];
    res.json(groups);
});

app.get('/api/users', (req, res) => {
    const users = readJsonFile(usersFile) || [];
    const onlineUsers = Array.from(connectedUsers.values()).map(u => u.id);
    
    const updatedUsers = users.map(user => ({
        ...user,
        status: onlineUsers.includes(user.id) ? 'online' : 'offline'
    }));

    const safeUsers = updatedUsers.map(({ password, ...user }) => user);
    res.json(safeUsers);
});

// Mesaj geçmişi endpoint'leri
app.get('/api/messages/private/:userId1/:userId2', (req, res) => {
    const { userId1, userId2 } = req.params;
    const messages = readJsonFile(messagesFile) || [];
    
    const privateMessages = messages.filter(msg => 
        msg.type === 'private' && 
        ((msg.from === userId1 && msg.to === userId2) || 
         (msg.from === userId2 && msg.to === userId1))
    );
    
    res.json(privateMessages);
});

app.get('/api/messages/group/:groupId', (req, res) => {
    const { groupId } = req.params;
    const messages = readJsonFile(messagesFile) || [];
    
    const groupMessages = messages.filter(msg => 
        msg.type === 'group' && msg.groupId === groupId
    );
    
    res.json(groupMessages);
});

// Socket.IO bağlantı yönetimi
const connectedUsers = new Map();

function updateAndSendUserList() {
    const users = readJsonFile(usersFile) || [];
    const onlineUsers = Array.from(connectedUsers.values()).map(u => u.id);
    
    const updatedUsers = users.map(user => ({
        ...user,
        status: onlineUsers.includes(user.id) ? 'online' : 'offline'
    }));

    // Hassas bilgileri çıkar
    const safeUsers = updatedUsers.map(({ password, ...user }) => user);
    io.emit('userList', safeUsers);
    return safeUsers;
}

io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı');
    let currentUserData = null;

    socket.on('userConnected', (userData) => {
        console.log('Kullanıcı bağlandı:', userData);
        currentUserData = userData;
        connectedUsers.set(userData.id, {
            ...userData,
            socketId: socket.id,
            status: 'online'
        });

        // Kullanıcı listesini güncelle ve gönder
        updateAndSendUserList();
    });

    socket.on('privateMessage', (data) => {
        console.log('Özel mesaj:', data);
        const targetUser = Array.from(connectedUsers.values()).find(u => u.id === data.to);
        
        const messageData = {
            ...data,
            timestamp: new Date(),
            type: 'private'
        };

        // Mesajı alıcıya gönder
        if (targetUser) {
            socket.to(targetUser.socketId).emit('privateMessage', messageData);
        }

        // Mesajı kaydedelim
        const messages = readJsonFile(messagesFile) || [];
        messages.push(messageData);
        writeJsonFile(messagesFile, messages);
    });

    socket.on('groupMessage', (data) => {
        console.log('Grup mesajı:', data);
        const messageData = {
            ...data,
            timestamp: new Date(),
            type: 'group'
        };

        socket.to(data.groupId).emit('groupMessage', messageData);

        // Mesajı kaydedelim
        const messages = readJsonFile(messagesFile) || [];
        messages.push(messageData);
        writeJsonFile(messagesFile, messages);
    });

    socket.on('disconnect', () => {
        if (currentUserData) {
            console.log('Kullanıcı ayrıldı:', currentUserData.username);
            connectedUsers.delete(currentUserData.id);
            updateAndSendUserList();
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
}); 