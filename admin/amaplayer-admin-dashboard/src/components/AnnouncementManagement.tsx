import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit2, Trash2, Power, PowerOff, AlertCircle, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import announcementService from '../services/announcementService';
import { Announcement, CreateAnnouncementData, AnnouncementStats } from '../types/models/announcement';
import { Timestamp } from 'firebase/firestore';

const AnnouncementManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<AnnouncementStats>({ total: 0, active: 0, expired: 0, expiringSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    expiresAt: '',
    expiresTime: '',
    actionUrl: '',
    priority: 'normal' as 'low' | 'normal' | 'high'
  });

  // Load announcements and stats
  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const [announcementsList, statsData] = await Promise.all([
        announcementService.getAllAnnouncements(),
        announcementService.getStats()
      ]);
      setAnnouncements(announcementsList);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading announcements:', error);
      alert('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      message: '',
      expiresAt: '',
      expiresTime: '',
      actionUrl: '',
      priority: 'normal'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (announcement: Announcement) => {
    const expiresAt = announcement.expiresAt instanceof Timestamp
      ? announcement.expiresAt.toDate()
      : new Date(announcement.expiresAt);

    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      expiresAt: expiresAt.toISOString().split('T')[0],
      expiresTime: expiresAt.toTimeString().substring(0, 5),
      actionUrl: announcement.actionUrl || '',
      priority: announcement.priority || 'normal'
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      message: '',
      expiresAt: '',
      expiresTime: '',
      actionUrl: '',
      priority: 'normal'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    if (formData.title.length > 100) {
      alert('Title must be 100 characters or less');
      return;
    }
    if (!formData.message.trim()) {
      alert('Message is required');
      return;
    }
    if (formData.message.length > 500) {
      alert('Message must be 500 characters or less');
      return;
    }
    if (!formData.expiresAt || !formData.expiresTime) {
      alert('Expiration date and time are required');
      return;
    }

    // Combine date and time
    const expirationDateTime = new Date(`${formData.expiresAt}T${formData.expiresTime}`);
    if (expirationDateTime <= new Date()) {
      alert('Expiration date must be in the future');
      return;
    }

    try {
      const announcementData: CreateAnnouncementData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        expiresAt: expirationDateTime,
        priority: formData.priority,
        ...(formData.actionUrl && { actionUrl: formData.actionUrl.trim() })
      };

      if (editingAnnouncement) {
        // Update existing announcement
        await announcementService.updateAnnouncement(editingAnnouncement.id, announcementData);
        alert('Announcement updated successfully!');
      } else {
        // Create new announcement
        await announcementService.createAnnouncement(
          announcementData,
          currentUser?.uid || '',
          currentUser?.displayName || currentUser?.email || 'Admin'
        );
        alert('Announcement created successfully!');
      }

      handleCloseModal();
      loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Failed to save announcement');
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!window.confirm(`Are you sure you want to delete the announcement "${announcement.title}"?`)) {
      return;
    }

    try {
      await announcementService.deleteAnnouncement(announcement.id);
      alert('Announcement deleted successfully');
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await announcementService.toggleActive(announcement.id, !announcement.isActive);
      loadAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement status:', error);
      alert('Failed to update announcement status');
    }
  };

  const handleBulkDeleteExpired = async () => {
    if (!window.confirm('Are you sure you want to delete ALL expired announcements? This action cannot be undone.')) {
      return;
    }

    try {
      const count = await announcementService.bulkDeleteExpired();
      alert(`Successfully deleted ${count} expired announcement(s)`);
      loadAnnouncements();
    } catch (error) {
      console.error('Error bulk deleting expired announcements:', error);
      alert('Failed to delete expired announcements');
    }
  };

  const getStatusBadge = (announcement: Announcement) => {
    const now = new Date();
    const expiresAt = announcement.expiresAt instanceof Timestamp
      ? announcement.expiresAt.toDate()
      : new Date(announcement.expiresAt);
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (!announcement.isActive) {
      return <span className="badge badge-gray">Inactive</span>;
    }
    if (expiresAt <= now) {
      return <span className="badge badge-red">Expired</span>;
    }
    if (expiresAt.getTime() - now.getTime() <= twentyFourHours) {
      return <span className="badge badge-yellow">Expiring Soon</span>;
    }
    return <span className="badge badge-green">Active</span>;
  };

  const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    if (filterStatus === 'all') return true;

    const now = new Date();
    const expiresAt = announcement.expiresAt instanceof Timestamp
      ? announcement.expiresAt.toDate()
      : new Date(announcement.expiresAt);

    if (filterStatus === 'active') {
      return announcement.isActive && expiresAt > now;
    }
    if (filterStatus === 'expired') {
      return expiresAt <= now;
    }
    return true;
  });

  return (
    <div className="announcement-management">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Megaphone size={32} />
            Announcement Management
          </h1>
          <p className="page-subtitle">Create and manage global announcements for all users</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={20} />
          Create Announcement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Announcements</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-label">Active</div>
          <div className="stat-value">{stats.active}</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-label">Expiring Soon</div>
          <div className="stat-value">{stats.expiringSoon}</div>
          <div className="stat-note">Within 24 hours</div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-label">Expired</div>
          <div className="stat-value">{stats.expired}</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="table-controls">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({announcements.length})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active ({stats.active})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'expired' ? 'active' : ''}`}
            onClick={() => setFilterStatus('expired')}
          >
            Expired ({stats.expired})
          </button>
        </div>
        {stats.expired > 0 && (
          <button className="btn btn-danger-outline" onClick={handleBulkDeleteExpired}>
            <Trash2 size={16} />
            Delete All Expired
          </button>
        )}
      </div>

      {/* Announcements Table */}
      {loading ? (
        <div className="loading-state">Loading announcements...</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="empty-state">
          <Megaphone size={48} />
          <h3>No announcements found</h3>
          <p>Create your first announcement to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Title</th>
                <th>Message</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Expires At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnnouncements.map(announcement => (
                <tr key={announcement.id}>
                  <td>{getStatusBadge(announcement)}</td>
                  <td className="font-semibold">{announcement.title}</td>
                  <td className="message-cell">
                    {announcement.message.length > 60
                      ? `${announcement.message.substring(0, 60)}...`
                      : announcement.message}
                  </td>
                  <td>{announcement.createdByName}</td>
                  <td>{formatDate(announcement.createdAt)}</td>
                  <td>{formatDate(announcement.expiresAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-icon-primary"
                        onClick={() => handleOpenEditModal(announcement)}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className={`btn-icon ${announcement.isActive ? 'btn-icon-warning' : 'btn-icon-success'}`}
                        onClick={() => handleToggleActive(announcement)}
                        title={announcement.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDelete(announcement)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Title */}
                <div className="form-group">
                  <label htmlFor="title">
                    Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    className="form-input"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    maxLength={100}
                    placeholder="Enter announcement title"
                    required
                  />
                  <div className="char-counter">
                    {formData.title.length} / 100 characters
                  </div>
                </div>

                {/* Message */}
                <div className="form-group">
                  <label htmlFor="message">
                    Message <span className="required">*</span>
                  </label>
                  <textarea
                    id="message"
                    className="form-textarea"
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    maxLength={500}
                    rows={4}
                    placeholder="Enter announcement message"
                    required
                  />
                  <div className="char-counter">
                    {formData.message.length} / 500 characters
                  </div>
                </div>

                {/* Expiration Date and Time */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiresAt">
                      <Calendar size={16} />
                      Expiration Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="expiresAt"
                      className="form-input"
                      value={formData.expiresAt}
                      onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="expiresTime">
                      <Clock size={16} />
                      Expiration Time <span className="required">*</span>
                    </label>
                    <input
                      type="time"
                      id="expiresTime"
                      className="form-input"
                      value={formData.expiresTime}
                      onChange={e => setFormData({ ...formData, expiresTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Action URL (Optional) */}
                <div className="form-group">
                  <label htmlFor="actionUrl">
                    Action URL (Optional)
                  </label>
                  <input
                    type="url"
                    id="actionUrl"
                    className="form-input"
                    value={formData.actionUrl}
                    onChange={e => setFormData({ ...formData, actionUrl: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <div className="form-hint">
                    Users can click to navigate to this URL
                  </div>
                </div>

                {/* Preview */}
                {(formData.title || formData.message) && (
                  <div className="announcement-preview">
                    <div className="preview-label">
                      <AlertCircle size={16} />
                      Preview (How it will appear to users)
                    </div>
                    <div className="preview-notification">
                      <div className="preview-icon">
                        <Megaphone size={16} />
                      </div>
                      <div className="preview-content">
                        <div className="preview-header">
                          <span className="preview-title">{formData.title || 'Announcement Title'}</span>
                          <span className="preview-badge">ANNOUNCEMENT</span>
                        </div>
                        <p className="preview-message">{formData.message || 'Announcement message will appear here...'}</p>
                        {formData.expiresAt && formData.expiresTime && (
                          <div className="preview-meta">
                            Expires {new Date(`${formData.expiresAt}T${formData.expiresTime}`).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .announcement-management {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .page-subtitle {
          color: #666;
          margin: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #333;
        }

        .stat-note {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
        }

        .stat-success .stat-value { color: #22c55e; }
        .stat-warning .stat-value { color: #f59e0b; }
        .stat-danger .stat-value { color: #ef4444; }

        .table-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
        }

        .filter-tab {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: #f3f4f6;
        }

        .filter-tab.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f9fafb;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .message-cell {
          max-width: 300px;
          color: #666;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-green {
          background: #dcfce7;
          color: #166534;
        }

        .badge-yellow {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-red {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-gray {
          background: #f3f4f6;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          padding: 6px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon-primary {
          background: #dbeafe;
          color: #1e40af;
        }

        .btn-icon-primary:hover {
          background: #bfdbfe;
        }

        .btn-icon-success {
          background: #dcfce7;
          color: #166534;
        }

        .btn-icon-success:hover {
          background: #bbf7d0;
        }

        .btn-icon-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .btn-icon-warning:hover {
          background: #fde68a;
        }

        .btn-icon-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-icon-danger:hover {
          background: #fecaca;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-danger-outline {
          background: white;
          color: #ef4444;
          border: 1px solid #ef4444;
        }

        .btn-danger-outline:hover {
          background: #fef2f2;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 48px;
          background: white;
          border-radius: 8px;
        }

        .empty-state svg {
          color: #d1d5db;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          color: #374151;
        }

        .empty-state p {
          color: #6b7280;
          margin: 0;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .modal-close:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }

        .required {
          color: #ef4444;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-textarea {
          resize: vertical;
          font-family: inherit;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .char-counter {
          font-size: 12px;
          color: #6b7280;
          text-align: right;
          margin-top: 4px;
        }

        .form-hint {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .announcement-preview {
          margin-top: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .preview-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #3b82f6;
          font-size: 14px;
        }

        .preview-notification {
          display: flex;
          gap: 12px;
          background: linear-gradient(to right, #EFF6FF, #DBEAFE);
          border-left: 4px solid #3B82F6;
          padding: 12px;
          border-radius: 6px;
        }

        .preview-icon {
          color: #3b82f6;
        }

        .preview-content {
          flex: 1;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .preview-title {
          font-weight: 600;
          color: #1f2937;
        }

        .preview-badge {
          background: #3b82f6;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .preview-message {
          margin: 0 0 8px 0;
          color: #4b5563;
          font-size: 14px;
        }

        .preview-meta {
          font-size: 12px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .announcement-management {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .table-container {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default AnnouncementManagement;
