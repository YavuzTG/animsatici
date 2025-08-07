import React from 'react';

const App = () => {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800">Test Sayfası</h1>
        <p className="text-gray-600 mt-4">Eğer bu yazıyı görüyorsanız React çalışıyor!</p>
        <div className="mt-4 p-4 bg-blue-100 rounded">
          <p className="text-blue-800">✅ TailwindCSS de çalışıyor!</p>
        </div>
      </div>
    </div>
  );
};

export default App;
