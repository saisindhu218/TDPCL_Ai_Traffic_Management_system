require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');
const Hospital = require('./models/Hospital');
const Emergency = require('./models/Emergency');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');
const logger = require('./utils/logger');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  transports: ['websocket', 'polling']
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const corsError = new Error('Not allowed by CORS');
    corsError.statusCode = 403;
    callback(corsError);
  },
  credentials: true,
}));

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      msg: 'Too many requests, please try again later.',
      requestId: req.id || null,
    });
  },
});

app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Socket.io Real-Time System
io.on('connection', (socket) => {
  logger.info('socket_connected', { socketId: socket.id });

  socket.on('join_role', (role) => {
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
    const allowedRoles = new Set(['ambulance', 'police', 'hospital', 'admin']);

    if (!allowedRoles.has(normalizedRole)) {
      socket.emit('socket_error', { msg: 'Invalid role' });
      return;
    }

    socket.join(normalizedRole);
    logger.info('socket_join_role', { socketId: socket.id, role: normalizedRole });
  });

  socket.on('join_hospital', (hospitalCode) => {
    const normalizedCode = typeof hospitalCode === 'string' ? hospitalCode.trim().toLowerCase() : '';
    if (/^[a-z0-9_-]{2,40}$/.test(normalizedCode)) {
      socket.join(`hospital_${normalizedCode}`);
      logger.info('socket_join_hospital', { socketId: socket.id, hospitalCode: normalizedCode });
    }
  });

  socket.on('disconnect', () => {
    logger.info('socket_disconnected', { socketId: socket.id });
  });
});

// Expose io for use in routes/controllers
app.set('io', io);
app.use(notFoundHandler);
app.use(errorHandler);

const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const { MongoMemoryServer } = require('mongodb-memory-server');

function listenWithFallback(initialPort) {
  let currentPort = initialPort;

  const tryListen = () => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn('server_port_busy_retry', { currentPort, retryPort: currentPort + 1 });
        currentPort += 1;
        setTimeout(tryListen, 250);
        return;
      }

      logger.error('server_failed_to_start', { error: err.message, stack: err.stack });
      process.exit(1);
    });

    server.listen(currentPort, () => {
      logger.info('server_listening', { port: currentPort });
      if (currentPort !== initialPort) {
        logger.info('server_port_fallback_notice', { url: `http://localhost:${currentPort}` });
      }
    });
  };

  tryListen();
}

const ensureDemoUsers = async () => {
  const demoUsers = [
    { name: 'Demo Ambulance', email: 'ambulance@demo.com', role: 'ambulance' },
    { name: 'Demo Police', email: 'police@demo.com', role: 'police' },
    { name: 'Demo Hospital', email: 'hospital@demo.com', role: 'hospital' },
    { name: 'Demo Admin', email: 'admin@demo.com', role: 'admin' }
  ];

  const hashedPassword = await bcrypt.hash('demo123', 10);

  await Promise.all(demoUsers.map(async (demo) => {
    await User.findOneAndUpdate(
      { email: demo.email },
      {
        $set: {
          ...demo,
          password: hashedPassword
        }
      },
      {
        upsert: true,
        runValidators: true
      }
    );
  }));
};

