import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [emergencyUpdates, setEmergencyUpdates] = useState([]);
    const [signalUpdates, setSignalUpdates] = useState([]);

    useEffect(() => {
        const newSocket = io('http://localhost:5000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('✅ Connected to WebSocket server');
        });

        newSocket.on('ambulance-update', (data) => {
            console.log('🚑 Ambulance update:', data);
            setEmergencyUpdates(prev => [...prev, data]);
        });

        newSocket.on('traffic-update', (data) => {
            console.log('🚦 Traffic update:', data);
            setSignalUpdates(prev => [...prev, data]);
        });

        newSocket.on('emergency-broadcast', (data) => {
            console.log('🚨 Emergency broadcast:', data);
        });

        newSocket.on('disconnect', () => {
            console.log('🔌 Disconnected from WebSocket server');
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    const emitLocationUpdate = (data) => {
        if (socket) {
            socket.emit('ambulance-location-update', data);
        }
    };

    const emitEmergencyAlert = (data) => {
        if (socket) {
            socket.emit('emergency-alert', data);
        }
    };

    const emitSignalClearance = (data) => {
        if (socket) {
            socket.emit('signal-clearance', data);
        }
    };

    const value = {
        socket,
        emergencyUpdates,
        signalUpdates,
        emitLocationUpdate,
        emitEmergencyAlert,
        emitSignalClearance
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};