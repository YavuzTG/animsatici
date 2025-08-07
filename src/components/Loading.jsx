import React from 'react';

const Loading = ({ metin = 'Yükleniyor...' }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5">
      <div className="position-relative mb-4">
        <div className="loading-modern"></div>
      </div>
      
      <div className="text-center">
        <h5 className="text-white fw-bold mb-3 animate-fade-in-up">
          {metin}
        </h5>
        <div className="d-flex justify-content-center gap-2">
          {[0, 150, 300].map((delay, index) => (
            <div
              key={index}
              className="bg-white rounded-circle loading-dot"
              style={{
                width: '8px',
                height: '8px',
                animationDelay: `${delay}ms`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;
