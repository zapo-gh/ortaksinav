/**
 * WebSocket Hook for Real-time Updates
 * Provides WebSocket connection management and real-time communication
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../utils/logger';

export const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectInterval = options.reconnectInterval || 3000;

  // Message handlers
  const messageHandlers = useRef(new Map());

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        logger.info('🔌 WebSocket bağlantısı açıldı');
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);

          // Call registered handlers
          const handlers = messageHandlers.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message));
          }

          logger.debug('📨 WebSocket mesajı alındı:', message.type);
        } catch (error) {
          logger.error('❌ WebSocket mesaj parse hatası:', error);
        }
      };

      ws.current.onclose = (event) => {
        logger.warn('🔌 WebSocket bağlantısı kapandı:', event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.current.onerror = (error) => {
        logger.error('❌ WebSocket hatası:', error);
        setConnectionError(error);
      };

    } catch (error) {
      logger.error('❌ WebSocket bağlantı hatası:', error);
      setConnectionError(error);
      scheduleReconnect();
    }
  }, [url, reconnectAttempts, maxReconnectAttempts]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    reconnectTimeout.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      logger.info(`🔄 WebSocket yeniden bağlantı denemesi: ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
      connect();
    }, reconnectInterval);
  }, [connect, reconnectAttempts, maxReconnectAttempts, reconnectInterval]);

  // Send message
  const sendMessage = useCallback((type, payload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = { type, payload, timestamp: Date.now() };
      ws.current.send(JSON.stringify(message));
      logger.debug('📤 WebSocket mesajı gönderildi:', type);
    } else {
      logger.warn('⚠️ WebSocket bağlantısı açık değil, mesaj gönderilemedi');
    }
  }, []);

  // Register message handler
  const onMessage = useCallback((type, handler) => {
    if (!messageHandlers.current.has(type)) {
      messageHandlers.current.set(type, []);
    }
    messageHandlers.current.get(type).push(handler);

    // Return cleanup function
    return () => {
      const handlers = messageHandlers.current.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  // Exam-specific message handlers
  const useExamMessages = useCallback(() => {
    // Placement updates
    onMessage('placement_update', (message) => {
      logger.info('📊 Yerleştirme güncellemesi alındı:', message.payload);
      // Handle placement update
    });

    // Algorithm progress
    onMessage('algorithm_progress', (message) => {
      logger.debug('⚙️ Algoritma ilerlemesi:', message.payload);
      // Handle algorithm progress
    });

    // User joined/left
    onMessage('user_presence', (message) => {
      logger.info('👥 Kullanıcı durumu:', message.payload);
      // Handle user presence
    });

    // Error notifications
    onMessage('error', (message) => {
      logger.error('❌ Sunucu hatası:', message.payload);
      // Handle server error
    });
  }, [onMessage]);

  return {
    // Connection state
    isConnected,
    lastMessage,
    connectionError,
    reconnectAttempts,

    // Methods
    sendMessage,
    onMessage,
    connect,
    disconnect: () => ws.current?.close(),

    // Exam-specific helpers
    useExamMessages,

    // Connection info
    readyState: ws.current?.readyState
  };
};

// Specialized hook for exam system
export const useExamWebSocket = (examId) => {
  const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/exam/${examId}`;
  const ws = useWebSocket(wsUrl);

  // Exam-specific methods
  const joinExam = useCallback((userId, userName) => {
    ws.sendMessage('join_exam', { userId, userName });
  }, [ws]);

  const leaveExam = useCallback((userId) => {
    ws.sendMessage('leave_exam', { userId });
  }, [ws]);

  const sendPlacementUpdate = useCallback((placementData) => {
    ws.sendMessage('placement_update', placementData);
  }, [ws]);

  const requestAlgorithmStatus = useCallback(() => {
    ws.sendMessage('get_algorithm_status', {});
  }, [ws]);

  // Auto-join on connection
  useEffect(() => {
    if (ws.isConnected && examId) {
      // Get user info from localStorage or context
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.id && userInfo.name) {
        joinExam(userInfo.id, userInfo.name);
      }
    }
  }, [ws.isConnected, examId, joinExam]);

  return {
    ...ws,
    joinExam,
    leaveExam,
    sendPlacementUpdate,
    requestAlgorithmStatus
  };
};

export default useWebSocket;
