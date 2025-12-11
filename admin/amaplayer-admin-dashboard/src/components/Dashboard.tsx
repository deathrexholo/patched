import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  PlayCircle, 
  Activity,
  CheckCircle,
  XCircle,
  Filter,
  MapPin,
  Eye,
  Ban,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { User, Event } from '../types/models';
import { TalentVideo } from '../types/models/search';
import { userManagementService } from '../services/userManagementService';
import { videoVerificationService } from '../services/videoVerificationService';
import { eventsService } from '../services/eventsService';
import EnhancedSearchBar from './search/EnhancedSearchBar';
import SearchResultsDisplay from './search/SearchResultsDisplay';
import AdvancedFiltersPanel from './search/AdvancedFiltersPanel';
import { enhancedSearchService } from '../services/search/enhancedSearchService';
import { BulkSelectionProvider } from '../contexts/BulkSelectionContext';
import { SearchQuery, SearchResults, SearchFilters } from '../types/models/search';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    verified: number;
    athletes: number;
    coaches: number;
    organizations: number;
  };
  videos: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  events: {
    total: number;
    active: number;
  };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Enhanced search states
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [useEnhancedSearch, setUseEnhancedSearch] = useState(false);
  
  // Legacy filter states (for backward compatibility)
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'athlete' | 'coach' | 'organization'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'verified'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [ageFilter, setAgeFilter] = useState('');
  const [ageOperator, setAgeOperator] = useState<'exact' | 'greater' | 'less'>('exact');
  const [achievementFilter, setAchievementFilter] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Enhanced search handlers
  const handleEnhancedSearch = async (query: SearchQuery) => {
    setIsSearching(true);
    setSearchError(null);
    setUseEnhancedSearch(true);

    try {
      const result = await enhancedSearchService.search(query);
      
      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        setSearchError(result.error?.message || 'Search failed');
        setSearchResults(null);
      }
    } catch (error) {
      console.error('Enhanced search error:', error);
      setSearchError('An unexpected error occurred during search');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFiltersChange = (filters: SearchFilters) => {
    setCurrentFilters(filters);
    
    // If there's an active search, re-execute with new filters
    if (useEnhancedSearch && searchResults) {
      const updatedQuery: SearchQuery = {
        ...searchResults.query,
        filters
      };
      handleEnhancedSearch(updatedQuery);
    }
  };

  const handleItemClick = (item: User | TalentVideo | Event) => {
    if ('role' in item) {
      // It's a user
      setSelectedUser(item as User);
      setShowUserModal(true);
    }
    // Handle other item types as needed
  };

  const handleFacetClick = (facetType: string, facetValue: string) => {
    // Update filters based on facet selection
    const newFilters = { ...currentFilters };
    
    switch (facetType) {
      case 'roles':
        newFilters.role = newFilters.role || [];
        if (!newFilters.role.includes(facetValue as any)) {
          newFilters.role.push(facetValue as any);
        }
        break;
      case 'statuses':
        newFilters.status = newFilters.status || [];
        if (!newFilters.status.includes(facetValue as any)) {
          newFilters.status.push(facetValue as any);
        }
        break;
      case 'locations':
        newFilters.location = facetValue;
        break;
      // Add more facet types as needed
    }
    
    handleFiltersChange(newFilters);
  };

  const handleClearSearch = () => {
    setUseEnhancedSearch(false);
    setSearchResults(null);
    setSearchError(null);
    setCurrentFilters({});
  };

  const loadDashboardData = async () => {
    try {
      console.log('🚀 Starting to load dashboard data...');
      setLoading(true);
      setUsersLoading(true);

      console.log('📍 Calling getUserStats...');
      const userStats = await userManagementService.getUserStats();
      console.log('✅ User stats loaded:', userStats);

      console.log('📍 Calling getVerificationStats...');
      const videoStats = await videoVerificationService.getVerificationStats();
      console.log('✅ Video stats loaded:', videoStats);

      console.log('📍 Calling getAllEvents...');
      const events = await eventsService.getAllEvents();
      console.log('✅ Events loaded:', events.length, 'events');

      console.log('📍 Calling getAllUsers...');
      const allUsers = await userManagementService.getAllUsers();
      console.log('✅ Users loaded:', allUsers.length, 'users');

      const eventStats = {
        total: events.length,
        active: events.filter(e => e.isActive).length
      };

      setStats({
        users: userStats,
        videos: videoStats,
        events: eventStats
      });

      setUsers(allUsers);
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
      setUsersLoading(false);
    }
  };

  // Filter users based on all criteria
  const filteredUsers = users.filter(user => {
    // Text search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const sportsStr = user.sports?.join(' ').toLowerCase() || '';
      const matchesSearch =
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.bio?.toLowerCase().includes(searchLower) ||
        user.location?.toLowerCase().includes(searchLower) ||
        sportsStr.includes(searchLower);

      if (!matchesSearch) return false;
    }

    // Role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;

    // Status filter
    if (statusFilter === 'active' && (!user.isActive)) return false;
    if (statusFilter === 'verified' && !user.isVerified) return false;

    // Location filter
    if (locationFilter.trim() && user.location &&
        !user.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;

    // Sport filter
    if (sportFilter.trim() && user.sports && user.sports.length > 0) {
      const hasSport = user.sports.some(sport =>
        sport.toLowerCase().includes(sportFilter.toLowerCase())
      );
      if (!hasSport) return false;
    } else if (sportFilter.trim()) {
      return false;
    }

    // Gender filter
    if (genderFilter !== 'all' && user.gender !== genderFilter) return false;

    // Age filter - calculate from dateOfBirth if available
    if (ageFilter.trim() && user.dateOfBirth) {
      const filterAge = parseInt(ageFilter);
      if (!isNaN(filterAge)) {
        const birthDate = new Date(user.dateOfBirth);
        const today = new Date();
        let userAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          userAge--;
        }
        if (ageOperator === 'exact' && userAge !== filterAge) return false;
        if (ageOperator === 'greater' && userAge <= filterAge) return false;
        if (ageOperator === 'less' && userAge >= filterAge) return false;
      }
    }

    return true;
  });

  const clearAllFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setLocationFilter('');
    setSportFilter('');
    setGenderFilter('all');
    setAgeFilter('');
    setAchievementFilter('');
    setAgeOperator('exact');
  };


  const StatCard: React.FC<{
    title: string;
    value?: number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    link: string;
  }> = ({ title, value = 0, subtitle, icon: Icon, color, link }) => (
    <Link
      to={link}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : '0'}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Link>
  );

  const UserCard: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img
            src={user.photoURL || 'https://via.placeholder.com/48'}
            alt={user.displayName}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user.displayName}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedUser(user);
            setShowUserModal(true);
          }}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            user.role === 'athlete' ? 'bg-blue-100 text-blue-800' :
            user.role === 'coach' ? 'bg-green-100 text-green-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
          </span>

          {user.isVerified && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Verified
            </span>
          )}

          {!user.isActive && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <Ban className="w-3 h-3 mr-1" />
              Inactive
            </span>
          )}
        </div>

        {user.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {user.location}
          </div>
        )}

        {user.sports && Array.isArray(user.sports) && user.sports.length > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <Activity className="w-4 h-4 mr-2" />
            {user.sports.join(', ')}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mt-3">
          <span>{user.followersCount || 0} followers</span>
          <span>{user.postsCount || 0} posts</span>
        </div>
      </div>
    </div>
  );

  const UserModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-90vh overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900">User Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-center space-x-4">
              <img
                src={user.photoURL || 'https://via.placeholder.com/80'}
                alt={user.displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{user.displayName}</h3>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  {user.isVerified && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                  {!user.isActive && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <Ban className="w-3 h-3 mr-1" />
                      Inactive
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'athlete' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'coach' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.bio && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <p className="mt-1 text-sm text-gray-900">{user.bio}</p>
                </div>
              )}
              {user.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm text-gray-900">{user.location}</p>
                </div>
              )}
              {user.sports && Array.isArray(user.sports) && user.sports.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sports</label>
                  <p className="mt-1 text-sm text-gray-900">{user.sports.join(', ')}</p>
                </div>
              )}
              {user.dateOfBirth && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">{user.dateOfBirth}</p>
                </div>
              )}
              {user.gender && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{user.gender}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{user.followersCount || 0}</p>
                <p className="text-sm text-gray-600">Followers</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{user.followingCount || 0}</p>
                <p className="text-sm text-gray-600">Following</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{user.postsCount || 0}</p>
                <p className="text-sm text-gray-600">Posts</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{user.storiesCount || 0}</p>
                <p className="text-sm text-gray-600">Stories</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to the AmaPlayer admin dashboard</p>
      </div>

      {/* Main Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats.users.total}
            subtitle={`${stats.users.active} active`}
            icon={Users}
            color="bg-blue-500"
            link="/users"
          />
          <StatCard
            title="Events"
            value={stats.events.total}
            subtitle={`${stats.events.active} active`}
            icon={Calendar}
            color="bg-green-500"
            link="/events"
          />
          <StatCard
            title="Videos"
            value={stats.videos.total}
            subtitle={`${stats.videos.pending} pending review`}
            icon={PlayCircle}
            color="bg-purple-500"
            link="/videos"
          />
          <StatCard
            title="Verified Users"
            value={stats.users.verified}
            subtitle={`${Math.round((stats.users.verified / stats.users.total) * 100)}% of total`}
            icon={CheckCircle}
            color="bg-indigo-500"
            link="/users"
          />
        </div>
      )}

      {/* Enhanced Search Section */}
      <BulkSelectionProvider>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {useEnhancedSearch ? 'Search Results' : 'All Users'}
            </h2>
            <div className="flex items-center space-x-3">
              {useEnhancedSearch ? (
                <>
                  <button
                    onClick={handleClearSearch}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    ← Back to All Users
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-600">
                    Showing {filteredUsers.length} of {users.length} users
                  </span>
                  <Link
                    to="/users"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Advanced Management →
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <EnhancedSearchBar
              onSearch={handleEnhancedSearch}
              placeholder="Search users, videos, events..."
              enableAutoComplete={true}
              enableSavedSearches={true}
              searchTypes={['all', 'users', 'videos', 'events']}
              initialFilters={currentFilters}
              className="mb-4"
            />

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
              >
                <Filter className="w-4 h-4" />
                <span>Advanced Filters</span>
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {!useEnhancedSearch && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200"
                >
                  <span>Legacy Filters</span>
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <AdvancedFiltersPanel
                  filters={currentFilters}
                  onFiltersChange={handleFiltersChange}
                  searchType="all"
                />
              </div>
            )}

            {/* Legacy Filters (for backward compatibility) */}
            {!useEnhancedSearch && showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="athlete">Athletes</option>
                    <option value="coach">Coaches</option>
                    <option value="organization">Organizations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                  <input
                    type="text"
                    placeholder="Filter by sport..."
                    value={sportFilter}
                    onChange={(e) => setSportFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <div className="flex space-x-2">
                    <select
                      value={ageOperator}
                      onChange={(e) => setAgeOperator(e.target.value as any)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="exact">=</option>
                      <option value="greater">&gt;</option>
                      <option value="less">&lt;</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Age"
                      value={ageFilter}
                      onChange={(e) => setAgeFilter(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
                  <input
                    type="text"
                    placeholder="Filter by achievements..."
                    value={achievementFilter}
                    onChange={(e) => setAchievementFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-full">
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Error Display */}
          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-800">{searchError}</span>
              </div>
            </div>
          )}

          {/* Search Loading */}
          {isSearching && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          )}

          {/* Enhanced Search Results */}
          {useEnhancedSearch && searchResults && !isSearching && (
            <SearchResultsDisplay
              results={searchResults}
              searchTerm={searchResults.query.term}
              onItemClick={handleItemClick}
              onFacetClick={handleFacetClick}
              enableBulkSelection={true}
              className="enhanced-search-results"
            />
          )}

          {/* Legacy Users Grid (when not using enhanced search) */}
          {!useEnhancedSearch && !isSearching && (
            <>
              {usersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.slice(0, 12).map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your search or filter criteria.
                      </p>
                    </div>
                  )}

                  {filteredUsers.length > 12 && (
                    <div className="text-center">
                      <Link
                        to="/users"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        View All {filteredUsers.length} Users
                      </Link>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </BulkSelectionProvider>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;