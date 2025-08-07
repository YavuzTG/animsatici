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

  // Türkçe karakter düzeltme sözlüğü
  const karakterDuzeltmeleri = {
    // Sık karşılaşılan OCR hataları
    'ğ': /[gq]/g,
    'ı': /[i1l|]/g,
    'ş': /[s]/g,
    'ç': /[c]/g,
    'ü': /[u]/g,
    'ö': /[o]/g,
    'İ': /[I1l|]/g,
    // Yaygın kelime hataları
    'bugün': /bug[iıl1]n|bug[iıl1]+n/gi,
    'bugün': /bugun/gi,
    'için': /[iıl1]ç[iıl1]n|icin/gi,
    'şimdi': /s[iıl1]md[iıl1]|simdi/gi,
    'yarın': /yar[iıl1]n|yarin/gi,
    'geldi': /geld[iıl1]|geldi/gi,
    'gitti': /g[iıl1]tt[iıl1]|gitti/gi,
  };

  // Metin düzeltme fonksiyonu
  const metniDuzelt = (rawText) => {
    if (!rawText) return '';

    let duzeltilmisMetin = rawText;

    // 1. Karakter düzeltmeleri
    Object.keys(karakterDuzeltmeleri).forEach(dogruKelime => {
      const regex = karakterDuzeltmeleri[dogruKelime];
      duzeltilmisMetin = duzeltilmisMetin.replace(regex, dogruKelime);
    });

    // 2. Satır temizleme
    const temizMetin = duzeltilmisMetin
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Tamamen boş satırları çıkar
        if (line.length === 0) return false;
        
        // Sadece tek karakter olanları çıkar (çok kısa)
        if (line.length === 1 && !line.match(/[a-zA-ZçÇğĞıIİöÖşŞüÜ0-9]/)) return false;
        
        // Sadece noktalama işaretlerinden oluşan uzun satırları çıkar
        if (line.length > 3 && /^[^\w\s]+$/.test(line)) return false;
        
        // Çok fazla noktalama işareti olanları çıkar
        if (line.length > 0 && (line.match(/[^\w\s]/g) || []).length / line.length > 0.5) return false;
        
        return true;
      })
      .join('\n')
      .trim();

    return temizMetin;
  };

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

      // OCR ayarlarını optimize et - daha iyi yazı tanıma için
      await worker.setParameters({
        tessedit_pageseg_mode: '6', // PSM 6: Uniform block of text (tek blok metin)
        tessedit_ocr_engine_mode: '1', // OEM 1: Neural nets LSTM only (daha iyi)
        preserve_interword_spaces: '1', // Kelimeler arası boşlukları koru
        tessedit_do_invert: '0', // Görüntü inversiyonu yapma
        tessedit_write_images: '0', // Debug görüntüleri yazma
        user_defined_dpi: '300', // DPI ayarı
        textord_really_old_xheight: '0', // Yeni x-height hesaplaması
        classify_enable_adaptive_matcher: '1', // Uyarlanabilir eşleyici
        classify_enable_learning: '1', // Öğrenmeyi etkinleştir
        textord_noise_area_ratio: '0.3', // Gürültü oranını düşür
        textord_noise_sizelimit: '0.2', // Gürültü boyut sınırını düşür
        textord_heavy_nr: '1', // Ağır gürültü temizleme
        language_model_penalty_non_freq_dict_word: '0.1', // Sözlükte olmayan kelimeler için düşük ceza
        language_model_penalty_non_dict_word: '0.15', // Sözlükte olmayan kelimeler
      });

      const { data: { text } } = await worker.recognize(selectedImage);
      
      // Metni düzelt ve temizle
      const temizMetin = metniDuzelt(text);

      setExtractedText(temizMetin);
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
                        <li className="mb-2 text-muted">
                          <span className="me-2">🚫</span>
                          <strong>Optimize edildi</strong> - gereksiz karakterler azaltıldı
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
                        <li className="mb-2 text-muted">
                          <span className="me-2">🔍</span>
                          <strong>Yüksek doğruluk</strong> için net resimler kullanın
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
