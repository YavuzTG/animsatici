import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Spinner, InputGroup } from 'react-bootstrap';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../contexts/AuthContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import Loading from '../components/Loading';

const Animsaticilar = () => {
  const { kullanici } = useAuthContext();
  const {
    dinleniyor,
    metin,
    destekleniyor,
    hata: sesHatasi,
    mikrofonIzni,
    dinlemeBaslat,
    dinlemeDurdur,
    metniSifirla
  } = useSpeechRecognition();

  const [animsaticilar, setAnimsaticilar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yeniAnimsatici, setYeniAnimsatici] = useState('');
  const [hedefTarih, setHedefTarih] = useState(() => {
    // Şu anki tarih-saati datetime-local formatında hazırla
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [hata, setHata] = useState('');

  // Ses tanıma metnini otomatik olarak textarea'ya ekle
  useEffect(() => {
    if (metin && metin.trim().length > 0) {
      setYeniAnimsatici(prev => {
        // Eğer textarea boşsa direkt metni ekle
        if (!prev.trim()) {
          return metin;
        }
        // Eğer doluysa boşluk bırakıp ekle
        return prev + ' ' + metin;
      });
      
      // Metni temizle ki tekrar eklemesin
      setTimeout(() => {
        metniSifirla();
      }, 100);
    }
  }, [metin]);

  // Anımsatıcıları yükle
  const animsaticilariYukle = async () => {
    if (!kullanici) return;
    
    console.log('🔍 Anımsatıcılar yükleniyor, kullanıcı:', kullanici.uid);
    setHata('');
    
    try {
      const q = query(
        collection(db, 'animsaticilar'),
        where('kullaniciId', '==', kullanici.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const animsaticiListesi = [];
      
      querySnapshot.forEach((doc) => {
        animsaticiListesi.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Client-side sorting
      animsaticiListesi.sort((a, b) => {
        const dateA = a.olusturmaTarihi?.toDate?.() || new Date(0);
        const dateB = b.olusturmaTarihi?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      setAnimsaticilar(animsaticiListesi);
    } catch (error) {
      console.error('❌ Anımsatıcılar yüklenirken hata:', error);
      setHata('Anımsatıcılar yüklenirken bir hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    animsaticilariYukle();
  }, [kullanici]);

  // Yeni anımsatıcı ekle
  const animsaticiEkle = async (e) => {
    e.preventDefault();
    
    console.log('🔥 BUTON BASILDI!');
    console.log('📝 Metin:', yeniAnimsatici);
    console.log('👤 Kullanıcı:', kullanici);
    
    if (!yeniAnimsatici.trim()) {
      alert('❌ Lütfen bir metin yazın!');
      return;
    }

    if (!kullanici) {
      alert('❌ Kullanıcı oturum açmamış!');
      return;
    }

    setEkleniyor(true);
    setHata('');
    
    try {
      console.log('🚀 Firebase\'e kaydediliyor...');
      
      const docRef = await addDoc(collection(db, 'animsaticilar'), {
        icerik: yeniAnimsatici.trim(),
        kullaniciId: kullanici.uid,
        kullaniciEmail: kullanici.email,
        olusturmaTarihi: new Date(),
        hedefTarih: hedefTarih ? new Date(hedefTarih) : null,
        aktif: true
      });
      
      console.log('✅ Başarıyla eklendi! Doc ID:', docRef.id);
      alert('✅ Not başarıyla eklendi!');
      
      setYeniAnimsatici('');
      // Yeni anımsatıcı için şu anki tarih-saati ayarla
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setHedefTarih(`${year}-${month}-${day}T${hours}:${minutes}`);
      await animsaticilariYukle();
    } catch (error) {
      console.error('❌ HATA DETAYI:', error);
      console.error('❌ Hata kodu:', error.code);
      console.error('❌ Hata mesajı:', error.message);
      setHata(`Anımsatıcı eklenirken hata: ${error.message}`);
      alert(`❌ Hata: ${error.message}`);
    } finally {
      setEkleniyor(false);
    }
  };

  // Anımsatıcı sil
  const animsaticiSil = async (id) => {
    if (!window.confirm('Bu anımsatıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'animsaticilar', id));
      await animsaticilariYukle();
    } catch (error) {
      console.error('Anımsatıcı silinirken hata:', error);
      setHata('Anımsatıcı silinirken bir hata oluştu.');
    }
  };

  if (yukleniyor) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{minHeight: '60vh'}}>
        <Loading metin="Anımsatıcılar yükleniyor..." />
      </Container>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          
          {/* BAŞLIK VE YENİ NOT BUTONU */}
          <div className="card mb-4" style={{backgroundColor: 'white', border: '1px solid #ddd'}}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h1 className="h2 mb-0">📝 Anımsatıcılarım ({animsaticilar.length})</h1>
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    setYeniAnimsatici('');
                    // Şu anki tarih-saati yeniden ayarla
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    setHedefTarih(`${year}-${month}-${day}T${hours}:${minutes}`);
                    document.querySelector('textarea')?.focus();
                  }}
                  style={{fontSize: '16px', padding: '12px 24px'}}
                >
                  ➕ YENİ NOT EKLE
                </button>
              </div>
            </div>
          </div>

          {/* HATA MESAJI */}
          {hata && (
            <div className="alert alert-danger" role="alert">
              ❌ {hata}
            </div>
          )}

          {/* YENİ NOT EKLEME FORMU */}
          <div className="card mb-4" style={{backgroundColor: '#f8f9fa', border: '2px solid #007bff'}}>
            <div className="card-header" style={{backgroundColor: '#007bff', color: 'white'}}>
              <h3 className="mb-0">✨ Yeni Anımsatıcı Ekle</h3>
            </div>
            <div className="card-body">
              <form onSubmit={animsaticiEkle}>
                <div className="mb-3">
                  <label className="form-label fw-bold">📝 Not İçeriği</label>
                  <InputGroup>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={yeniAnimsatici}
                      onChange={(e) => setYeniAnimsatici(e.target.value)}
                      placeholder="Hatırlamak istediğiniz notu buraya yazın veya mikrofona tıklayıp söyleyin..."
                      style={{
                        fontSize: '16px',
                        border: '2px solid #007bff',
                        borderRadius: '8px 0 0 8px',
                        resize: 'vertical'
                      }}
                    />
                    <div className="d-flex flex-column">
                      <Button
                        variant={dinleniyor ? "danger" : "outline-primary"}
                        size="lg"
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          width: '60px',
                          height: '100%',
                          minHeight: '100px',
                          border: '2px solid #007bff',
                          borderRadius: '0 8px 8px 0',
                          borderLeft: 'none'
                        }}
                        onClick={dinleniyor ? dinlemeDurdur : dinlemeBaslat}
                        disabled={!destekleniyor || mikrofonIzni === false}
                        title={dinleniyor ? "Ses kaydını durdur" : "Sesli not ekle"}
                      >
                        {dinleniyor ? (
                          <span style={{fontSize: '1.5rem', animation: 'pulse 1s infinite'}}>🔴</span>
                        ) : (
                          <span style={{fontSize: '1.5rem'}}>🎤</span>
                        )}
                      </Button>
                      
                      {/* Ses tanıma durum göstergesi */}
                      {dinleniyor && (
                        <small className="text-success text-center mt-1" style={{fontSize: '10px'}}>
                          DİNLİYOR
                        </small>
                      )}
                      {sesHatasi && (
                        <small className="text-danger text-center mt-1" style={{fontSize: '10px'}}>
                          HATA
                        </small>
                      )}
                    </div>
                  </InputGroup>
                  
                  {/* Mikrofon durumu bilgilendirme */}
                  {!destekleniyor && (
                    <small className="text-warning d-block mt-2">
                      ⚠️ Tarayıcınız ses tanıma özelliğini desteklemiyor
                    </small>
                  )}
                  {mikrofonIzni === false && (
                    <small className="text-danger d-block mt-2">
                      ❌ Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verin.
                    </small>
                  )}
                  {dinleniyor && (
                    <small className="text-info d-block mt-2">
                      🎤 <strong>Dinliyorum...</strong> Konuşun, sözleriniz otomatik olarak yukarıya eklenecek. 
                      <br />
                      <em>Cümle tamamlandıktan 3 saniye sonra mikrofon kapanır.</em>
                    </small>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold">📅 Hedef Tarih (İsteğe Bağlı)</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={hedefTarih}
                    onChange={(e) => setHedefTarih(e.target.value)}
                    style={{
                      fontSize: '16px',
                      border: '2px solid #007bff',
                      borderRadius: '8px'
                    }}
                  />
                  <small className="text-muted">
                    💡 Bu anımsatıcıyı hangi tarihe kadar tamamlamak istiyorsunuz?
                  </small>
                </div>
                
                <div className="d-flex gap-3 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-warning btn-lg"
                    onClick={() => {
                      console.log('🧪 TEST BUTONU BASILDI!');
                      console.log('👤 Kullanıcı var mı?', !!kullanici);
                      console.log('📝 Metin var mı?', yeniAnimsatici);
                      alert('🧪 Test butonu çalışıyor!');
                    }}
                  >
                    🧪 TEST
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    onClick={() => {
                      setYeniAnimsatici('');
                      // Şu anki tarih-saati yeniden ayarla
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      setHedefTarih(`${year}-${month}-${day}T${hours}:${minutes}`);
                    }}
                    disabled={!yeniAnimsatici.trim() && !hedefTarih}
                  >
                    🗑️ TEMİZLE
                  </button>
                  
                  <button
                    type="submit"
                    className="btn btn-success btn-lg"
                    disabled={ekleniyor || !yeniAnimsatici.trim()}
                    onClick={() => console.log('🔥 KAYDET BUTONU BASILDI!')}
                    style={{
                      minWidth: '200px',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    {ekleniyor ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        EKLENİYOR...
                      </span>
                    ) : (
                      '➕ KAYDET'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* NOTLAR LİSTESİ */}
          {animsaticilar.length === 0 ? (
            <div className="card text-center py-5">
              <div className="card-body">
                <div style={{fontSize: '4rem'}} className="mb-3">📝</div>
                <h3>Henüz hiç notunuz yok</h3>
                <p className="text-muted">Yukarıdaki formdan ilk notunuzu ekleyin!</p>
              </div>
            </div>
          ) : (
            <div className="row">
              {animsaticilar.map((animsatici, index) => (
                <div className="col-12 mb-3" key={animsatici.id}>
                  <div className="card" style={{backgroundColor: 'white', border: '1px solid #ddd'}}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <p className="card-text lead mb-3" style={{whiteSpace: 'pre-wrap'}}>
                            {animsatici.icerik}
                          </p>
                          <div className="d-flex flex-wrap gap-3 align-items-center">
                            <small className="text-muted">
                              �️ Oluşturulma: {animsatici.olusturmaTarihi?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih yok'}
                            </small>
                            {animsatici.hedefTarih && (
                              <small 
                                className={`badge ${
                                  new Date(animsatici.hedefTarih.toDate()) < new Date() 
                                    ? 'bg-danger' 
                                    : new Date(animsatici.hedefTarih.toDate()) <= new Date(Date.now() + 7*24*60*60*1000)
                                    ? 'bg-warning text-dark'
                                    : 'bg-success'
                                } px-3 py-2`}
                                style={{fontSize: '0.9rem'}}
                              >
                                ⏰ Hedef: {animsatici.hedefTarih?.toDate?.()?.toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-outline-danger btn-sm ms-3"
                          onClick={() => animsaticiSil(animsatici.id)}
                        >
                          🗑️ SİL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default Animsaticilar;
