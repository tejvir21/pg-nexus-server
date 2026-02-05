const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: config.frontendUrl,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: config.socket.pingTimeout,
      pingInterval: config.socket.pingInterval,
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);

      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);

      // Join user to their role room
      socket.join(socket.userRole);

      // Join property-specific rooms if owner
      socket.on('join:property', (propertyId) => {
        socket.join(`property:${propertyId}`);
        console.log(`User ${socket.userId} joined property:${propertyId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
        this.connectedUsers.delete(socket.userId);
      });

      // Typing indicators
      socket.on('typing:start', ({ complaintId }) => {
        socket.to(`complaint:${complaintId}`).emit('typing:start', {
          userId: socket.userId,
        });
      });

      socket.on('typing:stop', ({ complaintId }) => {
        socket.to(`complaint:${complaintId}`).emit('typing:stop', {
          userId: socket.userId,
        });
      });
    });

    console.log('✅ Socket.IO initialized');
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Emit to all users in a property
  emitToProperty(propertyId, event, data) {
    this.io.to(`property:${propertyId}`).emit(event, data);
  }

  // Emit to all users with a specific role
  emitToRole(role, event, data) {
    this.io.to(role).emit(event, data);
  }

  // Emit to all connected clients
  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  // Real-time event methods

  notifyNewPayment(payment, tenant) {
    // Notify tenant
    this.emitToUser(tenant.user, 'payment:new', {
      payment,
      message: 'New payment record created',
    });

    // Notify property owner
    this.emitToProperty(payment.property, 'payment:created', {
      payment,
      tenant: {
        id: tenant._id,
        name: tenant.fullName,
      },
    });
  }

  notifyPaymentUpdate(payment, tenant) {
    // Notify tenant
    this.emitToUser(tenant.user, 'payment:updated', {
      payment,
      message: 'Payment status updated',
    });

    // Notify property owner
    this.emitToProperty(payment.property, 'payment:updated', {
      payment,
      tenant: {
        id: tenant._id,
        name: tenant.fullName,
      },
    });
  }

  notifyNewComplaint(complaint, tenant) {
    // Notify property owner
    this.emitToProperty(complaint.property, 'complaint:new', {
      complaint,
      tenant: {
        id: tenant._id,
        name: tenant.fullName,
      },
    });

    // Notify admins
    this.emitToRole('admin', 'complaint:new', {
      complaint,
      tenant: {
        id: tenant._id,
        name: tenant.fullName,
      },
    });
  }

  notifyComplaintUpdate(complaint, tenant) {
    // Notify tenant
    this.emitToUser(tenant.user, 'complaint:updated', {
      complaint,
      message: `Your complaint "${complaint.title}" has been updated`,
    });

    // Notify property owner
    this.emitToProperty(complaint.property, 'complaint:updated', {
      complaint,
      tenant: {
        id: tenant._id,
        name: tenant.fullName,
      },
    });
  }

  notifyNewNotice(notice) {
    if (notice.property) {
      // Notify specific property tenants
      this.emitToProperty(notice.property, 'notice:new', {
        notice,
        message: `New notice: ${notice.title}`,
      });
    } else {
      // Notify all tenants
      this.emitToRole('tenant', 'notice:new', {
        notice,
        message: `New notice: ${notice.title}`,
      });
    }
  }

  notifyRoomAssignment(tenant, room, property) {
    // Notify tenant
    this.emitToUser(tenant.user, 'tenant:room-assigned', {
      tenant,
      room,
      property,
      message: `You have been assigned to Room ${room.roomNumber}`,
    });

    // Notify property owner
    this.emitToProperty(property._id, 'tenant:new', {
      tenant,
      room,
      message: `New tenant assigned to Room ${room.roomNumber}`,
    });
  }
}

module.exports = new SocketService();
