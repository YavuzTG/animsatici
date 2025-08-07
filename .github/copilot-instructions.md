# Copilot Özel Talimatları

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

Bu proje React + Firebase tabanlı sesli anımsatıcı ve yetkili dosya sistemi uygulamasıdır.

## Proje Özellikleri:
- **Frontend**: React.js + TailwindCSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Ses Tanıma**: Web Speech API
- **OCR**: Tesseract.js
- **Routing**: React Router DOM

## Kod Yazım Kuralları:
- Türkçe yorum ve değişken isimleri kullan
- Mobil öncelikli tasarım yap
- Firebase güvenlik kurallarına dikkat et
- Kullanıcı rollerini (user, authorized, admin) dikkate al
- Hata yönetimi ve loading durumları ekle
- Responsive tasarım kullan

## Dosya Yapısı:
- `/src/components/` - React bileşenleri
- `/src/pages/` - Sayfa bileşenleri
- `/src/hooks/` - Custom hook'lar
- `/src/utils/` - Yardımcı fonksiyonlar
- `/src/firebase/` - Firebase yapılandırması
- `/src/contexts/` - React Context'leri

## Güvenlik:
- Firestore güvenlik kuralları
- Kullanıcı yetkilendirme sistemi
- Dosya erişim kontrolü
