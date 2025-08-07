import React, { useState } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Loading from './components/Loading';

// Mock Auth Context
const mockAuthContext = {
  kullanici: {
    uid: 'mock-user',
    email: 'test@example.com',
    displayName: 'Test Kullanıcı'
  },
  kullaniciRolu: 'kullanici',
  yukleniyor: false,
  cikisYap: () => {
    console.log('Çıkış yapıldı');
  },
  yetkiVarMi: (yetki) => yetki === 'kullanici'
};

// Mock Auth Provider
const MockAuthProvider = ({ children }) => {
  return (
    <div>
      {children}
    </div>
  );
};

// Mock useAuthContext hook
export const useAuthContext = () => mockAuthContext;

// Mock pages
const Animsaticilar = () => (
  <div className="glass p-6 rounded-lg">
    <h2 className="text-xl font-bold mb-4">📝 Anımsatıcılar</h2>
    <p className="text-gray-600">Buraya anımsatıcılarınız gelecek...</p>
  </div>
);

const SesKayit = () => (
  <div className="glass p-6 rounded-lg">
    <h2 className="text-xl font-bold mb-4">🎤 Ses Kayıt</h2>
    <p className="text-gray-600">Sesli not kaydetme özelliği buraya gelecek...</p>
  </div>
);

const OCR = () => (
  <div className="glass p-6 rounded-lg">
    <h2 className="text-xl font-bold mb-4">📷 OCR</h2>
    <p className="text-gray-600">Görüntüden yazı çıkarma özelliği buraya gelecek...</p>
  </div>
);

// Ana uygulama içeriği
const AppContent = () => {
  const [aktifSekme, setAktifSekme] = useState('animsaticilar');

  // Aktif sekmeye göre sayfa render'ı
  const renderAktifSayfa = () => {
    switch(aktifSekme) {
      case 'animsaticilar':
        return <Animsaticilar />;
      case 'ses-kayit':
        return <SesKayit />;
      case 'ocr':
        return <OCR />;
      default:
        return <Animsaticilar />;
    }
  };

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
      <Header />
      <Navigation 
        aktifSekme={aktifSekme} 
        setAktifSekme={setAktifSekme} 
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderAktifSayfa()}
      </main>
    </div>
  );
};

// Ana uygulama bileşeni
const App = () => {
  return (
    <MockAuthProvider>
      <div className="font-sans antialiased">
        <AppContent />
      </div>
    </MockAuthProvider>
  );
};

export default App;
