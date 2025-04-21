# DarkChat

DarkChat, Socket.IO və Node.js istifadə edilərək hazırlanmış müasir və təhlükəsiz real-time mesajlaşma tətbiqidir.

## Xüsusiyyətlər

- 🔒 Təhlükəsiz giriş sistemi
- 👥 Real vaxt istifadəçi statusu izləmə
- 💬 Şəxsi mesajlaşma
- 👥 Qrup söhbətləri
- 🎨 Müasir və istifadəçi dostu interfeys
- 🔔 Ani bildirişlər
- 🖼️ Avatar dəstəyi
- 🔍 İstifadəçi və qrup axtarışı

## Quraşdırma

1. Repozitroniyi klonlayın:
```bash
git clone https://github.com/yourusername/darkchat.git
cd darkchat
```

2. Asılılıqları yükləyin:
```bash
npm install
```

3. Tətbiqi başladın:
```bash
npm start
```

4. Brauzerinizdə bu ünvanı açın:
```
http://localhost:3000
```

## Asılılıqlar

- Node.js
- Express.js
- Socket.IO
- bcryptjs
- EJS
- Tailwind CSS

## Layihə Strukturu

```
darkchat/
├── app.js              # Əsas tətbiq faylı
├── data/              # JSON məlumat faylları
│   ├── users.json
│   ├── groups.json
│   └── messages.json
├── public/            # Statik fayllar
│   ├── css/
│   ├── js/
│   ├── images/
│   └── sounds/
├── views/             # EJS şablonları
└── package.json
```

## Təhlükəsizlik

- Şifrələr bcrypt ilə həşlənir
- Sessiya idarəetməsi üçün express-session istifadə olunur
- Təhlükəsiz WebSocket bağlantıları

## Töhfə Vermək

1. Bu repozitroniyi fork edin
2. Yeni branch yaradın (`git checkout -b feature/amazing`)
3. Dəyişikliklərinizi commit edin (`git commit -m 'Əla xüsusiyyət əlavə edildi'`)
4. Branch-ı push edin (`git push origin feature/amazing`)
5. Pull Request yaradın

## Lisenziya

Bu layihə MIT lisenziyası altında lisenziyalanıb. Ətraflı məlumat üçün [LICENSE](LICENSE) faylına baxın.

## Əlaqə

- Vebsayt: [your-website.com](https://your-website.com)
- GitHub: [@yourusername](https://github.com/yourusername)
- E-poçt: your.email@example.com 