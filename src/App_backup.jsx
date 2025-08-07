import React, { useState } from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Loading from './components/Loading';
import Auth from './pages/Auth';
import Animsaticilar from './pages/Animsaticilar';
import SesKayit from './pages/SesKayit';
import OCR from './pages/OCR';
import Dosyalar from './pages/Dosyalar';

// Ana uygulama içeriği
const AppContent = () => {
  const { kullanici, yukleniyor } = useAuthContext();
  const [aktifSekme, setAktifSekme] = useState('animsaticilar');

  if (yukleniyor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
        <div className="text-center space-y-4">
          <Loading metin="Uygulama yükleniyor..." />
        </div>
      </div>
    );
  }

  if (!kullanici) {
    return (
      <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
        <Auth />
      </div>
    );
  }

  // Aktif sekmeye göre sayfa render'ı
  const renderAktifSayfa = () => {
    switch(aktifSekme) {
      case 'animsaticilar':
        return <Animsaticilar />;
      case 'ses-kayit':
        return <SesKayit />;
      case 'ocr':
        return <OCR />;
      case 'dosyalar':
        return <Dosyalar />;
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
    <AuthProvider>
      <div className="font-sans antialiased">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;
