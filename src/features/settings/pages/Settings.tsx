import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Shield, Eye, Bell, Sun, Globe, Mail, Lock, Check } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import PasswordChangeSection from '../components/PasswordChangeSection';
import ThemeToggle from '../../../components/common/ui/ThemeToggle';
import LanguageSelector from '../../../components/common/forms/LanguageSelector';
import '../styles/Settings.css';

interface SettingsPageProps {
  initialTab?: 'account' | 'security' | 'privacy' | 'notifications' | 'preferences';
}

const Settings: React.FC<SettingsPageProps> = ({ initialTab = 'account' }) => {
  const { currentUser, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isLoading] = useState<boolean>(false);

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="settings-tab-content">
            <h3>Account Settings</h3>
            <p>Manage your account information and profile settings.</p>
            
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <User size={20} />
                </div>
                <div className="setting-content">
                  <h4>Display Name</h4>
                  <p>Your public display name</p>
                  <input 
                    type="text" 
                    placeholder="Enter display name" 
                    value={currentUser?.displayName || ''} 
                    className="setting-input" 
                  />
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-icon">
                  <Mail size={20} />
                </div>
                <div className="setting-content">
                  <h4>Email Address</h4>
                  <p>Your account email address</p>
                  <input 
                    type="email" 
                    value={currentUser?.email || ''} 
                    className="setting-input" 
                    disabled 
                  />
                </div>
              </div>
              
              <div className="setting-actions">
                <button className="save-btn">
                  <Check size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );
      case 'preferences':
        return (
          <div className="settings-tab-content">
            <h3>App Preferences</h3>
            <p>Customize your app experience with theme and language settings.</p>
            
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <Sun size={20} />
                </div>
                <div className="setting-content">
                  <h4>Theme</h4>
                  <p>Choose your preferred theme</p>
                  <div className="setting-control">
                    <ThemeToggle inline={false} showLabel={true} />
                  </div>
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-icon">
                  <Globe size={20} />
                </div>
                <div className="setting-content">
                  <h4>Language</h4>
                  <p>Select your preferred language</p>
                  <div className="setting-control">
                    <LanguageSelector inline={false} showLabel={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="settings-tab-content">
            <h3>Security Settings</h3>
            <p>Manage your password and security preferences.</p>

            {!isGuest() && currentUser ? (
              <PasswordChangeSection />
            ) : (
              <div className="settings-section">
                <div className="setting-item">
                  <div className="setting-icon">
                    <Lock size={20} />
                  </div>
                  <div className="setting-content">
                    <h4>Password Management</h4>
                    <p>Sign in to manage your password and security settings.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'privacy':
        return (
          <div className="settings-tab-content">
            <h3>Privacy Settings</h3>
            <p>Control your privacy and visibility settings.</p>
            
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <Eye size={20} />
                </div>
                <div className="setting-content">
                  <h4>Profile Visibility</h4>
                  <p>Choose who can see your profile information</p>
                  <select className="setting-select">
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-content">
                  <h4>Activity Status</h4>
                  <p>Show when you're active on the platform</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Show activity status</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="settings-tab-content">
            <h3>Notification Preferences</h3>
            <p>Manage your notification settings.</p>
            
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-icon">
                  <Bell size={20} />
                </div>
                <div className="setting-content">
                  <h4>Email Notifications</h4>
                  <p>Receive notifications via email</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Enable email notifications</span>
                  </label>
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-content">
                  <h4>Push Notifications</h4>
                  <p>Receive push notifications in your browser</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Enable push notifications</span>
                  </label>
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-content">
                  <h4>Achievement Notifications</h4>
                  <p>Get notified about new achievements</p>
                  <label className="setting-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Enable achievement notifications</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="settings-tab-content">
            <h3>Settings</h3>
            <p>Select a tab to view settings.</p>
          </div>
        );
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-title">
          <SettingsIcon size={24} />
          <h1>Settings</h1>
        </div>
      </div>

      <div className="settings-container">
        <nav className="settings-nav">
          <ul className="settings-tabs">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                    type="button"
                    aria-label={`Switch to ${tab.label} settings`}
                  >
                    <IconComponent size={18} />
                    <span>{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="settings-content">
          {isLoading ? (
            <div className="settings-loading">
              <div className="loading-spinner"></div>
              <p>Loading settings...</p>
            </div>
          ) : (
            renderTabContent()
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;