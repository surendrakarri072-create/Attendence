# Deployment Guide - Attendance Management System

This guide explains how to host your application live online using free services.

## Prerequisites
- GitHub Account
- MongoDB Atlas Account (for Database)
- Render.com Account (for Backend Hosting)
- Netlify or Vercel Account (for Frontend Hosting)

---

## 1. Database Setup (MongoDB Atlas)

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **New Cluster** (Shared/Free Tier).
3. **Database Access**: Create a database user (e.g., `admin`) and password.
4. **Network Access**: Add IP Address `0.0.0.0/0` (Allow access from anywhere).
5. **Connect**:
   - Click "Connect" > "Connect your application".
   - Copy the Connection String.
   - It looks like: `mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<password>` with your actual password.

---

## 2. Backend Deployment (Render.com)

1. **Push your code to GitHub**:
   - Initialize git in your project:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     ```
   - Create a repo on GitHub and push.

2. **Create Web Service on Render**:
   - Log in to [Render](https://render.com).
   - Click "New +" > "Web Service".
   - Connect your GitHub repository.
   - **Settings**:
     - **Root Directory**: `server` (Important! Your backend is in the server folder)
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
   - **Environment Variables**:
     - Key: `MONGODB_URI`
     - Value: (Paste your Atlas connection string from Step 1)
     - Key: `PORT`
     - Value: `10000` (or leave default, Render usually handles this)

3. Deploy! Render will give you a backend URL (e.g., `https://ams-backend.onrender.com`).

---

## 3. Frontend Deployment (Netlify/Vercel)

1. Open `js/config.js` in your project.
2. Update `API_BASE_URL` to your **Render Backend URL**:
   ```javascript
   const CONFIG = {
       API_BASE_URL: 'https://ams-backend.onrender.com/api',
       // ...
   };
   ```
3. **Deploy Frontend**:
   - Drag and drop your project folder (containing `index.html`) to [Netlify Drop](https://app.netlify.com/drop).
   - OR connect your GitHub repo to Vercel/Netlify.
   - **Note**: Ensure the "Publish verification" settings serve the root folder.

---

## 4. Verification
1. Open your new Frontend URL (e.g., `https://my-ams-app.netlify.app`).
2. Try to login. If it works, your Frontend is successfully talking to your Cloud Backend!

---

## Troubleshooting
- **CORS Errors**: If you see CORS issues in the console, you might need to update `server.js` to explicitly allow your frontend domain:
  ```javascript
  app.use(cors({
      origin: 'https://your-frontend-domain.netlify.app'
  }));
  ```
