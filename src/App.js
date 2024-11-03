import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Extract session ID from URL
    const sessionId = location.pathname.split('/join/')[1];
    
    if (sessionId) {
      // Deep link to open mobile app
      window.location.href = `wannawatch://join/${sessionId}`;
      
      // After a short delay, show "Open in App" button
      setTimeout(() => {
        // Show download prompts if app isn't installed
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = 'https://apps.apple.com/app/your-app-id';
        } else {
          window.location.href = 'https://play.google.com/store/apps/details?id=your.app.id';
        }
      }, 1000);
    }
  }, [location]);

  const handleShare = async () => {
    const sessionId = location.pathname.split('/join/')[1];
    const shareLink = `http://localhost:3000/join/${sessionId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my WannaWatch session!',
          text: 'Help me decide what to watch!',
          url: shareLink
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support native sharing
      try {
        await navigator.clipboard.writeText(shareLink);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>What Should We Watch?</h1>
        <p>Opening session in app...</p>
        <div className="store-buttons">
          <a href="https://apps.apple.com/app/your-app-id">
            Download on App Store
          </a>
          <a href="https://play.google.com/store/apps/details?id=your.app.id">
            Get it on Google Play
          </a>
        </div>
      </header>
    </div>
  );
}

export default App; 