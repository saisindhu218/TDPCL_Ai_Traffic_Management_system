import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io('http://localhost:5000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      
      // Re-register all listeners after reconnection
      this.listeners.forEach((callback, event) => {
        this.socket.on(event, callback);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔁 Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
    });
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }

    this.socket.on(event, callback);
    this.listeners.set(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      this.listeners.delete(event);
    }
  }

  emit(event, data) {
    if (!this.socket || !this.socket.connected) {
      console.warn('⚠️ Socket not connected, attempting to reconnect...');
      this.connect();
      
      // Wait a bit for connection
      setTimeout(() => {
        if (this.socket.connected) {
          this.socket.emit(event, data);
        } else {
          console.error('Cannot emit, socket not connected');
        }
      }, 1000);
      return;
    }

    this.socket.emit(event, data);
  }

  // Specific event emitters for our application
  emitLocationUpdate(data) {
    this.emit('ambulance-location-update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitEmergencyAlert(data) {
    this.emit('emergency-alert', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitSignalClearance(data) {
    this.emit('signal-clearance', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  emitRouteUpdate(data) {
    this.emit('route-update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Helper methods for common operations
  joinRoom(roomId) {
    this.emit('join-room', { roomId });
  }

  leaveRoom(roomId) {
    this.emit('leave-room', { roomId });
  }

  // Status checking
  isConnected() {
    return this.socket && this.socket.connected;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Reconnection management
  manualReconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  // Health check
  async healthCheck() {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({ connected: false, message: 'Socket not connected' });
        return;
      }

      const timeout = setTimeout(() => {
        resolve({ connected: false, message: 'Health check timeout' });
      }, 5000);

      this.socket.emit('health-check', {}, (response) => {
        clearTimeout(timeout);
        resolve({
          connected: true,
          latency: response.latency,
          timestamp: response.timestamp
        });
      });
    });
  }

  // Get connection statistics
  getStats() {
    if (!this.socket) {
      return {
        connected: false,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts
      };
    }

    return {
      connected: this.socket.connected,
      id: this.socket.id,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      listeners: this.listeners.size
    };
  }
}

// Create a singleton instance
const socketService = new SocketService();

// Export both the instance and the class
export { SocketService };
export default socketService;