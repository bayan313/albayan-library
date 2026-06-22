
# 🏛️ ALBAYAN Library Management System

A high-end, dark-themed Library Management System (LMS) built with the MERN stack. Designed for educational institutions requiring professional resource tracking and role-based access.

## ✨ Features

- **Multi-Role Portals**: Dedicated interfaces for Administrators and Students.
- **Advanced Inventory**: Full CRUD for books with Category filtering.
- **Barcode Scanning**: 
  - **Camera Support**: Built-in scanner for mobile/webcam use.
  - **Laser Support**: Optimized for physical HID laser scanners with auto-metadata fetch.
- **Smart Catalog**: Global Google Books API integration for auto-filling book details.
- **Circulation Management**: Digital request queue, approval workflow, and history logging.
- **CSV Bulk Import**: Support for importing hundreds of books or users via CSV files.
- **Cloud Sync**: Hybrid storage with LocalStorage fallback for offline capability.

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/try/download/community) installed locally or a MongoDB Atlas URI.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/albayan-lms.git

# Navigate to project
cd albayan-lms

# Install dependencies
npm install
```

### 3. Running the App
```bash
# Start the Backend Server
npm start

# In a separate terminal, start the Frontend (if using Vite/Live Server)
# Or simply open index.html if using ES Modules.
```

## 🔐 Admin Access
To access the Master Admin portal:
1. Go to the **Manual Login** section.
2. Enter the Master ID: `admin@123`
3. Select the **Administrator** portal.

## 📄 License
MIT License.
