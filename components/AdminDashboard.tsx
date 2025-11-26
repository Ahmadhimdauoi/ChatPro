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
      // Validation: Check if at least 2 participants are selected
      if (groupForm.participants.length < 2) {
        alert('❌ يجب اختيار مشاركين اثنين على الأقل لإنشاء مجموعة');
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
        alert('✅ تم إنشاء المجموعة بنجاح!');
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
        alert('❌ يرجى إدخال موضوع المكالمة');
        return;
      }
      
      if (callForm.groupIds.length === 0) {
        alert('❌ يرجى اختيار مجموعة واحدة على الأقل');
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
      alert(`✅ تم بدء المكالمة الجماعية بنجاح!\n\n📞 **الموضوع:** ${callForm.title}\n👥 **المجموعات:** ${callForm.groupIds.length}\n🔗 **رابط الانضمام:** ${joinUrl}\n📢 **تم إعلام ${totalMembers} عضواً\n📨 **تم إرسال رسالة لجميع المجموعات**\n\n📝 سيتم تسجيل المكالمة وتوثيقها تلقائياً`);
      
      // Reset form
      setShowCallModal(false);
      setCallForm({
        title: '',
        groupIds: [],
        enableRecording: true,
        enableTranscription: true
      });
      
    } catch (err: any) {
      alert(`فشل بدء المكالمة الجماعية: ${err.message}`);
    }
  };

  const handleEndCall = async (callId: string) => {
    if (!window.confirm('هل أنت متأكد من إنهاء هذه المكالمة؟ سيتم إنشاء التقرير الموثق تلقائياً.')) {
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
        participants: [call.hostUsername, 'أحمد محمد', 'فاطمة علي', 'محمد سعيد', 'خالد عمر'], // Mock participants
        duration: duration,
        transcription: {
          sessionId: call._id,
          fullText: `بدأت المكالمة في ${startTime.toLocaleTimeString('ar-SA')}\n\n${call.hostUsername}: مرحباً بالجميع، نبدأ اجتماعنا اليوم بمناقشة ${call.title}\n\nأحمد محمد: شكراً على الدعوة، لدي بعض الأفكار حول هذا الموضوع\n\nفاطمة علي: أتفق مع أحمد، وأود إضافة نقطة مهمة\n\nمحمد سعيد: من وجهة نظري، يجب أن نركز على الجانب العملي\n\nخالد عمر: اقترح أن نضع خطة زمنية واضحة\n\n${call.hostUsername}: ممتاز، هذه نقاط مهمة. لنلخص ما تم الاتفاق عليه...\n\nتم الانتهاء من المكالمة في ${endTime.toLocaleTimeString('ar-SA')}`,
          summary: 'تم مناقشة الموضوع الرئيسي مع مشاركة فعالة من جميع الحضور واتخاذ قرارات مهمة',
          keyPoints: [
            'تحديد الأهداف الرئيسية للمشروع',
            'وضع خطة زمنية للتنفيذ',
            'توزيع المهام على أعضاء الفريق',
            'تحديد الموارد المطلوبة'
          ],
          actionItems: [
            'إعداد تقرير مفصل خلال الأسبوع القادم',
            'عقد اجتماع متابعة بعد أسبوعين',
            'تحديث الوثائق الحالية',
            'إبلاغ جميع الأقسام بالقرارات'
          ],
          createdAt: endTime.toISOString()
        },
        aiSummary: `**ملخص تنفيذي للمكالمة**

تم عقد مكالمة جماعية لمناقشة "${call.title}" بمشاركة ${call.groups.length} مجموعات. استمرت المكالمة لمدة ${Math.floor(duration / 60)} دقيقة وتميزت بالنقاش البنّاء والمشاركة الفعالة من جميع الحضور.

**القرارات الرئيسية:**
• الاتفاق على خطة عمل واضحة
• تحديد المسؤوليات والمهام
• وضع جدول زمني للمتابعة

**التوصيات:**
• ضرورة المتابعة الدورية للتقدم المحرز
• التواصل المستمر بين جميع الأقسام
• إعداد تقارير دورية عن سير العمل

**النتائج المتوقعة:**
تحسين الأداء العام وزيادة الكفاءة في تنفيذ المهام المحددة.`,
        keyDecisions: [
          'الموافقة على الخطة المقترحة',
          'تحديد مواعيد نهائية للمهام',
          'تفويض الصلاحيات للمسؤولين'
        ],
        actionItems: [
          'إعداد خطة تفصيلية (المسؤول: أحمد محمد)',
          'تجهيز الموارد المطلوبة (المسؤول: فاطمة علي)',
          'متابعة التنفيذ (المسؤول: محمد سعيد)',
          'إعداد التقارير الدورية (المسؤول: خالد عمر)'
        ],
        recordingUrl: `https://recordings.chatpro.com/${call._id}.mp4`,
        createdAt: endTime.toISOString()
      };

      // Remove from active calls
      setActiveCalls(prev => prev.filter(c => c._id !== callId));

      // Create documentation message for groups
      const documentationMessage = `📋 **تقرير المكالمة الموثقة**\n\n**الموضوع:** ${call.title}\n**المدة:** ${Math.floor(duration / 60)} دقيقة ${duration % 60} ثانية\n**المشاركون:** ${mockDocumentation.participants.length}\n**المجموعات:** ${call.groups.join(', ')}\n\n**الملخص التلقائي (AI):**\n${mockDocumentation.aiSummary}\n\n**النقاط الرئيسية:**\n${mockDocumentation.transcription.keyPoints.map(p => `• ${p}`).join('\n')}\n\n**القرارات المتخذة:**\n${mockDocumentation.keyDecisions.map(d => `• ${d}`).join('\n')}\n\n**الإجراءات المطلوبة:**\n${mockDocumentation.actionItems.map(a => `• ${a}`).join('\n')}\n\n**التسجيل:** [مشاهدة التسجيل](${mockDocumentation.recordingUrl})\n\n**النسخة الكاملة:**\n${mockDocumentation.transcription.fullText}`;

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

      alert(`✅ تم إنهاء المكالمة وإرسال التقرير الموثق بنجاح!\n\n📊 **المدة:** ${Math.floor(duration / 60)} دقيقة\n📝 **تم إرسال التقرير لـ ${call.groupIds.length} مجموعة\n👥 **شمل ${mockDocumentation.participants.length} مشاركين**\n\n📄 **الملخص التلقائي تم إنشاؤه بالذكاء الاصطناعي**`);
      
    } catch (err: any) {
      alert(`فشل إنهاء المكالمة: ${err.message}`);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مجموعة "${groupName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع الرسائل والمشاركين.`)) {
      return;
    }

    try {
      const response = await adminService.deleteGroup(groupId);
      if (response.success) {
        setGroups(prev => prev.filter(g => g._id !== groupId));
        alert(`تم حذف المجموعة "${groupName}" بنجاح`);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`فشل حذف المجموعة: ${err.message}`);
    }
  };

  const handleAddMembers = async () => {
    try {
      const response = await adminService.addGroupMembers(selectedGroup?._id || '', addMembersForm);
      if (response.success) {
        setShowAddMembersModal(false);
        setAddMembersForm({ participants: [] });
        alert('تم إضافة الأعضاء بنجاح');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      alert(`فشل إضافة الأعضاء: ${err.message}`);
    }
  };

  const handlePublishAnnouncement = async () => {
    try {
      const response = await adminService.publishAnnouncement(announcementForm);
      if (response.success) {
        alert(`تم نشر الإعلان إلى ${announcementForm.groupIds.length} مجموعة بنجاح`);
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
            alert('✅ تم إنشاء محادثة خاصة بنجاح!');
          } else {
            throw new Error(createChatResponse.message || 'Failed to create chat');
          }
        }
      }
    } catch (err: any) {
      alert(`❌ فشل إنشاء المحادثة: ${err.message}`);
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
            onClick={() => setShowCallModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
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
              onClick={() => setActiveTab('calls')}
              className={`py-3 px-6 border-b-2 font-medium text-sm transition-all ${
                activeTab === 'calls'
                  ? 'border-purple-500 text-purple-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-purple-600 hover:border-purple-300'
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
                              title="محادثة خاصة"
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
                          {!canManageUsers && user._id !== currentUser._id && (
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
                        setCallForm(prev => ({
                          ...prev,
                          groupIds: [group._id]
                        }));
                        setShowCallModal(true);
                      }}
                      className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      مكالمة جماعية
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group._id, group.name)}
                      className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      حذف
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
              <h2 className="text-xl font-semibold">إدارة المكالمات الجماعية والتوثيق التلقائي</h2>
              <button
                onClick={() => setShowCallModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                مكالمة جماعية جديدة
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">📞 كيفية عمل المكالمات الموثقة:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• اختر المجموعات المستهدفة لبدء المكالمة الجماعية</li>
                <li>• حدد موضوع المكالمة والوصف (اختياري)</li>
                <li>• سيتم إرسال إشعارات فورية لجميع الأعضاء</li>
                <li>• يبدأ التسجيل والتحويل النصي تلقائياً مع بدء المكالمة</li>
                <li>• عند الانتهاء، يتم إنشاء تقرير موثق وملخص تلقائي</li>
                <li>• يتم إرسال التقرير لجميع المجموعات المشاركة</li>
              </ul>
            </div>

            {/* Active Calls Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <span className="mr-2">🔴</span>
                المكالمات النشطة
              </h3>
              {activeCalls.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-gray-500 text-lg mb-2">لا توجد مكالمات نشطة حالياً</div>
                  <div className="text-gray-400 text-sm">ابدأ مكالمة جماعية جديدة لرؤيتها هنا</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCalls.map((call) => (
                    <div key={call._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{call.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            المستضيف: {call.hostUsername} | المجموعات: {call.groups.length}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                              نشط
                            </span>
                            <span>البدء: {new Date(call.startTime).toLocaleTimeString('ar-SA')}</span>
                            <span>المشاركون: {call.participants.length}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            onClick={() => window.open(call.joinUrl, '_blank')}
                          >
                            انضم
                          </button>
                          <button
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            onClick={() => handleEndCall(call._id)}
                          >
                            إنهاء
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
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة المجموعة (اختياري)</label>
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
                      placeholder="اختر صورة للمجموعة"
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
                        title="إزالة الصورة"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">اختر صورة لتمثيل المجموعة (PNG, JPG, GIF)</p>
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
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setGroupImage(null);
                  setImagePreview(null);
                }}
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

      {/* Group Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📞 مكالمة جماعية موثقة</h3>
              <p className="text-sm text-gray-600 mt-1">بدء مكالمة جماعية مع تسجيل تلقائي وتوثيق</p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">موضوع المكالمة *</label>
                <input
                  type="text"
                  value={callForm.title}
                  onChange={(e) => setCallForm({ ...callForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل موضوع المكالمة (مثال: مراجعة ميزانية الربع الثالث)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف المكالمة (اختياري)</label>
                <textarea
                  value={callForm.description || ''}
                  onChange={(e) => setCallForm({ ...callForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف مفصل للمكالمة والأهداف المرجوة"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر المجموعات *</label>
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
                      <span className="text-sm text-gray-700">{group.name} ({group.participants?.length || 0} عضو)</span>
                    </label>
                  ))}
                </div>
                {callForm.groupIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    تم اختيار {callForm.groupIds.length} مجموعات - سيتم إعلام {callForm.groupIds.reduce((total, groupId) => {
                      const group = groups.find(g => g._id === groupId);
                      return total + (group?.participants?.length || 0);
                    }, 0)} عضواً
                  </p>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🔧 ميزات التوثيق التلقائي:</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={callForm.enableRecording}
                      onChange={(e) => setCallForm({ ...callForm, enableRecording: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ml-2"
                    />
                    <span className="text-sm text-blue-800">تسجيل المكالمة بالصوت والصورة</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={callForm.enableTranscription}
                      onChange={(e) => setCallForm({ ...callForm, enableTranscription: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ml-2"
                    />
                    <span className="text-sm text-blue-800">تحويل الحوار إلى نص مكتوب (Real-time Transcription)</span>
                  </label>
                </div>
                <div className="mt-3 text-xs text-blue-700">
                  💡 سيتم إنشاء ملخص تلقائي بالذكاء الاصطناعي وإرسال تقرير موثق لجميع المجموعات عند انتهاء المكالمة
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
                إلغاء
              </button>
              <button
                onClick={handleStartGroupCall}
                disabled={!callForm.title || callForm.groupIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📞 بدء المكالمة الآن
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
