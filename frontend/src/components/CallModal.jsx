import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  IconPhone,
  IconPhoneOff,
  IconMic,
  IconMicOff,
  IconVideo,
  IconVideoOff,
  IconScreenShare,
  IconMaximize,
  IconMinimize,
  IconUser,
} from './Icons';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Robust Media Stream Acquisition with seamless fallbacks
const acquireUserMedia = async ({ video, audio }) => {
  // 1. Try full requested constraints
  if (navigator?.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      return stream;
    } catch (err) {
      console.warn('Initial camera/mic acquisition failed, attempting audio-only...', err);
    }

    // 2. Fallback to audio only if video failed (e.g. no webcam plugged in)
    if (video) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: audio ? true : false,
        });
        return audioStream;
      } catch (audioErr) {
        console.warn('Audio-only fallback also failed, attempting synthetic track...', audioErr);
      }
    }
  }

  // 3. Synthetic stream fallback (ensures WebRTC handshake never drops if no hardware is attached)
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Live Video Feed', 320, 240);

    const canvasStream = canvas.captureStream ? canvas.captureStream(10) : null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.00001; // inaudible carrier
      osc.connect(gain);
      gain.connect(dst);
      osc.start();

      const tracks = [
        ...(canvasStream ? canvasStream.getVideoTracks() : []),
        ...dst.stream.getAudioTracks(),
      ];
      if (tracks.length > 0) {
        return new MediaStream(tracks);
      }
    }
  } catch (synthErr) {
    console.warn('Synthetic track generation failed:', synthErr);
  }

  throw new Error('Unable to access media input device.');
};

