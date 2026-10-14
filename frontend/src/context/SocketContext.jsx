import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // { [userId]: boolean }
  const [reactionUpdate, setReactionUpdate] = useState(null);
  const [readReceipt, setReadReceipt] = useState(null);

  const [deletedMessageId, setDeletedMessageId] = useState(null);
  const [lastSeenUpdate, setLastSeenUpdate] = useState(null);
  const [incomingGroupMessage, setIncomingGroupMessage] = useState(null);

  // Advanced feature updates
  const [messageEdited, setMessageEdited] = useState(null);
  const [pollUpdated, setPollUpdated] = useState(null);
  const [gameUpdated, setGameUpdated] = useState(null);
  const [ghostMode, setGhostMode] = useState(() => localStorage.getItem('ghost_mode') === 'true');

  // WebRTC Calling Signaling States
  const [incomingCall, setIncomingCall] = useState(null);
  const [callAnswered, setCallAnswered] = useState(null);
  const [callRejected, setCallRejected] = useState(null);
  const [callEnded, setCallEnded] = useState(null);
  const [iceCandidateReceived, setIceCandidateReceived] = useState(null);

  const socketRef = useRef(null);

  const toggleGhostMode = () => {
    setGhostMode((prev) => {
      const next = !prev;
      localStorage.setItem('ghost_mode', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      // Initialize socket connection
      const socketUrl = import.meta.env.VITE_API_URL || '/';
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('⚡ Connected to Socket.io server with ID:', newSocket.id);
        newSocket.emit('setup_user', user._id);
      });

      // Listen for list of currently online user IDs
      newSocket.on('online_users', (users) => {
        setOnlineUsers(users);
      });

      // Listen for incoming messages
      newSocket.on('receive_message', (msg) => {
        setIncomingMessage(msg);
      });

      // Listen for incoming group messages
      newSocket.on('receive_group_message', (msg) => {
        setIncomingGroupMessage(msg);
      });

      // Listen for typing events
      newSocket.on('user_typing', ({ sender, isTyping }) => {
        setTypingUsers((prev) => ({
          ...prev,
          [sender]: isTyping,
        }));
      });

      // Listen for read receipt updates
      newSocket.on('messages_read', ({ readerId, senderId }) => {
        setReadReceipt({ readerId, senderId, timestamp: Date.now() });
      });

      // Listen for reaction updates
      newSocket.on('message_reaction_updated', (data) => {
        setReactionUpdate(data);
      });

      // Listen for message deletion ("Delete for everyone")
      newSocket.on('message_deleted', ({ messageId }) => {
        setDeletedMessageId({ messageId, timestamp: Date.now() });
      });

      // Listen for message edits
      newSocket.on('message_edited', (data) => {
        setMessageEdited(data);
      });

      // Listen for poll votes
      newSocket.on('poll_updated', (data) => {
        setPollUpdated(data);
      });

      // Listen for in-chat game moves
      newSocket.on('game_updated', (data) => {
        setGameUpdated(data);
      });

      // Listen for user last seen updates
      newSocket.on('user_last_seen', ({ userId, lastSeen }) => {
        setLastSeenUpdate({ userId, lastSeen });
      });

      // WebRTC Call Signaling Listeners
      newSocket.on('incoming_call', (data) => {
        setIncomingCall(data);
      });

      newSocket.on('call_answered', (data) => {
        setCallAnswered(data);
      });

      newSocket.on('call_rejected', () => {
        setCallRejected(Date.now());
      });

      newSocket.on('call_ended', () => {
        setCallEnded(Date.now());
      });

      newSocket.on('receive_ice_candidate', ({ candidate }) => {
        setIceCandidateReceived({ candidate, timestamp: Date.now() });
      });

      return () => {
        newSocket.disconnect();
        socketRef.current = null;
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setOnlineUsers([]);
    }
  }, [isAuthenticated, user?._id]);

  // Emit a message to server (supports text, image, audio, file, replyTo)
  const sendRealtimeMessage = (recipientId, payloadOrText, maybeImage, callback) => {
    if (!socketRef.current || !user?._id) return;

    let payload = {};
    let cb = callback;

    if (typeof payloadOrText === 'object' && payloadOrText !== null) {
      payload = payloadOrText;
      cb = maybeImage; // when calling with (recipientId, payloadObj, callback)
    } else {
      payload = {
        text: payloadOrText,
        image: maybeImage,
      };
    }

    socketRef.current.emit(
      'send_message',
      {
        sender: user._id,
        recipient: recipientId,
        text: payload.text || '',
        image: payload.image || '',
        audio: payload.audio || '',
        file: payload.file || null,
        replyTo: payload.replyTo || null,
        poll: payload.poll || undefined,
        codeSnippet: payload.codeSnippet || undefined,
        game: payload.game || undefined,
        disappearingSeconds: payload.disappearingSeconds || undefined,
      },
      cb
    );
  };

  // Group Socket Methods
  const joinGroup = (groupId) => {
    if (socketRef.current && groupId) {
      socketRef.current.emit('join_group', groupId);
    }
  };

  const leaveGroup = (groupId) => {
    if (socketRef.current && groupId) {
      socketRef.current.emit('leave_group', groupId);
    }
  };

  const sendGroupMessage = (groupId, payload, callback) => {
    if (!socketRef.current || !user?._id || !groupId) return;
    socketRef.current.emit(
      'send_group_message',
      {
        sender: user._id,
        groupId,
        text: payload.text || '',
        image: payload.image || '',
        audio: payload.audio || '',
        file: payload.file || null,
        replyTo: payload.replyTo || null,
        poll: payload.poll || undefined,
        codeSnippet: payload.codeSnippet || undefined,
        game: payload.game || undefined,
        disappearingSeconds: payload.disappearingSeconds || undefined,
      },
      callback
    );
  };

  // WebRTC Signaling Methods
  const callUser = ({ recipientId, callerName, callerAvatar, callType, offer }) => {
    if (!socketRef.current || !user?._id) return;
    socketRef.current.emit('call_user', {
      recipientId,
      callerId: user._id,
      callerName: callerName || user.name,
      callerAvatar: callerAvatar || user.avatar || '',
      callType: callType || 'video',
      offer,
    });
  };

  const answerCall = ({ callerId, recipientId, answer }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('answer_call', {
      callerId,
      recipientId: recipientId || user._id,
      answer,
    });
  };

  const rejectCall = ({ callerId }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('reject_call', { callerId });
  };

  const endCall = ({ targetUserId }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('end_call', { targetUserId });
  };

  const sendIceCandidate = ({ targetUserId, candidate }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send_ice_candidate', { targetUserId, candidate });
  };

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  // Send typing notification
  const sendTypingStatus = (recipientId, isTyping) => {
    if (!socketRef.current || !user?._id) return;
    socketRef.current.emit('typing', {
      sender: user._id,
      recipient: recipientId,
      isTyping,
    });
  };

  // Mark conversation messages as read
  const markMessagesAsRead = (senderId) => {
    if (!socketRef.current || !user?._id || !senderId) return;
    socketRef.current.emit('mark_read', {
      readerId: user._id,
      senderId,
    });
  };

  // Add/toggle emoji reaction on a message
  const addReaction = (messageId, emoji, callback) => {
    if (!socketRef.current || !user?._id || !messageId) return;
    socketRef.current.emit(
      'add_reaction',
      {
        messageId,
        emoji,
        userId: user._id,
      },
      callback
    );
  };

  // Delete message for everyone
  const deleteMessage = (messageId, callback) => {
    if (!socketRef.current || !user?._id || !messageId) return;
    socketRef.current.emit(
      'delete_message',
      {
        messageId,
        userId: user._id,
      },
      callback
    );
  };

  // Delete message for me only
  const deleteMessageForMe = (messageId, callback) => {
    if (!socketRef.current || !user?._id || !messageId) return;
    socketRef.current.emit(
      'delete_message_for_me',
      {
        messageId,
        userId: user._id,
      },
      callback
    );
  };

  // Toggle star / bookmark
  const toggleStar = (messageId, callback) => {
    if (!socketRef.current || !user?._id || !messageId) return;
    socketRef.current.emit(
      'toggle_star',
      {
        messageId,
        userId: user._id,
      },
      callback
    );
  };

  // Edit message
  const editMessage = (messageId, newText, callback) => {
    if (!socketRef.current || !user?._id || !messageId) return;
    socketRef.current.emit(
      'edit_message',
      {
        messageId,
        newText,
        userId: user._id,
      },
      callback
    );
  };

  // Vote on interactive poll
  const votePoll = (messageId, optionIndex, callback) => {
    if (!socketRef.current || !user?._id || !messageId) return;
    socketRef.current.emit(
      'vote_poll',
      {
        messageId,
        optionIndex,
        userId: user._id,
      },
      callback
    );
  };

  // Play in-chat game move (Tic-Tac-Toe)
  const playGameMove = (messageId, cellIndex, callback) => {
    if (!socketRef.current || !user?._id || !messageId) return;
    socketRef.current.emit(
      'play_game_move',
      {
        messageId,
        cellIndex,
        userId: user._id,
      },
      callback
    );
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
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
        toggleGhostMode,
        sendRealtimeMessage,
        sendTypingStatus,
        markMessagesAsRead,
        addReaction,
        deleteMessage,
        deleteMessageForMe,
        editMessage,
        votePoll,
        playGameMove,
        toggleStar,
        isUserOnline,
        // Group Chat
        joinGroup,
        leaveGroup,
        sendGroupMessage,
        // WebRTC Calling
        incomingCall,
        callAnswered,
        callRejected,
        callEnded,
        iceCandidateReceived,
        callUser,
        answerCall,
        rejectCall,
        endCall,
        sendIceCandidate,
        clearIncomingCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
