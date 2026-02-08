from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId
import base64
from PIL import Image
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'fitness_tracker')]

# JWT Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days

# LLM Configuration for food recognition
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== Models ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int
    gender: str  # "male" or "female"
    height: float  # in cm
    weight: float  # in kg
    goal: str = "maintain"  # "gain", "maintain", "lose"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    age: int
    gender: str
    height: float
    weight: float
    goal: str
    bmi: float
    daily_calorie_target: int
    daily_water_target: int  # in ml

class UpdateProfile(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    goal: Optional[str] = None

class FoodItem(BaseModel):
    name: str
    proteins_per_100g: float
    carbs_per_100g: float
    fats_per_100g: float
    vitamins: str
    kcal_per_100g: float

class FoodLogEntry(BaseModel):
    food_name: str
    grams: float
    kcal: float
    proteins: float
    carbs: float
    fats: float

class FoodLogCreate(BaseModel):
    date: str  # YYYY-MM-DD format
    entries: List[FoodLogEntry]

class WaterLogCreate(BaseModel):
    date: str
    amount_ml: int

class SleepLogCreate(BaseModel):
    date: str
    hours: float
    quality: str  # "poor", "fair", "good", "excellent"
    notes: Optional[str] = ""

class MoodLogCreate(BaseModel):
    date: str
    mood: str  # "sad", "neutral", "happy", "excited"
    notes: Optional[str] = ""

# ==================== Helper Functions ====================

def calculate_bmi(weight: float, height: float) -> float:
    """Calculate BMI from weight (kg) and height (cm)"""
    height_m = height / 100
    return round(weight / (height_m ** 2), 2)

def calculate_daily_calories(age: int, gender: str, weight: float, height: float, goal: str) -> int:
    """Calculate daily calorie target based on Harris-Benedict equation"""
    # Basal Metabolic Rate (BMR)
    if gender.lower() == "male":
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    
    # Assume moderate activity level (1.55 multiplier)
    tdee = bmr * 1.55
    
    # Adjust based on goal
    if goal == "lose":
        return int(tdee - 500)  # 500 calorie deficit
    elif goal == "gain":
        return int(tdee + 500)  # 500 calorie surplus
    else:
        return int(tdee)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== Auth Endpoints ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Calculate BMI and calorie target
    bmi = calculate_bmi(user.weight, user.height)
    daily_calories = calculate_daily_calories(user.age, user.gender, user.weight, user.height, user.goal)
    
    # Create user document
    user_doc = {
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "name": user.name,
        "age": user.age,
        "gender": user.gender,
        "height": user.height,
        "weight": user.weight,
        "goal": user.goal,
        "bmi": bmi,
        "daily_calorie_target": daily_calories,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# ==================== User Profile Endpoints ====================

@api_router.get("/profile", response_model=UserProfile)
async def get_profile(current_user = Depends(get_current_user)):
    return UserProfile(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        age=current_user["age"],
        gender=current_user["gender"],
        height=current_user["height"],
        weight=current_user["weight"],
        goal=current_user["goal"],
        bmi=current_user["bmi"],
        daily_calorie_target=current_user["daily_calorie_target"]
    )

@api_router.put("/profile")
async def update_profile(profile_update: UpdateProfile, current_user = Depends(get_current_user)):
    update_data = {}
    
    if profile_update.name:
        update_data["name"] = profile_update.name
    if profile_update.age:
        update_data["age"] = profile_update.age
    if profile_update.height:
        update_data["height"] = profile_update.height
    if profile_update.weight:
        update_data["weight"] = profile_update.weight
    if profile_update.goal:
        update_data["goal"] = profile_update.goal
    
    # Recalculate BMI and calories if height/weight/goal changed
    height = profile_update.height or current_user["height"]
    weight = profile_update.weight or current_user["weight"]
    goal = profile_update.goal or current_user["goal"]
    age = profile_update.age or current_user["age"]
    
    if profile_update.height or profile_update.weight:
        update_data["bmi"] = calculate_bmi(weight, height)
    
    if profile_update.height or profile_update.weight or profile_update.goal or profile_update.age:
        update_data["daily_calorie_target"] = calculate_daily_calories(
            age, current_user["gender"], weight, height, goal
        )
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}

# ==================== Food Database Endpoints ====================

@api_router.get("/food-database")
async def get_food_database(search: Optional[str] = None):
    if search:
        foods = await db.food_database.find(
            {"name": {"$regex": search, "$options": "i"}}
        ).to_list(50)
    else:
        foods = await db.food_database.find().to_list(100)
    
    return [
        {
            "id": str(food["_id"]),
            "name": food["name"],
            "proteins_per_100g": food["proteins_per_100g"],
            "carbs_per_100g": food["carbs_per_100g"],
            "fats_per_100g": food["fats_per_100g"],
            "vitamins": food["vitamins"],
            "kcal_per_100g": food["kcal_per_100g"]
        }
        for food in foods
    ]

@api_router.post("/food-database")
async def add_food_to_database(food: FoodItem, current_user = Depends(get_current_user)):
    food_doc = food.dict()
    result = await db.food_database.insert_one(food_doc)
    return {"id": str(result.inserted_id), "message": "Food added to database"}

# ==================== Food Log Endpoints ====================

@api_router.post("/food-logs")
async def create_food_log(log: FoodLogCreate, current_user = Depends(get_current_user)):
    # Calculate totals
    total_kcal = sum(entry.kcal for entry in log.entries)
    total_proteins = sum(entry.proteins for entry in log.entries)
    total_carbs = sum(entry.carbs for entry in log.entries)
    total_fats = sum(entry.fats for entry in log.entries)
    
    log_doc = {
        "user_id": str(current_user["_id"]),
        "date": log.date,
        "entries": [entry.dict() for entry in log.entries],
        "total_kcal": total_kcal,
        "total_proteins": total_proteins,
        "total_carbs": total_carbs,
        "total_fats": total_fats,
        "created_at": datetime.utcnow()
    }
    
    # Check if log exists for this date
    existing_log = await db.food_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": log.date
    })
    
    if existing_log:
        # Update existing log
        await db.food_logs.update_one(
            {"_id": existing_log["_id"]},
            {"$set": log_doc}
        )
        return {"message": "Food log updated"}
    else:
        # Create new log
        await db.food_logs.insert_one(log_doc)
        return {"message": "Food log created"}

