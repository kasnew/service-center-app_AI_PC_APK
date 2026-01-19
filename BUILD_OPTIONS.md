# Варіанти компіляції для Linux

## Поточна ОС
- **ОС**: Linux (Manjaro)
- **Архітектура**: x86_64

## Доступні формати для Linux

### 1. AppImage (рекомендовано)
**Переваги:**
- Універсальний формат, працює на всіх Linux дистрибутивах
- Не потребує встановлення (portable)
- Один файл для розповсюдження

**Команда:**
```bash
npm run build:linux
# або
npm run build:linux:appimage
```

**Результат:** `ServiceCenterApp-Linux-1.0.0.AppImage`

---

### 2. DEB (для Debian/Ubuntu/Manjaro)
**Переваги:**
- Нативна інтеграція з системою
- Автоматичне оновлення через менеджер пакетів
- Встановлення через `dpkg` або `apt`

**Команда:**
```bash
npm run build:linux:deb
```

**Результат:** `ServiceCenterApp-1.0.0.deb`

**Встановлення:**
```bash
sudo dpkg -i ServiceCenterApp-1.0.0.deb
# або
sudo apt install ./ServiceCenterApp-1.0.0.deb
```

---

### 3. RPM (для Fedora/RedHat/openSUSE)
**Переваги:**
- Нативна інтеграція з системою
- Автоматичне оновлення через менеджер пакетів
- Встановлення через `rpm` або `dnf`

**Команда:**
```bash
npm run build:linux:rpm
```

**Результат:** `ServiceCenterApp-1.0.0.rpm`

**Встановлення:**
```bash
sudo rpm -i ServiceCenterApp-1.0.0.rpm
# або
sudo dnf install ServiceCenterApp-1.0.0.rpm
```

---

### 4. TAR.GZ (архів)
**Переваги:**
- Мінімальний розмір
- Ручне встановлення
- Підходить для серверів або кастомних систем

**Команда:**
```bash
npm run build:linux:tar
```

**Результат:** `ServiceCenterApp-1.0.0.tar.gz`

**Встановлення:**
```bash
tar -xzf ServiceCenterApp-1.0.0.tar.gz
cd ServiceCenterApp-1.0.0
./service-center-app
```

---

### 5. SNAP
**Переваги:**
- Універсальний формат для всіх Linux
- Автоматичні оновлення
- Ізольоване середовище

**Команда:**
```bash
npm run build:linux:snap
```

**Результат:** `ServiceCenterApp-1.0.0.snap`

**Встановлення:**
```bash
sudo snap install ServiceCenterApp-1.0.0.snap --dangerous
```

---

### 6. Flatpak
**Переваги:**
- Універсальний формат
- Ізольоване середовище
- Підтримка sandbox

**Команда:**
```bash
npm run build:linux:flatpak
```

**Результат:** `ServiceCenterApp-1.0.0.flatpak`

---

### 7. Всі формати одночасно
**Команда:**
```bash
npm run build:linux:all
```

**Результат:** Всі доступні формати в папці `release/`

---

## Рекомендації

### Для розповсюдження:
- **AppImage** - найкращий вибір для широкого розповсюдження
- **DEB** - для Debian/Ubuntu/Manjaro користувачів
- **RPM** - для Fedora/RedHat користувачів

### Для розробки:
- **TAR.GZ** - швидка компіляція, мінімальний розмір

### Для production:
- **DEB** або **RPM** - нативна інтеграція з системою

---

## Додаткові опції

### Компіляція з очищенням:
```bash
npm run build:clean
```

### Компіляція тільки TypeScript (без electron-builder):
```bash
npm run build:ts
```

### Компіляція тільки фронтенду:
```bash
npm run build:frontend
```

---

## Розташування результатів

Всі скомпільовані файли знаходяться в:
```
release/1.0.0/
```

---

## Примітки

- Для компіляції DEB/RPM може знадобитися встановити додаткові залежності:
  ```bash
  # Для DEB
  sudo apt install fakeroot
  
  # Для RPM
  sudo dnf install rpm-build
  ```

- AppImage не потребує додаткових залежностей

- Рекомендований формат для Manjaro: **DEB** або **AppImage**

