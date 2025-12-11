import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  User,
  Calendar,
  FileVideo,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Filter,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { videoVerificationService } from '../services/videoVerificationService';
import { TalentVideo, SearchQuery, SearchResults, SearchFilters } from '../types/models/search';
import EnhancedSearchBar from './search/EnhancedSearchBar';
import SearchResultsDisplay from './search/SearchResultsDisplay';
import AdvancedFiltersPanel from './search/AdvancedFiltersPanel';
import BulkOperationsPanel from './search/BulkOperationsPanel';
import { enhancedSearchService } from '../services/search/enhancedSearchService';
import { BulkSelectionProvider } from '../contexts/BulkSelectionContext';

const VideoVerification: React.FC = () => {
  const [videos, setVideos] = useState<TalentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<TalentVideo | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  // Enhanced search states
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [useEnhancedSearch, setUseEnhancedSearch] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  // Enhanced search handlers
  const handleEnhancedSearch = async (query: SearchQuery) => {
    setIsSearching(true);
    setSearchError(null);
    setUseEnhancedSearch(true);

    try {
      // Force search type to videos for this component
      const videoQuery = { ...query, searchType: 'videos' as const };
      const result = await enhancedSearchService.search(videoQuery);
      
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

  const handleItemClick = (item: any) => {
    // Convert search result to TalentVideo for modal
    const video: TalentVideo = {
      ...item,
      uploadedAt: item.createdAt as any,
      userName: item.userName,
      userEmail: item.userId,
      isVerified: item.isVerified || false // Add missing property
    };
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const handleFacetClick = (facetType: string, facetValue: string) => {
    const newFilters = { ...currentFilters };
    
    switch (facetType) {
      case 'verificationStatuses':
        newFilters.verificationStatus = newFilters.verificationStatus || [];
        if (!newFilters.verificationStatus.includes(facetValue as any)) {
          newFilters.verificationStatus.push(facetValue as any);
        }
        break;
      case 'categories':
        newFilters.category = newFilters.category || [];
        if (!newFilters.category.includes(facetValue)) {
          newFilters.category.push(facetValue);
        }
        break;
    }
    
    handleFiltersChange(newFilters);
  };

  const handleClearSearch = () => {
    setUseEnhancedSearch(false);
    setSearchResults(null);
    setSearchError(null);
    setCurrentFilters({});
  };

  const handleBulkOperationsClick = () => {
    setShowBulkOperations(true);
  };

  const loadVideos = async () => {
    console.log('🎬 ADMIN: LoadVideos function called');
    try {
      setLoading(true);
      console.log('🔄 ADMIN: Calling getAllVideos from Firebase...');
      // Fetch real videos from Firebase
      const allVideos = await videoVerificationService.getAllVideos();
      console.log('📊 ADMIN: Received videos:', allVideos);
      console.log('📈 ADMIN: Total videos loaded:', allVideos.length);
      setVideos(allVideos);
    } catch (error) {
      console.error('❌ ADMIN: Error loading videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    if (statusFilter !== 'all' && video.verificationStatus !== statusFilter) return false;
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        video.title?.toLowerCase().includes(searchLower) ||
        video.userName?.toLowerCase().includes(searchLower) ||
        video.description?.toLowerCase().includes(searchLower) ||
        video.category?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const handleApproveVideo = async (video: TalentVideo) => {
    setReviewing(video.id);
    try {
      await videoVerificationService.approveVideo(video.id!);
      await loadVideos();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error approving video:', error);
    } finally {
      setReviewing(null);
    }
  };

  const handleRejectVideo = async (video: TalentVideo) => {
    const reason = prompt('Enter rejection reason (optional):');
    setReviewing(video.id);
    
    try {
      await videoVerificationService.rejectVideo(video.id!, reason || undefined);
      await loadVideos();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error rejecting video:', error);
    } finally {
      setReviewing(null);
    }
  };

  const handleFlagVideo = async (video: TalentVideo) => {
    const reason = prompt('Enter flag reason:');
    if (!reason) return;

    try {
      await videoVerificationService.flagVideo(video.id!, reason);
      await loadVideos();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error flagging video:', error);
    }
  };

  const VideoDetailsModal: React.FC<{ video: TalentVideo; onClose: () => void }> = ({ video, onClose }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-95vh overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900">Video Review</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player */}
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={video.videoUrl}
                  poster={video.thumbnail}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Video Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => handleApproveVideo(video)}
                  disabled={reviewing === video.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
                >
                  {reviewing === video.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <ThumbsUp className="w-4 h-4" />
                      <span>Approve</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRejectVideo(video)}
                  disabled={reviewing === video.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
                >
                  {reviewing === video.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <ThumbsDown className="w-4 h-4" />
                      <span>Reject</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleFlagVideo(video)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Flag</span>
                </button>
              </div>
            </div>

            {/* Video Details */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {video.title || 'Untitled Video'}
                </h3>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    video.verificationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    video.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {video.verificationStatus === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {video.verificationStatus === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                    {video.verificationStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                    {video.verificationStatus.charAt(0).toUpperCase() + video.verificationStatus.slice(1)}
                  </span>
                  {video.category && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {video.category.charAt(0).toUpperCase() + video.category.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{video.userName || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">User ID: {video.userId}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{video.description}</p>
                </div>
              )}

              {/* Video Status */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> {video.verificationStatus.charAt(0).toUpperCase() + video.verificationStatus.slice(1)}
                </p>
              </div>

              {/* Upload Date */}
              <div className="text-sm">
                <span className="text-gray-600">Upload Date:</span>
                <span className="text-gray-900 ml-2">
                  {video.createdAt ? new Date(typeof video.createdAt === 'string' ? video.createdAt : video.createdAt instanceof Date ? video.createdAt : video.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                </span>
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
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Verification</h1>
            <p className="text-gray-600 mt-1">
              Review and verify talent showcase videos
              {statusFilter !== 'all' && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Filtering: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} 
                  ({filteredVideos.length} videos)
                </span>
              )}
            </p>
          </div>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="mt-2 sm:mt-0 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors duration-200"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
            statusFilter === 'pending' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {videos.filter(v => v.verificationStatus === 'pending').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Click to {statusFilter === 'pending' ? 'show all' : 'filter pending'} videos</p>
        </div>

        <div 
          className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
            statusFilter === 'approved' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {videos.filter(v => v.verificationStatus === 'approved').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Click to {statusFilter === 'approved' ? 'show all' : 'filter approved'} videos</p>
        </div>

        <div 
          className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
            statusFilter === 'rejected' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'
          }`}
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
        >
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {videos.filter(v => v.verificationStatus === 'rejected').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Click to {statusFilter === 'rejected' ? 'show all' : 'filter rejected'} videos</p>
        </div>

        <div 
          className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
            statusFilter === 'all' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
          }`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileVideo className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Videos</p>
              <p className="text-2xl font-bold text-gray-900">{videos.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Click to show all videos</p>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <BulkSelectionProvider>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Enhanced Search Bar */}
          <EnhancedSearchBar
            onSearch={handleEnhancedSearch}
            placeholder="Search videos by title, user, description..."
            enableAutoComplete={true}
            enableSavedSearches={true}
            searchTypes={['videos']}
            initialFilters={currentFilters}
            className="mb-4"
          />

          {/* Search Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
              >
                <Filter className="w-4 h-4" />
                <span>Advanced Filters</span>
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {useEnhancedSearch && (
                <button
                  onClick={handleClearSearch}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  ← Back to All Videos
                </button>
              )}
            </div>

            {/* Legacy Filter (for backward compatibility) */}
            {!useEnhancedSearch && (
              <div className="flex space-x-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search videos by title, user, or description..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <AdvancedFiltersPanel
                filters={currentFilters}
                onFiltersChange={handleFiltersChange}
                searchType="videos"
              />
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
            <span className="ml-3 text-gray-600">Searching videos...</span>
          </div>
        )}

        {/* Enhanced Search Results */}
        {useEnhancedSearch && searchResults && !isSearching && (
          <SearchResultsDisplay
            results={searchResults}
            searchTerm={searchResults.query.term}
            onItemClick={handleItemClick}
            onFacetClick={handleFacetClick}
            onBulkOperationsClick={handleBulkOperationsClick}
            enableBulkSelection={true}
            className="enhanced-search-results"
          />
        )}

        {/* Bulk Operations Panel */}
        {showBulkOperations && (
          <BulkOperationsPanel
            isOpen={showBulkOperations}
            onClose={() => setShowBulkOperations(false)}
          />
        )}
      </BulkSelectionProvider>

      {/* Legacy Videos Grid (when not using enhanced search) */}
      {!useEnhancedSearch && !isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
          <div key={video.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="aspect-video bg-gray-100 relative cursor-pointer" onClick={() => {
              setSelectedVideo(video);
              setShowVideoModal(true);
            }}>
              <img
                src={video.thumbnail || '/api/placeholder/400/225'}
                alt={video.title || 'Video thumbnail'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                <PlayCircle className="w-12 h-12 text-white" />
              </div>
              <div className="absolute top-2 left-2">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${
                  video.verificationStatus === 'approved' ? 'bg-green-600' :
                  video.verificationStatus === 'rejected' ? 'bg-red-600' :
                  'bg-yellow-600'
                }`}>
                  {video.verificationStatus === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {video.verificationStatus === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                  {video.verificationStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {video.verificationStatus.charAt(0).toUpperCase() + video.verificationStatus.slice(1)}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                  {video.title || 'Untitled Video'}
                </h3>
                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen(actionMenuOpen === video.id ? null : video.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {actionMenuOpen === video.id && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSelectedVideo(video);
                            setShowVideoModal(true);
                            setActionMenuOpen(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4 inline mr-2" />
                          Review
                        </button>
                        {video.verificationStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveVideo(video)}
                              disabled={reviewing === video.id}
                              className="block w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                              <ThumbsUp className="w-4 h-4 inline mr-2" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectVideo(video)}
                              disabled={reviewing === video.id}
                              className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                              <ThumbsDown className="w-4 h-4 inline mr-2" />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleFlagVideo(video)}
                          className="block w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-gray-100"
                        >
                          <AlertTriangle className="w-4 h-4 inline mr-2" />
                          Flag
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                <User className="w-3 h-3" />
                <span>{video.userName || 'Unknown User'}</span>
              </div>

              {video.createdAt && (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(typeof video.createdAt === 'string' ? video.createdAt : video.createdAt instanceof Date ? video.createdAt : video.createdAt.toDate()).toLocaleDateString()}</span>
                </div>
              )}

              {video.verificationStatus === 'pending' && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => handleApproveVideo(video)}
                    disabled={reviewing === video.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs py-2 px-3 rounded"
                  >
                    {reviewing === video.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mx-auto" />
                    ) : (
                      'Approve'
                    )}
                  </button>
                  <button
                    onClick={() => handleRejectVideo(video)}
                    disabled={reviewing === video.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs py-2 px-3 rounded"
                  >
                    {reviewing === video.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mx-auto" />
                    ) : (
                      'Reject'
                    )}
                  </button>
                </div>
              )}
            </div>
            </div>
          ))}
        </div>
      )}

      {!useEnhancedSearch && !isSearching && filteredVideos.length === 0 && (
        <div className="text-center py-12">
          <FileVideo className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No videos found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No videos have been submitted for review yet.'
            }
          </p>
        </div>
      )}

      {/* Video Details Modal */}
      {showVideoModal && selectedVideo && (
        <VideoDetailsModal
          video={selectedVideo}
          onClose={() => {
            setShowVideoModal(false);
            setSelectedVideo(null);
          }}
        />
      )}
    </div>
  );
};

export default VideoVerification;