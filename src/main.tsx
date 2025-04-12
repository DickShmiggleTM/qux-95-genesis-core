
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/themes.css';
import './styles/animations.css'; // Import our new animations
import './styles/variables.css'; // Import CSS variables
import './styles/chat-fixes.css'; // Import chat fixes

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
