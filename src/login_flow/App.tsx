import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import LanguageSelector from '../components/common/forms/LanguageSelector';
import WelcomePage from './components/WelcomePage';
import RoleSelectionPage from './components/RoleSelectionPage';
import AboutPage from './components/AboutPage';
import Login from '../features/auth/Login';
import './App.css';

function LoginFlowApp(): React.JSX.Element {
  return (
    <div className="App">
      <ThemeToggle />
      <LanguageSelector />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/role-selection" element={<RoleSelectionPage />} />
        <Route path="/about/:role" element={<AboutPage />} />
        <Route path="/login/:role" element={<Login />} />
      </Routes>
    </div>
  );
}

export default LoginFlowApp;
