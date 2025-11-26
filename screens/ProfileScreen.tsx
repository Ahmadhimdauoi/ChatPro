import React, { useState, useRef } from 'react';
import { User } from '../types';
import { uploadProfilePicture } from '../services/apiService';

interface ProfileScreenProps {
  currentUser: User;
  onClose: () => void;
  onProfileUpdate?: (updatedUser: User) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  currentUser, 
  onClose, 
  onProfileUpdate 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Try to upload to server, but fall back to local preview if it fails
      try {
        const result = await uploadProfilePicture(file, currentUser._id);
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          alert('✅ Profile picture updated successfully!');
          
          // Update user data with new profile picture from server
          if (onProfileUpdate) {
            const updatedUser = {
              ...currentUser,
              profilePicture: result.profilePictureUrl
            };
            onProfileUpdate(updatedUser);
          }
        }, 500);
      } catch (uploadError) {
        console.warn('Server upload failed, using local preview:', uploadError);
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Fallback: use the local preview as the profile picture
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          alert('✅ Profile picture updated locally! (Server upload failed)');
          
          // Update user data with local preview
          if (onProfileUpdate) {
            const updatedUser = {
              ...currentUser,
              profilePicture: previewImage // Use the local preview
            };
            onProfileUpdate(updatedUser);
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(`❌ Failed to upload profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      setUploadProgress(0);
      setPreviewImage(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getProfilePicture = () => {
    if (previewImage) return previewImage;
    if (currentUser.profilePicture) return currentUser.profilePicture;
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center">
              <span className="mr-3">👤</span>
              My Profile
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="Close profile"
              aria-label="Close profile"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Profile Picture Section */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-secondary shadow-lg">
                {getProfilePicture() ? (
                  <img 
                    src={getProfilePicture()} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                    <span className="text-4xl font-bold text-secondary">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Upload Progress Overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <div className="text-xs">{uploadProgress}%</div>
                  </div>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
              title="Upload profile picture"
              aria-label="Upload profile picture"
            />
            
            <div className="mt-4 space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-secondary hover:bg-secondary-dark text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : '📷 Update Photo'}
              </button>
              
              {previewImage && !isUploading && (
                <button
                  onClick={() => setPreviewImage(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <p className="text-xs text-textSecondary mt-2">
              JPG, PNG, GIF, WebP • Max 5MB
            </p>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-accent rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                <span className="mr-2">📋</span>
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Full Name
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2 text-primary">
                    {currentUser.username}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Username
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2 text-primary">
                    @{currentUser.username}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Email Address
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2 text-primary">
                    {currentUser.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Department
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2 text-primary">
                    {currentUser.department || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-accent rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                <span className="mr-2">🔐</span>
                Account Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Role
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      currentUser.role === 'Admin' 
                        ? 'bg-red-100 text-red-800'
                        : currentUser.role === 'Manager'
                        ? 'bg-accent text-secondary'
                        : 'bg-accent-dark text-textSecondary'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Status
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      currentUser.status === 'online' 
                        ? 'bg-success text-success'
                        : 'bg-accent text-textSecondary'
                    }`}>
                      {currentUser.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    Join Date
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2 text-primary">
                    {currentUser.createdAt ? formatDate(currentUser.createdAt) : 'Not available'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">
                    User ID
                  </label>
                  <div className="bg-card border border-border rounded-lg px-4 py-2 text-textSecondary font-mono text-sm">
                    {currentUser._id}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-accent rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Activity Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <div className="text-2xl font-bold text-primary mb-1">
                    📱
                  </div>
                  <div className="text-sm text-textSecondary">
                    Active User
                  </div>
                </div>
                
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <div className="text-2xl font-bold text-primary mb-1">
                    💬
                  </div>
                  <div className="text-sm text-textSecondary">
                    Chat Participant
                  </div>
                </div>
                
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <div className="text-2xl font-bold text-primary mb-1">
                    🌐
                  </div>
                  <div className="text-sm text-textSecondary">
                    PONGO Team
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
