# 🚨 Smart Traffic Management System

## 📋 Project Overview
An **AI-powered web application** that reduces ambulance response time by intelligently managing urban traffic. This **MCA final year project** demonstrates real-time coordination between ambulances, traffic police, and hospitals.

## 🎯 Key Features
- 🚑 **Ambulance Dashboard**: Live GPS tracking + AI-optimized routes
- 🚓 **Police Control**: Signal clearance + congestion management  
- 🏥 **Hospital Portal**: Emergency alerts + patient preparation
- 👑 **Admin Panel**: User management + system analytics
- 🤖 **AI Integration**: Traffic prediction + route optimization

## 🏗️ Tech Stack
- **Frontend**: React.js, Material-UI, Google Maps
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (FREE tier)
- **Real-time**: WebSockets (Socket.io)
- **Maps**: Google Maps API / OpenStreetMap

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v16+)
- MongoDB Atlas account (FREE)
- Google Maps API key (Optional)

### 2. Clone & Setup
```bash
# Clone repository
git clone https://github.com/your-username/smart-traffic-ambulance.git
cd smart-traffic-ambulance
```

### 3. Backend Setup
```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your MongoDB URI
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Setup database
npm run setup-db

# Start backend
npm start
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Start frontend
npm start
```

### 5. Access Application
- Open browser: http://localhost:3000
- Use demo credentials (see below)

## 👥 Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| 🚑 Ambulance | `driver01@hospital.gov` | `driver123` |
| 🚓 Police | `traffic@police.gov` | `police123` |
| 🏥 Hospital | `emergency@cityhospital.gov` | `hospital123` |
| 👑 Admin | `admin@traffic.gov` | `admin123` |

## 📁 Project Structure
```
smart-traffic-ambulance/
├── backend/           # Node.js server
├── frontend/          # React application  
└── README.md          # This file
```

## 🗺️ Google Maps Setup (Optional)
1. Get FREE API key: https://console.cloud.google.com/
2. Enable: Maps JavaScript, Directions, Geocoding APIs
3. Add to `frontend/.env`:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
```

## 🎓 Viva Presentation Tips
1. **Show all 4 roles** (2 minutes each)
2. **Demonstrate real-time updates** (WebSockets)
3. **Explain AI workflow** (traffic prediction)
4. **Show database operations** (MongoDB)
5. **Discuss future extensions** (IoT, ML)

## 🔮 Future Enhancements
- IoT traffic signal integration
- Machine learning for better predictions  
- Mobile app for ambulance drivers
- Voice command interface
- Drone traffic monitoring

## 📞 Support
- **Documentation**: Check `/docs` folder

## 📄 License
MIT License - Free for academic use

---

**Built with ❤️ for MCA Final Year Project**  
**Ready for demo in under 10 minutes!**