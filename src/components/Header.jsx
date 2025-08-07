import React, { useState } from 'react';
import { Navbar, Container, Nav, NavDropdown, Badge, Button } from 'react-bootstrap';
import { useAuthContext } from '../contexts/AuthContext';

const Header = () => {
  const { kullanici, cikisYap, kullaniciRolu } = useAuthContext();
  const [expanded, setExpanded] = useState(false);

  if (!kullanici) return null;

  const getRoleConfig = () => {
    switch(kullaniciRolu) {
      case 'admin':
        return { variant: 'warning', icon: '⚡', text: 'Admin' };
      case 'yetkili':
        return { variant: 'success', icon: '🛡️', text: 'Yetkili' };
      default:
        return { variant: 'primary', icon: '👤', text: 'Kullanıcı' };
    }
  };

  const roleConfig = getRoleConfig();

  return (
    <Navbar expand="lg" className="navbar-modern sticky-top" expanded={expanded}>
      <Container fluid>
        {/* Logo ve Marka */}
        <Navbar.Brand className="d-flex align-items-center">
          <div className="me-3 animate-bounce-gentle" style={{fontSize: '2rem'}}>
            🎯
          </div>
          <div>
            <h1 className="gradient-text mb-0 fw-bold" style={{fontSize: '1.8rem'}}>
              Sesli Anımsatıcı
            </h1>
            <small className="text-white-50 fw-medium">
              ✨ Akıllı Not Tutma Sistemi
            </small>
          </div>
        </Navbar.Brand>

        <Navbar.Toggle 
          aria-controls="basic-navbar-nav" 
          onClick={() => setExpanded(!expanded)}
          className="border-0"
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '10px',
            padding: '8px 12px'
          }}
        />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {/* Kullanıcı Bilgileri */}
            <div className="d-none d-lg-flex align-items-center me-4">
              <div className="text-end me-3">
                <div className="text-white fw-bold mb-0" style={{fontSize: '0.95rem'}}>
                  {kullanici.displayName || kullanici.email.split('@')[0]}
                </div>
                <small className="text-white-50">
                  {kullanici.email}
                </small>
              </div>
              
              <Badge className={`user-badge ${kullaniciRolu === 'admin' ? 'user-badge-admin' : kullaniciRolu === 'yetkili' ? 'user-badge-authorized' : ''} me-3`}>
                <span className="me-2">{roleConfig.icon}</span>
                {roleConfig.text}
              </Badge>
            </div>

            {/* Desktop Çıkış Butonu */}
            <Button
              onClick={cikisYap}
              className="btn-modern-danger d-none d-lg-block"
            >
              <i className="me-2">🚪</i>
              Çıkış Yap
            </Button>

            {/* Mobil Dropdown */}
            <NavDropdown
              title={
                <div className="d-flex align-items-center">
                  <span className="me-2" style={{fontSize: '1.2rem'}}>{roleConfig.icon}</span>
                  <span className="text-white fw-bold">Hesap</span>
                </div>
              }
              id="user-dropdown"
              className="d-lg-none"
              menuVariant="dark"
            >
              <NavDropdown.Item disabled>
                <div className="text-center py-2">
                  <div className="fw-bold text-primary">
                    {kullanici.displayName || kullanici.email.split('@')[0]}
                  </div>
                  <small className="text-muted">{kullanici.email}</small>
                  <div className="mt-2">
                    <Badge className={`user-badge ${kullaniciRolu === 'admin' ? 'user-badge-admin' : kullaniciRolu === 'yetkili' ? 'user-badge-authorized' : ''}`}>
                      <span className="me-2">{roleConfig.icon}</span>
                      {roleConfig.text}
                    </Badge>
                  </div>
                </div>
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={() => {setExpanded(false); cikisYap();}}>
                <i className="me-2">🚪</i>
                Çıkış Yap
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
