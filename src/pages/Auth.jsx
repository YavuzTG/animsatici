import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import Loading from '../components/Loading';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [girisModu, setGirisModu] = useState(true); // true: giriş, false: kayıt
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  const formGonder = async (e) => {
    e.preventDefault();
    setYukleniyor(true);
    setHata('');

    try {
      if (girisModu) {
        // Giriş yap
        await signInWithEmailAndPassword(auth, email, sifre);
      } else {
        // Kayıt ol
        const { user } = await createUserWithEmailAndPassword(auth, email, sifre);
        
        // Kullanıcı belgesini Firestore'da oluştur
        await setDoc(doc(db, 'kullanicilar', user.uid), {
          email: user.email,
          rol: 'kullanici',
          olusturmaTarihi: new Date(),
          aktif: true
        });
      }
    } catch (error) {
      console.error('Kimlik doğrulama hatası:', error);
      
      // Türkçe hata mesajları
      const hataMesajlari = {
        'auth/user-not-found': 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.',
        'auth/wrong-password': 'Hatalı şifre girdiniz.',
        'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda.',
        'auth/weak-password': 'Şifre en az 6 karakter olmalıdır.',
        'auth/invalid-email': 'Geçerli bir e-posta adresi giriniz.',
        'auth/too-many-requests': 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.'
      };
      
      setHata(hataMesajlari[error.code] || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  };

  if (yukleniyor) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{minHeight: '100vh'}}>
        <Loading metin={girisModu ? 'Giriş yapılıyor...' : 'Kayıt oluşturuluyor...'} />
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" 
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           padding: '2rem 1rem'
         }}>
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={8} md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0" style={{borderRadius: '15px'}}>
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🎯</div>
                  <h2 className="h3 fw-bold text-primary mb-2">Sesli Anımsatıcı</h2>
                  <p className="text-muted small">
                    {girisModu ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}
                  </p>
                </div>
                
                <Form onSubmit={formGonder}>
                  {hata && (
                    <Alert variant="danger" className="py-2 px-3 small">
                      {hata}
                    </Alert>
                  )}
                  
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-medium">E-posta Adresi</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      required
                      style={{borderRadius: '8px'}}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-medium">Şifre</Form.Label>
                    <Form.Control
                      type="password"
                      value={sifre}
                      onChange={(e) => setSifre(e.target.value)}
                      placeholder="En az 6 karakter"
                      required
                      style={{borderRadius: '8px'}}
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 py-2 fw-medium"
                    style={{borderRadius: '8px'}}
                    disabled={yukleniyor}
                  >
                    {girisModu ? '🔐 Giriş Yap' : '📝 Kayıt Ol'}
                  </Button>

                  <div className="text-center mt-3">
                    <Button
                      variant="link"
                      onClick={() => {
                        setGirisModu(!girisModu);
                        setHata('');
                      }}
                      className="text-decoration-none small"
                    >
                      {girisModu 
                        ? 'Hesabınız yok mu? Kayıt olun' 
                        : 'Zaten hesabınız var mı? Giriş yapın'
                      }
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Auth;
