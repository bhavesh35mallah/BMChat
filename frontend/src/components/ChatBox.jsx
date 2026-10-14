import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { authAPI, chatAPI, groupAPI } from '../services/api';
import { EmojiPicker } from './EmojiPicker';
import { playNotificationChime } from '../utils/sound';
import { CallModal } from './CallModal';
import { CreateGroupModal } from './CreateGroupModal';
import { CreatePollModal } from './CreatePollModal';
import { CodeSnippetModal } from './CodeSnippetModal';
import { GroupInfoDrawer } from './GroupInfoDrawer';
import {
  IconSend,
  IconMic,
  IconMicOff,
  IconSmile,
  IconImage,
  IconPaperclip,
  IconPoll,
  IconCode,
  IconGame,
  IconPhone,
  IconVideo,
  IconInfo,
  IconClock,
  IconPalette,
  IconTrash,
  IconSearch,
  IconStar,
  IconBell,
  IconBellOff,
  IconCheck,
  IconCheckCheck,
  IconCopy,
  IconEdit,
  IconForward,
  IconPin,
  IconReply,
  IconPlus,
  IconX,
  IconUsers,
  IconChat,
  IconDownload,
  IconFileText,
  IconUser,
} from './Icons';

const QUICK_REACTIONS = ['❤️', '👍', '🔥', '😂', '🎉'];

const WALLPAPER_PRESETS = [
  { id: 'obsidian', name: 'Dark Obsidian', color: '#6366f1' },
  { id: 'violet', name: 'Cosmic Violet', color: '#a855f7' },
  { id: 'ocean', name: 'Deep Ocean', color: '#0ea5e9' },
  { id: 'emerald', name: 'Emerald Forest', color: '#10b981' },
  { id: 'sunset', name: 'Sunset Crimson', color: '#f43f5e' },
];