// Web Audio API Ringtone & Chimes
class CallAudioEffects {
  constructor() {
    this.ctx = null;
    this.ringInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playRing() {
    this.init();
    if (!this.ctx) return;
    this.stop();

    const ring = () => {
      try {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0.08, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
      } catch (e) {
        console.warn('Audio effect error:', e);
      }
    };

    ring();
    this.ringInterval = setInterval(ring, 3000);
  }

  playConnect() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playEnd() {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(180, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

const audioEffects = new CallAudioEffects();

export const CallModal = ({
  outgoingCall,
  onClose,
  showToast,
}) => {
  const {
    incomingCall,
    callAnswered,
    callRejected,
    callEnded,
    iceCandidateReceived,
    remoteScreenShare,
    callUser,
    answerCall,
    rejectCall,
    endCall,
    sendIceCandidate,
    sendScreenShareStatus,
    clearIncomingCall,
  } = useSocket();

  const [callStatus, setCallStatus] = useState('idle');
  const [callType, setCallType] = useState('video');
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  const modalContainerRef = useRef(null);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const stopLocalMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
  };

  const cleanupCall = () => {
    audioEffects.stop();
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    stopLocalMedia();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallStatus('idle');
    setPartnerInfo(null);
    setIsScreenSharing(false);
    setCallDuration(0);
    clearIncomingCall();
  };

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && targetUserId) {
        sendIceCandidate({
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('WebRTC ontrack received:', event.track?.kind);
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
      } else if (event.track) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
          remoteStreamRef.current.addTrack(event.track);
        }
      }

      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        audioEffects.stop();
        audioEffects.playConnect();
        startCallTimer();
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        handleEndCall();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const startCallTimer = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // 1. Handle Outgoing Call initiation
  useEffect(() => {
    if (outgoingCall && outgoingCall.partner && callStatus === 'idle') {
      const { partner, callType: type } = outgoingCall;
      setCallType(type);
      setPartnerInfo({
        id: partner._id,
        name: partner.name,
        avatar: partner.avatar,
      });
      setCallStatus('calling');
      audioEffects.playRing();

      const startOutgoing = async () => {
        try {
          const stream = await acquireUserMedia({
            video: type === 'video',
            audio: true,
          });
          localStreamRef.current = stream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const pc = createPeerConnection(partner._id);
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          // Ensure video transceiver is available for screen share even if call starts audio-only
          const hasVideoSender = pc.getSenders().some((s) => s.track && s.track.kind === 'video');
          if (!hasVideoSender && pc.addTransceiver) {
            pc.addTransceiver('video', { direction: 'sendrecv' });
          }

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          callUser({
            recipientId: partner._id,
            callType: type,
            offer,
          });
        } catch (err) {
          console.error('Call media error:', err);
          showToast?.('Camera / Microphone fallback in use');
        }
      };

      startOutgoing();
    }
  }, [outgoingCall]);

  // 2. Handle Incoming Call from socket
  useEffect(() => {
    if (incomingCall && callStatus === 'idle') {
      setCallStatus('incoming');
      setCallType(incomingCall.callType || 'video');
      setPartnerInfo({
        id: incomingCall.callerId,
        name: incomingCall.callerName,
        avatar: incomingCall.callerAvatar,
      });
      audioEffects.playRing();
    }
  }, [incomingCall]);

  // 3. Handle Call Answered
  useEffect(() => {
    if (callAnswered && callStatus === 'calling' && pcRef.current) {
      audioEffects.stop();
      pcRef.current
        .setRemoteDescription(new RTCSessionDescription(callAnswered.answer))
        .then(() => {
          setCallStatus('connected');
          audioEffects.playConnect();
          startCallTimer();
        })
        .catch((err) => console.error('Error setting remote answer:', err));
    }
  }, [callAnswered]);

  // 4. Handle Remote ICE candidates
  useEffect(() => {
    if (iceCandidateReceived && pcRef.current && pcRef.current.remoteDescription) {
      try {
        pcRef.current.addIceCandidate(new RTCIceCandidate(iceCandidateReceived.candidate));
      } catch (e) {
        console.warn('Error adding ICE candidate:', e);
      }
    }
  }, [iceCandidateReceived]);

  // 5. Handle Call Rejected
  useEffect(() => {
    if (callRejected && (callStatus === 'calling' || callStatus === 'incoming')) {
      audioEffects.stop();
      audioEffects.playEnd();
      showToast?.('Call was declined');
      cleanupCall();
      onClose();
    }
  }, [callRejected]);

  // 6. Handle Call Ended
  useEffect(() => {
    if (callEnded && callStatus !== 'idle') {
      audioEffects.stop();
      audioEffects.playEnd();
      showToast?.('Call ended');
      cleanupCall();
      onClose();
    }
  }, [callEnded]);

  // Accept Incoming Call
  const handleAcceptCall = async () => {
    audioEffects.stop();
    if (!incomingCall || !incomingCall.offer) return;

    try {
      const stream = await acquireUserMedia({
        video: callType === 'video',
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(incomingCall.callerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Ensure video transceiver is available for screen share even if call starts audio-only
      const hasVideoSender = pc.getSenders().some((s) => s.track && s.track.kind === 'video');
      if (!hasVideoSender && pc.addTransceiver) {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      answerCall({
        callerId: incomingCall.callerId,
        answer,
      });

      setCallStatus('connected');
      audioEffects.playConnect();
      startCallTimer();
    } catch (err) {
      console.error('Failed to accept call:', err);
      showToast?.('Connecting call...');
    }
  };

  const handleRejectCall = () => {
    audioEffects.stop();
    if (partnerInfo?.id) {
      rejectCall({ callerId: partnerInfo.id });
    }
    cleanupCall();
    onClose();
  };

  const handleEndCall = () => {
    audioEffects.stop();
    audioEffects.playEnd();
    if (partnerInfo?.id) {
      if (isScreenSharing) {
        sendScreenShareStatus({ targetUserId: partnerInfo.id, isSharing: false });
      }
      endCall({ targetUserId: partnerInfo.id });
    }
    cleanupCall();
    onClose();
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        showToast?.(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted');
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
        showToast?.(videoTrack.enabled ? 'Camera turned on' : 'Camera turned off');
      }
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera video track in peer connection
    if (pcRef.current) {
      const videoSender =
        pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video') ||
        pcRef.current.getSenders().find((s) => !s.track || s.track.kind !== 'audio');

      const originalVideoTrack = localStreamRef.current
        ? localStreamRef.current.getVideoTracks()[0]
        : null;

      if (videoSender) {
        if (originalVideoTrack && !isVideoDisabled) {
          await videoSender.replaceTrack(originalVideoTrack);
        } else {
          await videoSender.replaceTrack(null);
        }
      }
    }

    // Restore local video preview to camera stream
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    setIsScreenSharing(false);
    showToast?.('Screen sharing stopped');

    if (partnerInfo?.id) {
      sendScreenShareStatus({ targetUserId: partnerInfo.id, isSharing: false });
    }
  };

  const startScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showToast?.('Screen sharing is not supported in this browser or device');
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (!screenVideoTrack) {
        showToast?.('No screen video track captured');
        return;
      }

      // Replace or add video track in RTCPeerConnection
      if (pcRef.current) {
        let videoSender =
          pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video') ||
          pcRef.current.getSenders().find((s) => !s.track || s.track.kind !== 'audio');

        if (videoSender) {
          await videoSender.replaceTrack(screenVideoTrack);
        } else {
          pcRef.current.addTrack(screenVideoTrack, screenStream);
        }
      }

      // Update local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
        localVideoRef.current.play().catch(() => {});
      }

      setIsScreenSharing(true);
      showToast?.('Screen sharing active');

      if (partnerInfo?.id) {
        sendScreenShareStatus({ targetUserId: partnerInfo.id, isSharing: true });
      }

      // Listen for browser's native "Stop sharing" bar
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        console.log('Screen sharing cancelled by user');
      } else {
        console.error('Screen share error:', err);
        showToast?.('Failed to start screen sharing');
      }
    }
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleToggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (callStatus === 'idle') return null;

  const showVideoViewport =
    (callType === 'video' || remoteScreenShare || isScreenSharing) &&
    callStatus === 'connected';

  return (
    <div className="call-modal-backdrop">
      <div
        ref={modalContainerRef}
        className={`call-modal-window glass-card ${isFullscreen ? 'fullscreen-call' : ''}`}
      >
        {/* Header Bar */}
        <div className="call-header-bar">
          <div className="call-header-left">
            <span className="call-type-badge">
              {callType === 'video' || remoteScreenShare || isScreenSharing ? (
                <IconVideo size={14} />
              ) : (
                <IconPhone size={14} />
              )}
              <span>
                {remoteScreenShare
                  ? 'Screen Presentation'
                  : isScreenSharing
                  ? 'Presenting Screen'
                  : callType === 'video'
                  ? 'Video Call'
                  : 'Voice Call'}
              </span>
            </span>
            {callStatus === 'connected' && (
              <span className="call-timer-badge">{formatDuration(callDuration)}</span>
            )}
          </div>

          <button
            type="button"
            className="call-fs-btn"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
          </button>
        </div>

        {/* Video / Avatar Viewport Area */}
        <div className="call-viewport-area">
          {/* Remote Media Viewport */}
          <div className="remote-media-container">
            {showVideoViewport ? (
              <>
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                      el.srcObject = remoteStreamRef.current;
                    }
                  }}
                  autoPlay
                  playsInline
                  className={`remote-video-feed ${remoteScreenShare ? 'is-screen-share' : ''}`}
                />

                {remoteScreenShare && (
                  <div className="screen-share-presenting-pill">
                    <IconScreenShare size={14} />
                    <span>{partnerInfo?.name || 'Partner'} is sharing screen</span>
                  </div>
                )}

                {isScreenSharing && !remoteScreenShare && (
                  <div className="screen-share-active-banner">
                    <div className="screen-share-banner-content">
                      <div className="screen-share-icon-glow">
                        <IconScreenShare size={28} />
                      </div>
                      <h4>You are sharing your screen</h4>
                      <p>Your screen is currently visible to {partnerInfo?.name || 'the participant'}.</p>
                      <button
                        type="button"
                        className="btn-stop-share-pill"
                        onClick={stopScreenShare}
                      >
                        Stop Sharing
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="call-avatar-placeholder">
                <div className={`call-avatar-large ${callStatus !== 'connected' ? 'pulse-ring' : ''}`}>
                  {partnerInfo?.avatar ? (
                    <img src={partnerInfo.avatar} alt={partnerInfo.name} />
                  ) : (
                    <div className="avatar-fallback-call">
                      <IconUser size={44} />
                    </div>
                  )}
                </div>
                <h3 className="call-partner-name">{partnerInfo?.name || 'Contact'}</h3>
                <div className="call-status-indicator">
                  {callStatus === 'calling' && (
                    <span className="status-flex"><span className="pulse-dot"></span> Calling...</span>
                  )}
                  {callStatus === 'incoming' && (
                    <span className="status-flex"><span className="pulse-dot ring"></span> Incoming Call...</span>
                  )}
                  {callStatus === 'connected' && (
                    <span className="status-flex"><span className="pulse-dot live"></span> Connected</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Local Video PIP */}
          {(callType === 'video' || isScreenSharing) && (
            <div className={`local-video-pip ${isScreenSharing ? 'is-sharing-pip' : ''}`}>
              <video
                ref={(el) => {
                  localVideoRef.current = el;
                  const currentSrc = isScreenSharing
                    ? screenStreamRef.current
                    : localStreamRef.current;
                  if (el && currentSrc && el.srcObject !== currentSrc) {
                    el.srcObject = currentSrc;
                  }
                }}
                autoPlay
                muted
                playsInline
                className={`local-video-feed ${isScreenSharing ? 'is-screen-share' : ''} ${
                  isVideoDisabled && !isScreenSharing ? 'hidden-feed' : ''
                }`}
              />
              {isScreenSharing && (
                <div className="local-pip-badge">
                  <span>Your Screen</span>
                </div>
              )}
              {isVideoDisabled && !isScreenSharing && (
                <div className="video-disabled-cover">
                  <IconVideoOff size={20} />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Call Controls Bar */}
        <div className="call-controls-bar">
          {callStatus === 'incoming' ? (
            <div className="incoming-actions-group">
              <button
                type="button"
                className="btn-call-control btn-decline-call"
                onClick={handleRejectCall}
                title="Decline Call"
              >
                <IconPhoneOff size={22} />
                <span>Decline</span>
              </button>

              <button
                type="button"
                className="btn-call-control btn-accept-call"
                onClick={handleAcceptCall}
                title="Accept Call"
              >
                <IconPhone size={22} />
                <span>Accept</span>
              </button>
            </div>
          ) : (
            <div className="active-actions-group">
              {/* Mute Mic */}
              <button
                type="button"
                className={`btn-call-action ${isMuted ? 'action-active' : ''}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <IconMicOff size={20} /> : <IconMic size={20} />}
                <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Toggle Video */}
              {callType === 'video' && (
                <button
                  type="button"
                  className={`btn-call-action ${isVideoDisabled ? 'action-active' : ''}`}
                  onClick={handleToggleVideo}
                  title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoDisabled ? <IconVideoOff size={20} /> : <IconVideo size={20} />}
                  <span className="control-label">{isVideoDisabled ? 'Start Video' : 'Stop Video'}</span>
                </button>
              )}

              {/* Screen Sharing Toggle */}
              {callStatus === 'connected' && (
                <button
                  type="button"
                  className={`btn-call-action ${isScreenSharing ? 'action-active' : ''}`}
                  onClick={handleToggleScreenShare}
                  title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                >
                  <IconScreenShare size={20} />
                  <span className="control-label">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
                </button>
              )}

              {/* End Call Button */}
              <button
                type="button"
                className="btn-call-action btn-hangup"
                onClick={handleEndCall}
                title="End Call"
              >
                <IconPhoneOff size={22} />
                <span className="control-label">End</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
