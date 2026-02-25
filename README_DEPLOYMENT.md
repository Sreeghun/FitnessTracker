# FitnessTracker - Deployment Guide

A comprehensive fitness tracking application with AI-powered food recognition, built with FastAPI (backend) and React Native Expo (frontend).

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication
- **Profile Management**: Track BMI, calorie targets, and water goals
- **Food Tracking**: 53+ food database with nutritional information
- **AI Food Recognition**: Upload food images and get instant nutritional analysis (GPT-4o Vision)
- **Water Tracking**: Monitor daily water intake
- **Activity Logging**: Track exercises, steps, calories burned
- **Sleep & Mood Tracking**: Monitor wellness metrics
- **Dashboard**: Comprehensive daily overview of all health metrics

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+ and Yarn
- MongoDB (local or cloud instance)
- OpenAI API key (for food image recognition)

## 🛠️ Technology Stack

### Backend
- FastAPI
- Motor (async MongoDB driver)
- OpenAI SDK (for AI image analysis)
- JWT authentication
- Bcrypt password hashing

### Frontend
- React Native (Expo)
- React Navigation
- React Native Paper (UI components)
- Axios (API calls)

## 📦 Installation

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="fitness_tracker"
CORS_ORIGINS="*"
SECRET_KEY="your-secure-secret-key-here"
OPENAI_API_KEY="your-openai-api-key-here"
```

4. Run the backend:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
yarn install
```

3. Create `.env` file:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

4. Run the frontend:
```bash
# For web
yarn start --web

# For mobile (iOS)
yarn ios

# For mobile (Android)
yarn android
```

## 🌐 Deployment

### Backend Deployment Options

#### Option 1: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

#### Option 2: Render
1. Create a new Web Service
2. Connect your repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

#### Option 3: DigitalOcean App Platform
1. Create a new app
2. Select your repository
3. Configure build settings
4. Add environment variables

#### Option 4: Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Frontend Deployment Options

#### Option 1: Expo Web Build
```bash
# Build for web
expo build:web

# Deploy to hosting service (Vercel, Netlify, etc.)
```

#### Option 2: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

#### Option 3: Mobile App Stores
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

### Database Options

#### MongoDB Atlas (Recommended)
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGO_URL` in `.env`

#### Local MongoDB
```bash
# Install MongoDB
# macOS
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Start MongoDB
mongod --dbpath /path/to/data
```

## 🔐 Environment Variables

### Backend (.env)
```env
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/"
DB_NAME="fitness_tracker"
CORS_ORIGINS="https://yourfrontend.com,https://www.yourfrontend.com"
SECRET_KEY="your-very-secure-secret-key-min-32-characters"
OPENAI_API_KEY="sk-proj-your-openai-key"
```

### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Food
- `GET /api/food-database` - Get food list
- `POST /api/food-database` - Add new food
- `GET /api/food-logs/{date}` - Get food log for date
- `POST /api/food-logs` - Create/update food log
- `POST /api/analyze-food-image` - Analyze food image with AI

### Water
- `GET /api/water-logs/{date}` - Get water log for date
- `POST /api/water-logs` - Log water intake

### Activity
- `GET /api/activity-logs/{date}` - Get activities for date
- `POST /api/activity-logs` - Log activity
- `GET /api/activity-logs?days=7` - Get activity history

### Dashboard
- `GET /api/dashboard/{date}` - Get complete dashboard data

### Sleep & Mood
- `GET /api/sleep-logs/{date}` - Get sleep log
- `POST /api/sleep-logs` - Log sleep
- `GET /api/mood-logs/{date}` - Get mood log
- `POST /api/mood-logs` - Log mood

## 🔑 API Documentation

Once backend is running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## 🧪 Testing

### Backend
```bash
# Test API endpoint
curl http://localhost:8001/api/food-database

# Register test user
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "age": 25,
    "gender": "male",
    "height": 175,
    "weight": 70,
    "goal": "maintain"
  }'
```

## 📊 Database Schema

### Users Collection
```json
{
  "email": "string",
  "password_hash": "string",
  "name": "string",
  "age": "number",
  "gender": "string",
  "height": "number",
  "weight": "number",
  "goal": "string",
  "bmi": "number",
  "daily_calorie_target": "number",
  "daily_water_target": "number",
  "created_at": "datetime"
}
```

### Food Database Collection
```json
{
  "name": "string",
  "proteins_per_100g": "number",
  "carbs_per_100g": "number",
  "fats_per_100g": "number",
  "vitamins": "string",
  "kcal_per_100g": "number"
}
```

### Food Logs Collection
```json
{
  "user_id": "string",
  "date": "string",
  "entries": [
    {
      "food_name": "string",
      "grams": "number",
      "kcal": "number",
      "proteins": "number",
      "carbs": "number",
      "fats": "number"
    }
  ],
  "total_kcal": "number",
  "total_proteins": "number",
  "total_carbs": "number",
  "total_fats": "number"
}
```

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection
- Verify all environment variables are set
- Check port 8001 is not in use

### Frontend can't connect to backend
- Verify `EXPO_PUBLIC_BACKEND_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

### AI Food Recognition not working
- Verify OpenAI API key is valid
- Check API quota/billing
- Ensure image is in correct format (base64)

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for health and fitness enthusiasts**
