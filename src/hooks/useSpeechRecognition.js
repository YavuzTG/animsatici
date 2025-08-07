import { useState, useRef, useEffect } from 'react';

export const useSpeechRecognition = () => {
  const [dinleniyor, setDinleniyor] = useState(false);
  const [metin, setMetin] = useState('');
  const [destekleniyor, setDestekleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [mikrofonIzni, setMikrofonIzni] = useState(null);
  
  const recognition = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Mikrofon izni kontrolü
    const mikrofonIzniKontrol = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Stream'i kapat
          setMikrofonIzni(true);
          console.log('✅ Mikrofon izni verildi');
        }
      } catch (error) {
        console.error('❌ Mikrofon izni hatası:', error);
        setMikrofonIzni(false);
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
      recognition.current.continuous = false; // Her seferinde tek cümle
      recognition.current.interimResults = false; // Sadece final sonuçlar
      recognition.current.lang = 'tr-TR'; // Türkçe
      recognition.current.maxAlternatives = 1;
      
      // Olay dinleyicileri
      recognition.current.onstart = () => {
        console.log('🎤 Dinleme başladı - onstart event');
        console.log('📊 Dinleme başlamadan önce state:', dinleniyor);
        setDinleniyor(true);
        console.log('✅ onstart - Dinleniyor state TRUE yapıldı');
        
        // Double check - 200ms sonra tekrar kontrol et
        setTimeout(() => {
          setDinleniyor(true);
          console.log('🔄 onstart - 200ms sonra state tekrar TRUE yapıldı');
        }, 200);
        
        setHata(null);
        
        // 10 saniye timeout
        timeoutRef.current = setTimeout(() => {
          console.log('⏰ Dinleme timeout');
          if (recognition.current && dinleniyor) {
            recognition.current.stop();
            setHata('Zaman aşımı - tekrar deneyin');
          }
        }, 10000);
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
            break;
          case 'network':
            hataMesaji = 'İnternet bağlantısı sorunu';
            break;
          default:
            hataMesaji = `Ses tanıma hatası: ${event.error}`;
        }
        
        setHata(hataMesaji);
        setDinleniyor(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
      
      recognition.current.onend = () => {
        console.log('🔚 Dinleme sona erdi - State güncelleniyor');
        console.log('📊 Mevcut dinleniyor state:', dinleniyor);
        
        // Force state update
        setDinleniyor(false);
        console.log('✅ Dinleniyor state FALSE yapıldı');
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
      
      recognition.current.onresult = (event) => {
        console.log('📝 Ses tanıma sonucu:', event);
        
        if (event.results && event.results.length > 0) {
          const sonSonuc = event.results[event.results.length - 1];
          if (sonSonuc.isFinal) {
            const taninanMetin = sonSonuc[0].transcript.trim();
            console.log('✅ Final metin:', taninanMetin);
            setMetin(taninanMetin);
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
    };
  }, []);

  const dinlemeBaslat = async () => {
    if (!destekleniyor) {
      setHata('Tarayıcınız ses tanımayı desteklemiyor');
      return;
    }
    
    if (mikrofonIzni === false) {
      setHata('Mikrofon iznine ihtiyaç var');
      return;
    }
    
    // Her zaman fresh start - state kontrolü yapmadan zorla başlat
    console.log('🔄 Fresh start - mevcut dinleniyor state:', dinleniyor);
    
    // Önce temizle
    if (recognition.current) {
      recognition.current.stop();
      console.log('🛑 Mevcut recognition durduruldu');
    }
    setDinleniyor(false);
    
    // Kısa bekleme sonra başlat
    setTimeout(() => {
      if (recognition.current) {
        console.log('🚀 Fresh dinleme başlatılıyor...');
        setMetin('');
        setHata(null);
        
        try {
          // Manuel state update - onstart event'inden önce
          setDinleniyor(true);
          console.log('✅ State manuel olarak TRUE yapıldı');
          
          recognition.current.start();
          console.log('🎤 SpeechRecognition.start() çağrıldı');
          
          // Force immediate state update - callback ile garanti et
          setTimeout(() => {
            setDinleniyor(true);
            console.log('🔄 100ms sonra state tekrar TRUE yapıldı');
          }, 100);
          
        } catch (error) {
          console.error('❌ Dinleme başlatma hatası:', error);
          setHata('Dinleme başlatılamadı: ' + error.message);
          setDinleniyor(false); // Hata durumunda false yap
        }
      }
    }, 100);
  };

  const dinlemeDurdur = () => {
    console.log('🛑 Dinleme durduruluyor - Mevcut durum:', dinleniyor);
    
    if (recognition.current) {
      recognition.current.stop();
    }
    
    // Force state update
    setDinleniyor(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
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