// Helper to format last seen date into human-readable relative time
const formatLastSeen = (dateString) => {
  if (!dateString) return 'Offline';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Last seen just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Last seen ${diffDays}d ago`;
  return `Last seen on ${new Date(dateString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })}`;
};

// Helper to format bytes to human-readable size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ChatBox = () => {
  const { user, token } = useAuth();
  const {
    onlineUsers,
    incomingMessage,
    incomingGroupMessage,
    typingUsers,
    reactionUpdate,
    readReceipt,
    deletedMessageId,
    lastSeenUpdate,
    messageEdited,
    pollUpdated,
    gameUpdated,
    ghostMode,
    sendRealtimeMessage,
    sendTypingStatus,
    markMessagesAsRead,
    addReaction,
    deleteMessage,
    deleteMessageForMe,
    toggleStar,
    isUserOnline,
    joinGroup,
    leaveGroup,
    sendGroupMessage,
    editMessage,
    votePoll,
    playGameMove,
  } = useSocket();

  const [usersList, setUsersList] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [groupsList, setGroupsList] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('direct'); // 'direct' | 'groups'
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [outgoingCallSession, setOutgoingCallSession] = useState(null); // { partner, callType }
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Advanced features states
  const [unreadCounts, setUnreadCounts] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [showStarredDrawer, setShowStarredDrawer] = useState(false);

  // Pinned Message state (persisted per conversation)
  const [pinnedMessageId, setPinnedMessageId] = useState(null);

  // Audio Playback Rates { [msgId]: 1 | 1.5 | 2 }
  const [audioRates, setAudioRates] = useState({});

  // Chat Wallpaper
  const [chatWallpaper, setChatWallpaper] = useState(
    () => localStorage.getItem('chat_wallpaper') || 'obsidian'
  );
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);

  // Contact Profile Card Modal & Shared Media
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState('about'); // 'about' | 'media'

  // Forwarding Message Modal
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // A-to-Z Features States
  const [showPollModal, setShowPollModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState(0); // 0 = off, seconds
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null); // { messageId, text }
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const speechRecognitionRef = useRef(null);

  // Voice note recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (text) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(text);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // 1. Fetch all users for chat directory
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await authAPI.getUsers(token);
      if (res.success && res.users) {
        setUsersList(res.users);
        if (!activePartner && !activeGroup && res.users.length > 0 && window.innerWidth > 768) {
          setActivePartner(res.users[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load users list:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch all user groups
  const loadGroups = async () => {
    try {
      const res = await groupAPI.getUserGroups(token);
      if (res.success && res.groups) {
        setGroupsList(res.groups);
      }
    } catch (err) {
      console.error('Failed to load groups list:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadUsers();
      loadGroups();
    }
  }, [token]);

  // Handle Last Seen Realtime Updates
  useEffect(() => {
    if (!lastSeenUpdate) return;
    setUsersList((prev) =>
      prev.map((u) =>
        u._id === lastSeenUpdate.userId
          ? { ...u, lastSeen: lastSeenUpdate.lastSeen }
          : u
      )
    );
    if (activePartner?._id === lastSeenUpdate.userId) {
      setActivePartner((prev) => ({
        ...prev,
        lastSeen: lastSeenUpdate.lastSeen,
      }));
    }
  }, [lastSeenUpdate, activePartner?._id]);

  // 2. Fetch conversation history when active partner changes
  useEffect(() => {
    if (!activePartner?._id || !token) return;

    const loadConversation = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await chatAPI.getMessages(token, activePartner._id);
        if (res.success && res.messages) {
          setMessages(res.messages);
          markMessagesAsRead(activePartner._id);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadConversation();

    // Load pinned message for this conversation
    const savedPin = localStorage.getItem(`pinned_${user._id}_${activePartner._id}`);
    setPinnedMessageId(savedPin || null);

    // Clear unread count for this partner
    setUnreadCounts((prev) => ({
      ...prev,
      [activePartner._id]: 0,
    }));
  }, [activePartner?._id, token, user._id]);

  // 2b. Fetch group conversation history & join room when activeGroup changes
  useEffect(() => {
    if (!activeGroup?._id || !token) return;

    const loadGroupConversation = async () => {
      setIsLoadingMessages(true);
      try {
        joinGroup(activeGroup._id);
        const res = await groupAPI.getGroupMessages(token, activeGroup._id);
        if (res.success && res.messages) {
          setMessages(res.messages);
        }
      } catch (err) {
        console.error('Failed to load group messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadGroupConversation();

    const savedPin = localStorage.getItem(`pinned_group_${user._id}_${activeGroup._id}`);
    setPinnedMessageId(savedPin || null);

    setUnreadCounts((prev) => ({
      ...prev,
      [activeGroup._id]: 0,
    }));

    return () => {
      leaveGroup(activeGroup._id);
    };
  }, [activeGroup?._id, token, user._id]);

  // Handle incoming group messages
  useEffect(() => {
    if (!incomingGroupMessage) return;

    if (activeGroup?._id && incomingGroupMessage.group === activeGroup._id) {
      setMessages((prev) => {
        if (prev.some((m) => m._id === incomingGroupMessage._id)) return prev;
        return [...prev, incomingGroupMessage];
      });
    } else {
      setUnreadCounts((prev) => ({
        ...prev,
        [incomingGroupMessage.group]: (prev[incomingGroupMessage.group] || 0) + 1,
      }));
    }

    if (soundEnabled && incomingGroupMessage.sender?._id !== user._id) {
      playNotificationChime();
    }
  }, [incomingGroupMessage, activeGroup?._id, user._id, soundEnabled]);


  // 3. Handle incoming realtime message
  useEffect(() => {
    if (!incomingMessage) return;

    const senderId = incomingMessage.sender?._id || incomingMessage.sender;
    const recipientId = incomingMessage.recipient?._id || incomingMessage.recipient;

    if (
      (senderId === activePartner?._id && recipientId === user?._id) ||
      (senderId === user?._id && recipientId === activePartner?._id)
    ) {
      setMessages((prev) => {
        if (prev.some((m) => m._id === incomingMessage._id)) {
          return prev;
        }
        return [...prev, incomingMessage];
      });

      if (senderId === activePartner?._id) {
        markMessagesAsRead(activePartner._id);
        if (soundEnabled) playNotificationChime();
      }
    } else if (senderId !== user?._id) {
      if (soundEnabled) playNotificationChime();
      setUnreadCounts((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    }
  }, [incomingMessage, activePartner?._id, user?._id, soundEnabled]);

  // 4. Handle Read Receipts
  useEffect(() => {
    if (!readReceipt || !activePartner?._id) return;
    if (readReceipt.readerId === activePartner._id) {
      setMessages((prev) =>
        prev.map((m) => {
          const isSentByMe = (m.sender?._id || m.sender) === user?._id;
          if (isSentByMe && m.status !== 'read') {
            return { ...m, status: 'read' };
          }
          return m;
        })
      );
    }
  }, [readReceipt, activePartner?._id, user?._id]);

  // 5. Handle Reaction Updates
  useEffect(() => {
    if (!reactionUpdate) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id === reactionUpdate.messageId) {
          return {
            ...m,
            reactions: reactionUpdate.reactions,
          };
        }
        return m;
      })
    );
  }, [reactionUpdate]);

  // 6. Handle Deleted Message Updates
  useEffect(() => {
    if (!deletedMessageId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m._id === deletedMessageId.messageId
          ? {
              ...m,
              isDeleted: true,
              text: 'This message was deleted',
              image: '',
              audio: '',
              file: null,
            }
          : m
      )
    );
    if (pinnedMessageId === deletedMessageId.messageId) {
      setPinnedMessageId(null);
      localStorage.removeItem(`pinned_${user._id}_${activePartner?._id}`);
    }
  }, [deletedMessageId, pinnedMessageId, user._id, activePartner?._id]);

  // 7. Handle Message Edited Realtime Updates
  useEffect(() => {
    if (!messageEdited) return;
    const targetId = messageEdited.messageId || messageEdited._id;
    setMessages((prev) =>
      prev.map((m) =>
        m._id === targetId
          ? { ...m, text: messageEdited.newText || messageEdited.text, isEdited: true }
          : m
      )
    );
  }, [messageEdited]);

  // 8. Handle Poll Updated Realtime Updates
  useEffect(() => {
    if (!pollUpdated) return;
    const targetId = pollUpdated.messageId || pollUpdated._id;
    setMessages((prev) =>
      prev.map((m) =>
        m._id === targetId
          ? { ...m, poll: pollUpdated.poll }
          : m
      )
    );
  }, [pollUpdated]);

  // 9. Handle Game Updated Realtime Updates
  useEffect(() => {
    if (!gameUpdated) return;
    const targetId = gameUpdated.messageId || gameUpdated._id;
    setMessages((prev) =>
      prev.map((m) =>
        m._id === targetId
          ? { ...m, game: gameUpdated.game }
          : m
      )
    );
  }, [gameUpdated]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (!chatSearchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingMessages, chatSearchQuery]);

  // Handle typing status
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (activePartner?._id) {
      sendTypingStatus(activePartner._id, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(activePartner._id, false);
      }, 1500);
    }
  };

  // Handle image attachment
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Image size cannot exceed 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle document / file attachment
  const handleDocumentSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Document size cannot exceed 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data: event.target.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle Message Reaction
  const handleReactToMessage = (messageId, emoji) => {
    addReaction(messageId, emoji);
    setHoveredMessageId(null);
  };

  // Open Delete Message Modal
  const handleOpenDeleteModal = (msg) => {
    const isSentByMe = (msg.sender?._id || msg.sender)?.toString() === user._id.toString();
    const isGroupAdmin =
      activeGroup &&
      ((activeGroup.admin?._id || activeGroup.admin)?.toString() === user._id.toString() ||
        (activeGroup.admins || []).some((a) => (a?._id || a)?.toString() === user._id.toString()));

    setDeletingMessage({
      messageId: msg._id,
      text:
        msg.text ||
        (msg.image
          ? 'Photo attachment'
          : msg.audio
          ? 'Voice recording'
          : msg.file?.name
          ? `File: ${msg.file.name}`
          : msg.poll
          ? `Poll: ${msg.poll.question}`
          : msg.codeSnippet
          ? 'Code snippet'
          : 'Message'),
      isSentByMe,
      canDeleteForEveryone: isSentByMe || Boolean(isGroupAdmin),
    });
  };

  // Confirm Delete for Me
  const handleConfirmDeleteForMe = () => {
    if (!deletingMessage) return;
    const { messageId } = deletingMessage;

    setMessages((prev) => prev.filter((m) => m._id !== messageId));
    if (pinnedMessageId === messageId) {
      setPinnedMessageId(null);
    }
    deleteMessageForMe(messageId);
    chatAPI.deleteForMe(token, messageId).catch((err) => console.warn('REST deleteForMe error:', err));
    showToast('Message deleted for you');
    setDeletingMessage(null);
  };

  // Confirm Delete for Everyone
  const handleConfirmDeleteForEveryone = () => {
    if (!deletingMessage) return;
    const { messageId } = deletingMessage;

    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId
          ? {
              ...m,
              isDeleted: true,
              text: '🚫 This message was deleted',
              image: '',
              audio: '',
              file: null,
              poll: undefined,
              codeSnippet: undefined,
              game: undefined,
            }
          : m
      )
    );
    if (pinnedMessageId === messageId) {
      setPinnedMessageId(null);
    }
    deleteMessage(messageId);
    chatAPI.deleteForEveryone(token, messageId).catch((err) => console.warn('REST deleteForEveryone error:', err));
    showToast('Message deleted for everyone');
    setDeletingMessage(null);
  };

  // Handle Toggle Star
  const handleToggleStar = (messageId) => {
    toggleStar(messageId, (res) => {
      if (res && res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, starredBy: res.starredBy } : m
          )
        );
        showToast(res.isStarred ? 'Message starred' : 'Message unstarred');
      }
    });
  };

  // Handle Pinned Message
  const handleTogglePin = (msgId) => {
    if (pinnedMessageId === msgId) {
      setPinnedMessageId(null);
      localStorage.removeItem(`pinned_${user._id}_${activePartner._id}`);
      showToast('Message unpinned');
    } else {
      setPinnedMessageId(msgId);
      localStorage.setItem(`pinned_${user._id}_${activePartner._id}`, msgId);
      showToast('Message pinned to top');
    }
  };

  // Handle Copy Message Text
  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  };

  // Handle Audio Speed Multiplier
  const handleToggleAudioSpeed = (msgId) => {
    const currentRate = audioRates[msgId] || 1;
    const nextRate = currentRate === 1 ? 1.5 : currentRate === 1.5 ? 2 : 1;
    setAudioRates((prev) => ({ ...prev, [msgId]: nextRate }));

    const audioEl = document.getElementById(`audio-player-${msgId}`);
    if (audioEl) {
      audioEl.playbackRate = nextRate;
    }
  };

  // Handle Select Wallpaper
  const handleSelectWallpaper = (wallId) => {
    setChatWallpaper(wallId);
    localStorage.setItem('chat_wallpaper', wallId);
    setShowWallpaperMenu(false);
    showToast(`Wallpaper changed to ${wallId}`);
  };

  // Handle Clear Entire Conversation
  const handleClearChat = async () => {
    if (activeGroup) {
      showToast('Clearing group history is disabled for shared rooms');
      return;
    }
    if (!activePartner?._id || messages.length === 0) return;
    if (
      window.confirm(
        `Are you sure you want to permanently clear the conversation history with ${activePartner.name}?`
      )
    ) {
      try {
        const res = await chatAPI.clearMessages(token, activePartner._id);
        if (res.success) {
          setMessages([]);
          setPinnedMessageId(null);
          localStorage.removeItem(`pinned_${user._id}_${activePartner._id}`);
          showToast('Conversation cleared');
        }
      } catch (err) {
        console.error('Failed to clear conversation:', err);
        alert('Failed to clear conversation: ' + err.message);
      }
    }
  };

  // Handle Forward Message
  const handleForwardToUser = (targetUser) => {
    if (!forwardingMessage || !targetUser?._id) return;

    const payload = {
      text: forwardingMessage.text || '',
      image: forwardingMessage.image || '',
      audio: forwardingMessage.audio || '',
      file: forwardingMessage.file || null,
      status: 'sent',
    };

    sendRealtimeMessage(targetUser._id, payload, async (ack) => {
      if (!ack || !ack.success) {
        try {
          await chatAPI.sendMessage(token, {
            recipient: targetUser._id,
            ...payload,
          });
        } catch (e) {
          console.error('Forward fallback error:', e);
        }
      }
    });

    setForwardingMessage(null);
    showToast(`Forwarded to ${targetUser.name}`);
  };

  // Voice Note Recording functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone. Please check browser microphone permissions.');
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const finishVoiceRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result;
        sendVoiceMessage(base64Audio);
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  };

  const sendVoiceMessage = (base64Audio) => {
    if ((!activePartner?._id && !activeGroup?._id) || !base64Audio) return;

    const currentPartnerName = activePartner ? activePartner.name : (activeGroup ? activeGroup.name : 'Group');
    const payload = {
      text: '',
      image: '',
      audio: base64Audio,
      file: null,
      replyTo: replyingTo
        ? {
            id: replyingTo._id,
            text:
              replyingTo.text ||
              (replyingTo.image
                ? 'Photo'
                : replyingTo.audio
                ? 'Voice note'
                : replyingTo.file
                ? replyingTo.file.name
                : 'Message'),
            senderName:
              (replyingTo.sender?._id || replyingTo.sender) === user?._id
                ? 'You'
                : (replyingTo.sender?.name || currentPartnerName),
          }
        : null,
    };

    setReplyingTo(null);

    if (activeGroup) {
      sendGroupMessage(activeGroup._id, payload, async (ack) => {
        if (ack?.success && ack.message) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === ack.message._id)) return prev;
            return [...prev, ack.message];
          });
        }
      });
      return;
    }

    sendRealtimeMessage(activePartner._id, payload, async (ack) => {
      if (!ack || !ack.success) {
        try {
          const res = await chatAPI.sendMessage(token, {
            recipient: activePartner._id,
            ...payload,
          });
          if (res.success && res.message) {
            setMessages((prev) => [...prev, res.message]);
          }
        } catch (err) {
          console.error('Voice send fallback error:', err);
        }
      }
    });
  };

  // Export Chat History as .txt file
  const handleExportChat = () => {
    if (!messages || messages.length === 0) {
      alert('No messages to export.');
      return;
    }

    const chatTitle = activeGroup ? activeGroup.name : (activePartner ? activePartner.name : 'Chat');
    let textContent = `=====================================================\n`;
    textContent += activeGroup
      ? `GROUP CHAT TRANSCRIPT: ${activeGroup.name}\nMembers: ${activeGroup.members?.map((m) => m.name || m.email).join(', ')}\n`
      : `CHAT TRANSCRIPT: ${user.name} & ${activePartner?.name}\n`;
    textContent += `Exported: ${new Date().toLocaleString()}\n`;
    textContent += `Total Messages: ${messages.length}\n`;
    textContent += `=====================================================\n\n`;

    messages.forEach((msg) => {
      const isSentByMe = (msg.sender?._id || msg.sender) === user?._id;
      const senderName = isSentByMe ? user.name : (msg.sender?.name || activePartner?.name || 'Member');
      const time = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'N/A';

      let body = '';
      if (msg.isDeleted) {
        body = '[Deleted message]';
      } else {
        if (msg.text) body += msg.text;
        if (msg.image) body += ' [Image Attachment]';
        if (msg.audio) body += ' [Voice Note]';
        if (msg.file?.name) body += ` [File: ${msg.file.name} (${formatFileSize(msg.file.size)})]`;
      }

      textContent += `[${time}] ${senderName}: ${body}\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_${chatTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Chat history exported');
  };

  // Send or Edit message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!activePartner?._id && !activeGroup?._id) return;

    // Handle Editing existing message
    if (editingMessage) {
      if (!inputText.trim()) return;
      const textToSave = inputText.trim();
      const msgId = editingMessage.messageId;
      setEditingMessage(null);
      setInputText('');
      editMessage(msgId, textToSave, (res) => {
        if (res && res.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === msgId ? { ...m, text: textToSave, isEdited: true } : m
            )
          );
          showToast('Message updated');
        }
      });
      return;
    }

    if (!inputText.trim() && !attachedImage && !attachedFile) return;

    const currentPartnerName = activePartner ? activePartner.name : (activeGroup ? activeGroup.name : 'Group');
    const messagePayload = {
      text: inputText.trim(),
      image: attachedImage || '',
      file: attachedFile || null,
      disappearingSeconds: disappearingDuration > 0 ? disappearingDuration : undefined,
      replyTo: replyingTo
        ? {
            id: replyingTo._id,
            text:
              replyingTo.text ||
              (replyingTo.image
                ? 'Photo'
                : replyingTo.audio
                ? 'Voice note'
                : replyingTo.file
                ? replyingTo.file.name
                : 'Message'),
            senderName:
              (replyingTo.sender?._id || replyingTo.sender) === user?._id
                ? 'You'
                : (replyingTo.sender?.name || currentPartnerName),
            hasAttachment: !!(replyingTo.image || replyingTo.audio || replyingTo.file),
          }
        : null,
      status: 'sent',
    };

    setInputText('');
    setAttachedImage(null);
    setAttachedFile(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    if (activePartner?._id) {
      sendTypingStatus(activePartner._id, false);
    }

    if (activeGroup) {
      sendGroupMessage(activeGroup._id, messagePayload, async (ack) => {
        if (ack?.success && ack.message) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === ack.message._id)) return prev;
            return [...prev, ack.message];
          });
        }
      });
      return;
    }

    sendRealtimeMessage(activePartner._id, messagePayload, async (ack) => {
      if (!ack || !ack.success) {
        try {
          const res = await chatAPI.sendMessage(token, {
            recipient: activePartner._id,
            ...messagePayload,
          });
          if (res.success && res.message) {
            setMessages((prev) => [...prev, res.message]);
          }
        } catch (err) {
          console.error('Message send fallback failed:', err);
        }
      }
    });
  };

  // Handle Create Poll
  const handleCreatePoll = ({ question, options }) => {
    if (!activePartner?._id && !activeGroup?._id) return;

    const formattedOptions = (options || []).map((opt) => {
      if (typeof opt === 'string') {
        return { text: opt, votes: [] };
      }
      return { text: opt?.text || String(opt), votes: opt?.votes || [] };
    });

    const payload = {
      text: `Poll: ${question}`,
      poll: {
        question,
        options: formattedOptions,
      },
      disappearingSeconds: disappearingDuration > 0 ? disappearingDuration : undefined,
    };

    if (activeGroup) {
      sendGroupMessage(activeGroup._id, payload, (ack) => {
        if (ack?.success && ack.message) {
          setMessages((prev) => [...prev, ack.message]);
        }
      });
    } else {
      sendRealtimeMessage(activePartner._id, payload, async (ack) => {
        if (!ack || !ack.success) {
          try {
            const res = await chatAPI.sendMessage(token, {
              recipient: activePartner._id,
              ...payload,
            });
            if (res.success && res.message) {
              setMessages((prev) => [...prev, res.message]);
            }
          } catch (e) {
            console.error('Poll fallback error:', e);
          }
        }
      });
    }

    setShowPollModal(false);
    showToast('Poll created');
  };

  // Handle Voting in Poll with optimistic update
  const handleVotePoll = (messageId, optionIndex) => {
    if (!user?._id || !messageId) return;

    // Optimistic UI state update
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId || !m.poll) return m;
        const totalOpts = m.poll.options || [];
        const myId = user._id.toString();
        const updatedOptions = totalOpts.map((opt, idx) => {
          const currentVotes = (opt.votes || []).map((v) => (v?._id || v)?.toString());
          const alreadyVotedThis = currentVotes.includes(myId);

          if (idx === optionIndex) {
            return {
              ...opt,
              votes: alreadyVotedThis
                ? (opt.votes || []).filter((v) => (v?._id || v)?.toString() !== myId)
                : [...(opt.votes || []).filter((v) => (v?._id || v)?.toString() !== myId), user._id],
            };
          } else {
            return {
              ...opt,
              votes: (opt.votes || []).filter((v) => (v?._id || v)?.toString() !== myId),
            };
          }
        });
        return {
          ...m,
          poll: {
            ...m.poll,
            options: updatedOptions,
          },
        };
      })
    );

    votePoll(messageId, optionIndex, (res) => {
      if (res?.success && res.poll) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, poll: res.poll } : m))
        );
      }
    });
  };

  // Handle Create Code Snippet
  const handleCreateCodeSnippet = ({ code, language }) => {
    if (!activePartner?._id && !activeGroup?._id) return;

    const payload = {
      text: `Code Snippet (${language})`,
      codeSnippet: {
        code,
        language,
      },
      disappearingSeconds: disappearingDuration > 0 ? disappearingDuration : undefined,
    };

    if (activeGroup) {
      sendGroupMessage(activeGroup._id, payload, (ack) => {
        if (ack?.success && ack.message) {
          setMessages((prev) => [...prev, ack.message]);
        }
      });
    } else {
      sendRealtimeMessage(activePartner._id, payload, async (ack) => {
        if (!ack || !ack.success) {
          try {
            const res = await chatAPI.sendMessage(token, {
              recipient: activePartner._id,
              ...payload,
            });
            if (res.success && res.message) {
              setMessages((prev) => [...prev, res.message]);
            }
          } catch (e) {
            console.error('Code snippet fallback error:', e);
          }
        }
      });
    }

    setShowCodeModal(false);
    showToast('Code snippet shared');
  };

  // Handle Start Tic-Tac-Toe Game
  const handleStartGame = () => {
    if (!activePartner?._id && !activeGroup?._id) return;

    const payload = {
      text: 'Tic-Tac-Toe Challenge',
      game: {
        gameType: 'tictactoe',
        status: 'waiting',
        board: Array(9).fill(null),
        turn: user._id,
        playerX: user._id,
        playerO: activePartner?._id || null,
        winner: null,
      },
      disappearingSeconds: disappearingDuration > 0 ? disappearingDuration : undefined,
    };

    if (activeGroup) {
      sendGroupMessage(activeGroup._id, payload, (ack) => {
        if (ack?.success && ack.message) {
          setMessages((prev) => [...prev, ack.message]);
        }
      });
    } else {
      sendRealtimeMessage(activePartner._id, payload, async (ack) => {
        if (!ack || !ack.success) {
          try {
            const res = await chatAPI.sendMessage(token, {
              recipient: activePartner._id,
              ...payload,
            });
            if (res.success && res.message) {
              setMessages((prev) => [...prev, res.message]);
            }
          } catch (e) {
            console.error('Game fallback error:', e);
          }
        }
      });
    }

    showToast('Game challenge started');
  };

  // Web Speech API Voice Transcription
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser');
      return;
    }

    if (isSpeechListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsSpeechListening(false);
      showToast('Voice dictation stopped');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
        setIsSpeechListening(false);
      };

      recognition.onend = () => {
        setIsSpeechListening(false);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsSpeechListening(true);
      showToast('Listening... Speak now');
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsSpeechListening(false);
    }
  };

  const handleSelectPartner = (u) => {
    setActivePartner(u);
    setActiveGroup(null);
    setShowMobileChat(true);
    setInChatSearchOpen(false);
    setChatSearchQuery('');
    setShowStarredDrawer(false);
    setShowWallpaperMenu(false);
    setReplyingTo(null);
  };

  const handleSelectGroup = (g) => {
    setActiveGroup(g);
    setActivePartner(null);
    setShowMobileChat(true);
    setInChatSearchOpen(false);
    setChatSearchQuery('');
    setShowStarredDrawer(false);
    setShowWallpaperMenu(false);
    setReplyingTo(null);
  };

  // Filter contacts by sidebar search
  const filteredUsers = usersList.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter groups by sidebar search
  const filteredGroups = groupsList.filter(
    (g) =>
      g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter messages by in-chat search
  const displayedMessages = chatSearchQuery.trim()
    ? messages.filter((m) =>
        m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase())
      )
    : messages;

  // Starred messages list
  const starredMessages = messages.filter((m) =>
    (m.starredBy || []).some(
      (id) => (id?._id || id)?.toString() === user?._id?.toString()
    )
  );

  // Pinned message object
  const pinnedMessage = messages.find((m) => m._id === pinnedMessageId);

  // Shared Media list (photos and files)
  const sharedMediaMessages = messages.filter(
    (m) => !m.isDeleted && (m.image || m.file?.name || m.audio)
  );

  const isPartnerTyping = activePartner?._id ? !!typingUsers[activePartner._id] : false;

  const jumpToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-jump');
      setTimeout(() => el.classList.remove('highlight-jump'), 2000);
    }
  };

  return (
    <div
      className={`chatbox-wrapper ${
        showMobileChat ? 'mobile-chat-active' : 'mobile-list-active'
      }`}
    >
      {/* Toast Notification Notification Pill */}
      {toastMessage && (
        <div className="chat-floating-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lightbox Modal for Fullscreen Image View */}
      {lightboxImage && (
        <div className="lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content">
            <img src={lightboxImage} alt="Full view" className="lightbox-img" />
            <button className="lightbox-close-btn" onClick={() => setLightboxImage(null)} aria-label="Close image">
              <IconX size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Contact Profile & Shared Media Modal */}
      {showProfileModal && activePartner && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="profile-card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Contact Info</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowProfileModal(false)}
                aria-label="Close profile"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="profile-modal-body">
              <div className="profile-hero-center">
                <div className="profile-large-avatar-wrap">
                  {activePartner.avatar ? (
                    <img
                      src={activePartner.avatar}
                      alt={activePartner.name}
                      className="profile-large-avatar"
                    />
                  ) : (
                    <div className="profile-large-placeholder">
                      {activePartner.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`profile-status-dot ${
                      isUserOnline(activePartner._id) ? 'online' : 'offline'
                    }`}
                  />
                </div>
                <h2 className="profile-hero-name">{activePartner.name}</h2>
                <div className="profile-hero-status">
                  {isUserOnline(activePartner._id) ? (
                    <span className="text-success font-medium">● Active now</span>
                  ) : (
                    <span className="text-muted">{formatLastSeen(activePartner.lastSeen)}</span>
                  )}
                </div>
              </div>

              {/* Profile Tabs */}
              <div className="profile-modal-tabs">
                <button
                  type="button"
                  className={`profile-tab-btn ${profileModalTab === 'about' ? 'active' : ''}`}
                  onClick={() => setProfileModalTab('about')}
                >
                  <IconUser size={15} />
                  <span>Details & Bio</span>
                </button>
                <button
                  type="button"
                  className={`profile-tab-btn ${profileModalTab === 'media' ? 'active' : ''}`}
                  onClick={() => setProfileModalTab('media')}
                >
                  <IconPaperclip size={15} />
                  <span>Shared Media ({sharedMediaMessages.length})</span>
                </button>
              </div>

              {profileModalTab === 'about' ? (
                <div className="profile-details-list">
                  <div className="profile-info-row">
                    <span className="profile-info-label">Email Address</span>
                    <span className="profile-info-val">{activePartner.email}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">About / Bio</span>
                    <span className="profile-info-val">
                      {activePartner.bio || 'No bio provided yet.'}
                    </span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">Messages Exchanged</span>
                    <span className="profile-info-val">{messages.length} messages</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="profile-info-label">Direct Actions</span>
                    <div className="profile-actions-row">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setShowProfileModal(false);
                          setInChatSearchOpen(true);
                        }}
                      >
                        <IconSearch size={14} />
                        <span>Search in Chat</span>
                      </button>
                      <button
                        type="button"
                        className="btn-danger-ghost btn-sm"
                        onClick={() => {
                          setShowProfileModal(false);
                          handleClearChat();
                        }}
                      >
                        <IconTrash size={14} />
                        <span>Clear History</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="shared-media-gallery">
                  {sharedMediaMessages.length === 0 ? (
                    <div className="media-empty">
                      <p>No photos or documents shared yet in this conversation.</p>
                    </div>
                  ) : (
                    <div className="media-gallery-grid">
                      {sharedMediaMessages.map((m) => (
                        <div key={m._id} className="media-gallery-card">
                          {m.image ? (
                            <img
                              src={m.image}
                              alt="Shared media"
                              className="gallery-thumb"
                              onClick={() => {
                                setShowProfileModal(false);
                                setLightboxImage(m.image);
                              }}
                            />
                          ) : m.file ? (
                            <div
                              className="gallery-file-chip"
                              onClick={() => {
                                setShowProfileModal(false);
                                jumpToMessage(m._id);
                              }}
                            >
                              <IconFileText size={18} />
                              <div className="gallery-file-name" title={m.file.name}>
                                {m.file.name}
                              </div>
                            </div>
                          ) : (
                            <div
                              className="gallery-audio-chip"
                              onClick={() => {
                                setShowProfileModal(false);
                                jumpToMessage(m._id);
                              }}
                            >
                              <IconMic size={15} />
                              <span>Voice Note</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="modal-backdrop" onClick={() => setForwardingMessage(null)}>
          <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
            <div className="forward-modal-header">
              <h3>Forward Message</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setForwardingMessage(null)}
                aria-label="Close modal"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="forward-preview-box">
              <span className="forward-preview-label">Selected message:</span>
              <p className="forward-preview-text">
                {forwardingMessage.text ||
                  (forwardingMessage.image
                    ? 'Photo'
                    : forwardingMessage.audio
                    ? 'Voice note'
                    : forwardingMessage.file
                    ? forwardingMessage.file.name
                    : 'Message')}
              </p>
            </div>
            <div className="forward-search-wrap">
              <input
                type="text"
                placeholder="Search contact to forward to..."
                value={forwardSearchQuery}
                onChange={(e) => setForwardSearchQuery(e.target.value)}
                className="forward-search-input"
              />
            </div>
            <div className="forward-contacts-list">
              {usersList
                .filter(
                  (u) =>
                    u._id !== user._id &&
                    (u.name?.toLowerCase().includes(forwardSearchQuery.toLowerCase()) ||
                      u.email?.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                )
                .map((contact) => (
                  <div key={contact._id} className="forward-contact-row">
                    <div className="forward-contact-meta">
                      <div className="forward-avatar-mini">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt={contact.name} />
                        ) : (
                          contact.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="forward-contact-name">{contact.name}</span>
                    </div>
                    <button
                      type="button"
                      className="forward-send-btn"
                      onClick={() => handleForwardToUser(contact)}
                    >
                      <span>Send</span>
                      <IconForward size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar: Users Directory */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="flex-between">
            <h3 className="sidebar-title">Chats</h3>
            <div className="badge-row">
              <span className="badge badge-accent">
                {onlineUsers.length} Online
              </span>
            </div>
          </div>

          {/* Segmented Tabs: Direct vs Groups */}
          <div className="sidebar-tabs">
            <button
              type="button"
              className={`sidebar-tab-btn ${sidebarTab === 'direct' ? 'active' : ''}`}
              onClick={() => setSidebarTab('direct')}
            >
              <IconChat size={15} />
              <span>Direct ({usersList.length})</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab-btn ${sidebarTab === 'groups' ? 'active' : ''}`}
              onClick={() => setSidebarTab('groups')}
            >
              <IconUsers size={15} />
              <span>Groups ({groupsList.length})</span>
            </button>
          </div>

          <div className="user-search-wrapper">
            <IconSearch size={15} className="search-icon" />
            <input
              type="text"
              placeholder={sidebarTab === 'direct' ? 'Search contacts...' : 'Search groups...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="user-search-input"
            />
          </div>
        </div>

        <div className="users-directory-list">
          {sidebarTab === 'direct' ? (
            /* Direct Contacts List */
            isLoadingUsers ? (
              <div className="users-loading">
                <span className="spinner"></span> Loading contacts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="no-users-box">
                <div className="no-users-icon">
                  <IconUsers size={32} />
                </div>
                <p className="no-users-title">No other users found</p>
                <p className="no-users-hint">
                  Tip: Open an <strong>Incognito window</strong> or another browser, register a second account, and test 2-way live chat!
                </p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const online = isUserOnline(u._id);
                const isSelected = activePartner?._id === u._id && !activeGroup;
                const unread = unreadCounts[u._id] || 0;

                return (
                  <div
                    key={u._id}
                    className={`user-contact-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectPartner(u)}
                  >
                    <div className="avatar-wrapper">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="contact-avatar-img" />
                      ) : (
                        <div className="contact-avatar-placeholder">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`online-indicator ${online ? 'online' : 'offline'}`} />
                    </div>

                    <div className="contact-info">
                      <div className="contact-name-row">
                        <span className="contact-name">{u.name}</span>
                        {unread > 0 ? (
                          <span className="unread-counter-badge">{unread}</span>
                        ) : (
                          <span className="contact-status-text">
                            {online ? 'Online' : formatLastSeen(u.lastSeen)}
                          </span>
                        )}
                      </div>
                      <p className="contact-bio-snippet">{u.bio || u.email}</p>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* Groups List */
            <>
              <button
                type="button"
                className="btn-new-group"
                onClick={() => setShowCreateGroupModal(true)}
              >
                <IconPlus size={15} />
                <span>Create New Group</span>
              </button>

              {groupsList.length === 0 ? (
                <div className="no-users-box">
                  <div className="no-users-icon">
                    <IconUsers size={32} />
                  </div>
                  <p className="no-users-title">No groups joined yet</p>
                  <p className="no-users-hint">
                    Click <strong>"Create New Group"</strong> to start a collaborative group chat room!
                  </p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="empty-members-hint">No groups matching "{searchQuery}"</div>
              ) : (
                filteredGroups.map((g) => {
                  const isSelected = activeGroup?._id === g._id;
                  const unread = unreadCounts[g._id] || 0;

                  return (
                    <div
                      key={g._id}
                      className={`user-contact-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectGroup(g)}
                    >
                      <div className="avatar-wrapper">
                        <div className="group-avatar-display">
                          {g.avatar ? <span className="group-avatar-text">{g.avatar}</span> : <IconUsers size={18} />}
                        </div>
                      </div>

                      <div className="contact-info">
                        <div className="contact-name-row">
                          <span className="contact-name">{g.name}</span>
                          {unread > 0 ? (
                            <span className="unread-counter-badge">{unread}</span>
                          ) : (
                            <span className="contact-status-text">
                              {g.members?.length || 0} members
                            </span>
                          )}
                        </div>
                        <p className="contact-bio-snippet">
                          {g.description || `Created by ${g.admin?.name || 'Admin'}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Chat Area with Dynamic Wallpaper */}
      <div className={`chat-main-area wallpaper-${chatWallpaper}`}>
        {activeGroup || activePartner ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              {activeGroup ? (
                <div className="active-user-meta">
                  <button
                    type="button"
                    className="mobile-back-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileChat(false);
                    }}
                    title="Back to groups list"
                    aria-label="Back to groups"
                  >
                    ‹
                  </button>

                  <div className="avatar-wrapper">
                    <div className="group-avatar-display">
                      {activeGroup.avatar ? <span className="group-avatar-text">{activeGroup.avatar}</span> : <IconUsers size={20} />}
                    </div>
                  </div>
                  <div>
                    <div className="active-partner-name">
                      <span>{activeGroup.name}</span>
                      <span className="group-badge-tag">Group</span>
                    </div>
                    <div className="active-partner-sub">
                      <span className="text-muted">
                        {activeGroup.members?.length || 0} members • Admin: {activeGroup.admin?.name || 'Admin'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="active-user-meta clickable-meta"
                  onClick={() => setShowProfileModal(true)}
                  title="Click to view contact profile & shared media"
                >
                  <button
                    type="button"
                    className="mobile-back-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMobileChat(false);
                    }}
                    title="Back to contacts list"
                    aria-label="Back to contacts"
                  >
                    ‹
                  </button>

                  <div className="avatar-wrapper">
                    {activePartner.avatar ? (
                      <img
                        src={activePartner.avatar}
                        alt={activePartner.name}
                        className="contact-avatar-img"
                      />
                    ) : (
                      <div className="contact-avatar-placeholder">
                        {activePartner.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`online-indicator ${
                        isUserOnline(activePartner._id) ? 'online' : 'offline'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="active-partner-name">
                      <span>{activePartner.name}</span>
                      <span className="view-profile-hint">
                        <IconInfo size={14} />
                      </span>
                    </div>
                    <div className="active-partner-sub">
                      {isPartnerTyping ? (
                        <span className="typing-text">typing a message...</span>
                      ) : isUserOnline(activePartner._id) ? (
                        <span className="text-success font-medium">● Active now</span>
                      ) : (
                        <span className="text-muted">{formatLastSeen(activePartner.lastSeen)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="chat-header-actions">
                {/* Group Info & Management Drawer Button */}
                {activeGroup && (
                  <button
                    type="button"
                    className="chat-header-btn group-info-trigger-btn"
                    onClick={() => setShowGroupDrawer(true)}
                    title="Group Settings & Members"
                    aria-label="Group Information"
                  >
                    <IconInfo size={17} />
                  </button>
                )}

                {/* WebRTC 1-on-1 Voice & Video Calling */}
                {activePartner && (
                  <>
                    <button
                      type="button"
                      className="chat-header-btn call-action-btn"
                      onClick={() => setOutgoingCallSession({ partner: activePartner, callType: 'audio' })}
                      title={`Start Voice Call with ${activePartner.name}`}
                      aria-label="Voice Call"
                    >
                      <IconPhone size={17} />
                    </button>
                    <button
                      type="button"
                      className="chat-header-btn call-action-btn"
                      onClick={() => setOutgoingCallSession({ partner: activePartner, callType: 'video' })}
                      title={`Start Video Call with ${activePartner.name}`}
                      aria-label="Video Call"
                    >
                      <IconVideo size={17} />
                    </button>
                  </>
                )}

                {/* Disappearing Messages Duration Picker */}
                <div className="relative-container">
                  <button
                    type="button"
                    className={`chat-header-btn ${disappearingDuration > 0 ? 'active' : ''}`}
                    onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
                    title={`Disappearing messages: ${disappearingDuration > 0 ? `${disappearingDuration}s` : 'Off'}`}
                    aria-label="Disappearing Messages Timer"
                  >
                    <IconClock size={17} />
                    {disappearingDuration > 0 && <span className="disappearing-badge-dot"></span>}
                  </button>
                  {showDisappearingMenu && (
                    <div className="wallpaper-dropdown disappearing-menu-dropdown">
                      <div className="wallpaper-dropdown-title">
                        <IconClock size={14} />
                        <span>Self-Destruct Timer</span>
                      </div>
                      {[
                        { sec: 0, label: 'Off' },
                        { sec: 10, label: '10 Seconds' },
                        { sec: 60, label: '1 Minute' },
                        { sec: 3600, label: '1 Hour' },
                        { sec: 86400, label: '24 Hours' },
                      ].map((item) => (
                        <button
                          key={item.sec}
                          type="button"
                          className={`wallpaper-option-btn ${disappearingDuration === item.sec ? 'active' : ''}`}
                          onClick={() => {
                            setDisappearingDuration(item.sec);
                            setShowDisappearingMenu(false);
                            showToast(item.sec > 0 ? `Disappearing set to ${item.label}` : 'Disappearing turned off');
                          }}
                        >
                          <span className="wall-icon">{item.sec > 0 ? <IconClock size={14} /> : <IconX size={14} />}</span>
                          <span className="wall-name">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search In Chat */}
                <button
                  type="button"
                  className={`chat-header-btn ${inChatSearchOpen ? 'active' : ''}`}
                  onClick={() => setInChatSearchOpen(!inChatSearchOpen)}
                  title={inChatSearchOpen ? 'Close search' : 'Search in this conversation'}
                  aria-label="Search conversation"
                >
                  <IconSearch size={16} />
                </button>

                {/* Starred Messages View */}
                <button
                  type="button"
                  className={`chat-header-btn ${showStarredDrawer ? 'active' : ''}`}
                  onClick={() => setShowStarredDrawer(!showStarredDrawer)}
                  title="View Starred Messages"
                  aria-label="View Starred Messages"
                >
                  <IconStar size={16} fill={showStarredDrawer ? '#f59e0b' : 'none'} color={showStarredDrawer ? '#f59e0b' : 'currentColor'} />
                  {starredMessages.length > 0 && (
                    <span className="header-badge-count">{starredMessages.length}</span>
                  )}
                </button>

                {/* Wallpaper Theme Picker */}
                <div className="relative-container">
                  <button
                    type="button"
                    className={`chat-header-btn ${showWallpaperMenu ? 'active' : ''}`}
                    onClick={() => setShowWallpaperMenu(!showWallpaperMenu)}
                    title="Change Chat Wallpaper"
                    aria-label="Change Chat Wallpaper"
                  >
                    <IconPalette size={17} />
                  </button>
                  {showWallpaperMenu && (
                    <div className="wallpaper-dropdown">
                      <div className="wallpaper-dropdown-title">Chat Theme / Wallpaper</div>
                      {WALLPAPER_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`wallpaper-option-btn ${chatWallpaper === p.id ? 'active' : ''}`}
                          onClick={() => handleSelectWallpaper(p.id)}
                        >
                          <span
                            className="wall-color-dot"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="wall-name">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Chat History */}
                <button
                  type="button"
                  className="chat-header-btn"
                  onClick={handleExportChat}
                  title="Export Chat History (.txt)"
                  aria-label="Export Chat History"
                >
                  <IconDownload size={16} />
                </button>

                {/* Clear Conversation */}
                <button
                  type="button"
                  className="chat-header-btn btn-clear-chat"
                  onClick={handleClearChat}
                  title="Clear conversation history"
                  aria-label="Clear conversation history"
                >
                  <IconTrash size={17} />
                </button>

                {/* Audio Notifications Mute / Unmute */}
                <button
                  type="button"
                  className={`chat-header-btn ${!soundEnabled ? 'muted' : ''}`}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Mute notification chime' : 'Enable notification chime'}
                  aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
                >
                  {soundEnabled ? (
                    <IconBell size={16} />
                  ) : (
                    <IconBellOff size={16} />
                  )}
                </button>

                {/* Minimal Live Status Pill */}
                <div className="header-status-pill hide-on-tiny" title="Realtime Socket.io active">
                  <span className="live-status-dot"></span>
                  <span className="live-status-label">Live</span>
                </div>
              </div>
            </div>

            {/* In-Chat Search Strip */}
            {inChatSearchOpen && (
              <div className="in-chat-search-strip">
                <div className="search-strip-input-wrap">
                  <IconSearch className="search-strip-icon" size={15} />
                  <input
                    type="text"
                    placeholder="Find in conversation..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="search-strip-input"
                    autoFocus
                  />
                  {chatSearchQuery && (
                    <button
                      type="button"
                      className="search-strip-clear"
                      onClick={() => setChatSearchQuery('')}
                      title="Clear search input"
                      aria-label="Clear search"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>

                {chatSearchQuery && (
                  <span className="search-strip-badge">
                    {displayedMessages.length} {displayedMessages.length === 1 ? 'match' : 'matches'}
                  </span>
                )}

                <button
                  type="button"
                  className="search-strip-close"
                  onClick={() => {
                    setInChatSearchOpen(false);
                    setChatSearchQuery('');
                  }}
                  title="Close search"
                >
                  Done
                </button>
              </div>
            )}

            {/* Sticky Pinned Message Strip */}
            {pinnedMessage && (
              <div
                className="pinned-message-strip"
                onClick={() => jumpToMessage(pinnedMessage._id)}
                title="Click to jump to pinned message"
              >
                <div className="pinned-pin-icon">
                  <IconPin size={16} />
                </div>
                <div className="pinned-meta">
                  <span className="pinned-tag">Pinned Message</span>
                  <p className="pinned-snippet">
                    {pinnedMessage.text ||
                      (pinnedMessage.image
                        ? 'Photo'
                        : pinnedMessage.audio
                        ? 'Voice note'
                        : pinnedMessage.file
                        ? pinnedMessage.file.name
                        : 'Message')}
                  </p>
                </div>
                <button
                  type="button"
                  className="pinned-unpin-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePin(pinnedMessage._id);
                  }}
                  title="Unpin message"
                  aria-label="Unpin message"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}

            {/* Starred Messages Sliding Drawer */}
            {showStarredDrawer && (
              <div className="starred-drawer">
                <div className="starred-drawer-header">
                  <div className="starred-drawer-title">
                    <IconStar size={16} fill="#f59e0b" color="#f59e0b" />
                    <span>Starred Messages ({starredMessages.length})</span>
                  </div>
                  <button
                    type="button"
                    className="drawer-close-btn"
                    onClick={() => setShowStarredDrawer(false)}
                    aria-label="Close starred messages"
                  >
                    <IconX size={16} />
                  </button>
                </div>
                <div className="starred-drawer-list">
                  {starredMessages.length === 0 ? (
                    <div className="starred-empty">
                      <p>No starred messages yet.</p>
                      <span>Hover over any message and click star to bookmark it here.</span>
                    </div>
                  ) : (
                    starredMessages.map((sm) => {
                      const isMe = (sm.sender?._id || sm.sender) === user?._id;
                      return (
                        <div
                          key={sm._id}
                          className="starred-item-card"
                          onClick={() => jumpToMessage(sm._id)}
                        >
                          <div className="starred-item-header">
                            <span className="starred-sender-name">
                              {isMe ? 'You' : activePartner.name}
                            </span>
                            <span className="starred-time">
                              {new Date(sm.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="starred-item-content">
                            {sm.text && <p className="starred-text">{sm.text}</p>}
                            {sm.image && (
                              <div className="starred-img-tag"><IconImage size={13} /> Photo</div>
                            )}
                            {sm.audio && (
                              <div className="starred-img-tag"><IconMic size={13} /> Voice note</div>
                            )}
                            {sm.file?.name && (
                              <div className="starred-img-tag"><IconFileText size={13} /> {sm.file.name}</div>
                            )}
                          </div>
                          <div className="starred-item-footer">
                            <span className="jump-hint">Click to jump ↗</span>
                            <button
                              type="button"
                              className="unstar-mini-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStar(sm._id);
                              }}
                              title="Remove star"
                            >
                              Unstar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="chat-messages-container">
              {isLoadingMessages ? (
                <div className="messages-loading">
                  <span className="spinner"></span> Loading conversation...
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="empty-messages-placeholder">
                  <div className="empty-msg-icon">
                    <IconChat size={38} />
                  </div>
                  <h4>{chatSearchQuery ? 'No matching messages' : 'No messages yet'}</h4>
                  <p>
                    {chatSearchQuery
                      ? 'Try another keyword or clear the search filter.'
                      : `Send a message, voice note, or picture to start chatting with ${activeGroup ? activeGroup.name : activePartner?.name}!`}
                  </p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isSentByMe = (msg.sender?._id || msg.sender) === user?._id;
                  const senderAvatar =
                    msg.sender?.avatar || (isSentByMe ? user?.avatar : activePartner?.avatar);
                  const senderName =
                    msg.sender?.name || (isSentByMe ? user?.name : (activePartner?.name || 'Member'));
                  const isHovered = hoveredMessageId === msg._id;
                  const isStarred = (msg.starredBy || []).some(
                    (id) => (id?._id || id)?.toString() === user?._id?.toString()
                  );
                  const isPinned = pinnedMessageId === msg._id;
                  const audioSpeed = audioRates[msg._id] || 1;

                  // Group reactions
                  const reactionCounts = (msg.reactions || []).reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {});

                  const myReaction = (msg.reactions || []).find(
                    (r) => (r.user?._id || r.user)?.toString() === user?._id?.toString()
                  )?.emoji;

                  return (
                    <div
                      key={msg._id || Math.random()}
                      id={`msg-${msg._id}`}
                      className={`message-row ${isSentByMe ? 'sent' : 'received'}`}
                      onMouseEnter={() => setHoveredMessageId(msg._id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {!isSentByMe && (
                        <div
                          className="msg-avatar-col"
                          onClick={() => {
                            if (!activeGroup) setShowProfileModal(true);
                          }}
                          title={activeGroup ? senderName : 'View profile'}
                          style={{ cursor: activeGroup ? 'default' : 'pointer' }}
                        >
                          {senderAvatar ? (
                            <img src={senderAvatar} alt={senderName} className="msg-avatar-img" />
                          ) : (
                            <div className="msg-avatar-placeholder">
                              {senderName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="message-bubble-wrapper">
                        {/* Message Bubble */}
                        <div
                          className={`message-bubble ${
                            isSentByMe ? 'bubble-sent' : 'bubble-received'
                          } ${msg.isDeleted ? 'bubble-deleted' : ''} ${isPinned ? 'bubble-pinned' : ''}`}
                        >
                          {/* Group Sender Name in Group Chat */}
                          {activeGroup && !isSentByMe && (
                            <div className="group-message-sender-name">{senderName}</div>
                          )}

                          {/* Quoted Reply Block */}
                          {msg.replyTo && msg.replyTo.id && (
                            <div
                              className="bubble-quote-box"
                              onClick={() => jumpToMessage(msg.replyTo.id)}
                              title="Click to jump to quoted message"
                            >
                              <div className="quote-sender">{msg.replyTo.senderName}</div>
                              <div className="quote-text">{msg.replyTo.text}</div>
                            </div>
                          )}

                          {/* Image Attachment */}
                          {msg.image && !msg.isDeleted && (
                            <div
                              className="bubble-image-wrap"
                              onClick={() => setLightboxImage(msg.image)}
                              title="Click to view full image"
                            >
                              <img src={msg.image} alt="Shared attachment" className="bubble-image" />
                              <span className="image-zoom-hint">
                                <IconSearch size={13} />
                                <span>Expand</span>
                              </span>
                            </div>
                          )}

                          {/* Voice Note Player with 1x / 1.5x / 2x Speed Multiplier */}
                          {msg.audio && !msg.isDeleted && (
                            <div className="bubble-audio-wrap">
                              <div className="audio-header-row">
                                <span className="audio-icon-tag">
                                  <IconMic size={14} />
                                  <span>Voice Note</span>
                                </span>
                                <button
                                  type="button"
                                  className="audio-speed-pill"
                                  onClick={() => handleToggleAudioSpeed(msg._id)}
                                  title="Change playback speed"
                                >
                                  {audioSpeed}x
                                </button>
                              </div>
                              <audio
                                id={`audio-player-${msg._id}`}
                                controls
                                src={msg.audio}
                                className="bubble-audio-player"
                              />
                            </div>
                          )}

                          {/* Document / File Attachment */}
                          {msg.file?.name && !msg.isDeleted && (
                            <div className="bubble-file-card">
                              <div className="file-icon-square">
                                <IconFileText size={20} />
                              </div>
                              <div className="file-meta">
                                <div className="file-name" title={msg.file.name}>
                                  {msg.file.name}
                                </div>
                                <div className="file-size">
                                  {formatFileSize(msg.file.size)}
                                </div>
                              </div>
                              <a
                                href={msg.file.data}
                                download={msg.file.name}
                                className="file-download-btn"
                                title="Download file"
                                aria-label="Download file"
                              >
                                <IconDownload size={15} />
                              </a>
                            </div>
                          )}

                          {/* Live Poll Card */}
                          {msg.poll && msg.poll.question && !msg.isDeleted && (
                            <div className="bubble-poll-card">
                              <div className="poll-header">
                                <span className="poll-badge">
                                  <IconPoll size={14} />
                                  <span>Poll</span>
                                </span>
                                <span className="poll-total-votes">
                                  {(msg.poll.options || []).reduce((sum, o) => sum + (o.votes?.length || 0), 0)} votes
                                </span>
                              </div>
                              <div className="poll-question">{msg.poll.question}</div>
                              <div className="poll-options-list">
                                {(() => {
                                  const totalVotes = (msg.poll.options || []).reduce(
                                    (sum, o) => sum + (o.votes?.length || 0),
                                    0
                                  );
                                  return (msg.poll.options || []).map((opt, idx) => {
                                    const voteCount = opt.votes?.length || 0;
                                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                    const hasVotedThis = (opt.votes || []).some(
                                      (vId) => (vId?._id || vId)?.toString() === user?._id?.toString()
                                    );
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        className={`poll-option-btn ${hasVotedThis ? 'poll-option-voted' : ''}`}
                                        onClick={() => handleVotePoll(msg._id, idx)}
                                        title={hasVotedThis ? 'Click to change/remove vote' : 'Click to vote'}
                                      >
                                        <div
                                          className="poll-option-progress"
                                          style={{ width: `${percentage}%` }}
                                        />
                                        <div className="poll-option-content">
                                          <div className="poll-option-text">
                                            <span className={`poll-radio-indicator ${hasVotedThis ? 'checked' : ''}`}>
                                              {hasVotedThis && <IconCheck size={11} />}
                                            </span>
                                            <span className="poll-opt-label">{opt.text}</span>
                                          </div>
                                          <div className="poll-option-stats">
                                            <span className="poll-percent">{percentage}%</span>
                                            <span className="poll-count">({voteCount})</span>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Code Snippet Card */}
                          {msg.codeSnippet && msg.codeSnippet.code && !msg.isDeleted && (
                            <div className="bubble-code-card">
                              <div className="code-header">
                                <div className="code-lang-tag">
                                  <span className="code-dot red"></span>
                                  <span className="code-dot yellow"></span>
                                  <span className="code-dot green"></span>
                                  <span className="code-lang-name">{msg.codeSnippet.language || 'code'}</span>
                                </div>
                                <button
                                  type="button"
                                  className="code-copy-btn"
                                  onClick={() => handleCopyText(msg.codeSnippet.code)}
                                  title="Copy Code"
                                >
                                  <IconCopy size={13} />
                                  <span>Copy</span>
                                </button>
                              </div>
                              <pre className="code-pre-box">
                                <code>{msg.codeSnippet.code}</code>
                              </pre>
                            </div>
                          )}

                          {/* Tic-Tac-Toe Game Card */}
                          {msg.game && msg.game.gameType === 'tictactoe' && !msg.isDeleted && (
                            <div className="bubble-game-card">
                              <div className="game-card-header">
                                <span className="game-title">
                                  <IconGame size={16} />
                                  <span>Tic-Tac-Toe</span>
                                </span>
                                <span className={`game-status-badge ${msg.game.status}`}>
                                  {msg.game.status === 'waiting'
                                    ? 'Waiting for Player'
                                    : msg.game.status === 'playing'
                                    ? 'In Progress'
                                    : 'Game Over'}
                                </span>
                              </div>
                              <div className="game-players-row">
                                <div className={`game-player-pill ${msg.game.turn === (msg.game.playerX?._id || msg.game.playerX) ? 'turn-active' : ''}`}>
                                  <span className="player-mark x-mark">X</span>
                                  <span className="player-name">
                                    {(msg.game.playerX?._id || msg.game.playerX) === user?._id
                                      ? 'You'
                                      : (msg.game.playerX?.name || 'Player X')}
                                  </span>
                                </div>
                                <span className="game-vs">VS</span>
                                <div className={`game-player-pill ${msg.game.turn === (msg.game.playerO?._id || msg.game.playerO) ? 'turn-active' : ''}`}>
                                  <span className="player-mark o-mark">O</span>
                                  <span className="player-name">
                                    {msg.game.playerO
                                      ? (msg.game.playerO?._id || msg.game.playerO) === user?._id
                                        ? 'You'
                                        : (msg.game.playerO?.name || 'Player O')
                                      : 'Waiting...'}
                                  </span>
                                </div>
                              </div>

                              {/* Banner if game finished */}
                              {msg.game.status === 'finished' && (
                                <div className="game-result-banner">
                                  {msg.game.winner === 'draw'
                                    ? "Game ended in a draw"
                                    : `Winner: ${
                                        (msg.game.winner?._id || msg.game.winner) === user?._id
                                          ? 'You won!'
                                          : (msg.game.winner?.name || 'Player') + ' won!'
                                      }`}
                                </div>
                              )}

                              {/* 3x3 Grid */}
                              <div className="tictactoe-grid">
                                {(msg.game.board || Array(9).fill(null)).map((cell, idx) => {
                                  const isMyTurn = msg.game.turn === user?._id && msg.game.status !== 'finished';
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={!!cell || !isMyTurn}
                                      className={`tictactoe-cell ${cell ? `cell-${cell.toLowerCase()}` : ''} ${
                                        isMyTurn && !cell ? 'cell-playable' : ''
                                      }`}
                                      onClick={() => playGameMove(msg._id, idx)}
                                    >
                                      {cell}
                                    </button>
                                  );
                                })}
                              </div>
                              {msg.game.status === 'playing' && (
                                <div className="game-turn-hint">
                                  {msg.game.turn === user?._id ? "Your turn to play" : "Waiting for opponent..."}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Text Message */}
                          {msg.text && (
                            <div className={`bubble-text ${msg.isDeleted ? 'deleted-text' : ''}`}>
                              {msg.text}
                            </div>
                          )}

                          {/* Hover Actions Bar (Reactions, Reply, Edit, Star, Pin, Copy, Forward, Delete) */}
                          {msg._id && isHovered && !msg.isDeleted && (
                            <div className={`quick-reaction-bar ${isSentByMe ? 'left' : 'right'}`}>
                              {/* Emojis */}
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className={`quick-react-btn ${myReaction === emoji ? 'active' : ''}`}
                                  onClick={() => handleReactToMessage(msg._id, emoji)}
                                  title={`React ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}

                              <span className="action-divider"></span>

                              {/* Reply Button */}
                              <button
                                type="button"
                                className="quick-react-btn"
                                onClick={() => setReplyingTo(msg)}
                                title="Reply to message"
                              >
                                <IconReply size={15} />
                              </button>

                              {/* Edit Button (if sent by me and regular text message) */}
                              {isSentByMe && msg.text && !msg.poll && !msg.codeSnippet && !msg.game && (
                                <button
                                  type="button"
                                  className="quick-react-btn"
                                  onClick={() => {
                                    setEditingMessage({ messageId: msg._id, text: msg.text });
                                    setInputText(msg.text);
                                  }}
                                  title="Edit message"
                                >
                                  <IconEdit size={15} />
                                </button>
                              )}

                              {/* Copy Text Button (if message has text) */}
                              {msg.text && (
                                <button
                                  type="button"
                                  className="quick-react-btn"
                                  onClick={() => handleCopyText(msg.text)}
                                  title="Copy text to clipboard"
                                >
                                  <IconCopy size={15} />
                                </button>
                              )}

                              {/* Forward Button */}
                              <button
                                type="button"
                                className="quick-react-btn"
                                onClick={() => setForwardingMessage(msg)}
                                title="Forward message to another contact"
                              >
                                <IconForward size={15} />
                              </button>

                              {/* Pin Button */}
                              <button
                                type="button"
                                className={`quick-react-btn ${isPinned ? 'pinned-active' : ''}`}
                                onClick={() => handleTogglePin(msg._id)}
                                title={isPinned ? 'Unpin message' : 'Pin message to top'}
                              >
                                <IconPin size={15} />
                              </button>

                              {/* Star Button */}
                              <button
                                type="button"
                                className={`quick-react-btn ${isStarred ? 'starred-active' : ''}`}
                                onClick={() => handleToggleStar(msg._id)}
                                title={isStarred ? 'Unstar message' : 'Star message'}
                              >
                                <IconStar size={15} fill={isStarred ? '#f59e0b' : 'none'} color={isStarred ? '#f59e0b' : 'currentColor'} />
                              </button>

                              {/* Delete message (Delete for me / Delete for everyone / Admin delete) */}
                              <button
                                type="button"
                                className="quick-react-btn delete-btn"
                                onClick={() => handleOpenDeleteModal(msg)}
                                title="Delete message"
                                aria-label="Delete message"
                              >
                                <IconTrash size={15} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reaction Badges Below Bubble */}
                        {Object.keys(reactionCounts).length > 0 && (
                          <div className={`reactions-row ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                type="button"
                                className={`reaction-pill ${myReaction === emoji ? 'my-reaction' : ''}`}
                                onClick={() => handleReactToMessage(msg._id, emoji)}
                                title={`${count} reaction(s)`}
                              >
                                <span>{emoji}</span>
                                <span className="reaction-count">{count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timestamp, Pin, Star Indicator & Read Receipts */}
                        <div className={`message-timestamp-row ${isSentByMe ? 'text-right' : 'text-left'}`}>
                          {isPinned && (
                            <span className="bubble-pin-badge" title="Pinned message">
                              <IconPin size={12} />
                            </span>
                          )}

                          {isStarred && (
                            <span className="bubble-star-badge" title="Starred message">
                              <IconStar size={12} fill="#f59e0b" color="#f59e0b" />
                            </span>
                          )}

                          {/* Edited tag */}
                          {msg.isEdited && (
                            <span className="bubble-edited-tag" title="Message edited">
                              (edited)
                            </span>
                          )}

                          {/* Disappearing indicator */}
                          {msg.expiresAt && (
                            <span className="bubble-disappearing-badge" title="Disappearing message">
                              <IconClock size={12} />
                            </span>
                          )}

                          <span className="timestamp-text">
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Just now'}
                          </span>

                          {/* Read Receipts for sent messages: ✓✓ */}
                          {isSentByMe && (
                            <span
                              className={`read-checkmarks ${msg.status === 'read' ? 'read' : 'delivered'}`}
                              title={msg.status === 'read' ? 'Read by recipient' : 'Delivered'}
                            >
                              <IconCheckCheck size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Banner Above Input */}
            {replyingTo && (
              <div className="reply-preview-bar">
                <div className="reply-indicator-bar"></div>
                <div className="reply-preview-info">
                  <div className="reply-preview-sender">
                    Replying to{' '}
                    {(replyingTo.sender?._id || replyingTo.sender) === user?._id
                      ? 'yourself'
                      : (replyingTo.sender?.name || (activePartner ? activePartner.name : 'Member'))}
                  </div>
                  <div className="reply-preview-snippet">
                    {replyingTo.text ||
                      (replyingTo.image
                        ? 'Photo'
                        : replyingTo.audio
                        ? 'Voice Note'
                        : replyingTo.file
                        ? replyingTo.file.name
                        : 'Message')}
                  </div>
                </div>
                <button
                  type="button"
                  className="reply-cancel-btn"
                  onClick={() => setReplyingTo(null)}
                  title="Cancel reply"
                  aria-label="Cancel reply"
                >
                  <IconX size={15} />
                </button>
              </div>
            )}

            {/* Editing Message Banner Above Input */}
            {editingMessage && (
              <div className="reply-preview-bar edit-preview-bar">
                <div className="reply-indicator-bar edit-indicator-bar"></div>
                <div className="reply-preview-info">
                  <div className="reply-preview-sender">
                    <IconEdit size={14} />
                    <span>Editing message</span>
                  </div>
                  <div className="reply-preview-snippet">{editingMessage.text}</div>
                </div>
                <button
                  type="button"
                  className="reply-cancel-btn"
                  onClick={() => {
                    setEditingMessage(null);
                    setInputText('');
                  }}
                  title="Cancel editing"
                  aria-label="Cancel editing"
                >
                  <IconX size={15} />
                </button>
              </div>
            )}

            {/* Attached Image Preview Bar */}
            {attachedImage && (
              <div className="attached-media-bar">
                <div className="attached-chip">
                  <img src={attachedImage} alt="Attachment Preview" className="attached-thumb" />
                  <span className="attached-label">Image attached</span>
                  <button
                    type="button"
                    className="attached-remove-btn"
                    onClick={() => setAttachedImage(null)}
                    aria-label="Remove image attachment"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Attached Document Preview Bar */}
            {attachedFile && (
              <div className="attached-media-bar">
                <div className="attached-chip">
                  <span className="chip-file-icon">
                    <IconFileText size={18} />
                  </span>
                  <div className="chip-file-meta">
                    <span className="attached-label">{attachedFile.name}</span>
                    <span className="attached-sub">{formatFileSize(attachedFile.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="attached-remove-btn"
                    onClick={() => setAttachedFile(null)}
                    aria-label="Remove file attachment"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Voice Recording Controls Bar */}
            {isRecording ? (
              <div className="voice-recording-bar">
                <div className="recording-status">
                  <span className="recording-blinking-dot"></span>
                  <span className="recording-label">Recording Voice Note...</span>
                  <span className="recording-timer">
                    {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="recording-wave-visualizer">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div className="recording-actions">
                  <button
                    type="button"
                    className="recording-cancel-btn"
                    onClick={cancelVoiceRecording}
                    title="Discard recording"
                  >
                    <IconX size={14} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    className="recording-send-btn"
                    onClick={finishVoiceRecording}
                    title="Send voice note"
                  >
                    <IconSend size={14} />
                    <span>Send Voice</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Input Bar */
              <form onSubmit={handleSendMessage} className="chat-input-bar">
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelectEmoji={handleSelectEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}

                {/* Emoji Picker Button */}
                <button
                  type="button"
                  className={`chat-action-btn ${showEmojiPicker ? 'active' : ''}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add Emoji"
                  aria-label="Add Emoji"
                >
                  <IconSmile size={19} />
                </button>

                {/* Photo Attachment Button */}
                <label className="chat-action-btn" title="Send Image" aria-label="Send Image">
                  <IconImage size={19} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Document Attachment Button */}
                <label className="chat-action-btn" title="Send Document (PDF, DOC, TXT)" aria-label="Send Document">
                  <IconPaperclip size={19} />
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.zip,.csv,.json,.xls,.xlsx"
                    onChange={handleDocumentSelect}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Interactive Poll Button */}
                <button
                  type="button"
                  className="chat-action-btn"
                  onClick={() => setShowPollModal(true)}
                  title="Create Interactive Poll"
                  aria-label="Create Poll"
                >
                  <IconPoll size={19} />
                </button>

                {/* Code Snippet Button */}
                <button
                  type="button"
                  className="chat-action-btn"
                  onClick={() => setShowCodeModal(true)}
                  title="Share Formatted Code Snippet"
                  aria-label="Share Code"
                >
                  <IconCode size={19} />
                </button>

                {/* In-Chat Mini Game (Tic-Tac-Toe) Button */}
                <button
                  type="button"
                  className="chat-action-btn"
                  onClick={handleStartGame}
                  title="Challenge to Tic-Tac-Toe Game"
                  aria-label="Play Game"
                >
                  <IconGame size={19} />
                </button>

                {/* Speech-to-Text Button */}
                <button
                  type="button"
                  className={`chat-action-btn ${isSpeechListening ? 'speech-listening-active' : ''}`}
                  onClick={toggleSpeechRecognition}
                  title={isSpeechListening ? 'Listening... Click to stop' : 'Speech-to-Text Voice Dictation'}
                  aria-label="Speech to text"
                >
                  <IconMic size={19} />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  className="chat-text-input"
                  placeholder={
                    editingMessage
                      ? 'Edit message content...'
                      : activeGroup
                      ? `Message group ${activeGroup.name}...`
                      : `Message ${activePartner?.name || 'chat'}...`
                  }
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />

                {/* Voice Note Record or Send/Save Button */}
                {!inputText.trim() && !attachedImage && !attachedFile && !editingMessage ? (
                  <button
                    type="button"
                    className="chat-mic-btn"
                    onClick={startVoiceRecording}
                    title="Record Voice Note"
                    aria-label="Record Voice Note"
                  >
                    <IconMic size={18} />
                  </button>
                ) : (
                  /* Send / Save Button */
                  <button
                    type="submit"
                    className={`chat-send-btn ${editingMessage ? 'btn-save-edit' : ''}`}
                    title={editingMessage ? 'Save changes' : 'Send Message'}
                    aria-label={editingMessage ? 'Save changes' : 'Send Message'}
                  >
                    <span>{editingMessage ? 'Save' : 'Send'}</span>
                    <IconSend size={15} />
                  </button>
                )}
              </form>
            )}
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="editorial-empty-seal">
              <div className="no-chat-icon">
                <IconChat size={34} />
              </div>
            </div>
            <div className="editorial-chat-badge">BM Chat • Realtime & Encrypted</div>
            <h3 className="no-chat-title">Select a Conversation</h3>
            <p className="no-chat-desc">
              Choose any direct contact or team group from the left directory to start messaging in real-time.
            </p>
            <div className="no-chat-perks">
              <span className="no-chat-perk-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Zero Latency
              </span>
              <span className="no-chat-perk-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                256-Bit Encrypted
              </span>
              <span className="no-chat-perk-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                HD Voice & Video
              </span>
            </div>
          </div>
        )}
      </div>

      {/* WebRTC Audio & Video Calling Modal */}
      <CallModal
        outgoingCall={outgoingCallSession}
        onClose={() => setOutgoingCallSession(null)}
        showToast={showToast}
      />

      {/* Create New Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        users={usersList}
        token={token}
        onGroupCreated={(newGroup) => {
          setGroupsList((prev) => [newGroup, ...prev]);
          setActiveGroup(newGroup);
          setActivePartner(null);
          setSidebarTab('groups');
        }}
        showToast={showToast}
      />

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmitPoll={handleCreatePoll}
        showToast={showToast}
      />

      {/* Share Code Snippet Modal */}
      <CodeSnippetModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onSubmitSnippet={handleCreateCodeSnippet}
        showToast={showToast}
      />

      {/* Group Info & Management Drawer */}
      <GroupInfoDrawer
        isOpen={showGroupDrawer}
        onClose={() => setShowGroupDrawer(false)}
        group={activeGroup}
        currentUser={user}
        allUsers={usersList}
        token={token}
        isUserOnline={isUserOnline}
        onGroupUpdated={(updatedGroup) => {
          setActiveGroup(updatedGroup);
          setGroupsList((prev) =>
            prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g))
          );
        }}
        onGroupLeft={(groupId) => {
          setGroupsList((prev) => prev.filter((g) => g._id !== groupId));
          setActiveGroup(null);
          setShowGroupDrawer(false);
          showToast('Left group');
        }}
        showToast={showToast}
      />

      {/* Delete Message Confirmation Dialog */}
      {deletingMessage && (
        <div className="modal-backdrop" onClick={() => setDeletingMessage(null)}>
          <div className="delete-message-dialog glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon-col">
                <div className="delete-icon-badge">
                  <IconTrash size={20} />
                </div>
                <div>
                  <h3 className="modal-title">Delete Message</h3>
                  <p className="modal-subtitle">Choose how you want to delete this message</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setDeletingMessage(null)}
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="delete-preview-content">
              <div className="delete-preview-quote">
                "{deletingMessage.text?.length > 90
                  ? deletingMessage.text.substring(0, 90) + '...'
                  : deletingMessage.text}"
              </div>
              <p className="delete-explain-text">
                {deletingMessage.canDeleteForEveryone
                  ? 'You can delete this message for everyone in this chat or only for yourself.'
                  : 'You can remove this message from your own chat view.'}
              </p>
            </div>

            <div className="delete-dialog-actions">
              <button
                type="button"
                className="btn-delete-option btn-delete-me"
                onClick={handleConfirmDeleteForMe}
              >
                <IconTrash size={16} />
                <div className="btn-text-block">
                  <span className="btn-primary-title">Delete for Me</span>
                  <span className="btn-secondary-desc">Hidden from your view only</span>
                </div>
              </button>

              {deletingMessage.canDeleteForEveryone && (
                <button
                  type="button"
                  className="btn-delete-option btn-delete-everyone"
                  onClick={handleConfirmDeleteForEveryone}
                >
                  <IconTrash size={16} />
                  <div className="btn-text-block">
                    <span className="btn-primary-title">Delete for Everyone</span>
                    <span className="btn-secondary-desc">Removed for all participants in chat</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary w-full mt-2"
                onClick={() => setDeletingMessage(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
