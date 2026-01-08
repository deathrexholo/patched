import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@hooks/useLanguage';
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from '../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../components/common/forms/LanguageSelector';
import './WelcomePage.css';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll to hide/show header controls
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down and past 50px - hide header
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  const handleLetsPlayClick = (): void => {
    navigate('/role-selection');
  };

  return (
    <div className="welcome-container">
      <div className={`welcome-header ${isHeaderVisible ? 'visible' : 'hidden'}`}>
        <button
          className="back-to-website-btn"
          onClick={() => window.location.href = '/landing/index.html'}
          title="Back to Website"
        >
          <ArrowLeft size={20} />
          <span>Back to Website</span>
        </button>
        <div className="welcome-controls">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      {/* Video Background */}
      <div className="video-background">
        <video autoPlay loop muted playsInline className="background-video">
          <source src="/assets/football_pitch.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      <div className="background-graphic">
        <div className="glowing-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className="content content-centered">
        <div className="tagline">{t('tagline')}</div>
        <h1 className="main-title">AmaPlayer</h1>
        <p className="subtitle">{t('subtitle')}</p>

        <div className="button-group button-group-large">
          <button className="login-btn login-btn-large" onClick={handleLetsPlayClick}>
            {t('letsPlay')}
          </button>
          <button className="secondary-btn secondary-btn-large" onClick={() => navigate('/login')}>
            {t('login')}
          </button>
        </div>


      </div>
    </div>
  );
};

export default WelcomePage;
