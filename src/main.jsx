import { createRoot } from 'react-dom/client';
import Gallery from './components/Gallery';
import './index.css';

createRoot(document.getElementById('root')).render(<Gallery />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
