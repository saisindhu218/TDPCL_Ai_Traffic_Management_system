import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { getSocketUrls } from '../utils/backendUrls';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [lastSocketError, setLastSocketError] = useState('');

  useEffect(() => {
    if (user) {
      const socketUrls = getSocketUrls();
      let currentIndex = 0;
      let activeSocket = null;
      let isDisposed = false;

      setConnectionStatus('connecting');
      setLastSocketError('');

      const connectNext = () => {
        if (isDisposed || currentIndex >= socketUrls.length) {
          if (!isDisposed) {
            setConnectionStatus('failed');
          }
          return;
        }

        const newSocket = io(socketUrls[currentIndex], {
          autoConnect: true,
          timeout: 8000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 800,
          reconnectionDelayMax: 4000,
          transports: ['websocket', 'polling']
        });
        activeSocket = newSocket;

        newSocket.on('connect', () => {
          console.log('Connected to socket server');
          newSocket.emit('join_role', user.role);
          setConnectionStatus('connected');
          setLastSocketError('');
          setSocket(newSocket);
        });

        newSocket.on('disconnect', () => {
          setConnectionStatus('disconnected');
        });

        newSocket.on('socket_error', (payload) => {
          setLastSocketError(payload?.msg || 'Socket error');
        });

        newSocket.on('connect_error', (err) => {
          setLastSocketError(err?.message || 'Connection failed');
          newSocket.off();
          newSocket.close();
          if (!isDisposed) {
            currentIndex += 1;
            connectNext();
          }
        });
      };

      connectNext();

      return () => {
        isDisposed = true;
        if (activeSocket) {
          activeSocket.close();
        }
        setConnectionStatus('idle');
        setLastSocketError('');
        setSocket(null);
      };
    }

    setConnectionStatus('idle');
    setLastSocketError('');
    return undefined;
  }, [user]);

  const contextValue = useMemo(() => ({
    socket,
    connectionStatus,
    lastSocketError
  }), [socket, connectionStatus, lastSocketError]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired
};
