import React from 'react';
import { Container, Nav } from 'react-bootstrap';
import { useAuthContext } from '../contexts/AuthContext';

const Navigation = ({ aktifSekme, setAktifSekme }) => {
  const { yetkiVarMi, kullanici, kullaniciRolu } = useAuthContext();

  // Debug için konsola yazdır
  console.log('Navigation Debug:', {
    kullanici: kullanici?.email,
    kullaniciRolu,
    yetkiliMi: yetkiVarMi('yetkili'),
    adminMi: yetkiVarMi('admin')
  });

  const sekmeler = [
    { 
      id: 'animsaticilar', 
      baslik: 'Anımsatıcılar', 
      ikon: '📝',
      aciklama: 'Not listesi ve sesli kayıt',
      renk: 'primary'
    },
    { 
      id: 'ocr', 
      baslik: 'OCR', 
      ikon: '📷',
      aciklama: 'Görüntüden yazı',
      renk: 'warning'
    },
  ];

  // Yetkili ve admin kullanıcıları için dosya sekmesi ekle
  if (yetkiVarMi('kullanici')) {
    sekmeler.push({ 
      id: 'dosyalar', 
      baslik: 'Dosyalar', 
      ikon: '📁',
      aciklama: 'Dosya indirme',
      renk: 'danger'
    });
  }

  return (
    <div className="glass py-3" style={{margin: '10px', borderRadius: '25px'}}>
      <Container fluid>
        {/* Desktop Navigation */}
        <Nav variant="pills" className="nav-pills-modern justify-content-center d-none d-md-flex">
          {sekmeler.map((sekme) => (
            <Nav.Item key={sekme.id}>
              <Nav.Link
                active={aktifSekme === sekme.id}
                onClick={() => setAktifSekme(sekme.id)}
                className="d-flex align-items-center"
              >
                <span className="me-2" style={{fontSize: '1.5rem'}}>
                  {sekme.ikon}
                </span>
                <div className="text-start">
                  <div className="fw-bold mb-0" style={{fontSize: '0.95rem'}}>
                    {sekme.baslik}
                  </div>
                  <small style={{fontSize: '0.75rem', opacity: 0.8}}>
                    {sekme.aciklama}
                  </small>
                </div>
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        {/* Mobile Navigation */}
        <Nav variant="pills" className="nav-pills-modern justify-content-center d-md-none">
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {sekmeler.map((sekme) => (
              <Nav.Item key={sekme.id}>
                <Nav.Link
                  active={aktifSekme === sekme.id}
                  onClick={() => setAktifSekme(sekme.id)}
                  className="d-flex flex-column align-items-center text-center px-3 py-2"
                  style={{minWidth: '80px'}}
                >
                  <span style={{fontSize: '1.8rem'}} className="mb-1">
                    {sekme.ikon}
                  </span>
                  <span className="fw-bold" style={{fontSize: '0.8rem'}}>
                    {sekme.baslik}
                  </span>
                </Nav.Link>
              </Nav.Item>
            ))}
          </div>
        </Nav>
      </Container>
    </div>
  );
};

export default Navigation;
