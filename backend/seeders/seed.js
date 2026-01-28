const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Hospital = require('../models/Hospital');
const TrafficSignal = require('../models/TrafficSignal');

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Hospital.deleteMany({});
        await TrafficSignal.deleteMany({});

        // Create users
        const users = [
            {
                username: 'admin',
                email: 'admin@traffic.gov',
                password: await bcrypt.hash('admin123', 10),
                role: 'admin'
            },
            {
                username: 'ambulance01',
                email: 'driver01@hospital.gov',
                password: await bcrypt.hash('driver123', 10),
                role: 'ambulance',
                vehicleNumber: 'KA01AB1234'
            },
            {
                username: 'police01',
                email: 'traffic@police.gov',
                password: await bcrypt.hash('police123', 10),
                role: 'police',
                stationName: 'Central Traffic Control'
            },
            {
                username: 'city_hospital',
                email: 'emergency@cityhospital.gov',
                password: await bcrypt.hash('hospital123', 10),
                role: 'hospital',
                hospitalName: 'City General Hospital'
            }
        ];

        await User.insertMany(users);
        console.log('✅ Users created');

        // Create hospitals
        const hospitals = [
            {
                name: 'City General Hospital',
                location: { lat: 12.9716, lng: 77.5946 },
                address: 'MG Road, Bangalore',
                emergencyContact: '080-12345678',
                bedsAvailable: 45
            },
            {
                name: 'Government Medical College',
                location: { lat: 12.9784, lng: 77.6408 },
                address: 'Indiranagar, Bangalore',
                emergencyContact: '080-87654321',
                bedsAvailable: 120
            }
        ];

        await Hospital.insertMany(hospitals);
        console.log('✅ Hospitals created');

        // Create traffic signals
        const signals = [
            {
                signalId: 'TS001',
                location: { lat: 12.9716, lng: 77.5946 },
                address: 'MG Road Junction'
            },
            {
                signalId: 'TS002',
                location: { lat: 12.9784, lng: 77.6408 },
                address: 'Indiranagar Junction'
            }
        ];

        await TrafficSignal.insertMany(signals);
        console.log('✅ Traffic signals created');

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Demo Credentials:');
        console.log('   👑 Admin: admin@traffic.gov / admin123');
        console.log('   🚑 Ambulance: driver01@hospital.gov / driver123');
        console.log('   🚓 Police: traffic@police.gov / police123');
        console.log('   🏥 Hospital: emergency@cityhospital.gov / hospital123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();