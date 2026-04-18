require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('node:http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Hospital = require('./models/Hospital');
const Emergency = require('./models/Emergency');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Socket.io Real-Time System
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_role', (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined role: ${role}`);
  });

  socket.on('join_hospital', (hospitalCode) => {
    if (hospitalCode) {
      socket.join(`hospital_${hospitalCode}`);
      console.log(`Socket ${socket.id} joined hospital: ${hospitalCode}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Expose io for use in routes/controllers
app.set('io', io);

const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const { MongoMemoryServer } = require('mongodb-memory-server');

function listenWithFallback(initialPort) {
  let currentPort = initialPort;

  const tryListen = () => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${currentPort} is busy. Retrying on ${currentPort + 1}...`);
        currentPort += 1;
        setTimeout(tryListen, 250);
        return;
      }

      console.error('Server failed to start:', err);
      process.exit(1);
    });

    server.listen(currentPort, () => {
      console.log(`Server running on port ${currentPort}`);
      if (currentPort !== initialPort) {
        console.log(`Tip: update frontend backend URL to http://localhost:${currentPort} if needed.`);
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

  console.log(`Auto-resolved ${staleEmergencies.length} stale active emergency records`);
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

  console.log(`Auto-resolved ${duplicateIds.length} duplicate active emergency records`);
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
      console.log(`Connected to MongoDB at ${mongoUri}`);
      ensureDemoUsers()
        .then(() => console.log('Demo users are ready (password: demo123)'))
        .catch((err) => console.error('Failed to seed demo users', err));
      ensureDemoHospitals()
        .then(() => console.log('Demo hospitals are ready'))
        .catch((err) => console.error('Failed to seed demo hospitals', err));
      cleanupStaleActiveEmergencies()
        .then(() => console.log('Stale emergency cleanup complete'))
        .catch((err) => console.error('Failed to clean stale active emergencies', err));
      cleanupDuplicateActiveEmergencies()
        .then(() => console.log('Duplicate active emergency cleanup complete'))
        .catch((err) => console.error('Failed to clean duplicate active emergencies', err));
      listenWithFallback(DEFAULT_PORT);
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB', err);
    });
};

startServer();