const ensureDemoHospitals = async () => {
  const demoHospitals = [
    {
      code: 'apollo',
      name: 'Apollo Hospital',
      address: 'Bannerghatta Road, Bengaluru',
      area: 'Bannerghatta Road',
      lat: 12.9166,
      lng: 77.6101,
      contact_number: '+91-80-26304050',
      emergency_number: '+91-80-26304111',
      trauma_level: 'Level 1',
      available_beds: 12,
      icu_beds: 4,
      ventilators: 3,
      specialties: ['Trauma', 'Cardiology', 'Critical Care'],
      status: 'available',
      notes: '24x7 emergency and trauma support'
    },
    {
      code: 'manipal',
      name: 'Manipal Hospital',
      address: 'Old Airport Road, Bengaluru',
      area: 'Old Airport Road',
      lat: 12.9584,
      lng: 77.6482,
      contact_number: '+91-80-25024444',
      emergency_number: '+91-80-25024400',
      trauma_level: 'Level 1',
      available_beds: 9,
      icu_beds: 3,
      ventilators: 2,
      specialties: ['Emergency', 'Neuroscience', 'Orthopedics'],
      status: 'available',
      notes: 'Advanced emergency support available'
    },
    {
      code: 'fortis',
      name: 'Fortis Hospital',
      address: 'Cunningham Road, Bengaluru',
      area: 'Cunningham Road',
      lat: 12.9985,
      lng: 77.5895,
      contact_number: '+91-80-66214444',
      emergency_number: '+91-80-66214400',
      trauma_level: 'Level 2',
      available_beds: 7,
      icu_beds: 2,
      ventilators: 1,
      specialties: ['Emergency', 'General Surgery'],
      status: 'busy',
      notes: 'High priority emergency support'
    },
    {
      code: 'narayana',
      name: 'Narayana Health',
      address: 'Bommasandra, Bengaluru',
      area: 'Bommasandra',
      lat: 12.8265,
      lng: 77.6901,
      contact_number: '+91-80-71222222',
      emergency_number: '+91-80-71222200',
      trauma_level: 'Level 1',
      available_beds: 15,
      icu_beds: 5,
      ventilators: 4,
      specialties: ['Trauma', 'Cardiology', 'Pediatrics'],
      status: 'available',
      notes: 'Large emergency capacity'
    },
    {
      code: 'columbia',
      name: 'Columbia Asia Hospital',
      address: 'Hebbal, Bengaluru',
      area: 'Hebbal',
      lat: 13.0352,
      lng: 77.5973,
      contact_number: '+91-80-61656666',
      emergency_number: '+91-80-61656600',
      trauma_level: 'Level 2',
      available_beds: 6,
      icu_beds: 2,
      ventilators: 1,
      specialties: ['Emergency', 'Internal Medicine'],
      status: 'busy',
      notes: 'Good for stabilized trauma transfers'
    }
  ];

  await Promise.all(demoHospitals.map(async (hospital) => {
    await Hospital.findOneAndUpdate(
      { code: hospital.code },
      { $set: hospital },
      { upsert: true, runValidators: true, returnDocument: 'after' }
    );
  }));
};

const cleanupStaleActiveEmergencies = async () => {
  const staleCutoff = new Date(Date.now() - 10 * 60 * 1000);
  const staleEmergencies = await Emergency.find({
    status: 'active',
    updatedAt: { $lt: staleCutoff }
  }).select('_id updatedAt');

  if (!staleEmergencies.length) {
    return;
  }

  await Emergency.updateMany(
    { _id: { $in: staleEmergencies.map((emergency) => emergency._id) } },
    {
      $set: {
        status: 'resolved',
        end_time: new Date()
      }
    }
  );

  logger.info('stale_emergencies_resolved', { count: staleEmergencies.length });
};

const cleanupDuplicateActiveEmergencies = async () => {
  const activeEmergencies = await Emergency.find({ status: 'active' })
    .sort({ ambulance_id: 1, createdAt: -1 })
    .select('_id ambulance_id createdAt');

  const groupedByAmbulance = new Map();

  activeEmergencies.forEach((emergency) => {
    const ambulanceId = String(emergency.ambulance_id);
    if (!groupedByAmbulance.has(ambulanceId)) {
      groupedByAmbulance.set(ambulanceId, []);
    }
    groupedByAmbulance.get(ambulanceId).push(emergency);
  });

  const duplicateIds = [];

  groupedByAmbulance.forEach((emergencies) => {
    if (emergencies.length > 1) {
      duplicateIds.push(...emergencies.slice(1).map((emergency) => emergency._id));
    }
  });

  if (!duplicateIds.length) {
    return;
  }

  await Emergency.updateMany(
    { _id: { $in: duplicateIds } },
    {
      $set: {
        status: 'resolved',
        end_time: new Date()
      }
    }
  );

  logger.info('duplicate_active_emergencies_resolved', { count: duplicateIds.length });
};

const startServer = async () => {
  let mongoUri = process.env.MONGO_URI;

  // Use Memory Server if no explicit URI is provided, ensuring demo is always runnable
  if (!mongoUri) {
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  }

  mongoose.connect(mongoUri)
    .then(() => {
      logger.info('mongodb_connected', { mongoUri });
      ensureDemoUsers()
        .then(() => logger.info('demo_users_ready'))
        .catch((err) => logger.error('seed_demo_users_failed', { error: err.message, stack: err.stack }));
      ensureDemoHospitals()
        .then(() => logger.info('demo_hospitals_ready'))
        .catch((err) => logger.error('seed_demo_hospitals_failed', { error: err.message, stack: err.stack }));
      cleanupStaleActiveEmergencies()
        .then(() => logger.info('stale_emergency_cleanup_complete'))
        .catch((err) => logger.error('stale_emergency_cleanup_failed', { error: err.message, stack: err.stack }));
      cleanupDuplicateActiveEmergencies()
        .then(() => logger.info('duplicate_emergency_cleanup_complete'))
        .catch((err) => logger.error('duplicate_emergency_cleanup_failed', { error: err.message, stack: err.stack }));
      listenWithFallback(DEFAULT_PORT);
    })
    .catch(err => {
      logger.error('mongodb_connection_failed', { error: err.message, stack: err.stack });
    });
};

startServer();
