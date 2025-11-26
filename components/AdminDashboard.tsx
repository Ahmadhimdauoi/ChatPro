import React, { useState, useEffect } from 'react';
import { User, GroupCreationRequest, AddMembersRequest, AnnouncementRequest, AdminGroup } from '../types';
import { adminService } from '../services/apiService';

interface AdminDashboardProps {
  currentUser: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
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
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'announcements'>('users');
  
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
  const [addMembersForm, setAddMembersForm] = useState<AddMembersRequest>({
    participants: []
  });
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementRequest>({
    message: '',
    groupIds: [],
    priority: 'important',
    messageType: 'announcement'
  });

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
      alert('❌ فقط الأدمن يمكنه تغيير أدوار المستخدمين');
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
      alert(`❌ فشل تحديث الدور: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Only Admins can delete users
    if (!canDeleteUsers) {
      alert('❌ فقط الأدمن يمكنه حذف المستخدمين');
      return;
    }
    
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      const response = await adminService.deleteUser(userId);
      
      if (response.success) {
        // Remove user from local state
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        alert('✅ تم حذف المستخدم بنجاح');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`❌ فشل حذف المستخدم: ${err.message}`);
    }
  };

  // Group management handlers
  const handleCreateGroup = async () => {
    try {
      const response = await adminService.createGroup(groupForm);
      
      if (response.success) {
        setGroups(prevGroups => [response.data, ...prevGroups]);
        setShowCreateGroupModal(false);
        setGroupForm({
          name: '',
          description: '',
          participants: [],
          category: 'general',
          tags: [],
          isPrivate: false
        });
        alert('✅ تم إنشاء المجموعة بنجاح!');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`Failed to create group: ${err.message}`);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مجموعة "${groupName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع الرسائل والمشاركين.`)) {
      return;
    }

    try {
      const response = await adminService.deleteGroup(groupId);
      
      if (response.success) {
        setGroups(prevGroups => prevGroups.filter(group => group._id !== groupId));
        alert('✅ تم حذف المجموعة بنجاح!');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`فشل حذف المجموعة: ${err.message}`);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroup) return;
    
    try {
      const response = await adminService.addGroupMembers(selectedGroup._id, addMembersForm);
      
      if (response.success) {
        // Update group in local state
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group._id === selectedGroup._id 
              ? { ...group, participants: [...group.participants, ...response.data.newParticipants.map((id: string) => users.find(u => u._id === id)!)] }
              : group
          )
        );
        setShowAddMembersModal(false);
        setAddMembersForm({ participants: [] });
        setSelectedGroup(null);
        alert('✅ تم إضافة الأعضاء بنجاح!');
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
        setShowAnnouncementModal(false);
        setAnnouncementForm({
          message: '',
          groupIds: [],
          priority: 'important',
          messageType: 'announcement'
        });
        alert(`✅ تم نشر الإعلان إلى ${response.data.publishedTo.length} مجموعة!`);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`Failed to publish announcement: ${err.message}`);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800';
      case 'Manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 min-h-full">
      {/* Admin Header with Special Features */}
      <div className="mb-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <span className="mr-3">👑</span>
              Admin Dashboard
            </h1>
            <p className="text-purple-100">Welcome back, {currentUser?.username}!</p>
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                🔑 {currentUser?.role} Access
              </span>
              <span className="bg-green-400 bg-opacity-30 px-3 py-1 rounded-full">
                🟢 Online
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl mb-2">🛡️</div>
            <div className="text-sm text-purple-100">System Control</div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalUsers}</p>
                <p className="text-purple-600 text-xs mt-1">👥 Active Members</p>
              </div>
              <div className="text-3xl">👤</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Chats</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalChats}</p>
                <p className="text-blue-600 text-xs mt-1">💬 Conversations</p>
              </div>
              <div className="text-3xl">💭</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Messages</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalMessages}</p>
                <p className="text-green-600 text-xs mt-1">📨 Messages Sent</p>
              </div>
              <div className="text-3xl">📧</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Groups</p>
                <p className="text-3xl font-bold text-gray-900">{groups.length}</p>
                <p className="text-orange-600 text-xs mt-1">👥 Active Groups</p>
              </div>
              <div className="text-3xl">🏢</div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span className="text-xl">➕</span>
            <span>Create New Group</span>
          </button>
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span className="text-xl">📢</span>
            <span>Broadcast Announcement</span>
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
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-6 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'users'
                  ? 'border-purple-500 text-purple-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300'
              }`}
            >
              <span className="mr-2">👥</span>
              Users Management
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-3 px-6 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'groups'
                  ? 'border-purple-500 text-purple-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300'
              }`}
            >
              <span className="mr-2">📁</span>
              Groups Management
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`py-3 px-6 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'announcements'
                  ? 'border-purple-500 text-purple-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300'
              }`}
            >
              <span className="mr-2">📢</span>
              Announcements
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
                          {canManageUsers && user._id !== currentUser._id && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRoleModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="تغيير الدور"
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
                                  title="حذف المستخدم"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                          {!canManageUsers && (
                            <span className="text-gray-400 text-xs">صلاحيات محدودة</span>
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
              <h2 className="text-xl font-semibold">إدارة المجموعات</h2>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إنشاء مجموعة
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <div key={group._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
                    <span>👥 {group.participants?.length || 0} عضو</span>
                    <span>👤 المشرف: {group.groupAdmin?.username || 'غير معروف'}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowAddMembersModal(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      إضافة أعضاء
                    </button>
                    <button
                      onClick={() => {
                        setAnnouncementForm(prev => ({
                          ...prev,
                          groupIds: [group._id]
                        }));
                        setShowAnnouncementModal(true);
                      }}
                      className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      إعلان
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group._id, group.name)}
                      className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">بث الإعلانات</h2>
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                إعلان جديد
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📢 كيفية استخدام الإعلانات:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• اختر مجموعات متعددة لبث رسالتك</li>
                <li>• اختر مستوى الأولوية (عادي، عاجل، مهم)</li>
                <li>• سيتلقى جميع أعضاء المجموعة إشعارات فورية</li>
                <li>• يتم تمييز الإعلانات كرسائل خاصة في الدردشة</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">إنشاء مجموعة جديدة</h3>
              <p className="text-sm text-gray-600 mt-1">إنشاء مجموعة دردشة جديدة للتعاون الفريقي</p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المجموعة *</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل اسم المجموعة"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف المجموعة (اختياري)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                <select
                  value={groupForm.category}
                  onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select group category"
                  title="Group category"
                >
                  <option value="general">عام</option>
                  <option value="marketing">التسويق</option>
                  <option value="development">التطوير</option>
                  <option value="sales">المبيعات</option>
                  <option value="hr">الموارد البشرية</option>
                  <option value="project">المشروع</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المشاركون *</label>
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
                <label htmlFor="isPrivateGroup" className="ml-2 text-sm text-gray-700">جعل هذه المجموعة خاصة</label>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupForm.name || groupForm.participants.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إنشاء مجموعة
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
              <h3 className="text-lg font-semibold text-gray-900">إضافة أعضاء إلى {selectedGroup.name}</h3>
              <p className="text-sm text-gray-600 mt-1">اختر المستخدمين لإضافتهم إلى هذه المجموعة</p>
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
                إلغاء
              </button>
              <button
                onClick={handleAddMembers}
                disabled={addMembersForm.participants.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إضافة أعضاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">بث الإعلان</h3>
              <p className="text-sm text-gray-600 mt-1">إرسال رسالة إلى مجموعات متعددة</p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرسالة *</label>
                <textarea
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="أدخل رسالة الإعلان الخاصة بك"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                <select
                  value={announcementForm.priority}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select announcement priority"
                  title="Announcement priority level"
                >
                  <option value="normal">عادي</option>
                  <option value="important">مهم</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر المجموعات *</label>
                <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto">
                  {groups.map((group) => (
                    <label key={group._id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={announcementForm.groupIds.includes(group._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAnnouncementForm({ ...announcementForm, groupIds: [...announcementForm.groupIds, group._id] });
                          } else {
                            setAnnouncementForm({ ...announcementForm, groupIds: announcementForm.groupIds.filter(id => id !== group._id) });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{group.name} ({group.participants?.length || 0} عضو)</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setAnnouncementForm({
                    message: '',
                    groupIds: [],
                    priority: 'important',
                    messageType: 'announcement'
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handlePublishAnnouncement}
                disabled={!announcementForm.message || announcementForm.groupIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إرسال الإعلان
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
              <h3 className="text-lg font-semibold text-gray-900">تغيير دور المستخدم</h3>
              <p className="text-sm text-gray-600 mt-1">
                تحديث الدور لـ {selectedUser.username}
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
                      {role === 'Admin' ? 'أدمن' : role === 'Manager' ? 'مدير' : 'موظف'}
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
                إلغاء
              </button>
              <button
                onClick={() => handleRoleChange(selectedUser._id, selectedUser.role)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                تحديث الدور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
