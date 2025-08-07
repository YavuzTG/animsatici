# 📝 Sesli Anımsatıcı ve Yetkili Dosya Sistemi

React + Firebase tabanlı mobil uyumlu web uygulaması. Kullanıcıların sesli komutla anımsatıcı ekleyebildiği, görselden yazı çıkarabildiği ve yetkili kullanıcıların dosya paylaşabildiği sistem.

## 🚀 Özellikler

### ✅ Temel Özellikler
- **Kullanıcı Sistemi**: Firebase Authentication ile e-posta/şifre girişi
- **Sesli Anımsatıcı**: Web Speech API ile Türkçe ses tanıma
- **OCR**: Tesseract.js ile resimden metin çıkarma
- **Rol Tabanlı Erişim**: Kullanıcı, Yetkili, Admin rolleri
- **Dosya Yönetimi**: Yetkili kullanıcılar için dosya yükleme/indirme

### 🎯 Kullanıcı Rolleri
- 👤 **Kullanıcı**: Anımsatıcı ekler, OCR kullanır
- 🛡️ **Yetkili**: Ek olarak dosya bölümünü görür ve dosya indirir
- 👑 **Admin**: Dosya yönetimi yapabilir, kullanıcıları yetkilendirebilir

## 🛠️ Teknolojiler

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| Frontend | React.js | SPA (Tek Sayfa Uygulaması) |
| Stil | TailwindCSS | Mobil uyumlu tasarım |
| Backend | Firebase | Auth, Firestore, Storage |
| Ses Tanıma | Web Speech API | Tarayıcıda sesle komut |
| OCR | Tesseract.js | Resimden yazı çıkarma |
| Build Tool | Vite | Hızlı geliştirme ortamı |

## 🚀 Kurulum

### Gereksinimler
- Node.js (v16+)
- Firebase projesi
- Modern web tarayıcısı (Chrome, Edge, Safari)

### Adımlar

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Firebase yapılandırması:**
   - Firebase Console'da yeni proje oluşturun
   - Authentication, Firestore, Storage servislerini etkinleştirin
   - `src/firebase/config.js` dosyasındaki Firebase yapılandırmasını güncelleyin

3. **Geliştirme sunucusunu başlatın:**
   ```bash
   npm run dev
   ```

4. **Tarayıcıda açın:**
   - http://localhost:5173 adresine gidin

## 📁 Proje Yapısı

```
src/
├── components/          # React bileşenleri
│   ├── Header.jsx      # Üst header bileşeni
│   ├── Navigation.jsx  # Navigasyon menüsü
│   └── Loading.jsx     # Yükleme bileşeni
├── pages/              # Sayfa bileşenleri
│   ├── Auth.jsx        # Giriş/kayıt sayfası
│   ├── Animsaticilar.jsx # Anımsatıcı listesi
│   ├── SesKayit.jsx    # Ses tanıma sayfası
│   ├── OCR.jsx         # OCR sayfası
│   └── Dosyalar.jsx    # Dosya yönetimi
├── hooks/              # Custom React hook'ları
│   ├── useAuth.js      # Kimlik doğrulama hook'u
│   └── useSpeechRecognition.js # Ses tanıma hook'u
├── contexts/           # React Context'leri
│   └── AuthContext.jsx # Auth context sağlayıcısı
├── firebase/           # Firebase yapılandırması
│   └── config.js       # Firebase servisleri
└── App.jsx             # Ana uygulama bileşeni
```

## 🔧 Firebase Yapılandırması

### 1. Authentication
```javascript
// Email/Password yöntemini etkinleştirin
```

### 2. Firestore Koleksiyonları
```javascript
// animsaticilar koleksiyonu
{
  icerik: string,
  kullaniciId: string,
  kullaniciEmail: string,
  olusturmaTarihi: timestamp,
  tamamlandi: boolean,
  kaynak: string // 'manuel', 'ses-tanima', 'ocr'
}

// kullanicilar koleksiyonu
{
  email: string,
  rol: string, // 'kullanici', 'yetkili', 'admin'
  olusturmaTarihi: timestamp,
  aktif: boolean
}

// dosyalar koleksiyonu
{
  baslik: string,
  aciklama: string,
  dosyaAdi: string,
  dosyaBoyutu: number,
  dosyaTipi: string,
  downloadURL: string,
  storagePath: string,
  yukleyenId: string,
  yukleyenEmail: string,
  olusturmaTarihi: timestamp
}
```

## 📱 Kullanım

### Ses Tanıma
1. 🎤 **Ses Kayıt** sekmesine gidin
2. Mikrofon butonuna tıklayın
3. Türkçe konuşun
4. Metin otomatik olarak yazıya çevrilir
5. **Anımsatıcı Olarak Kaydet** butonuna tıklayın

### OCR (Resimden Metin)
1. 📷 **OCR** sekmesine gidin
2. Resim dosyası seçin (JPG, PNG)
3. **Metni Oku** butonuna tıklayın
4. Çıkarılan metni düzenleyin
5. **Anımsatıcı Olarak Kaydet** butonuna tıklayın

### Dosya Yönetimi (Yetkili Kullanıcılar)
1. 📁 **Dosyalar** sekmesine gidin
2. Admin: Dosya yükleyebilir
3. Yetkili/Admin: Dosyaları indirebilir

## 🔐 Yetkilendirme

Kullanıcı rollerini yönetmek için Firestore'da `kullanicilar` koleksiyonunda `rol` alanını güncelleyin.

## 🚀 Üretim Dağıtımı

```bash
# Üretim build'i oluştur
npm run build

# Firebase Hosting'e dağıt (opsiyonel)
firebase deploy
```