@api_router.get("/food-logs/{date}")
async def get_food_log(date: str, current_user = Depends(get_current_user)):
    log = await db.food_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": date
    })
    
    if not log:
        return None
    
    return {
        "date": log["date"],
        "entries": log["entries"],
        "total_kcal": log["total_kcal"],
        "total_proteins": log["total_proteins"],
        "total_carbs": log["total_carbs"],
        "total_fats": log["total_fats"]
    }

# ==================== Water Log Endpoints ====================

@api_router.post("/water-logs")
async def add_water_intake(log: WaterLogCreate, current_user = Depends(get_current_user)):
    # Check if log exists for this date
    existing_log = await db.water_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": log.date
    })
    
    if existing_log:
        # Add to existing log
        new_intake = existing_log["total_intake"] + log.amount_ml
        await db.water_logs.update_one(
            {"_id": existing_log["_id"]},
            {
                "$set": {"total_intake": new_intake},
                "$push": {"entries": {"time": datetime.utcnow().isoformat(), "amount_ml": log.amount_ml}}
            }
        )
    else:
        # Create new log
        log_doc = {
            "user_id": str(current_user["_id"]),
            "date": log.date,
            "total_intake": log.amount_ml,
            "goal_ml": 2000,  # Default 2L goal
            "entries": [{"time": datetime.utcnow().isoformat(), "amount_ml": log.amount_ml}]
        }
        await db.water_logs.insert_one(log_doc)
    
    return {"message": "Water intake logged"}

@api_router.get("/water-logs/{date}")
async def get_water_log(date: str, current_user = Depends(get_current_user)):
    log = await db.water_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": date
    })
    
    if not log:
        return {"date": date, "total_intake": 0, "goal_ml": 2000, "entries": []}
    
    return {
        "date": log["date"],
        "total_intake": log["total_intake"],
        "goal_ml": log["goal_ml"],
        "entries": log["entries"]
    }

# ==================== Sleep Log Endpoints ====================

@api_router.post("/sleep-logs")
async def create_sleep_log(log: SleepLogCreate, current_user = Depends(get_current_user)):
    log_doc = {
        "user_id": str(current_user["_id"]),
        "date": log.date,
        "hours": log.hours,
        "quality": log.quality,
        "notes": log.notes,
        "created_at": datetime.utcnow()
    }
    
    # Check if log exists for this date
    existing_log = await db.sleep_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": log.date
    })
    
    if existing_log:
        await db.sleep_logs.update_one(
            {"_id": existing_log["_id"]},
            {"$set": log_doc}
        )
    else:
        await db.sleep_logs.insert_one(log_doc)
    
    return {"message": "Sleep log saved"}

@api_router.get("/sleep-logs/{date}")
async def get_sleep_log(date: str, current_user = Depends(get_current_user)):
    log = await db.sleep_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": log.date
    })
    
    if not log:
        return None
    
    return {
        "date": log["date"],
        "hours": log["hours"],
        "quality": log["quality"],
        "notes": log["notes"]
    }

# ==================== Mood Log Endpoints ====================

