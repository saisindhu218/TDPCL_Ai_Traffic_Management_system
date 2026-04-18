#  AI-Based Smart Traffic Management System

A full-stack web application that improves ambulance movement during emergencies using real-time tracking, AI-based routing, and coordinated dashboards for multiple roles.



##  Features

*  Secure login with role-based access (Ambulance, Police, Hospital, Admin)
*  Start and manage emergency flow in real-time
*  Live ambulance tracking and location updates
*  AI-based route optimization and ETA calculation
*  Traffic updates and congestion handling
*  Real-time communication using Socket.io
*  Map support (Google Maps / OpenStreetMap)


##  Tech Stack

* **Frontend:** React + Vite
* **Backend:** Node.js + Express
* **Database:** MongoDB
* **Real-time:** Socket.io


##  Demo Login

| Role      | Email                                           | Password |
| --------- | ----------------------------------------------- | -------- |
| Ambulance | [ambulance@demo.com](mailto:ambulance@demo.com) | demo123  |
| Police    | [police@demo.com](mailto:police@demo.com)       | demo123  |
| Hospital  | [hospital@demo.com](mailto:hospital@demo.com)   | demo123  |
| Admin     | [admin@demo.com](mailto:admin@demo.com)         | demo123  |



##  Setup

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```



##  URLs

* Frontend: http://localhost:5173
* Backend: http://localhost:5000



##  Demo Flow

1. Login as **Ambulance** → Start emergency
2. View route, ETA, and updates
3. Login as **Police** → Manage traffic
4. Login as **Hospital** → Track incoming ambulance
5. Login as **Admin** → View system data



##  About

This project demonstrates how AI and real-time systems can be used to improve emergency response in smart cities.



##  Author

Rachabattuni Sai Sindhu
