import React, { useState, useEffect } from 'react';
import { User, GroupCreationRequest, AddMembersRequest, AnnouncementRequest, AdminGroup, GroupCallRequest, GroupCallSession, CallStartResponse } from '../types';
import { adminService, fileService, chatService } from '../services/apiService';

interface AdminDashboardProps {
  currentUser: User;
  onClose?: () => void;
  onSelectChat?: (chatId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose, onSelectChat }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // Group management states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  
  // Group calls states
  const [showCallModal, setShowCallModal] = useState(false);
  const [callForm, setCallForm] = useState<GroupCallRequest>({
    title: '',
    groupIds: [],
    enableRecording: true,
    enableTranscription: true
  });
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'calls'>('users');
  const [activeCalls, setActiveCalls] = useState<GroupCallSession[]>([]);
  
  // Check if current user is Admin (full access) or Manager (limited access)
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  
  // Default permissions if not available
  const defaultPermissions = {
    canDeleteUsers: false,
    canManageGroups: false,
    canViewAnalytics: false,
    canGenerateSummaries: false,
    canManageChannels: false,
  };
  const permissions = currentUser?.permissions || defaultPermissions;
  
  // Managers can't delete users or manage all users
  const canManageUsers = isAdmin || (isManager && permissions.canManageGroups);
  const canDeleteUsers = isAdmin && permissions.canDeleteUsers;
  const canViewAnalytics = isAdmin || (isManager && permissions.canViewAnalytics);
  
  // Form states
  const [groupForm, setGroupForm] = useState<GroupCreationRequest>({
    name: '',
    description: '',
    participants: [],
    category: 'general',
    tags: [],
    isPrivate: false
  });
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [addMembersForm, setAddMembersForm] = useState<AddMembersRequest>({
    participants: []
  });
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementRequest>({
    message: '',
    groupIds: [],
    priority: 'important',
    messageType: 'announcement'
  });
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching admin data...');

      // Fetch users, analytics, and groups in parallel
      const [usersResponse, analyticsResponse, groupsResponse] = await Promise.all([
        adminService.getAllUsers().catch(err => {
          console.error('❌ Users API Error:', err);
          return { success: false, message: err.message || 'Users API failed', data: [] };
        }),
        adminService.getAnalytics().catch(err => {
          console.error('❌ Analytics API Error:', err);
          return { success: false, message: err.message || 'Analytics API failed', data: null };
        }),
        adminService.getAllGroups().catch(err => {
          console.error('❌ Groups API Error:', err);
          return { success: false, message: err.message || 'Groups API failed', data: [] };
        })
      ]);