@api_router.post("/mood-logs")
async def create_mood_log(log: MoodLogCreate, current_user = Depends(get_current_user)):
    log_doc = {
        "user_id": str(current_user["_id"]),
        "date": log.date,
        "mood": log.mood,
        "notes": log.notes,
        "created_at": datetime.utcnow()
    }
    
    # Check if log exists for this date
    existing_log = await db.mood_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": log.date
    })
    
    if existing_log:
        await db.mood_logs.update_one(
            {"_id": existing_log["_id"]},
            {"$set": log_doc}
        )
    else:
        await db.mood_logs.insert_one(log_doc)
    
    return {"message": "Mood log saved"}

@api_router.get("/mood-logs/{date}")
async def get_mood_log(date: str, current_user = Depends(get_current_user)):
    log = await db.mood_logs.find_one({
        "user_id": str(current_user["_id"]),
        "date": date
    })
    
    if not log:
        return None
    
    return {
        "date": log["date"],
        "mood": log["mood"],
        "notes": log["notes"]
    }

# ==================== Dashboard Endpoint ====================

@api_router.get("/dashboard/{date}")
async def get_dashboard_data(date: str, current_user = Depends(get_current_user)):
    # Get all logs for the date
    food_log = await db.food_logs.find_one({"user_id": str(current_user["_id"]), "date": date})
    water_log = await db.water_logs.find_one({"user_id": str(current_user["_id"]), "date": date})
    sleep_log = await db.sleep_logs.find_one({"user_id": str(current_user["_id"]), "date": date})
    mood_log = await db.mood_logs.find_one({"user_id": str(current_user["_id"]), "date": date})
    
    return {
        "user": {
            "name": current_user["name"],
            "bmi": current_user["bmi"],
            "daily_calorie_target": current_user["daily_calorie_target"],
            "goal": current_user["goal"]
        },
        "food": {
            "total_kcal": food_log["total_kcal"] if food_log else 0,
            "total_proteins": food_log["total_proteins"] if food_log else 0,
            "total_carbs": food_log["total_carbs"] if food_log else 0,
            "total_fats": food_log["total_fats"] if food_log else 0
        },
        "water": {
            "total_intake": water_log["total_intake"] if water_log else 0,
            "goal_ml": water_log["goal_ml"] if water_log else 2000
        },
        "sleep": {
            "hours": sleep_log["hours"] if sleep_log else 0,
            "quality": sleep_log["quality"] if sleep_log else None
        },
        "mood": {
            "mood": mood_log["mood"] if mood_log else None
        }
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def startup_db_client():
    # Seed food database with common foods
    food_count = await db.food_database.count_documents({})
    if food_count == 0:
        common_foods = [
            {"name": "Chicken Breast", "proteins_per_100g": 31, "carbs_per_100g": 0, "fats_per_100g": 3.6, "vitamins": "B6, B12", "kcal_per_100g": 165},
            {"name": "Brown Rice", "proteins_per_100g": 2.6, "carbs_per_100g": 23, "fats_per_100g": 0.9, "vitamins": "B1, B3", "kcal_per_100g": 111},
            {"name": "Broccoli", "proteins_per_100g": 2.8, "carbs_per_100g": 7, "fats_per_100g": 0.4, "vitamins": "C, K", "kcal_per_100g": 34},
            {"name": "Banana", "proteins_per_100g": 1.1, "carbs_per_100g": 23, "fats_per_100g": 0.3, "vitamins": "B6, C", "kcal_per_100g": 89},
            {"name": "Salmon", "proteins_per_100g": 20, "carbs_per_100g": 0, "fats_per_100g": 13, "vitamins": "D, B12", "kcal_per_100g": 208},
            {"name": "Eggs", "proteins_per_100g": 13, "carbs_per_100g": 1.1, "fats_per_100g": 11, "vitamins": "A, D, B12", "kcal_per_100g": 155},
            {"name": "Oats", "proteins_per_100g": 17, "carbs_per_100g": 66, "fats_per_100g": 7, "vitamins": "B1, B5", "kcal_per_100g": 389},
            {"name": "Milk", "proteins_per_100g": 3.4, "carbs_per_100g": 5, "fats_per_100g": 1, "vitamins": "D, B12", "kcal_per_100g": 42},
            {"name": "Apple", "proteins_per_100g": 0.3, "carbs_per_100g": 14, "fats_per_100g": 0.2, "vitamins": "C", "kcal_per_100g": 52},
            {"name": "Sweet Potato", "proteins_per_100g": 1.6, "carbs_per_100g": 20, "fats_per_100g": 0.1, "vitamins": "A, C", "kcal_per_100g": 86},
        ]
        await db.food_database.insert_many(common_foods)
        logger.info("Food database seeded with common foods")
