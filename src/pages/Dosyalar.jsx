import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy, 
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase/config'; // storage aktif edildi
import { useAuthContext } from '../contexts/AuthContext';
import Loading from '../components/Loading';

const Dosyalar = () => {
  const { kullanici, yetkiVarMi } = useAuthContext();
  const [dosyalar, setDosyalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [dosyaYukleniyor, setDosyaYukleniyor] = useState(false);
  const [yuklemeDurumu, setYuklemeDurumu] = useState(0);
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [indirmeOnayiIstenen, setIndirmeOnayiIstenen] = useState(null);
  const [indirmeIstekleri, setIndirmeIstekleri] = useState([]);
  const [istekleriGoster, setIstekleriGoster] = useState(false);
  const [kullaniciIstekleri, setKullaniciIstekleri] = useState([]);
  const [onayliIstekleriGoster, setOnayliIstekleriGoster] = useState(false);

  // Giriş yapmamış kullanıcıları engelle
  if (!kullanici) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-400 text-6xl mb-4">🚫</div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Giriş Gerekli</h3>
          <p className="text-red-700">
            Bu bölüme erişmek için giriş yapmanız gerekiyor.
          </p>
        </div>
      </div>
    );
  }

  // Dosyaları yükle
  const dosyalariYukle = async () => {
    try {
      const q = query(
        collection(db, 'dosyalar'),
        orderBy('olusturmaTarihi', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const dosyaListesi = [];
      
      querySnapshot.forEach((doc) => {
        dosyaListesi.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setDosyalar(dosyaListesi);
    } catch (error) {
      console.error('Dosyalar yüklenirken hata:', error);
    } finally {
      setYukleniyor(false);
    }
  };

  // İndirme isteklerini yükle (sadece admin için)
  const indirmeIstekleriniYukle = async () => {
    if (!yetkiVarMi('admin')) return;
    
    try {
      // Basit query kullan, client-side'da sırala
      const querySnapshot = await getDocs(collection(db, 'indirmeIstekleri'));
      const istekListesi = [];
      
      querySnapshot.forEach((doc) => {
        istekListesi.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Client-side'da tarihe göre sırala
      istekListesi.sort((a, b) => {
        const dateA = a.olusturmaTarihi?.toDate?.() || new Date(0);
        const dateB = b.olusturmaTarihi?.toDate?.() || new Date(0);
        return dateB - dateA; // desc sıralama
      });
      
      setIndirmeIstekleri(istekListesi);
      console.log('Admin istekleri yüklendi:', istekListesi.length);
    } catch (error) {
      console.error('İndirme istekleri yüklenirken hata:', error);
    }
  };

  // Kullanıcının kendi isteklerini yükle
  const kullaniciIstekleriniYukle = async () => {
    if (!kullanici || yetkiVarMi('admin')) return;
    
    try {
      // Önce where ile filtrele, sonra client-side'da sırala
      const q = query(
        collection(db, 'indirmeIstekleri'),
        where('isteyenId', '==', kullanici.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const istekListesi = [];
      
      querySnapshot.forEach((doc) => {
        istekListesi.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Client-side'da tarihe göre sırala
      istekListesi.sort((a, b) => {
        const dateA = a.olusturmaTarihi?.toDate?.() || new Date(0);
        const dateB = b.olusturmaTarihi?.toDate?.() || new Date(0);
        return dateB - dateA; // desc sıralama
      });
      
      setKullaniciIstekleri(istekListesi);
      console.log('Kullanıcı istekleri yüklendi:', istekListesi.length);
    } catch (error) {
      console.error('Kullanıcı istekleri yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    dosyalariYukle();
    if (yetkiVarMi('admin')) {
      indirmeIstekleriniYukle();
    } else {
      kullaniciIstekleriniYukle();
    }
  }, [yetkiVarMi, kullanici]);

  // Dosya yükle (Firestore'da Base64 olarak sakla)
  const dosyaYukle = async (e) => {
    e.preventDefault();
    if (!selectedFile || !baslik.trim() || !kullanici) return;

    // 5MB'den büyük dosyaları engelle
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
      return;
    }

    setDosyaYukleniyor(true);
    setYuklemeDurumu(0);

    try {
      // Dosyayı Base64'e çevir
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        
        setYuklemeDurumu(50); // Progress göster
        
        // Firestore'a dosya bilgilerini kaydet
        await addDoc(collection(db, 'dosyalar'), {
          baslik: baslik.trim(),
          aciklama: aciklama.trim(),
          dosyaAdi: selectedFile.name,
          dosyaBoyutu: selectedFile.size,
          dosyaTipi: selectedFile.type,
          base64Data: base64Data, // Base64 formatında dosya içeriği
          yukleyenId: kullanici.uid,
          yukleyenEmail: kullanici.email,
          olusturmaTarihi: new Date()
        });
        
        setYuklemeDurumu(100);
        
        // Formu temizle
        setBaslik('');
        setAciklama('');
        setSelectedFile(null);
        document.getElementById('dosya-input').value = '';
        
        // Dosyaları yeniden yükle
        await dosyalariYukle();
      };
      
      reader.readAsDataURL(selectedFile);
      
    } catch (error) {
      console.error('Dosya yüklenirken hata:', error);
      alert('Dosya yüklenirken hata oluştu: ' + error.message);
    } finally {
      setDosyaYukleniyor(false);
      setYuklemeDurumu(0);
    }
  };

  // Admin onaylı dosya indirme
  const dosyaIndir = async (dosya) => {
    // Admin ise direkt indirebilir
    if (yetkiVarMi('admin')) {
      try {
        const link = document.createElement('a');
        
        // Base64 verisinin doğru formatında olduğundan emin ol
        if (dosya.base64Data) {
          link.href = dosya.base64Data;
        } else if (dosya.downloadURL) {
          link.href = dosya.downloadURL;
        } else {
          alert('Dosya verisi bulunamadı.');
          return;
        }
        
        link.download = dosya.dosyaAdi;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Admin dosya indirme başlatıldı:', dosya.dosyaAdi);
        
      } catch (error) {
        console.error('Admin dosya indirme hatası:', error);
        alert('Dosya indirilemedi. Lütfen tekrar deneyin.');
      }
      return;
    }

    // Normal kullanıcı için onay iste
    setIndirmeOnayiIstenen(dosya);
  };

  // İndirme onayı verme
  const indirmeOnayiVer = async () => {
    if (!indirmeOnayiIstenen) return;

    try {
      // İndirme isteği kaydını Firestore'a kaydet
      await addDoc(collection(db, 'indirmeIstekleri'), {
        dosyaId: indirmeOnayiIstenen.id,
        dosyaAdi: indirmeOnayiIstenen.dosyaAdi,
        dosyaBaslik: indirmeOnayiIstenen.baslik,
        isteyenId: kullanici.uid,
        isteyenEmail: kullanici.email,
        durum: 'beklemede', // beklemede, onaylandi, reddedildi
        olusturmaTarihi: new Date()
      });

      console.log('İndirme isteği oluşturuldu:', indirmeOnayiIstenen.baslik);

      alert('İndirme isteğiniz admin onayına gönderildi. Onaylandıktan sonra dosyayı indirebileceksiniz.');
      setIndirmeOnayiIstenen(null);
      
      // Kullanıcı isteklerini hemen yenile
      await kullaniciIstekleriniYukle();
      
    } catch (error) {
      console.error('İndirme isteği gönderilirken hata:', error);
      alert('İstek gönderilirken bir hata oluştu.');
    }
  };

  // Admin tarafından isteği onaylama
  const istekOnayla = async (istekId, dosyaId) => {
    try {
      await updateDoc(doc(db, 'indirmeIstekleri', istekId), {
        durum: 'onaylandi',
        onayTarihi: new Date()
      });

      console.log('İstek onaylandı:', istekId);
      alert('İndirme isteği onaylandı!');
      
      // İstekleri yenile
      await indirmeIstekleriniYukle();
      
    } catch (error) {
      console.error('İstek onaylanırken hata:', error);
      alert('İstek onaylanırken bir hata oluştu.');
    }
  };

  // Admin tarafından isteği reddetme
  const istekReddet = async (istekId) => {
    try {
      await updateDoc(doc(db, 'indirmeIstekleri', istekId), {
        durum: 'reddedildi',
        redTarihi: new Date()
      });

      alert('İndirme isteği reddedildi.');
      await indirmeIstekleriniYukle(); // İstekleri yenile
    } catch (error) {
      console.error('İstek reddedilirken hata:', error);
      alert('İstek reddedilirken bir hata oluştu.');
    }
  };

  // Onaylanmış dosyayı indir
  const onaylanmisDosyaIndir = async (istekId) => {
    try {
      // İstek bilgilerini al
      const istek = kullaniciIstekleri.find(i => i.id === istekId);
      if (!istek) {
        alert('İstek bulunamadı.');
        return;
      }

      // Dosya bilgilerini al
      const dosya = dosyalar.find(d => d.id === istek.dosyaId);
      if (!dosya) {
        alert('Dosya bulunamadı. Dosya silinmiş olabilir.');
        return;
      }

      // Dosyayı indir
      try {
        const link = document.createElement('a');
        
        // Base64 verisinin doğru formatında olduğundan emin ol
        if (dosya.base64Data) {
          link.href = dosya.base64Data;
        } else if (dosya.downloadURL) {
          link.href = dosya.downloadURL;
        } else {
          alert('Dosya verisi bulunamadı.');
          return;
        }
        
        link.download = dosya.dosyaAdi;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Dosya indirme başlatıldı:', dosya.dosyaAdi);
        
        // İndirme başarılı olduğuna dair feedback
        alert('Dosya indiriliyor... İndirme işlemi başlatıldı.');
        
      } catch (indirmeHatasi) {
        console.error('Dosya indirme hatası:', indirmeHatasi);
        alert('Dosya indirilemedi. Lütfen tekrar deneyin.');
        return;
      }

      // İsteği "indirildi" olarak işaretle
      await updateDoc(doc(db, 'indirmeIstekleri', istekId), {
        durum: 'indirildi',
        indirmeTarihi: new Date()
      });

      console.log('İstek durumu güncellendi: indirildi');

      // Kullanıcı isteklerini yenile
      await kullaniciIstekleriniYukle();
      
    } catch (error) {
      console.error('Dosya indirirken hata:', error);
      alert('Dosya indirirken bir hata oluştu: ' + error.message);
    }
  };
  const dosyaSil = async (dosya) => {
    if (!yetkiVarMi('admin')) {
      alert('Sadece admin kullanıcıları dosya silebilir.');
      return;
    }

    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      // Firestore'dan kaydı sil (Base64 data ile birlikte silinecek)
      await deleteDoc(doc(db, 'dosyalar', dosya.id));
      
      // Dosyaları yeniden yükle
      await dosyalariYukle();
    } catch (error) {
      console.error('Dosya silinirken hata:', error);
      alert('Dosya silinirken bir hata oluştu.');
    }
  };

  // Dosya boyutunu formatla
  const formatDosyaBoyutu = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (yukleniyor) {
    return <Loading metin="Dosyalar yükleniyor..." />;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          📁 {yetkiVarMi('admin') ? 'Dosya Yönetimi' : 'Dosya İndirme'}
        </h2>
        
        {/* Admin için bilgi */}
        {yetkiVarMi('admin') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-blue-400 text-2xl mr-3">⚡</div>
              <div>
                <h4 className="text-blue-900 font-medium">Admin Yetkileriniz</h4>
                <p className="text-blue-700 text-sm">
                  Dosya yükleme, silme ve tüm indirme yetkileriniz bulunmaktadır.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin için indirme istekleri */}
        {yetkiVarMi('admin') && indirmeIstekleri.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="text-orange-400 text-2xl mr-3">📋</div>
                <div>
                  <h4 className="text-orange-900 font-medium">
                    İndirme İstekleri ({indirmeIstekleri.filter(istek => istek.durum === 'beklemede').length} beklemede)
                  </h4>
                  <p className="text-orange-700 text-sm">
                    Kullanıcılardan gelen indirme isteklerini yönetin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIstekleriGoster(!istekleriGoster)}
                className="px-3 py-1 bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200 text-sm"
              >
                {istekleriGoster ? 'Gizle' : 'Göster'}
              </button>
            </div>

            {istekleriGoster && (
              <div className="mt-4 space-y-3">
                {indirmeIstekleri
                  .filter(istek => istek.durum === 'beklemede')
                  .map((istek) => (
                  <div key={istek.id} className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{istek.dosyaBaslik}</div>
                        <div className="text-sm text-gray-600">{istek.dosyaAdi}</div>
                        <div className="text-xs text-gray-500">
                          İsteyen: {istek.isteyenEmail} • {istek.olusturmaTarihi?.toDate?.()?.toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => istekOnayla(istek.id, istek.dosyaId)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          title="Onayla"
                        >
                          ✅ Onayla
                        </button>
                        <button
                          onClick={() => istekReddet(istek.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          title="Reddet"
                        >
                          ❌ Reddet
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {indirmeIstekleri.filter(istek => istek.durum === 'beklemede').length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Bekleyen indirme isteği bulunmuyor.
                  </div>
                )}

                {/* İşlem görmüş istekler */}
                {indirmeIstekleri.filter(istek => istek.durum !== 'beklemede').length > 0 && (
                  <div className="mt-6 pt-4 border-t border-orange-200">
                    <h5 className="font-medium text-gray-900 mb-3">İşlem Görmüş İstekler</h5>
                    <div className="space-y-2">
                      {indirmeIstekleri
                        .filter(istek => istek.durum !== 'beklemede')
                        .slice(0, 5) // Son 5 işlemi göster
                        .map((istek) => (
                        <div key={istek.id} className="bg-gray-50 rounded p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{istek.dosyaBaslik}</span>
                              <span className="text-gray-500 ml-2">• {istek.isteyenEmail}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              istek.durum === 'onaylandi' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {istek.durum === 'onaylandi' ? '✅ Onaylandı' : '❌ Reddedildi'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Normal kullanıcı için bilgi */}
        {!yetkiVarMi('admin') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-yellow-400 text-2xl mr-3">ℹ️</div>
              <div>
                <h4 className="text-yellow-900 font-medium">Kullanıcı Yetkileri</h4>
                <p className="text-yellow-700 text-sm">
                  Dosyaları görüntüleyebilir ve admin onayı ile indirebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Normal kullanıcı için onaylanmış istekler */}
        {!yetkiVarMi('admin') && kullaniciIstekleri.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="text-green-400 text-2xl mr-3">📋</div>
                <div>
                  <h4 className="text-green-900 font-medium">
                    İndirme İstekleriniz ({kullaniciIstekleri.filter(istek => istek.durum === 'onaylandi').length} indirilebilir)
                  </h4>
                  <p className="text-green-700 text-sm">
                    Onaylanmış dosyaları buradan indirebilirsiniz.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOnayliIstekleriGoster(!onayliIstekleriGoster)}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm"
              >
                {onayliIstekleriGoster ? 'Gizle' : 'Göster'}
              </button>
            </div>

            {onayliIstekleriGoster && (
              <div className="mt-4 space-y-3">
                {/* Onaylanmış istekler */}
                {kullaniciIstekleri
                  .filter(istek => istek.durum === 'onaylandi')
                  .map((istek) => (
                  <div key={istek.id} className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{istek.dosyaBaslik}</div>
                        <div className="text-sm text-gray-600">{istek.dosyaAdi}</div>
                        <div className="text-xs text-gray-500">
                          Onaylandı: {istek.onayTarihi?.toDate?.()?.toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <button
                        onClick={() => onaylanmisDosyaIndir(istek.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 ml-4"
                      >
                        📥 İndir
                      </button>
                    </div>
                  </div>
                ))}

                {kullaniciIstekleri.filter(istek => istek.durum === 'onaylandi').length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Henüz onaylanmış dosya bulunmuyor.
                  </div>
                )}

                {/* Diğer istekler */}
                <div className="mt-6 pt-4 border-t border-green-200">
                  <h5 className="font-medium text-gray-900 mb-3">İstek Durumları</h5>
                  <div className="space-y-2">
                    {kullaniciIstekleri
                      .filter(istek => istek.durum !== 'onaylandi')
                      .slice(0, 5)
                      .map((istek) => (
                      <div key={istek.id} className="bg-gray-50 rounded p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{istek.dosyaBaslik}</span>
                            <span className="text-gray-500 ml-2">• {istek.olusturmaTarihi?.toDate?.()?.toLocaleDateString('tr-TR')}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            istek.durum === 'beklemede' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : istek.durum === 'reddedildi'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {istek.durum === 'beklemede' && '⏳ Beklemede'}
                            {istek.durum === 'reddedildi' && '❌ Reddedildi'}
                            {istek.durum === 'indirildi' && '✅ İndirildi'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Dosya yükleme formu - sadece admin için */}
        {yetkiVarMi('admin') && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📤 Yeni Dosya Yükle</h3>
            
            <form onSubmit={dosyaYukle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Başlık *
                  </label>
                  <input
                    type="text"
                    value={baslik}
                    onChange={(e) => setBaslik(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Dosya başlığı"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosya *
                  </label>
                  <input
                    id="dosya-input"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={aciklama}
                  onChange={(e) => setAciklama(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Dosya açıklaması (opsiyonel)"
                />
              </div>
              
              <button
                type="submit"
                disabled={dosyaYukleniyor || !selectedFile || !baslik.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dosyaYukleniyor ? (
                  <div className="flex items-center">
                    <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Yükleniyor... {yuklemeDurumu}%
                  </div>
                ) : (
                  '📤 Dosyayı Yükle'
                )}
              </button>
              
              {dosyaYukleniyor && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${yuklemeDurumu}%` }}
                  ></div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Dosya listesi */}
        {dosyalar.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz dosya yok</h3>
            <p className="text-gray-500">
              {yetkiVarMi('admin') ? 'İlk dosyayı yükleyerek başlayın!' : 'Henüz yüklenmiş dosya bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dosyalar.map((dosya) => (
              <div
                key={dosya.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{dosya.baslik}</h4>
                    <p className="text-sm text-gray-600">{dosya.dosyaAdi}</p>
                  </div>
                  
                  {yetkiVarMi('admin') && (
                    <button
                      onClick={() => dosyaSil(dosya)}
                      className="text-red-500 hover:text-red-700 focus:outline-none ml-2"
                      title="Sil"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                
                {dosya.aciklama && (
                  <p className="text-sm text-gray-600 mb-3">{dosya.aciklama}</p>
                )}
                
                <div className="text-xs text-gray-500 mb-3 space-y-1">
                  <div>Boyut: {formatDosyaBoyutu(dosya.dosyaBoyutu)}</div>
                  <div>Türü: {dosya.dosyaTipi}</div>
                  <div>
                    Yükleyen: {dosya.yukleyenEmail}
                  </div>
                  <div>
                    Tarih: {dosya.olusturmaTarihi?.toDate?.()?.toLocaleDateString('tr-TR') || 'Tarih bilgisi yok'}
                  </div>
                </div>
                
                <button
                  onClick={() => dosyaIndir(dosya)}
                  className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  {yetkiVarMi('admin') ? '📥 İndir' : '🔐 İndirme İsteği'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* İndirme Onay Modal'ı */}
      {indirmeOnayiIstenen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-3xl mr-3">🔐</div>
                <h3 className="text-lg font-medium text-gray-900">İndirme Onayı Gerekli</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                <strong>{indirmeOnayiIstenen.baslik}</strong> dosyasını indirmek için admin onayı gerekiyor.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-600">
                  <p><strong>Dosya:</strong> {indirmeOnayiIstenen.dosyaAdi}</p>
                  <p><strong>Boyut:</strong> {formatDosyaBoyutu(indirmeOnayiIstenen.dosyaBoyutu)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                İsteğiniz admin onayına gönderilecek. Onaylandıktan sonra size bildirim yapılacaktır.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setIndirmeOnayiIstenen(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={indirmeOnayiVer}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Onay İste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dosyalar;
