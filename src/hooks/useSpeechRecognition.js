import { useState, useRef, useEffect } from 'react';

export const useSpeechRecognition = () => {
  const [dinleniyor, setDinleniyor] = useState(false);
  const [metin, setMetin] = useState('');
  const [destekleniyor, setDestekleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [mikrofonIzni, setMikrofonIzni] = useState(null);
  const [izinKontrolEdildi, setIzinKontrolEdildi] = useState(false);
  
  const recognition = useRef(null);
  const timeoutRef = useRef(null);
  const sessizlikTimerRef = useRef(null);
  const kapanmaTimerRef = useRef(null);

  useEffect(() => {
    // Mikrofon izni kontrolü - sadece bir kez
    const mikrofonIzniKontrol = async () => {
      if (izinKontrolEdildi) return;
      
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Stream'i kapat
          setMikrofonIzni(true);
          setIzinKontrolEdildi(true);
          console.log('✅ Mikrofon izni verildi');
        }
      } catch (error) {
        console.error('❌ Mikrofon izni hatası:', error);
        setMikrofonIzni(false);
        setIzinKontrolEdildi(true);
        setHata('Mikrofon iznine ihtiyaç var. Lütfen tarayıcı ayarlarından mikrofon erişimini etkinleştirin.');
      }
    };

    // Tarayıcı desteğini kontrol et
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setDestekleniyor(true);
      console.log('✅ Ses tanıma destekleniyor');
      
      // Mikrofon iznini kontrol et
      mikrofonIzniKontrol();
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      
      // Ayarları yapılandır
      recognition.current.continuous = true; // Sürekli dinleme modu - cümleler arası kapanmaz
      recognition.current.interimResults = true; // Ara sonuçları da al 
      recognition.current.lang = 'tr-TR'; // Türkçe
      recognition.current.maxAlternatives = 1;
      
      // Olay dinleyicileri
      recognition.current.onstart = () => {
        console.log('🎤 Dinleme başladı - onstart event');
        setDinleniyor(true);
        setHata(null);
        
        // CSS fix - body'ye class ekle
        document.body.classList.add('speech-recognition-active');
        
        // 30 saniye timeout - uzun konuşmalar için
        timeoutRef.current = setTimeout(() => {
          console.log('⏰ 30 saniye timeout - dinleme durduruluyor');
          if (recognition.current && dinleniyor) {
            recognition.current.stop();
            setHata('Uzun süre sessizlik - tekrar başlatabilirsiniz');
          }
        }, 30000);
      };
      
      recognition.current.onerror = (event) => {
        console.error('❌ Ses tanıma hatası:', event.error);
        
        let hataMesaji = '';
        switch(event.error) {
          case 'no-speech':
            hataMesaji = 'Ses algılanamadı, lütfen tekrar konuşun';
            break;
          case 'audio-capture':
            hataMesaji = 'Mikrofon sorunu - mikrofon bağlı mı?';
            break;
          case 'not-allowed':
            hataMesaji = 'Mikrofon izni verilmedi - tarayıcı ayarlarını kontrol edin';
            setMikrofonIzni(false);
            break;
          case 'network':
            hataMesaji = 'İnternet bağlantısı sorunu';
            break;
          default:
            hataMesaji = `Ses tanıma hatası: ${event.error}`;
        }
        
        setHata(hataMesaji);
        setDinleniyor(false);
        
        // CSS fix - hata durumunda body'den class'ı kaldır
        document.body.classList.remove('speech-recognition-active');
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (sessizlikTimerRef.current) {
          clearTimeout(sessizlikTimerRef.current);
        }
        if (kapanmaTimerRef.current) {
          clearTimeout(kapanmaTimerRef.current);
        }
      };
      
      recognition.current.onend = () => {
        console.log('🔚 Dinleme sona erdi');
        console.log('📊 Mevcut dinleniyor state:', dinleniyor);
        
        // Eğer hala dinleme modundaysak (manuel kapatılmadıysa)
        if (dinleniyor) {
          console.log('⏳ 5 saniye bekleyip tekrar başlatacak...');
          
          // 5 saniye bekle, sonra tekrar başlat
          sessizlikTimerRef.current = setTimeout(() => {
            if (dinleniyor && recognition.current) {
              try {
                console.log('🔄 Mikrofon tekrar başlatılıyor...');
                recognition.current.start();
              } catch (error) {
                console.error('❌ Tekrar başlatma hatası:', error);
                setDinleniyor(false);
                document.body.classList.remove('speech-recognition-active');
              }
            }
          }, 5000);
          
          // 15 saniye sonra tamamen kapat
          kapanmaTimerRef.current = setTimeout(() => {
            if (dinleniyor) {
              console.log('🔇 15 saniye sessizlik - mikrofon kapanıyor');
              setDinleniyor(false);
              document.body.classList.remove('speech-recognition-active');
              
              if (sessizlikTimerRef.current) {
                clearTimeout(sessizlikTimerRef.current);
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
            }
          }, 15000);
          
        } else {
          // Manuel durdurulduysa
          document.body.classList.remove('speech-recognition-active');
          
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          if (sessizlikTimerRef.current) {
            clearTimeout(sessizlikTimerRef.current);
          }
          if (kapanmaTimerRef.current) {
            clearTimeout(kapanmaTimerRef.current);
          }
        }
      };
      
      recognition.current.onresult = (event) => {
        console.log('📝 Ses tanıma sonucu:', event);
        
        // Yeni ses algılandı - tüm kapanma timer'larını iptal et
        if (sessizlikTimerRef.current) {
          clearTimeout(sessizlikTimerRef.current);
          console.log('🔄 Yeni ses - yeniden başlatma timer iptal edildi');
        }
        if (kapanmaTimerRef.current) {
          clearTimeout(kapanmaTimerRef.current);
          console.log('🔄 Yeni ses - kapanma timer iptal edildi');
        }
        
        if (event.results && event.results.length > 0) {
          const sonSonuc = event.results[event.results.length - 1];
          
          if (sonSonuc.isFinal) {
            const taninanMetin = sonSonuc[0].transcript.trim();
            console.log('✅ Final metin:', taninanMetin);
            setMetin(taninanMetin);
          } else {
            console.log('⏳ İnterim sonuç algılandı');
          }
        }
      };
    } else {
      console.error('❌ Ses tanıma desteklenmiyor');
      setDestekleniyor(false);
      setHata('Tarayıcınız ses tanımayı desteklemiyor. Chrome, Edge veya Safari kullanın.');
    }
    
    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (sessizlikTimerRef.current) {
        clearTimeout(sessizlikTimerRef.current);
      }
      if (kapanmaTimerRef.current) {
        clearTimeout(kapanmaTimerRef.current);
      }
    };
  }, [izinKontrolEdildi]); // Dependency olarak izinKontrolEdildi ekledik

  const dinlemeBaslat = async () => {
    if (!destekleniyor) {
      setHata('Tarayıcınız ses tanımayı desteklemiyor');
      return;
    }
    
    if (mikrofonIzni === false) {
      setHata('Mikrofon iznine ihtiyaç var');
      return;
    }
    
    // Eğer zaten dinleniyorsa, dur
    if (dinleniyor && recognition.current) {
      recognition.current.stop();
      return;
    }
    
    // Hemen başlat - gecikme yok
    console.log('🚀 Dinleme hemen başlatılıyor...');
    setMetin('');
    setHata(null);
    
    try {
      // Eğer recognition meşgulse bekle
      if (recognition.current && recognition.current.readyState !== undefined) {
        recognition.current.stop();
      }
      
      // Hemen başlat
      if (recognition.current) {
        setDinleniyor(true); // UI için hemen true yap
        recognition.current.start();
        console.log('🎤 SpeechRecognition.start() çağrıldı');
      }
      
    } catch (error) {
      console.error('❌ Dinleme başlatma hatası:', error);
      setHata('Dinleme başlatılamadı: ' + error.message);
      setDinleniyor(false);
    }
  };

  const dinlemeDurdur = () => {
    console.log('🛑 Dinleme durduruluyor - Mevcut durum:', dinleniyor);
    
    if (recognition.current) {
      recognition.current.stop();
    }
    
    // Force state update
    setDinleniyor(false);
    
    // CSS fix - manuel durdurma durumunda body'den class'ı kaldır
    document.body.classList.remove('speech-recognition-active');
    
    // Tüm timer'ları temizle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (sessizlikTimerRef.current) {
      clearTimeout(sessizlikTimerRef.current);
    }
  };

  const metniSifirla = () => {
    console.log('🔄 Metin sıfırlandı');
    setMetin('');
    setHata(null);
  };

  return {
    dinleniyor,
    metin,
    destekleniyor,
    hata,
    mikrofonIzni,
    dinlemeBaslat,
    dinlemeDurdur,
    metniSifirla
  };
};
