import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { getSocketUrls } from '../utils/backendUrls';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      const socketUrls = getSocketUrls();
      let currentIndex = 0;
      let activeSocket = null;
      let isDisposed = false;

      const connectNext = () => {
        if (isDisposed || currentIndex >= socketUrls.length) {
          return;
        }

        const newSocket = io(socketUrls[currentIndex], { autoConnect: true });
        activeSocket = newSocket;

        newSocket.on('connect', () => {
          console.log('Connected to socket server');
          newSocket.emit('join_role', user.role);
          setSocket(newSocket);
        });

        newSocket.on('connect_error', () => {
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
        setSocket(null);
      };
    }
    return undefined;
  }, [user]);

  const contextValue = useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired
};
