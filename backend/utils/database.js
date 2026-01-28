const mongoose = require('mongoose');

class Database {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            if (this.isConnected) {
                console.log('✅ Using existing database connection');
                return;
            }

            const db = mongoose.connection;

            // Event listeners
            db.on('connected', () => {
                console.log('✅ MongoDB connected successfully');
                this.isConnected = true;
            });

            db.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            db.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });

            // Connection options
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                family: 4
            };

            // Connect to MongoDB
            await mongoose.connect(process.env.MONGODB_URI, options);
            
            console.log('📊 Database connection established');
        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            throw error;
        }
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('✅ MongoDB disconnected successfully');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error);
            throw error;
        }
    }

    async checkConnection() {
        try {
            await mongoose.connection.db.admin().ping();
            return { status: 'connected', timestamp: new Date() };
        } catch (error) {
            return { status: 'disconnected', error: error.message, timestamp: new Date() };
        }
    }

    async clearDatabase() {
        try {
            if (process.env.NODE_ENV !== 'test') {
                throw new Error('Clear database only allowed in test environment');
            }

            const collections = mongoose.connection.collections;
            
            for (const key in collections) {
                await collections[key].deleteMany({});
            }
            
            console.log('🧹 Database cleared successfully');
            return { success: true, message: 'Database cleared' };
        } catch (error) {
            console.error('❌ Error clearing database:', error);
            throw error;
        }
    }

    async backupDatabase() {
        try {
            // This is a simplified backup - in production use mongodump
            const collections = mongoose.connection.collections;
            const backup = {
                timestamp: new Date(),
                collections: {}
            };

            for (const key in collections) {
                const data = await collections[key].find({}).toArray();
                backup.collections[key] = data;
            }

            console.log('💾 Database backup created');
            return backup;
        } catch (error) {
            console.error('❌ Error backing up database:', error);
            throw error;
        }
    }

    async getDatabaseStats() {
        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();
            
            const collections = await db.listCollections().toArray();
            const collectionStats = {};

            for (const collection of collections) {
                const coll = db.collection(collection.name);
                const count = await coll.countDocuments();
                collectionStats[collection.name] = {
                    count,
                    size: collection.size || 0
                };
            }

            return {
                dbStats: {
                    collections: stats.collections,
                    objects: stats.objects,
                    dataSize: (stats.dataSize / 1024 / 1024).toFixed(2) + ' MB',
                    storageSize: (stats.storageSize / 1024 / 1024).toFixed(2) + ' MB',
                    indexSize: (stats.indexSize / 1024 / 1024).toFixed(2) + ' MB'
                },
                collectionStats,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('❌ Error getting database stats:', error);
            throw error;
        }
    }

    async createIndexes() {
        try {
            // Create indexes for better performance
            const models = mongoose.modelNames();
            
            for (const modelName of models) {
                const model = mongoose.model(modelName);
                if (model.createIndexes) {
                    await model.createIndexes();
                }
            }

            console.log('📈 Database indexes created/verified');
            return { success: true, message: 'Indexes created' };
        } catch (error) {
            console.error('❌ Error creating indexes:', error);
            throw error;
        }
    }

    async healthCheck() {
        const connectionStatus = await this.checkConnection();
        const stats = await this.getDatabaseStats().catch(() => null);

        return {
            status: connectionStatus.status === 'connected' ? 'healthy' : 'unhealthy',
            database: connectionStatus,
            stats: stats ? stats.dbStats : null,
            timestamp: new Date(),
            uptime: process.uptime()
        };
    }
}

module.exports = new Database();