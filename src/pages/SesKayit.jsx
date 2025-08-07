import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Form, Spinner } from 'react-bootstrap';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../contexts/AuthContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const SesKayit = () => {
  const { kullanici } = useAuthContext();
  const {
    dinleniyor,
    metin,
    destekleniyor,
    hata,
    mikrofonIzni,
    dinlemeBaslat,
    dinlemeDurdur,
    metniSifirla
  } = useSpeechRecognition();
  
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basariliMesaj, setBasariliMesaj] = useState('');
  const [asistanDurumu, setAsistanDurumu] = useState('bekliyor'); // bekliyor, dinliyor, tarih-soruyor, saat-soruyor, not-soruyor
  const [anımsaticiDetayları, setAnımsaticiDetayları] = useState({
    baslik: '',
    tarih: '',
    saat: '',
    notlar: ''
  });
  const [sonİşlenenCevap, setSonİşlenenCevap] = useState(''); // Tekrar işlemeyi önlemek için
  
  // Component mount olduğunda mikrofon iznini önceden al
  useEffect(() => {
    const mikrofonHazirla = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          console.log('🎤 Mikrofon hazırlanıyor...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
          // Stream'i hemen kapat, sadece izin almak için
          stream.getTracks().forEach(track => track.stop());
          console.log('✅ Mikrofon hazır - hızlı başlatma aktif');
        } catch (error) {
          console.log('⚠️ Mikrofon ön hazırlık başarısız:', error.message);
        }
      }
    };
    
    // Sadece desteklenen tarayıcılarda çalıştır
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      mikrofonHazirla();
    }
  }, []);
  
  // Debug için dinleniyor state'ini takip et
  useEffect(() => {
    console.log('🔄 Dinleniyor state değişti:', dinleniyor);
    // DOM debug - mikrofon açıldığında ekranın gözükme durumunu kontrol et
    if (dinleniyor) {
      console.log('🖥️ DOM Debug - Mikrofon açık, body styles:');
      console.log('Body overflow:', document.body.style.overflow);
      console.log('Body display:', document.body.style.display);
      console.log('Body opacity:', document.body.style.opacity);
      console.log('HTML overflow:', document.documentElement.style.overflow);
      console.log('HTML display:', document.documentElement.style.display);
    }
  }, [dinleniyor]);

  // Sesli tarihi düzenli formata çevir
  const tarihiDuzenle = (sesliTarih) => {
    const bugün = new Date();
    const sesli = sesliTarih.toLowerCase();
    
    // Yarın/bugün kontrolü
    if (sesli.includes('yarın')) {
      const yarın = new Date(bugün);
      yarın.setDate(bugün.getDate() + 1);
      return yarın.toLocaleDateString('tr-TR');
    }
    
    if (sesli.includes('bugün')) {
      return bugün.toLocaleDateString('tr-TR');
    }
    
    // Haftalar (gelecek hafta, önümüzdeki hafta)
    if (sesli.includes('gelecek hafta') || sesli.includes('önümüzdeki hafta')) {
      const gelecekHafta = new Date(bugün);
      gelecekHafta.setDate(bugün.getDate() + 7);
      return gelecekHafta.toLocaleDateString('tr-TR');
    }
    
    // Günler (pazartesi, salı vs)
    const günler = {
      'pazartesi': 1, 'salı': 2, 'çarşamba': 3, 'perşembe': 4, 
      'cuma': 5, 'cumartesi': 6, 'pazar': 0
    };
    
    for (const [günAdı, günNumarası] of Object.entries(günler)) {
      if (sesli.includes(günAdı)) {
        const bugünkuGün = bugün.getDay();
        const fark = (günNumarası - bugünkuGün + 7) % 7;
        const hedefGün = new Date(bugün);
        hedefGün.setDate(bugün.getDate() + (fark === 0 ? 7 : fark)); // Bu haftaysa gelecek hafta
        return hedefGün.toLocaleDateString('tr-TR');
      }
    }
    
    // Ay isimleri ve günler (15 ağustos, 20 eylül vs)
    const aylar = {
      'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
      'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
    };
    
    for (const [ayAdı, ayNumarası] of Object.entries(aylar)) {
      if (sesli.includes(ayAdı)) {
        const gün = sesli.match(/(\d+)/)?.[1] || '1';
        const yıl = ayNumarası < bugün.getMonth() ? bugün.getFullYear() + 1 : bugün.getFullYear();
        const tarih = new Date(yıl, ayNumarası, parseInt(gün));
        return tarih.toLocaleDateString('tr-TR');
      }
    }
    
    // Eğer hiçbiri uymazsa orijinal metni döndür
    return sesliTarih;
  };

  // Sesli saati düzenli formata çevir
  const saatiDuzenle = (sesliSaat) => {
    const sesli = sesliSaat.toLowerCase();
    
    // Sabah saatleri
    if (sesli.includes('sabah')) {
      const saat = sesli.match(/(\d+)/)?.[1] || '9';
      return `${saat}:00`;
    }
    
    // Öğle saatleri
    if (sesli.includes('öğle')) {
      return '12:00';
    }
    
    // Öğleden sonra
    if (sesli.includes('öğleden sonra')) {
      const saat = sesli.match(/(\d+)/)?.[1] || '14';
      const saatNum = parseInt(saat);
      return `${saatNum > 12 ? saatNum : saatNum + 12}:00`;
    }
    
    // Akşam saatleri
    if (sesli.includes('akşam')) {
      const saat = sesli.match(/(\d+)/)?.[1] || '19';
      const saatNum = parseInt(saat);
      return `${saatNum > 12 ? saatNum : saatNum + 12}:00`;
    }
    
    // Gece saatleri
    if (sesli.includes('gece')) {
      const saat = sesli.match(/(\d+)/)?.[1] || '21';
      const saatNum = parseInt(saat);
      return `${saatNum > 12 ? saatNum : saatNum + 12}:00`;
    }
    
    // Direkt saat formatı (saat 14, 14:30 vs)
    const saatMatch = sesli.match(/(\d{1,2})(?::(\d{2}))?/);
    if (saatMatch) {
      const saat = saatMatch[1];
      const dakika = saatMatch[2] || '00';
      return `${saat}:${dakika}`;
    }
    
    // Eğer hiçbiri uymazsa orijinal metni döndür
    return sesliSaat;
  };

  // Text-to-Speech fonksiyonu
  const konuş = (metin) => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        // Önceki konuşmaları iptal et
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(metin);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.3; // Hızlandırdık (0.9'dan 1.3'e)
        utterance.pitch = 1.0;
        
        // Konuşma bittiğinde resolve et
        utterance.onend = () => {
          console.log('🔊 Konuşma tamamlandı:', metin.substring(0, 30) + '...');
          resolve();
        };
        
        utterance.onerror = () => {
          console.error('❌ Konuşma hatası');
          resolve(); // Hata olsa bile devam et
        };
        
        console.log('🗣️ Konuşuyor:', metin.substring(0, 30) + '...');
        speechSynthesis.speak(utterance);
      } else {
        console.log('❌ Text-to-Speech desteklenmiyor');
        resolve();
      }
    });
  };

  // Sesli asistan başlat
  const asistanBaslat = async () => {
    console.log('🤖 Asistan başlatılıyor...');
    setAsistanDurumu('dinliyor');
    setAnımsaticiDetayları({ baslik: '', tarih: '', saat: '', notlar: '' });
    setSonİşlenenCevap(''); // Temizle
    setBasariliMesaj('');
    
    // Konuşma olmadan direkt mikrofonu aç
    console.log('🎤 Direkt mikrofon açılıyor...');
    setTimeout(async () => {
      await dinlemeBaslat();
      console.log('📊 Dinleme başladı - state:', dinleniyor);
    }, 100);
  };

  // Kullanıcı cevabını işle
  useEffect(() => {
    console.log('📝 Metin değişti:', metin, 'Durum:', asistanDurumu);
    if (metin && asistanDurumu !== 'bekliyor' && metin.trim().length > 2) {
      const temizCevap = metin.trim();
      
      // Aynı cevabı tekrar işleme
      if (temizCevap === sonİşlenenCevap) {
        console.log('⚠️ Aynı cevap, tekrar işlenmiyor:', temizCevap);
        return;
      }
      
      // Cevabı işle ve hemen metni temizle
      setSonİşlenenCevap(temizCevap);
      metniSifirla();
      işleSesliCevap(temizCevap);
    }
  }, [metin, asistanDurumu]);

  const işleSesliCevap = async (cevap) => {
    console.log('🎤 Asistan durumu:', asistanDurumu, 'Cevap:', cevap);
    
    switch (asistanDurumu) {
      case 'dinliyor':
        // İlk cevap - anımsatıcı başlığı
        setAnımsaticiDetayları(prev => ({ ...prev, baslik: cevap }));
        setAsistanDurumu('tarih-soruyor');
        setSonİşlenenCevap(''); // Yeni durum için temizle
        dinlemeDurdur();
        
        // Direkt mikrofonu aç - konuşma yok
        setTimeout(async () => {
          await dinlemeBaslat();
        }, 50);
        break;

      case 'tarih-soruyor':
        const düzenliTarih = tarihiDuzenle(cevap);
        setAnımsaticiDetayları(prev => ({ ...prev, tarih: düzenliTarih }));
        setAsistanDurumu('saat-soruyor');
        setSonİşlenenCevap(''); // Yeni durum için temizle
        dinlemeDurdur();
        
        console.log('📅 Sesli tarih:', cevap, '→ Düzenli tarih:', düzenliTarih);
        
        // Direkt saat sorma aşamasına geçip dinlemeye başla
        setTimeout(async () => {
          await dinlemeBaslat();
        }, 50);
        break;

      case 'saat-soruyor':
        const düzenliSaat = saatiDuzenle(cevap);
        setAnımsaticiDetayları(prev => ({ ...prev, saat: düzenliSaat }));
        setAsistanDurumu('not-soruyor');
        setSonİşlenenCevap(''); // Yeni durum için temizle
        dinlemeDurdur();
        
        console.log('🕐 Sesli saat:', cevap, '→ Düzenli saat:', düzenliSaat);
        
        // Direkt not sorusuna geçip dinlemeye başla
        setTimeout(async () => {
          await dinlemeBaslat();
        }, 50);
        break;

      case 'not-soruyor':
        const notlar = cevap.toLowerCase().includes('hayır') || cevap.toLowerCase().includes('yok') ? '' : cevap;
        const tamamDetaylar = {
          ...anımsaticiDetayları,
          notlar: notlar
        };
        setAnımsaticiDetayları(tamamDetaylar);
        
        // Anımsatıcıyı otomatik kaydet
        otomatikKaydet(tamamDetaylar);
        setAsistanDurumu('tamamlandı');
        dinlemeDurdur();
        break;
    }
  };

  const otomatikKaydet = async (detaylar) => {
    setKaydediliyor(true);
    
    // Hedef tarih/saat oluştur
    const hedefTarihSaat = () => {
      try {
        // Tarih parsing (dd.mm.yyyy formatından)
        const [gün, ay, yıl] = detaylar.tarih.split('.');
        const [saat, dakika] = detaylar.saat.split(':');
        
        const hedefTarih = new Date(
          parseInt(yıl) || new Date().getFullYear(),
          (parseInt(ay) - 1) || new Date().getMonth(),
          parseInt(gün) || new Date().getDate(),
          parseInt(saat) || 9,
          parseInt(dakika) || 0
        );
        
        return hedefTarih;
      } catch (error) {
        console.error('Hedef tarih oluşturma hatası:', error);
        // Fallback - 1 gün sonra
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 1);
        fallback.setHours(9, 0, 0, 0);
        return fallback;
      }
    };
    
    const tamMetin = `🎯 ${detaylar.baslik}
📅 Tarih: ${detaylar.tarih}
🕐 Saat: ${detaylar.saat}${detaylar.notlar ? `
📝 Notlar: ${detaylar.notlar}` : ''}`;
    
    try {
      const hedefTarih = hedefTarihSaat();
      console.log('📅 Hedef tarih oluşturuldu:', hedefTarih);
      
      await addDoc(collection(db, 'animsaticilar'), {
        icerik: tamMetin,
        kullaniciId: kullanici.uid,
        kullaniciEmail: kullanici.email,
        olusturmaTarihi: new Date(),
        hedefTarih: hedefTarih, // Hedef tarih/saat
        sesliOluşturulan: true,
        detaylar: detaylar,
        aktif: true
      });
      
      await konuş(`${detaylar.baslik} anımsatıcınız ${detaylar.tarih} ${detaylar.saat} için kaydedildi!`);
      setBasariliMesaj('✅ Sesli anımsatıcı başarıyla oluşturuldu!');
      
      setTimeout(() => {
        setAsistanDurumu('bekliyor');
        setAnımsaticiDetayları({ baslik: '', tarih: '', saat: '', notlar: '' });
        metniSifirla();
        setBasariliMesaj('');
      }, 5000);
      
    } catch (error) {
      console.error('Sesli anımsatıcı kaydedilirken hata:', error);
      await konuş('Kaydederken hata oluştu. Tekrar deneyin.');
      setAsistanDurumu('bekliyor');
    } finally {
      setKaydediliyor(false);
    }
  };

  const asistanİptal = () => {
    setAsistanDurumu('bekliyor');
    setAnımsaticiDetayları({ baslik: '', tarih: '', saat: '', notlar: '' });
    setSonİşlenenCevap(''); // Temizle
    dinlemeDurdur();
    metniSifirla();
    speechSynthesis.cancel();
  };

  if (!destekleniyor) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Alert variant="warning" className="text-center">
              <div style={{fontSize: '3rem'}} className="mb-3">⚠️</div>
              <h4>Tarayıcı Uyumluluğu</h4>
              <p>Maalesef tarayıcınız ses tanıma özelliğini desteklemiyor.</p>
              <p>Lütfen Chrome, Edge veya Safari tarayıcılarından birini kullanın.</p>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  if (mikrofonIzni === false) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Alert variant="danger" className="text-center">
              <div style={{fontSize: '3rem'}} className="mb-3">🎤</div>
              <h4>Mikrofon İzni Gerekli</h4>
              <p>Sesli asistan özelliği için mikrofon erişimine ihtiyaç var.</p>
              <p><strong>Nasıl İzin Verilir:</strong></p>
              <ol className="text-start">
                <li>Adres çubuğundaki 🔒 simgesine tıklayın</li>
                <li>"Mikrofon" ayarını "İzin Ver" olarak değiştirin</li>
                <li>Sayfayı yenileyin (F5)</li>
              </ol>
              <Button 
                variant="primary" 
                onClick={() => window.location.reload()}
                className="mt-3"
              >
                🔄 Sayfayı Yenile
              </Button>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  const durumMesajları = {
    'bekliyor': '🎤 Sesli Asistan Hazır',
    'dinliyor': '👂 Konu Dinliyorum - Mikrofon Açık',
    'tarih-soruyor': '📅 Tarih Dinliyorum - Mikrofon Açık', 
    'saat-soruyor': '🕐 Saat Dinliyorum - Mikrofon Açık',
    'not-soruyor': '📝 Not Dinliyorum - Mikrofon Açık',
    'tamamlandı': '✅ Anımsatıcı Oluşturuldu!'
  };

  return (
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        <Col xs={12} lg={10} xl={8}>
          <Card className="modern-feature-card animate-fade-in-up">
            <Card.Body className="p-4 p-md-5">
              {/* Header */}
              <div className="d-flex align-items-center mb-4">
                <div className="me-3" style={{fontSize: '3rem'}}>🤖</div>
                <div>
                  <Card.Title className="h2 gradient-text fw-bold mb-2">
                    Sesli Anımsatıcı Asistanı
                  </Card.Title>
                  <Card.Subtitle className="text-muted lead">
                    Konuşarak detaylı anımsatıcılar oluşturun
                  </Card.Subtitle>
                </div>
              </div>

              {/* Success Message */}
              {basariliMesaj && (
                <Alert variant="success" className="mb-4 animate-fade-in">
                  <div className="d-flex align-items-center">
                    <span className="me-2" style={{fontSize: '1.5rem'}}>✅</span>
                    {basariliMesaj}
                  </div>
                </Alert>
              )}

              {/* Error Message */}
              {hata && (
                <Alert variant="danger" className="mb-4">
                  <div className="d-flex align-items-center">
                    <span className="me-2" style={{fontSize: '1.5rem'}}>❌</span>
                    {hata}
                  </div>
                </Alert>
              )}

              {/* Asistan Durumu */}
              <Card className="mb-4" style={{
                background: asistanDurumu === 'bekliyor' 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))'
                  : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
                border: 'none'
              }}>
                <Card.Body className="text-center p-5">
                  <Badge 
                    bg={asistanDurumu === 'bekliyor' ? 'primary' : 'success'}
                    className="px-4 py-2 fs-5 mb-4"
                  >
                    {durumMesajları[asistanDurumu]}
                  </Badge>

                  {asistanDurumu === 'bekliyor' ? (
                    <div>
                      <div style={{fontSize: '5rem'}} className="mb-4">🎤</div>
                      <h4 className="mb-3">Akıllı Sesli Asistan</h4>
                      <p className="text-muted mb-4 lead">
                        Size sorular sorup cevaplarınızı dinleyerek otomatik anımsatıcı oluşturur
                      </p>
                      <Button
                        onClick={asistanBaslat}
                        className="btn-modern-primary"
                        size="lg"
                        style={{fontSize: '1.2rem', padding: '15px 40px'}}
                      >
                        🚀 Sesli Asistanı Başlat
                      </Button>
                      
                      {/* Debug Test Butonları */}
                      <div className="mt-4">
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="me-2"
                          onClick={async () => {
                            console.log('🧪 Manuel mikrofon testi başlatılıyor');
                            console.log('📊 Test öncesi dinleniyor state:', dinleniyor);
                            
                            // Sadece bir kere başlat - retry mekanizmasını hook yapsın
                            await dinlemeBaslat();
                            console.log('📊 Test sonrası dinleniyor state:', dinleniyor);
                          }}
                        >
                          🎤 Mikrofon Test
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={async () => {
                            await konuş('Bu bir test konuşmasıdır');
                          }}
                        >
                          🔊 Ses Test
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div 
                        style={{
                          fontSize: '4rem',
                          animation: dinleniyor ? 'pulse-glow 2s infinite' : 'none'
                        }} 
                        className="mb-4"
                      >
                        {dinleniyor ? '👂' : '🤖'}
                      </div>
                      <p className="lead mb-4">
                        {dinleniyor ? 
                          '🗣️ Konuşun, dinliyorum...' : 
                          asistanDurumu === 'tamamlandı' ? 
                          '✅ Anımsatıcı oluşturuldu!' :
                          '⏳ Cevabınızı işliyorum... (sonraki soruyu hazırlıyorum)'
                        }
                      </p>
                      
                      {/* Güncel detaylar */}
                      {anımsaticiDetayları.baslik && (
                        <div className="text-start">
                          <h6 className="text-primary fw-bold mb-3">📋 Toplanan Bilgiler:</h6>
                          <ul className="list-unstyled">
                            {anımsaticiDetayları.baslik && (
                              <li className="mb-2">🎯 <strong>Konu:</strong> {anımsaticiDetayları.baslik}</li>
                            )}
                            {anımsaticiDetayları.tarih && (
                              <li className="mb-2">📅 <strong>Tarih:</strong> {anımsaticiDetayları.tarih}</li>
                            )}
                            {anımsaticiDetayları.saat && (
                              <li className="mb-2">🕐 <strong>Saat:</strong> {anımsaticiDetayları.saat}</li>
                            )}
                            {anımsaticiDetayları.notlar && (
                              <li className="mb-2">📝 <strong>Notlar:</strong> {anımsaticiDetayları.notlar}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      <Button
                        onClick={asistanİptal}
                        variant="outline-danger"
                        className="mt-3"
                      >
                        ❌ İptal Et
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Tanınan metin */}
              {metin && asistanDurumu !== 'bekliyor' && (
                <Card className="mb-4" style={{background: 'rgba(34, 197, 94, 0.1)', border: 'none'}}>
                  <Card.Header style={{background: 'transparent', border: 'none'}}>
                    <h6 className="mb-0 text-success fw-bold">
                      🎯 Son Tanınan Cevabınız
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <p className="mb-0 lead">{metin}</p>
                  </Card.Body>
                </Card>
              )}

              {/* Debug Panel - Geliştirme için */}
              {(mikrofonIzni !== null || hata) && (
                <Card className="mb-4" style={{background: 'rgba(156, 163, 175, 0.1)', border: 'none'}}>
                  <Card.Body>
                    <h6 className="text-muted fw-bold mb-3">🔧 Sistem Durumu:</h6>
                    <Row>
                      <Col md={6}>
                        <ul className="list-unstyled small">
                          <li className="mb-1">🌐 <strong>Tarayıcı Desteği:</strong> {destekleniyor ? '✅ Var' : '❌ Yok'}</li>
                          <li className="mb-1">🎤 <strong>Mikrofon İzni:</strong> {mikrofonIzni === true ? '✅ Verildi' : mikrofonIzni === false ? '❌ Reddedildi' : '⏳ Kontrol ediliyor'}</li>
                          <li className="mb-1">👂 <strong>Dinleme Durumu:</strong> 
                            <span className={dinleniyor ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                              {dinleniyor ? '✅ AKTIF (MİKROFON AÇIK)' : '❌ PASIF (MİKROFON KAPALI)'}
                            </span>
                            <small className="d-block text-muted">
                              Update: {new Date().toLocaleTimeString()}
                            </small>
                          </li>
                        </ul>
                      </Col>
                      <Col md={6}>
                        <ul className="list-unstyled small">
                          <li className="mb-1">🤖 <strong>Asistan Durumu:</strong> {durumMesajları[asistanDurumu]}</li>
                          <li className="mb-1">📝 <strong>Son Metin:</strong> {metin ? `"${metin.substring(0, 20)}..."` : 'Henüz yok'}</li>
                          <li className="mb-1">🔄 <strong>Son İşlenen:</strong> {sonİşlenenCevap ? `"${sonİşlenenCevap.substring(0, 15)}..."` : 'Henüz yok'}</li>
                          {anımsaticiDetayları.tarih && (
                            <li className="mb-1 text-info">📅 <strong>Düzenli Tarih:</strong> {anımsaticiDetayları.tarih}</li>
                          )}
                          {anımsaticiDetayları.saat && (
                            <li className="mb-1 text-info">🕐 <strong>Düzenli Saat:</strong> {anımsaticiDetayları.saat}</li>
                          )}
                          {hata && <li className="mb-1 text-danger">⚠️ <strong>Hata:</strong> {hata.substring(0, 30)}...</li>}
                        </ul>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* İpuçları */}
              <Card className="mt-4" style={{background: 'rgba(79, 172, 254, 0.1)', border: 'none'}}>
                <Card.Body>
                  <h6 className="text-info fw-bold mb-3">💡 Nasıl Çalışır:</h6>
                  <Row>
                    <Col md={6}>
                      <ul className="list-unstyled">
                        <li className="mb-2">1️⃣ <strong>Konu:</strong> "Araba bakımı" deyin</li>
                        <li className="mb-2">2️⃣ <strong>Tarih:</strong> "Yarın", "Pazartesi", "15 Ağustos" deyin</li>
                        <li className="mb-2">3️⃣ <strong>Saat:</strong> "Sabah 9", "Öğleden sonra 2", "19:30" deyin</li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <ul className="list-unstyled">
                        <li className="mb-2">4️⃣ <strong>Not:</strong> Ek bilgi veya "Hayır" deyin</li>
                        <li className="mb-2">✨ <strong>Otomatik:</strong> Sistem her şeyi kaydeder</li>
                        <li className="mb-2">🔄 <strong>Tekrar:</strong> İstediğiniz kadar kullanın</li>
                      </ul>
                      
                      <div className="mt-3">
                        <h6 className="text-info fw-bold mb-2">📋 Parsing Örnekleri:</h6>
                        <small className="text-muted d-block">
                          • "yarın" → {new Date(new Date().getTime() + 24*60*60*1000).toLocaleDateString('tr-TR')} <br />
                          • "sabah 9" → 09:00 <br />
                          • "öğleden sonra 2" → 14:00
                        </small>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Loading durumu */}
              {kaydediliyor && (
                <Card className="mt-3" style={{background: 'rgba(251, 191, 36, 0.1)', border: 'none'}}>
                  <Card.Body className="text-center">
                    <Spinner className="me-3" />
                    <strong>Anımsatıcınız kaydediliyor...</strong>
                  </Card.Body>
                </Card>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SesKayit;
