import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Loading from './components/Loading';
import Auth from './pages/Auth';

// Gerçek sayfaları import et
import Animsaticilar from './pages/Animsaticilar';
import SesKayit from './pages/SesKayit';
import OCR from './pages/OCR';

// Ana uygulama içeriği
const AppContent = () => {
  const { kullanici, yukleniyor } = useAuthContext();
  const [aktifSekme, setAktifSekme] = useState('animsaticilar');

  if (yukleniyor) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{minHeight: '100vh'}}>
        <Loading metin="Uygulama yükleniyor..." />
      </div>
    );
  }

  if (!kullanici) {
    return (
      <div style={{minHeight: '100vh'}}>
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
      default:
        return <Animsaticilar />;
    }
  };

  return (
    <div style={{minHeight: '100vh'}}>
      <Header />
      <Navigation 
        aktifSekme={aktifSekme} 
        setAktifSekme={setAktifSekme} 
      />
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xs={12} lg={10} xl={8}>
            {renderAktifSayfa()}
          </Col>
        </Row>
      </Container>
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
