import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, limit } from 'firebase/firestore';
import { Search as SearchIcon, UserPlus, Check, X, Filter, MapPin, User, Award, Target, Calendar, Settings, Bell } from 'lucide-react';
import FooterNav from '../../components/layout/FooterNav';
import SettingsMenu from '../../components/common/settings/SettingsMenu';
import NotificationDropdown from '../../components/common/notifications/NotificationDropdown';
import SafeImage from '../../components/common/SafeImage';
import SearchResultItem from './SearchResultItem';
import notificationService from '../../services/notificationService';
import friendsService from '../../services/api/friendsService';
import './Search.css';

interface UserData {
  id: string;
  displayName?: string;
  email?: string;
  name?: string;
  bio?: string;
  photoURL?: string;
  location?: string;
  role?: string;
  skills?: string[];
  sport?: string;
  sex?: string;
  age?: number | string;
  achievements?: Array<{ title: string }>;
}


interface SearchFilters {
  location: string;
  role: string;
  skill: string;
  sport: string;
  name: string;
  achievement: string;
  sex: string;
  age: string;
  // New athlete-specific filters
  eventType: string;
  position: string;
  subcategory: string;
}

export default function Search() {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    role: '',
    skill: '',
    sport: '',
    name: '',
    achievement: '',
    sex: '',
    age: '',
    eventType: '',
    position: '',
    subcategory: ''
  });
  
  // Notification and Settings state
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // Friend request and friendship tracking is now handled by SearchResultItem components

  // Live search effect with debouncing
  useEffect(() => {
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // Don't search if no criteria and if guest
    if (isGuest()) {
      setSearchResults([]);
      return;
    }

    // Search if there's a search term or any filter applied
    const hasSearchCriteria = searchTerm.trim().length >= 2 || 
                            Object.values(filters).some(filter => filter.trim().length > 0);

    if (!hasSearchCriteria) {
      setSearchResults([]);
      return;
    }

    // Set new timer for debounced search
    const timer = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms delay

    setSearchDebounceTimer(timer);

    // Cleanup function
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchTerm, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch unread notification count
  useEffect(() => {
    if (!currentUser || isGuest()) {
      setUnreadCount(0);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('receiverId', '==', currentUser.uid),
        where('read', '==', false)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.size);
      }, (error) => {
        console.error('Error fetching notification count:', error);
        setUnreadCount(0);
      });

    } catch (error) {
      console.error('Error setting up notification listener:', error);
      setUnreadCount(0);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, isGuest]);



  // Helper interface for match scores
  interface MatchScores {
    displayName: number;
    email: number;
    name: number;
  }

  // Calculate match score for text fields (exact: 100, startsWith: 50, contains: 10)
  const calculateMatchScore = (
    fields: { displayName: string; email: string; name: string },
    searchTerm: string
  ): MatchScores => {
    const result: MatchScores = { displayName: 0, email: 0, name: 0 };

    const scoreExact = 100;
    const scoreStartsWith = 50;
    const scoreContains = 10;

    // Check displayName
    if (fields.displayName === searchTerm) {
      result.displayName = scoreExact;
    } else if (fields.displayName.startsWith(searchTerm)) {
      result.displayName = scoreStartsWith;
    } else if (fields.displayName.includes(searchTerm)) {
      result.displayName = scoreContains;
    }

    // Check email
    if (fields.email === searchTerm) {
      result.email = scoreExact;
    } else if (fields.email.startsWith(searchTerm)) {
      result.email = scoreStartsWith;
    } else if (fields.email.includes(searchTerm)) {
      result.email = scoreContains;
    }

    // Check name
    if (fields.name === searchTerm) {
      result.name = scoreExact;
    } else if (fields.name.startsWith(searchTerm)) {
      result.name = scoreStartsWith;
    } else if (fields.name.includes(searchTerm)) {
      result.name = scoreContains;
    }

    return result;
  };

  // Check if any match score is non-zero
  const hasMatch = (scores: MatchScores): boolean => {
    return scores.displayName > 0 || scores.email > 0 || scores.name > 0;
  };

  // Get total match score for sorting (highest score wins)
  const getTotalScore = (scores: MatchScores): number => {
    return Math.max(scores.displayName, scores.email, scores.name);
  };

  const handleSearch = async (): Promise<void> => {
    if (isGuest() || !currentUser) {
      return;
    }

    setLoading(true);

    try {
      let results: UserData[] = [];
      const searchTermLower = searchTerm.toLowerCase().trim();

      // Use efficient indexed queries if athlete-specific filters are applied
      const hasAthleteFilters = filters.sport || filters.eventType || filters.position || filters.subcategory;
      const isAthleteSearch = filters.role === 'athlete' || hasAthleteFilters;

      if (isAthleteSearch && hasAthleteFilters) {
// Build Firestore query with indexed fields
        const constraints: any[] = [];

        // Always filter by role if searching athletes
        constraints.push(where('role', '==', 'athlete'));

        // Add sport filter (uses array-contains index)
        if (filters.sport) {
          constraints.push(where('sports', 'array-contains', filters.sport.toLowerCase()));
        }

        // Add event type filter (uses array-contains index)
        if (filters.eventType) {
          constraints.push(where('eventTypes', 'array-contains', filters.eventType.toLowerCase()));
        }

        // Add position filter (uses equality index)
        if (filters.position) {
          constraints.push(where('position', '==', filters.position.toLowerCase()));
        }

        // Add subcategory filter (uses equality index)
        if (filters.subcategory) {
          constraints.push(where('subcategory', '==', filters.subcategory.toLowerCase()));
        }

        // Add limit
        constraints.push(limit(100));

        const q = query(collection(db, 'users'), ...constraints);
        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
          const userData = { id: doc.id, ...doc.data() } as UserData;
          if (doc.id !== currentUser.uid) {
            results.push(userData);
          }
        });
// Apply client-side filters for remaining criteria
        // Track scores for sorting later
        const resultsWithScores = results.map(userData => {
          let matches = true;
          let matchScore = 0;

          // Text search with ranking
          if (searchTermLower) {
            const displayName = (userData.displayName || '').toLowerCase().trim();
            const email = (userData.email || '').toLowerCase().trim();
            const name = (userData.name || '').toLowerCase().trim();

            const scores = calculateMatchScore({ displayName, email, name }, searchTermLower);
            if (hasMatch(scores)) {
              matchScore = getTotalScore(scores);
            } else {
              matches = false;
            }
          }

          // Location
          if (matches && filters.location && userData.location) {
            if (!userData.location.toLowerCase().includes(filters.location.toLowerCase())) {
              matches = false;
            }
          }

          // Sex
          if (matches && filters.sex && userData.sex) {
            if (userData.sex !== filters.sex) {
              matches = false;
            }
          }

          // Age
          if (matches && filters.age && userData.age) {
            const userAge = parseInt(String(userData.age));
            const exactAge = parseInt(filters.age);
            if (userAge !== exactAge) {
              matches = false;
            }
          }

          return { userData, matches, matchScore };
        });

        // Filter and sort by score
        results = resultsWithScores
          .filter(item => item.matches)
          .sort((a, b) => b.matchScore - a.matchScore)
          .map(item => item.userData);

      } else {
        // Fallback to full collection scan for non-athlete or simple searches
const allUsersSnapshot = await getDocs(collection(db, 'users'));
        const resultsWithScores: Array<{ userData: UserData; matches: boolean; matchScore: number }> = [];

        allUsersSnapshot.forEach((doc) => {
          const userData = { id: doc.id, ...doc.data() } as UserData;

          // Don't include current user in results
          if (doc.id !== currentUser.uid) {
            let matches = true;
            let matchScore = 0;

            // Text search with ranking (if provided)
            if (searchTermLower) {
              const displayName = (userData.displayName || '').toLowerCase().trim();
              const email = (userData.email || '').toLowerCase().trim();
              const name = (userData.name || '').toLowerCase().trim();

              const scores = calculateMatchScore({ displayName, email, name }, searchTermLower);
              if (hasMatch(scores)) {
                matchScore = getTotalScore(scores);
              } else {
                matches = false;
              }
            }

            // Apply filters
            if (matches && filters.location && userData.location) {
              if (!userData.location.toLowerCase().includes(filters.location.toLowerCase())) {
                matches = false;
              }
            }

            if (matches && filters.role && userData.role) {
              if (userData.role !== filters.role) {
                matches = false;
              }
            }

            if (matches && filters.skill && userData.skills) {
              const skillMatch = userData.skills.some(skill =>
                skill.toLowerCase().includes(filters.skill.toLowerCase())
              );
              if (!skillMatch) matches = false;
            }

            if (matches && filters.sport && userData.sport) {
              if (!userData.sport.toLowerCase().includes(filters.sport.toLowerCase())) {
                matches = false;
              }
            }

            if (matches && filters.name && userData.name) {
              if (!userData.name.toLowerCase().includes(filters.name.toLowerCase())) {
                matches = false;
              }
            }

            if (matches && filters.achievement && userData.achievements) {
              const achievementMatch = userData.achievements.some(achievement =>
                achievement.title.toLowerCase().includes(filters.achievement.toLowerCase())
              );
              if (!achievementMatch) matches = false;
            }

            if (matches && filters.sex && userData.sex) {
              if (userData.sex !== filters.sex) {
                matches = false;
              }
            }

            // Age filtering
            if (matches && userData.age) {
              const userAge = parseInt(String(userData.age));

              // Exact age filter
              if (filters.age) {
                const exactAge = parseInt(filters.age);
                if (userAge !== exactAge) {
                  matches = false;
                }
              }

            } else if (filters.age) {
              // If age filters are applied but user has no age data, exclude them
              matches = false;
            }

            if (matches) {
              resultsWithScores.push({ userData, matches, matchScore });
            }
          }
        });

        // Sort by score and add to results
        results = resultsWithScores
          .sort((a, b) => b.matchScore - a.matchScore)
          .map(item => item.userData);
      }

      setSearchResults(results);
    } catch (error: any) {
      console.error('Error searching users:', error);

      // Check for index errors
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.error('🚨 Missing Firestore index! Deploy indexes with: firebase deploy --only firestore:indexes');
        alert('Database index required. Please contact administrator or deploy indexes.');
      } else {
        alert('Error searching users: ' + error.message);
      }
    }
    setLoading(false);
  };


  // Friend request logic is now handled by SearchResultItem component using useFriendRequest hook

  const handleFilterChange = (filterName: keyof SearchFilters, value: string): void => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = (): void => {
    setFilters({
      location: '',
      role: '',
      skill: '',
      sport: '',
      name: '',
      achievement: '',
      sex: '',
      age: '',
      eventType: '',
      position: '',
      subcategory: ''
    });
    setSearchTerm('');
    setSearchResults([]);
  };


  const hasActiveFilters = Object.values(filters).some(filter => filter.trim().length > 0) || searchTerm.trim().length > 0;

  // Notification and Settings handlers
  const handleSettingsToggle = () => {
    setSettingsOpen(!settingsOpen);
    setNotificationsOpen(false); // Close notifications if open
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleNotificationsToggle = () => {
    setNotificationsOpen(!notificationsOpen);
    setSettingsOpen(false); // Close settings if open
  };

  const handleNotificationsClose = () => {
    setNotificationsOpen(false);
  };

  // Guest view
  if (isGuest()) {
    return (
      <div className="search">
        <nav className="nav-bar">
          <div className="nav-content">
            <h1>Search</h1>
            <div className="nav-controls">
              {/* Settings for guest */}
              <div className="settings-container">
                <button
                  ref={settingsButtonRef}
                  className="settings-btn"
                  onClick={handleSettingsToggle}
                  aria-label="Open settings menu"
                  aria-expanded={settingsOpen}
                  aria-haspopup="true"
                  title="Settings"
                  type="button"
                >
                  <Settings size={20} aria-hidden="true" />
                  <span className="sr-only">Settings</span>
                </button>
                
                <SettingsMenu
                  isOpen={settingsOpen}
                  onClose={handleSettingsClose}
                  isGuest={true}
                  triggerButtonRef={settingsButtonRef}
                  currentUser={null}
                />
              </div>
            </div>
          </div>
        </nav>

        <div className="main-content search-content">
          <div className="guest-restriction">
            <div className="guest-restriction-content">
              <SearchIcon size={48} />
              <h2>User Search</h2>
              <p>🔒 Guest accounts cannot search for users</p>
              <p>Sign up to find and connect with friends!</p>
              <button 
                className="sign-up-btn"
                onClick={() => navigate('/login')}
              >
                Sign Up / Sign In
              </button>
            </div>
          </div>
        </div>
        
        <FooterNav />
      </div>
    );
  }

  return (
    <div className="search">
      <nav className="nav-bar">
        <div className="nav-content">
          <h1>Search</h1>
          <div className="nav-controls">
            {/* Notifications */}
            <div className="notifications-container">
              <button
                ref={notificationButtonRef}
                className="notification-btn"
                onClick={handleNotificationsToggle}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
                title="Notifications"
                type="button"
              >
                <Bell size={20} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <span className="sr-only">
                  Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
                </span>
              </button>

              <NotificationDropdown
                isOpen={notificationsOpen}
                onClose={handleNotificationsClose}
                triggerButtonRef={notificationButtonRef}
              />
            </div>
            
            {/* Settings */}
            <div className="settings-container">
              <button
                ref={settingsButtonRef}
                className="settings-btn"
                onClick={handleSettingsToggle}
                aria-label="Open settings menu"
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                title="Settings"
                type="button"
              >
                <Settings size={20} aria-hidden="true" />
                <span className="sr-only">Settings</span>
              </button>
              
              <SettingsMenu
                isOpen={settingsOpen}
                onClose={handleSettingsClose}
                isGuest={false}
                triggerButtonRef={settingsButtonRef}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="main-content search-content">
        <div className="search-bar">
          <div className="search-input-container">
            <SearchIcon size={20} />
            <input
              type="text"
              placeholder="Search users by name, email, or display name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button 
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
            </button>
            <button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="search-filters">
            <div className="filters-header">
              <h3><Filter size={20} />Advanced Filters</h3>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  <X size={16} />
                  Clear All
                </button>
              )}
            </div>
            
            <div className="filters-grid">
              <div className="filter-group">
                <label><MapPin size={16} />Location</label>
                <input
                  type="text"
                  placeholder="City, State, Country"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label><User size={16} />Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="athlete">Athlete</option>
                  <option value="coach">Coach</option>
                  <option value="organisation">Organization</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label><Target size={16} />Skill</label>
                <input
                  type="text"
                  placeholder="e.g., Swimming, Running"
                  value={filters.skill}
                  onChange={(e) => handleFilterChange('skill', e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label><Target size={16} />Sport</label>
                <input
                  type="text"
                  placeholder="e.g., Football, Basketball"
                  value={filters.sport}
                  onChange={(e) => handleFilterChange('sport', e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label><User size={16} />Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label><Award size={16} />Achievement</label>
                <input
                  type="text"
                  placeholder="e.g., Gold Medal, Champion"
                  value={filters.achievement}
                  onChange={(e) => handleFilterChange('achievement', e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label><User size={16} />Gender</label>
                <select
                  value={filters.sex}
                  onChange={(e) => handleFilterChange('sex', e.target.value)}
                >
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label><Calendar size={16} />Exact Age</label>
                <input
                  type="number"
                  placeholder="e.g., 25"
                  min="13"
                  max="100"
                  value={filters.age}
                  onChange={(e) => handleFilterChange('age', e.target.value)}
                />
              </div>

              {/* New Athlete-Specific Filters */}
              <div className="filter-group">
                <label><Target size={16} />Event Type</label>
                <input
                  type="text"
                  placeholder="e.g., 5000m, marathon"
                  value={filters.eventType}
                  onChange={(e) => handleFilterChange('eventType', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><Target size={16} />Position</label>
                <input
                  type="text"
                  placeholder="e.g., distance-runner, sprinter"
                  value={filters.position}
                  onChange={(e) => handleFilterChange('position', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label><Target size={16} />Subcategory</label>
                <input
                  type="text"
                  placeholder="e.g., long-distance, middle-distance"
                  value={filters.subcategory}
                  onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                />
              </div>

            </div>
          </div>
        )}
        
        <div className="search-results">
          {searchTerm && searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
            <div className="search-placeholder">
              <SearchIcon size={48} />
              <h3>Keep typing...</h3>
              <p>Type at least 2 characters to start searching</p>
            </div>
          )}

          {searchResults.length === 0 && searchTerm && searchTerm.trim().length >= 2 && !loading && (
            <div className="empty-state">
              <SearchIcon size={48} />
              <h3>No users found</h3>
              <p>Try searching with different keywords</p>
            </div>
          )}
          
          {searchResults.length === 0 && !searchTerm && (
            <div className="search-placeholder">
              <SearchIcon size={48} />
              <h3>Find Friends</h3>
              <p>Start typing to search for users and send friend requests</p>
            </div>
          )}
          
          {searchResults.map((user) => (
            <SearchResultItem key={user.id} user={user} />
          ))}
        </div>
      </div>
      
      <FooterNav />
    </div>
  );
}
