import React, { useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Form, ProgressBar, Spinner } from 'react-bootstrap';
import { createWorker } from 'tesseract.js';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../contexts/AuthContext';

const OCR = () => {
  const { kullanici } = useAuthContext();
  const [selectedImage, setSelectedImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basariliMesaj, setBasariliMesaj] = useState('');
  const fileInputRef = useRef(null);

  // Resim seçildiğinde
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setExtractedText('');
      setProgress(0);
    }
  };

  // OCR işlemini başlat
  const processImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedText('');

    try {
      const worker = await createWorker('tur+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const { data: { text } } = await worker.recognize(selectedImage);
      setExtractedText(text);
      await worker.terminate();
    } catch (error) {
      console.error('OCR işlemi sırasında hata:', error);
      alert('Resim işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Metni anımsatıcı olarak kaydet
  const animsaticiKaydet = async () => {
    if (!extractedText.trim() || !kullanici) return;

    setKaydediliyor(true);
    try {
      await addDoc(collection(db, 'animsaticilar'), {
        icerik: extractedText.trim(),
        kullaniciId: kullanici.uid,
        kullaniciEmail: kullanici.email,
        olusturmaTarihi: new Date(),
        tamamlandi: false,
        kaynak: 'ocr'
      });
      
      setBasariliMesaj('Metin anımsatıcı olarak kaydedildi! ✅');
      setTimeout(() => setBasariliMesaj(''), 3000);
    } catch (error) {
      console.error('Anımsatıcı kaydedilirken hata:', error);
    } finally {
      setKaydediliyor(false);
    }
  };

  // Yeni resim seç
  const yeniResimSec = () => {
    setSelectedImage(null);
    setExtractedText('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        <Col xs={12} lg={10} xl={8}>
          <Card className="modern-feature-card animate-fade-in-up">
            <Card.Body className="p-4 p-md-5">
              {/* Header */}
              <div className="d-flex align-items-center mb-4">
                <div className="me-3" style={{fontSize: '3rem'}}>📷</div>
                <div>
                  <Card.Title className="h2 gradient-text fw-bold mb-2">
                    OCR - Resimden Metin
                  </Card.Title>
                  <Card.Subtitle className="text-muted lead">
                    Resimlerinizdeki yazıları otomatik olarak metne çevirin
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

              {!selectedImage ? (
                // Resim yükleme bölümü
                <Card 
                  className="text-center py-5 mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                    border: '2px dashed rgba(59, 130, 246, 0.3)',
                    borderRadius: '15px'
                  }}
                >
                  <Card.Body className="py-5">
                    <div style={{fontSize: '5rem'}} className="mb-4 text-primary">📷</div>
                    <h3 className="h4 fw-bold mb-3 text-primary">
                      Resim Yükleyin
                    </h3>
                    <p className="text-muted mb-4 lead">
                      JPG, PNG veya GIF formatında resim yükleyebilirsiniz
                    </p>
                    
                    <Form.Control
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{display: 'none'}}
                    />
                    
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-modern-primary px-5 py-3"
                      style={{fontSize: '1.1rem'}}
                    >
                      📁 Resim Seç
                    </Button>
                  </Card.Body>
                </Card>
              ) : (
                // Resim ve işlem bölümü
                <div className="space-y-4">
                  {/* Seçilen resim */}
                  <Card className="mb-4" style={{background: 'rgba(255, 255, 255, 0.9)', border: 'none'}}>
                    <Card.Body className="text-center">
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="Seçilen resim"
                        className="img-fluid rounded shadow-sm mb-3"
                        style={{
                          maxHeight: '300px',
                          objectFit: 'contain',
                          border: '2px solid rgba(59, 130, 246, 0.2)'
                        }}
                      />
                      <Badge bg="info" className="fs-6">
                        📄 {selectedImage.name}
                      </Badge>
                    </Card.Body>
                  </Card>

                  {/* İşlem butonları */}
                  <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mb-4">
                    <Button
                      onClick={yeniResimSec}
                      disabled={isProcessing}
                      variant="outline-secondary"
                      className="px-4 py-2"
                    >
                      🔄 Yeni Resim Seç
                    </Button>
                    
                    <Button
                      onClick={processImage}
                      disabled={isProcessing}
                      className="btn-modern-primary px-5 py-2"
                    >
                      {isProcessing ? (
                        <div className="d-flex align-items-center">
                          <Spinner size="sm" className="me-2" />
                          İşleniyor... {progress}%
                        </div>
                      ) : (
                        '🔍 Metni Oku'
                      )}
                    </Button>
                  </div>

                  {/* İşlem durumu */}
                  {isProcessing && (
                    <Card className="mb-4" style={{background: 'rgba(59, 130, 246, 0.1)', border: 'none'}}>
                      <Card.Body>
                        <div className="d-flex align-items-center mb-3">
                          <Spinner size="sm" className="me-3 text-primary" />
                          <span className="text-primary fw-bold">Resim işleniyor...</span>
                        </div>
                        <ProgressBar 
                          now={progress} 
                          label={`${progress}%`}
                          className="mb-2"
                          style={{height: '8px'}}
                        />
                        <p className="text-primary mb-0">
                          <small>{progress}% tamamlandı - OCR teknolojisi resminizi analiz ediyor...</small>
                        </p>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Çıkarılan metin */}
                  {extractedText && (
                    <Card className="mb-4" style={{background: 'rgba(34, 197, 94, 0.1)', border: 'none'}}>
                      <Card.Header style={{background: 'transparent', border: 'none'}}>
                        <h5 className="mb-0 text-success fw-bold">
                          ✅ Çıkarılan Metin
                        </h5>
                      </Card.Header>
                      <Card.Body>
                        <Form.Control
                          as="textarea"
                          rows={8}
                          value={extractedText}
                          onChange={(e) => setExtractedText(e.target.value)}
                          className="form-control-modern mb-4"
                          placeholder="Çıkarılan metin burada görünecek..."
                          style={{
                            fontSize: '1.1rem',
                            lineHeight: '1.6'
                          }}
                        />
                        
                        <div className="d-flex gap-3 justify-content-end">
                          <Button
                            variant="outline-primary"
                            onClick={() => navigator.clipboard.writeText(extractedText)}
                            disabled={!extractedText.trim()}
                          >
                            📋 Kopyala
                          </Button>
                          <Button
                            onClick={animsaticiKaydet}
                            disabled={!extractedText.trim() || kaydediliyor}
                            className="btn-modern-primary"
                          >
                            {kaydediliyor ? (
                              <>
                                <Spinner size="sm" className="me-2" />
                                Kaydediliyor...
                              </>
                            ) : (
                              '💾 Anımsatıcı Olarak Kaydet'
                            )}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  )}
                </div>
              )}

              {/* Kullanım ipuçları */}
              <Card className="mt-4" style={{background: 'rgba(251, 191, 36, 0.1)', border: 'none'}}>
                <Card.Body>
                  <h5 className="text-warning fw-bold mb-3">💡 Daha İyi Sonuçlar İçin:</h5>
                  <Row>
                    <Col md={6}>
                      <ul className="list-unstyled">
                        <li className="mb-2 text-muted">
                          <span className="me-2">📸</span>
                          Resmin net ve yüksek çözünürlükte olsun
                        </li>
                        <li className="mb-2 text-muted">
                          <span className="me-2">📖</span>
                          Metin düz ve okunabilir olmalı
                        </li>
                        <li className="mb-2 text-muted">
                          <span className="me-2">💡</span>
                          İyi aydınlatılmış fotoğraflar tercih edin
                        </li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <ul className="list-unstyled">
                        <li className="mb-2 text-muted">
                          <span className="me-2">🌍</span>
                          Türkçe ve İngilizce desteklenir
                        </li>
                        <li className="mb-2 text-muted">
                          <span className="me-2">📱</span>
                          Telefon fotoğrafları da kullanılabilir
                        </li>
                        <li className="mb-2 text-muted">
                          <span className="me-2">✏️</span>
                          Sonucu düzenleyebilirsiniz
                        </li>
                      </ul>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Supported Formats */}
              <Card className="mt-3" style={{background: 'rgba(168, 85, 247, 0.1)', border: 'none'}}>
                <Card.Body className="text-center py-3">
                  <small className="text-muted">
                    🖼️ Desteklenen formatlar: JPG, PNG, GIF, WEBP, BMP
                    <span className="mx-2">•</span>
                    📏 Maksimum boyut: 10MB
                    <span className="mx-2">•</span>
                    🔒 Resimleriniz güvenli şekilde işlenir
                  </small>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default OCR;
