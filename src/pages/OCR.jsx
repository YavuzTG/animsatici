import React, { useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Form, ProgressBar, Spinner } from 'react-bootstrap';
import { createWorker } from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  const [ocrMethod, setOcrMethod] = useState('tesseract'); // Tesseract varsayılan olsun, her zaman çalışır
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
    'bugün': /bug[iıl1]n|bug[iıl1]+n|bugun/gi,
    'için': /[iıl1]ç[iıl1]n|icin/gi,
    'şimdi': /s[iıl1]md[iıl1]|simdi/gi,
    'yarın': /yar[iıl1]n|yarin/gi,
    'geldi': /geld[iıl1]|geldi/gi,
    'gitti': /g[iıl1]tt[iıl1]|gitti/gi,
    // Garip karakter kombinasyonları
    'bölüyor': /bölülae|béltyolae|boluyor|boluyae/gi,
    'geliyor': /geliyae|geliy0r|geliyor/gi,
    'gidiyor': /gidiyae|gidiy0r|gidiyor/gi,
    'ediyor': /ediyae|ediy0r|ediyor/gi,
    'oluyor': /oluyae|oluy0r|oluyor/gi,
    'yapıyor': /yapiyae|yapiy0r|yapiyor/gi,
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

    // 1.5. Genel garip karakter temizleme
    duzeltilmisMetin = duzeltilmisMetin
      // "ae" soneklerini temizle
      .replace(/ae\b/g, 'a')
      .replace(/yae\b/g, 'ya')
      .replace(/lae\b/g, 'la')
      .replace(/mae\b/g, 'ma')
      .replace(/nae\b/g, 'na')
      // Garip karakter kombinasyonları
      .replace(/0r\b/g, 'or')
      .replace(/y0r\b/g, 'yor')
      .replace(/[|]l/g, 'ıl')
      .replace(/[|]n/g, 'ın')
      .replace(/[|]m/g, 'ım')
      // İkili karakterleri düzelt
      .replace(/ll/g, 'ıl')
      .replace(/nn/g, 'ın');

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

  // File'ı base64'e çeviren fonksiyon
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // data:image/jpeg;base64, kısmını çıkar
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Google Gemini ile OCR işlemi
  const processImageWithGemini = async (imageFile) => {
    try {
      setProgress(20);
      
      // API anahtarı kontrolü
      const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Google Gemini API anahtarı bulunamadı. Lütfen .env dosyasına VITE_GOOGLE_GEMINI_API_KEY ekleyin.');
      }

      setProgress(40);
      
      // Dosyayı base64'e çevir
      const base64Image = await fileToBase64(imageFile);
      
      setProgress(60);
      
      // Gemini AI'ı başlat
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Bu görüntüdeki metni en yüksek doğrulukla çıkar ve yazım hatalarını otomatik düzelt.
        
        YAZIМ HATASI DÜZELTMELERİ:
        - Türkçe karakterleri doğru kullan: (ç,ğ,ı,İ,ö,ş,ü)
        - Karışan harfleri düzelt: 1→ı, l→ı, I→İ, 0→o, c→ç, s→ş, u→ü, ae→a
        - Türkçe kelime doğruluğunu kontrol et
        - Yaygın yazım hatalarını düzelt: "gunun" → "günün", "icin" → "için", "simd" → "şimdi"
        
        KARAKTER DÜZELTMELERİ:
        - "bugun" → "bugün"
        - "yann" → "yarın" 
        - "geldi1" → "geldin"
        - "gitt1" → "gitti"
        - "1c1n" → "için"
        - "s1md1" → "şimdi"
        - "bölülae" → "bölüyor"
        - "béltyolae" → "bölüyor"
        - "ae" sonekleri → "a" veya uygun Türkçe ek
        - Garip karakter kombinasyonlarını mantıklı Türkçe kelimelerle değiştir
        
        TÜRKÇE KELIME KONTROLLÜ:
        - Anlamlı Türkçe kelimeler oluştur
        - Fiil çekimlerini doğru yap (-yor, -ar, -er, -ir)
        - Ses uyumunu kontrol et
        - Yanlış tanınan kelimeleri context'e göre düzelt
        
        DİKKAT EDİLECEKLER:
        - Kelime aralarındaki boşlukları koru
        - Noktalama işaretlerini düzgün yerleştir
        - Sadece görüntüdeki metni ver, açıklama ekleme
        - Anlamı koruyarak yazım hatalarını düzelt
        - Garip harfler veya semboller varsa en yakın Türkçe karşılığını kullan
        
        Sonuç olarak temiz, doğru yazılmış, anlamlı Türkçe metin ver.
      `;

      setProgress(80);

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: imageFile.type,
            data: base64Image
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      setProgress(100);
      
      return text.trim();
    } catch (error) {
      console.error('Gemini OCR hatası:', error);
      throw new Error(`Gemini OCR işleminde hata: ${error.message}`);
    }
  };

  // Tesseract ile OCR işlemi (mevcut)
  const processImageWithTesseract = async (imageFile) => {
    setProgress(10);
    
    const worker = await createWorker('tur+eng');
    
    setProgress(30);
    
    try {
      setProgress(60);
      const { data: { text } } = await worker.recognize(imageFile);
      setProgress(90);
      
      await worker.terminate();
      setProgress(100);
      
      return metniDuzelt(text);
    } catch (error) {
      await worker.terminate();
      throw error;
    }
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
    setBasariliMesaj('');

    try {
      let text = '';
      
      if (ocrMethod === 'gemini') {
        text = await processImageWithGemini(selectedImage);
      } else {
        text = await processImageWithTesseract(selectedImage);
      }

      setExtractedText(text);
      
      if (text.trim()) {
        const methodName = ocrMethod === 'gemini' ? 'Gemini AI (yazım hatası düzeltildi)' : 'Tesseract';
        setBasariliMesaj(`✅ Metin başarıyla ${methodName} ile çıkarıldı!`);
      }
    } catch (error) {
      console.error('OCR hatası:', error);
      setExtractedText(`❌ Hata: ${error.message}`);
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

                  {/* OCR Method Seçimi */}
                  <Card className="mb-4" style={{background: 'rgba(255, 255, 255, 0.9)', border: 'none'}}>
                    <Card.Body>
                      <h6 className="fw-bold mb-3 text-primary">🤖 OCR + Yazım Hatası Düzeltme Seçin</h6>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Check
                            type="radio"
                            id="gemini-radio"
                            name="ocrMethod"
                            label={
                              <div>
                                <strong>Google Gemini AI</strong>
                                {import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ? (
                                  <Badge bg="success" className="ms-2">Yazım Hatası Düzeltme</Badge>
                                ) : (
                                  <Badge bg="warning" className="ms-2">API Anahtarı Gerekli</Badge>
                                )}
                                <br />
                                <small className="text-muted">
                                  {import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ? 
                                    '🚀 AI yazım hatası düzeltme + akıllı OCR' : 
                                    '🔑 .env dosyasına API anahtarı ekleyin'
                                  }
                                </small>
                              </div>
                            }
                            checked={ocrMethod === 'gemini'}
                            onChange={() => setOcrMethod('gemini')}
                            disabled={!import.meta.env.VITE_GOOGLE_GEMINI_API_KEY}
                            className="p-3 border rounded"
                            style={{
                              background: ocrMethod === 'gemini' ? 'rgba(25, 135, 84, 0.1)' : 'transparent',
                              borderColor: ocrMethod === 'gemini' ? '#198754' : '#dee2e6',
                              opacity: !import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ? 0.6 : 1
                            }}
                          />
                        </Col>
                        <Col md={6}>
                          <Form.Check
                            type="radio"
                            id="tesseract-radio"
                            name="ocrMethod"
                            label={
                              <div>
                                <strong>Tesseract OCR</strong>
                                <Badge bg="primary" className="ms-2">Yerel & Hızlı</Badge>
                                <br />
                                <small className="text-muted">⚙️ İnternet gerektirmez, gizlilik odaklı</small>
                              </div>
                            }
                            checked={ocrMethod === 'tesseract'}
                            onChange={() => setOcrMethod('tesseract')}
                            className="p-3 border rounded"
                            style={{
                              background: ocrMethod === 'tesseract' ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                              borderColor: ocrMethod === 'tesseract' ? '#0d6efd' : '#dee2e6'
                            }}
                          />
                        </Col>
                      </Row>
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
                          {ocrMethod === 'gemini' ? 'Gemini AI' : 'Tesseract'} ile işleniyor... {progress}%
                        </div>
                      ) : (
                        `🔍 ${ocrMethod === 'gemini' ? 'Gemini AI' : 'Tesseract'} ile Metni Oku`
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
