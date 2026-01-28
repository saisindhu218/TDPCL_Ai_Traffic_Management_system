const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const User = require('./models/User');
const TrafficSignal = require('./models/TrafficSignal');
const Hospital = require('./models/Hospital');

const setupDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await TrafficSignal.deleteMany({});
    await Hospital.deleteMany({});

    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      username: 'admin',
      email: 'admin@traffic.gov',
      password: adminPassword,
      role: 'admin',
      isActive: true
    });

    // Create Ambulance Driver
    const ambulancePassword = await bcrypt.hash('driver123', 10);
    const ambulance = await User.create({
      username: 'ambulance01',
      email: 'driver01@hospital.gov',
      password: ambulancePassword,
      role: 'ambulance',
      vehicleNumber: 'KA01AB1234',
      isActive: false
    });

    // Create Police User
    const policePassword = await bcrypt.hash('police123', 10);
    const police = await User.create({
      username: 'police01',
      email: 'traffic@police.gov',
      password: policePassword,
      role: 'police',
      stationName: 'Central Traffic Control',
      isActive: true
    });

    // Create Hospital User
    const hospitalPassword = await bcrypt.hash('hospital123', 10);
    const hospital = await User.create({
      username: 'city_hospital',
      email: 'emergency@cityhospital.gov',
      password: hospitalPassword,
      role: 'hospital',
      hospitalName: 'City General Hospital',
      isActive: true,
      location: {
        lat: 12.9716,
        lng: 77.5946
      }
    });

    // Create Traffic Signals
    const signals = [
      {
        signalId: 'TS001',
        location: {
          lat: 12.9716,
          lng: 77.5946,
          address: 'MG Road Junction'
        },
        lanes: [
          { direction: 'north', status: 'normal' },
          { direction: 'south', status: 'normal' },
          { direction: 'east', status: 'normal' },
          { direction: 'west', status: 'normal' }
        ],
        congestionLevel: 'medium'
      },
      {
        signalId: 'TS002',
        location: {
          lat: 12.9784,
          lng: 77.6408,
          address: 'Indiranagar Junction'
        },
        lanes: [
          { direction: 'north', status: 'normal' },
          { direction: 'south', status: 'normal' },
          { direction: 'east', status: 'normal' },
          { direction: 'west', status: 'normal' }
        ],
        congestionLevel: 'low'
      },
      {
        signalId: 'TS003',
        location: {
          lat: 12.9538,
          lng: 77.5736,
          address: 'Jaynagar Junction'
        },
        lanes: [
          { direction: 'north', status: 'normal' },
          { direction: 'south', status: 'normal' },
          { direction: 'east', status: 'normal' },
          { direction: 'west', status: 'normal' }
        ],
        congestionLevel: 'high'
      }
    ];

    await TrafficSignal.insertMany(signals);

    // Create Hospitals
    const hospitals = [
      {
        name: 'City General Hospital',
        location: {
          lat: 12.9716,
          lng: 77.5946
        },
        emergencyContact: '080-12345678',
        bedsAvailable: 45,
        specialties: ['Cardiology', 'Trauma', 'Neurology']
      },
      {
        name: 'Government Medical College',
        location: {
          lat: 12.9784,
          lng: 77.6408
        },
        emergencyContact: '080-87654321',
        bedsAvailable: 120,
        specialties: ['All Specialties', 'ICU', 'Pediatrics']
      },
      {
        name: 'Apollo Hospital',
        location: {
          lat: 12.9538,
          lng: 77.5736
        },
        emergencyContact: '080-55556666',
        bedsAvailable: 85,
        specialties: ['Oncology', 'Surgery', 'Orthopedics']
      }
    ];

    await Hospital.insertMany(hospitals);

    console.log('✅ Database setup completed successfully!');
    console.log('📋 Created users:');
    console.log('   👑 Admin: admin / admin123');
    console.log('   🚑 Ambulance: ambulance01 / driver123');
    console.log('   🚓 Police: police01 / police123');
    console.log('   🏥 Hospital: city_hospital / hospital123');
    console.log('');
    console.log('🚦 Created 3 traffic signals');
    console.log('🏥 Created 3 hospitals');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
};

setupDatabase();