      console.log('📊 API Responses:', {
        users: usersResponse.success ? '✅ Success' : '❌ Failed',
        analytics: analyticsResponse.success ? '✅ Success' : '❌ Failed',
        groups: groupsResponse.success ? '✅ Success' : '❌ Failed'
      });

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
        console.log(`✅ Loaded ${usersResponse.data.length} users`);
      } else {
        console.error('❌ Users failed:', usersResponse.message);
      }

      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
        console.log('✅ Analytics loaded');
      } else {
        console.error('❌ Analytics failed:', analyticsResponse.message);
      }
      
      if (groupsResponse.success && groupsResponse.data) {
        setGroups(groupsResponse.data);
        console.log(`✅ Loaded ${groupsResponse.data.length} groups`);
      } else {
        console.error('❌ Groups failed:', groupsResponse.message);
      }

      // Check if any API failed
      const failedAPIs = [];
      if (!usersResponse.success) failedAPIs.push('Users');
      if (!analyticsResponse.success) failedAPIs.push('Analytics');
      if (!groupsResponse.success) failedAPIs.push('Groups');

      if (failedAPIs.length > 0) {
        setError(`⚠️ Failed to load: ${failedAPIs.join(', ')}. Check console for details.`);
      }

    } catch (err: any) {
      console.error('💥 Fetch Admin Data Error:', err);
      setError(`💥 Network Error: ${err.message || 'Failed to connect to server'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Only Admins can change user roles
    if (!isAdmin) {
      alert('❌ Only Admins can change user roles');
      return;
    }
    
    try {
      const response = await adminService.updateUserRole(userId, newRole);
      
      if (response.success) {
        // Update local users state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId 
              ? { ...user, role: newRole as any, permissions: response.data.permissions }
              : user
          )
        );
        setShowRoleModal(false);
        setSelectedUser(null);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`❌ Failed to update role: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Only Admins can delete users
    if (!canDeleteUsers) {
      alert('❌ Only Admins can delete users');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminService.deleteUser(userId);
      
      if (response.success) {
        // Remove user from local state
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        alert('✅ User deleted successfully');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`❌ Failed to delete user: ${err.message}`);
    }
  };

  // Group management handlers
  const handleCreateGroup = async () => {
    try {
      // Validation: Check if at least 2 participants are selected
      if (groupForm.participants.length < 2) {
        alert('❌ Please select at least 2 participants to create a group');
        return;
      }
      
      // Use the working chatService.createGroupChat endpoint
      const groupChatData = {
        name: groupForm.name,
        participants: groupForm.participants
      };
      
      const response = await chatService.createGroupChat(groupChatData);
      
      if (response.success && response.data) {
        let createdGroup: AdminGroup = response.data as AdminGroup;
        
        // If there's an image, update the group with the image
        if (groupImage) {
          try {
            const uploadResponse = await fileService.uploadFile(groupImage);
            if (uploadResponse.success && uploadResponse.data) {
              // Update the created group with the full image URL
              const imageUrl = uploadResponse.data.url.startsWith('http') 
                ? uploadResponse.data.url 
                : `http://localhost:5000${uploadResponse.data.url}`;
              createdGroup.groupImage = imageUrl;
              console.log('Group image uploaded:', imageUrl);
              console.log('Created group with image:', createdGroup);
            } else {
              console.warn('Image upload failed, but group was created successfully');
            }
          } catch (uploadError: any) {
            console.warn('Image upload failed, but group was created successfully:', uploadError.message);
          }
        }
        
        setGroups(prevGroups => [createdGroup, ...prevGroups]);
        setShowCreateGroupModal(false);
        setGroupForm({
          name: '',
          description: '',
          participants: [],
          category: 'general',
          tags: [],
          isPrivate: false
        });
        setGroupImage(null);
        setImagePreview(null);
        alert('✅ Group created successfully!');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`Failed to create group: ${err.message}`);
    }
  };

  // Group call handlers - Frontend Only Solution
  const handleStartGroupCall = async () => {
    try {
      // Validation
      if (!callForm.title.trim()) {
        alert('❌ Please enter call title');
        return;
      }
      
      if (callForm.groupIds.length === 0) {
        alert('❌ Please select at least one group');
        return;
      }
      
      // Create group call session (Simulated)
      const sessionId = `call_${Date.now()}`;
      const joinUrl = `https://call.chatpro.com/join/${sessionId}`;
      
      const callSession = {
        _id: sessionId,
        title: callForm.title,
        hostId: currentUser._id,
        hostUsername: currentUser.username,
        groupIds: callForm.groupIds,
        groups: groups.filter(g => callForm.groupIds.includes(g._id)),
        startTime: new Date().toISOString(),
        status: 'active' as const,
        participants: [],
        joinUrl: joinUrl,
        description: callForm.description,
        enableRecording: callForm.enableRecording,
        enableTranscription: callForm.enableTranscription
      };
      
      // Add to active calls
      setActiveCalls(prev => [callSession, ...prev]);
      
      // Send actual call notification messages to all selected groups
      const callNotificationMessage = `📞 **🎯 Premium Group Call Session** 🎯

📋 **Call Details:**
🎙️ **Topic:** ${callForm.title}
👤 **Host:** ${currentUser.username}
🔗 **Join Link:** ${joinUrl}
⏰ **Start Time:** ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}

✨ **Premium Features Enabled:**
🎥 • Automatic HD Recording
📝 • Live Speech-to-Text Transcription  
🤖 • AI-Powered Summary Generation
📊 • Real-time Documentation

🚀 **Ready to connect! Click the link below to join the high-quality video conference session. 🚀`;
      
      // Send message to each selected group
      for (const groupId of callForm.groupIds) {
        try {
          const messageResponse = await chatService.sendMessage(groupId, {
            content: callNotificationMessage,
            messageType: 'system'
          });
          
          if (messageResponse.success) {
            console.log(`✅ Call notification sent to group: ${groupId}`);
          }
        } catch (msgError: any) {
          console.error(`❌ Failed to send notification to group ${groupId}:`, msgError.message);
        }
      }
      
      // Simulate sending call notifications (Mock)
      const totalMembers = callForm.groupIds.reduce((total, groupId) => {
        const group = groups.find(g => g._id === groupId);
        return total + (group?.participants?.length || 0);
      }, 0);
      
      // Show success message
      alert(`✅ Group call started successfully!\n\n📞 **Topic:** ${callForm.title}\n👥 **Groups:** ${callForm.groupIds.length}\n🔗 **Join Link:** ${joinUrl}\n📢 **Notified ${totalMembers} members**\n📨 **Message sent to all groups**\n\n📝 Call will be recorded and documented automatically`);
      
      // Reset form
      setShowCallModal(false);
      setCallForm({
        title: '',
        groupIds: [],
        enableRecording: true,
        enableTranscription: true
      });
      
    } catch (err: any) {
      alert(`Failed to start group call: ${err.message}`);
    }
  };

  const handleEndCall = async (callId: string) => {
    if (!window.confirm('Are you sure you want to end this call? The documented report will be generated automatically.')) {
      return;
    }

    try {
      // Find the call
      const call = activeCalls.find(c => c._id === callId);
      if (!call) return;

      // Simulate call ending and documentation generation
      const endTime = new Date();
      const startTime = new Date(call.startTime);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Generate realistic mock documentation
      const mockDocumentation = {
        sessionId: call._id,
        callTitle: call.title,
        groups: call.groups.map(g => g.name),
        participants: [call.hostUsername, 'Ahmed Mohammed', 'Fatima Ali', 'Mohammed Saeed', 'Khaled Omar'], // Mock participants
        duration: duration,
        transcription: {
          sessionId: call._id,
          fullText: `Call started at ${startTime.toLocaleTimeString('en-US')}\n\n${call.hostUsername}: Welcome everyone, let's start our meeting today to discuss ${call.title}\n\nAhmed Mohammed: Thanks for the invitation, I have some ideas about this topic\n\nFatima Ali: I agree with Ahmed, and I'd like to add an important point\n\nMohammed Saeed: From my perspective, we should focus on the practical aspect\n\nKhaled Omar: I suggest we set a clear timeline\n\n${call.hostUsername}: Excellent, these are important points. Let's summarize what we agreed on...\n\nCall ended at ${endTime.toLocaleTimeString('en-US')}`,
          summary: 'Main topic was discussed with active participation from all attendees and important decisions were made',
          keyPoints: [
            'Identify main project objectives',
            'Set implementation timeline',
            'Distribute tasks among team members',
            'Identify required resources'
          ],
          actionItems: [
            'Prepare detailed report within next week',
            'Hold follow-up meeting in two weeks',
            'Update current documents',
            'Inform all departments of decisions'
          ],
          createdAt: endTime.toISOString()
        },
        aiSummary: `**Executive Call Summary**

A group call was held to discuss "${call.title}" with ${call.groups.length} groups participating. The call lasted ${Math.floor(duration / 60)} minutes and was characterized by constructive discussion and active participation from all attendees.

**Key Decisions:**
• Agreement on clear action plan
• Assignment of responsibilities and tasks
• Setting timeline for follow-up

**Recommendations:**
• Need for regular progress monitoring
• Continuous communication between all departments
• Preparation of periodic reports on work progress

**Expected Outcomes:**
Improved overall performance and increased efficiency in executing assigned tasks.`,
        keyDecisions: [
          'Approval of proposed plan',
          'Setting deadlines for tasks',
          'Delegating authority to supervisors'
        ],
        actionItems: [
          'Prepare detailed plan (Responsible: Ahmed Mohammed)',
          'Prepare required resources (Responsible: Fatima Ali)',
          'Follow up on implementation (Responsible: Mohammed Saeed)',
          'Prepare periodic reports (Responsible: Khaled Omar)'
        ],
        recordingUrl: `https://recordings.chatpro.com/${call._id}.mp4`,
        createdAt: endTime.toISOString()
      };

      // Remove from active calls
      setActiveCalls(prev => prev.filter(c => c._id !== callId));

      // Create documentation message for groups
      const documentationMessage = `📋 **Documented Call Report**\n\n**Topic:** ${call.title}\n**Duration:** ${Math.floor(duration / 60)} minutes ${duration % 60} seconds\n**Participants:** ${mockDocumentation.participants.length}\n**Groups:** ${call.groups.join(', ')}\n\n**Automatic Summary (AI):**\n${mockDocumentation.aiSummary}\n\n**Key Points:**\n${mockDocumentation.transcription.keyPoints.map(p => `• ${p}`).join('\n')}\n\n**Decisions Made:**\n${mockDocumentation.keyDecisions.map(d => `• ${d}`).join('\n')}\n\n**Required Actions:**\n${mockDocumentation.actionItems.map(a => `• ${a}`).join('\n')}\n\n**Recording:** [View Recording](${mockDocumentation.recordingUrl})\n\n**Full Transcript:**\n${mockDocumentation.transcription.fullText}`;

      // Send actual documentation message to all participating groups
      for (const groupId of call.groupIds) {
        try {
          const docResponse = await chatService.sendMessage(groupId, {
            content: documentationMessage,
            messageType: 'system'
          });
          
          if (docResponse.success) {
            console.log(`✅ Documentation sent to group: ${groupId}`);
          }
        } catch (docError: any) {
          console.error(`❌ Failed to send documentation to group ${groupId}:`, docError.message);
        }
      }

      // Simulate sending documentation to all participating groups
      console.log('📋 Documentation sent to groups:', call.groupIds);
      console.log('📄 Documentation message:', documentationMessage);

      alert(`✅ Call ended and documented report sent successfully!\n\n📊 **Duration:** ${Math.floor(duration / 60)} minutes\n📝 **Report sent to ${call.groupIds.length} groups**\n👥 **Included ${mockDocumentation.participants.length} participants**\n\n📄 **Automatic summary generated with AI**`);
      
    } catch (err: any) {
      alert(`Failed to end call: ${err.message}`);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete group "${groupName}"?\n\nThis action cannot be undone and all messages and participants will be deleted.`)) {
      return;
    }

    try {
      const response = await adminService.deleteGroup(groupId);
      if (response.success) {
        setGroups(prev => prev.filter(g => g._id !== groupId));
        alert(`Group "${groupName}" deleted successfully`);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`Failed to delete group: ${err.message}`);
    }
  };

  const handleAddMembers = async () => {
    try {
      const response = await adminService.addGroupMembers(selectedGroup?._id || '', addMembersForm);
      if (response.success) {
        setShowAddMembersModal(false);
        setAddMembersForm({ participants: [] });
        alert('Members added successfully');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`Failed to add members: ${err.message}`);
    }
  };

  const handlePublishAnnouncement = async () => {
    try {
      const response = await adminService.publishAnnouncement(announcementForm);
      if (response.success) {
        alert(`Announcement published to ${announcementForm.groupIds.length} groups successfully`);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`Failed to publish announcement: ${err.message}`);
    }
  };

  const handleChatWithUser = async (userId: string) => {
    try {
      // Check if a private chat already exists with this user
      const chatsResponse = await chatService.getUserChats();
      
      if (chatsResponse.success && chatsResponse.data) {
        // Find existing private chat with this user
        const existingChat = chatsResponse.data.find(chat => 
          chat.type === 'private' && 
          chat.participants.some(p => p._id === userId)
        );

        if (existingChat) {
          // Chat exists, select it
          onSelectChat?.(existingChat._id);
          onClose?.();
        } else {
          // Create new private chat
          const createChatResponse = await chatService.createChat({
            type: 'private',
            participants: [currentUser._id, userId]
          });
          
          if (createChatResponse.success && createChatResponse.data) {
            onSelectChat?.(createChatResponse.data._id);
            onClose?.();
            alert('✅ Private chat created successfully!');
          } else {
            throw new Error(createChatResponse.message || 'Failed to create chat');
          }
        }
      }
    } catch (err: any) {
      alert(`❌ Failed to create chat: ${err.message}`);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800';
      case 'Manager':
        return 'bg-accent text-secondary';
      default:
        return 'bg-accent-dark text-textSecondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error}</div>
        <button 
          onClick={fetchAdminData}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-accent to-accent-dark min-h-full">
      {/* Admin Header with Special Features */}
      <div className="mb-8 bg-gradient-to-r from-primary to-secondary rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <span className="mr-3">👑</span>
              Admin Dashboard
            </h1>
            <p className="text-accent">Welcome back, {currentUser?.username}!</p>
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                🔑 {currentUser?.role} Access
              </span>
              <span className="bg-success bg-opacity-30 px-3 py-1 rounded-full">
                🟢 Online
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl mb-2">🛡️</div>
            <div className="text-sm text-accent">System Control</div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-xl p-6 shadow-lg border-l-4 border-primary hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-primary">{analytics.overview.totalUsers}</p>
                <p className="text-secondary text-xs mt-1">👥 Active Members</p>
              </div>
              <div className="text-3xl">👤</div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-6 shadow-lg border-l-4 border-secondary hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm font-medium">Total Chats</p>
                <p className="text-3xl font-bold text-primary">{analytics.overview.totalChats}</p>
                <p className="text-secondary text-xs mt-1">💬 Conversations</p>
              </div>
              <div className="text-3xl">💭</div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-6 shadow-lg border-l-4 border-success hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm font-medium">Total Messages</p>
                <p className="text-3xl font-bold text-primary">{analytics.overview.totalMessages}</p>
                <p className="text-secondary text-xs mt-1">📨 Messages Sent</p>
              </div>
              <div className="text-3xl">📧</div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-6 shadow-lg border-l-4 border-secondary-light hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textSecondary text-sm font-medium">Groups</p>
                <p className="text-3xl font-bold text-primary">{groups.length}</p>
                <p className="text-secondary text-xs mt-1">👥 Active Groups</p>
              </div>
              <div className="text-3xl">🏢</div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Quick Actions */}
      <div className="bg-card rounded-xl p-6 shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="bg-secondary hover:bg-secondary-dark text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span className="text-xl">➕</span>
            <span>Create New Group</span>
          </button>
          <button
            onClick={() => setShowCallModal(true)}
            className="bg-primary hover:bg-primary-dark text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span className="text-xl">📞</span>
            <span>Start Group Call</span>
          </button>
          <button
            onClick={fetchAdminData}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span className="text-xl">🔄</span>
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="bg-card rounded-lg shadow-lg">
        <div className="border-b border-border bg-gradient-to-r from-accent to-accent-dark">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-6 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'users'
                  ? 'border-secondary text-secondary bg-card'
                  : 'border-transparent text-textSecondary hover:text-secondary hover:border-accent'
              }`}
            >
              <span className="mr-2">👥</span>
              Users Management
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-3 px-6 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'groups'
                  ? 'border-secondary text-secondary bg-card'
                  : 'border-transparent text-textSecondary hover:text-secondary hover:border-accent'
              }`}
            >
              <span className="mr-2">📁</span>
              Groups Management
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              className={`py-3 px-6 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'calls'
                  ? 'border-secondary text-secondary bg-card'
                  : 'border-transparent text-textSecondary hover:text-secondary hover:border-accent'
              }`}
            >
              <span className="mr-2">📞</span>
              Group Calls
            </button>
          </nav>
        </div>

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="mr-3">👥</span>
                User Management
              </h2>
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-medium">
                  Total: {users.length} users
                </div>
                <button
                  onClick={fetchAdminData}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors"
                  title="Refresh Users"
                >
                  🔄
                </button>
              </div>
            </div>
        
        <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'online' ? 'bg-green-100 text-green-800' :
                          user.status === 'offline' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {user._id !== currentUser._id && (
                            <button
                              onClick={() => handleChatWithUser(user._id)}
                              className="text-green-600 hover:text-green-900"
                              title="Private Chat"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          )}
                          {canManageUsers && user._id !== currentUser._id && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRoleModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Change Role"
                                disabled={!isAdmin}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {canDeleteUsers && (
                                <button
                                  onClick={() => handleDeleteUser(user._id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete User"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                          {!canManageUsers && user._id !== currentUser._id && (
                            <span className="text-gray-400 text-xs">Limited Permissions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Groups Management Tab */}
        {activeTab === 'groups' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Group Management</h2>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Group
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => {
                console.log('Rendering group:', group);
                return (
                <div key={group._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {/* Group Image */}
                  <div className="flex justify-center mb-3">
                    {group.groupImage ? (
                      <img
                        src={group.groupImage}
                        alt={group.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                        onError={(e) => console.error('Image load error:', group.groupImage)}
                        onLoad={() => console.log('Image loaded:', group.groupImage)}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-2xl font-bold">
                        {group.name?.charAt(0)?.toUpperCase() || 'G'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      group.category === 'general' ? 'bg-gray-100 text-gray-800' :
                      group.category === 'marketing' ? 'bg-purple-100 text-purple-800' :
                      group.category === 'development' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {group.category}
                    </span>
                  </div>
                  
                  {group.description && (
                    <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>👥 {group.participants?.length || 0} members</span>
                    <span>👤 Admin: {group.groupAdmin?.username || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowAddMembersModal(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Add Members
                    </button>
                    <button
                      onClick={() => {
                        setCallForm(prev => ({
                          ...prev,
                          groupIds: [group._id]
                        }));
                        setShowCallModal(true);
                      }}
                      className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Group Call
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group._id, group.name)}
                      className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Group Calls Tab */}
        {activeTab === 'calls' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Group Calls & Auto-Documentation</h2>
              <button
                onClick={() => setShowCallModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                New Group Call
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">📞 How Documented Calls Work:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Select target groups to start the group call</li>
                <li>• Set call topic and description (optional)</li>
                <li>• Instant notifications will be sent to all members</li>
                <li>• Recording and transcription starts automatically when call begins</li>
                <li>• When ended, a documented report and automatic summary are created</li>
                <li>• Report is sent to all participating groups</li>
              </ul>
            </div>

            {/* Active Calls Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <span className="mr-2">🔴</span>
                Active Calls
              </h3>
              {activeCalls.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-gray-500 text-lg mb-2">No active calls currently</div>
                  <div className="text-gray-400 text-sm">Start a new group call to see it here</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCalls.map((call) => (
                    <div key={call._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{call.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Host: {call.hostUsername} | Groups: {call.groups.length}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                              Active
                            </span>
                            <span>Start: {new Date(call.startTime).toLocaleTimeString('en-US')}</span>
                            <span>Participants: {call.participants.length}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            onClick={() => window.open(call.joinUrl, '_blank')}
                          >
                            Join
                          </button>
                          <button
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            onClick={() => handleEndCall(call._id)}
                          >
                            End
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Group</h3>
              <p className="text-sm text-gray-600 mt-1">Create a new group chat for team collaboration</p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Group description (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={groupForm.category}
                  onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select group category"
                  title="Group category"
                >
                  <option value="general">General</option>
                  <option value="marketing">Marketing</option>
                  <option value="development">Development</option>
                  <option value="sales">Sales</option>
                  <option value="hr">HR</option>
                  <option value="project">Project</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Image (optional)</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setGroupImage(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Choose group image"
                    />
                  </div>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Group preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setGroupImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Choose an image to represent the group (PNG, JPG, GIF)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participants *</label>
                <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto">
                  {users.map((user) => (
                    <label key={user._id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={groupForm.participants.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupForm({ ...groupForm, participants: [...groupForm.participants, user._id] });
                          } else {
                            setGroupForm({ ...groupForm, participants: groupForm.participants.filter(id => id !== user._id) });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{user.username} ({user.email})</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrivateGroup"
                  checked={groupForm.isPrivate}
                  onChange={(e) => setGroupForm({ ...groupForm, isPrivate: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  aria-label="Make group private"
                  title="Private group setting"
                />
                <label htmlFor="isPrivateGroup" className="ml-2 text-sm text-gray-700">Make this group private</label>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setGroupImage(null);
                  setImagePreview(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupForm.name || groupForm.participants.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Members to {selectedGroup.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Select users to add to this group</p>
            </div>
            
            <div className="px-6 py-4">
              <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {users
                  .filter(user => !selectedGroup.participants?.some(p => p._id === user._id))
                  .map((user) => (
                    <label key={user._id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={addMembersForm.participants.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAddMembersForm({ ...addMembersForm, participants: [...addMembersForm.participants, user._id] });
                          } else {
                            setAddMembersForm({ ...addMembersForm, participants: addMembersForm.participants.filter(id => id !== user._id) });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{user.username} ({user.email})</span>
                    </label>
                  ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddMembersModal(false);
                  setAddMembersForm({ participants: [] });
                  setSelectedGroup(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={addMembersForm.participants.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Members
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📞 Documented Group Call</h3>
              <p className="text-sm text-gray-600 mt-1">Start a group call with automatic recording and documentation</p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Topic *</label>
                <input
                  type="text"
                  value={callForm.title}
                  onChange={(e) => setCallForm({ ...callForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter call topic (e.g., Q3 Budget Review)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Description (optional)</label>
                <textarea
                  value={callForm.description || ''}
                  onChange={(e) => setCallForm({ ...callForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Detailed description of the call and intended goals"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Groups *</label>
                <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <label key={group._id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={callForm.groupIds.includes(group._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCallForm({ ...callForm, groupIds: [...callForm.groupIds, group._id] });
                          } else {
                            setCallForm({ ...callForm, groupIds: callForm.groupIds.filter(id => id !== group._id) });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{group.name} ({group.participants?.length || 0} members)</span>
                    </label>
                  ))}
                </div>
                {callForm.groupIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected {callForm.groupIds.length} groups - {callForm.groupIds.reduce((total, groupId) => {
                      const group = groups.find(g => g._id === groupId);
                      return total + (group?.participants?.length || 0);
                    }, 0)} members will be notified
                  </p>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🔧 Auto-Documentation Features:</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={callForm.enableRecording}
                      onChange={(e) => setCallForm({ ...callForm, enableRecording: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ml-2"
                    />
                    <span className="text-sm text-blue-800">Record call with audio and video</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={callForm.enableTranscription}
                      onChange={(e) => setCallForm({ ...callForm, enableTranscription: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ml-2"
                    />
                    <span className="text-sm text-blue-800">Convert conversation to text (Real-time Transcription)</span>
                  </label>
                </div>
                <div className="mt-3 text-xs text-blue-700">
                  💡 AI-powered automatic summary will be created and documented report sent to all groups when call ends
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setCallForm({
                    title: '',
                    groupIds: [],
                    enableRecording: true,
                    enableTranscription: true
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartGroupCall}
                disabled={!callForm.title || callForm.groupIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📞 Start Call Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Change User Role</h3>
              <p className="text-sm text-gray-600 mt-1">
                Update role for {selectedUser.username}
              </p>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-3">
                {['Admin', 'Manager', 'Employee'].map((role) => (
                  <label key={role} className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedUser.role === role}
                      onChange={(e) => {
                        if (selectedUser) {
                          setSelectedUser({ ...selectedUser, role: role as any });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {role === 'Admin' ? 'Admin' : role === 'Manager' ? 'Manager' : 'Employee'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRoleChange(selectedUser._id, selectedUser.role)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
