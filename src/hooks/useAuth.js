import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const useAuth = () => {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kullaniciRolu, setKullaniciRolu] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseKullanici) => {
      if (firebaseKullanici) {
        try {
          // Kullanıcı belgesini Firestore'dan al
          const kullaniciDoc = await getDoc(doc(db, 'kullanicilar', firebaseKullanici.uid));
          const kullaniciVerisi = kullaniciDoc.exists() ? kullaniciDoc.data() : {};
          
          setKullanici({
            uid: firebaseKullanici.uid,
            email: firebaseKullanici.email,
            displayName: firebaseKullanici.displayName,
            ...kullaniciVerisi
          });
          
          setKullaniciRolu(kullaniciVerisi.rol || 'kullanici');
        } catch (error) {
          console.error('Kullanıcı verisi alınırken hata:', error);
          setKullanici({
            uid: firebaseKullanici.uid,
            email: firebaseKullanici.email,
            displayName: firebaseKullanici.displayName
          });
          setKullaniciRolu('kullanici');
        }
      } else {
        setKullanici(null);
        setKullaniciRolu(null);
      }
      setYukleniyor(false);
    });

    return () => unsubscribe();
  }, []);

  // Kullanıcı yetkilerini kontrol et
  const yetkiVarMi = (gerekliYetki) => {
    if (!kullanici || !kullaniciRolu) return false;
    
    const yetkiSeviyeleri = {
      'kullanici': 1,
      'yetkili': 2,
      'admin': 3
    };
    
    return yetkiSeviyeleri[kullaniciRolu] >= yetkiSeviyeleri[gerekliYetki];
  };

  // Çıkış yap fonksiyonu
  const cikisYap = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  return {
    kullanici,
    kullaniciRolu,
    yukleniyor,
    yetkiVarMi,
    cikisYap,
    oturumAcikMi: !!kullanici
  };
};
