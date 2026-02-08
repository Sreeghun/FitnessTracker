#!/usr/bin/env python3
import requests
import json
from datetime import datetime

# Backend URL configuration
BACKEND_URL = "https://health-sync-15.preview.emergentagent.com/api"

class FitnessTrackerAPITest:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.access_token = None
        self.test_user_email = "sarah.johnson@healthsync.com"
        self.test_user_password = "HealthyLife123"
        self.today_date = datetime.now().strftime("%Y-%m-%d")
        
    def get_headers(self, include_auth=True):
        headers = {
            "Content-Type": "application/json"
        }
        if include_auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        print("🧪 Testing User Registration...")
        
        url = f"{self.base_url}/auth/register"
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": "Sarah Johnson",
            "age": 28,
            "gender": "female",
            "height": 168.0,
            "weight": 65.0,
            "goal": "maintain"
        }
        
        try:
            response = requests.post(url, json=data, headers=self.get_headers(include_auth=False))
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 201 or response.status_code == 200:
                result = response.json()
                self.access_token = result.get("access_token")
                print("✅ Registration successful")
                print(f"Access token received: {self.access_token[:20]}...")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                print("⚠️  User already exists, proceeding to login")
                return self.test_user_login()
            else:
                print(f"❌ Registration failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        print("🧪 Testing User Login...")
        
        url = f"{self.base_url}/auth/login"
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        try:
            response = requests.post(url, json=data, headers=self.get_headers(include_auth=False))
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.access_token = result.get("access_token")
                print("✅ Login successful")
                print(f"Access token: {self.access_token[:20]}...")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def test_get_profile(self):
        """Test get user profile endpoint"""
        print("🧪 Testing Get Profile...")
        
        url = f"{self.base_url}/profile"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                profile = response.json()
                print("✅ Profile retrieved successfully")
                print(f"User: {profile.get('name')} - BMI: {profile.get('bmi')} - Calorie Target: {profile.get('daily_calorie_target')}")
                return True
            else:
                print(f"❌ Get profile failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get profile error: {e}")
            return False
    
    def test_update_profile(self):
        """Test update user profile endpoint"""
        print("🧪 Testing Update Profile...")
        
        url = f"{self.base_url}/profile"
        data = {
            "weight": 67.0,
            "goal": "lose"
        }
        
        try:
            response = requests.put(url, json=data, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Profile updated successfully")
                
                # Verify the changes by getting profile again
                profile_response = requests.get(url, headers=self.get_headers())
                if profile_response.status_code == 200:
                    profile = profile_response.json()
                    print(f"Updated BMI: {profile.get('bmi')} - New Calorie Target: {profile.get('daily_calorie_target')}")
                return True
            else:
                print(f"❌ Update profile failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Update profile error: {e}")
            return False
    
    def test_get_food_database(self):
        """Test get food database endpoint"""
        print("🧪 Testing Food Database - Get All...")
        
        url = f"{self.base_url}/food-database"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                foods = response.json()
                print(f"✅ Food database retrieved: {len(foods)} foods available")
                if foods:
                    print(f"Sample food: {foods[0]['name']} - {foods[0]['kcal_per_100g']} kcal/100g")
                return True
            else:
                print(f"❌ Get food database failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get food database error: {e}")
            return False
    
    def test_search_food_database(self):
        """Test search food database endpoint"""
        print("🧪 Testing Food Database - Search...")
        
        url = f"{self.base_url}/food-database?search=chicken"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                foods = response.json()
                print(f"✅ Food search successful: {len(foods)} chicken items found")
                if foods:
                    for food in foods:
                        print(f"  - {food['name']}: {food['kcal_per_100g']} kcal/100g")
                return True
            else:
                print(f"❌ Search food database failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Search food database error: {e}")
            return False
    
    def test_create_food_log(self):
        """Test create food log endpoint"""
        print("🧪 Testing Food Logging - Create...")
        
        url = f"{self.base_url}/food-logs"
        data = {
            "date": self.today_date,
            "entries": [
                {
                    "food_name": "Chicken Breast",
                    "grams": 150,
                    "kcal": 247.5,
                    "proteins": 46.5,
                    "carbs": 0,
                    "fats": 5.4
                },
                {
                    "food_name": "Brown Rice",
                    "grams": 100,
                    "kcal": 111,
                    "proteins": 2.6,
                    "carbs": 23,
                    "fats": 0.9
                },
                {
                    "food_name": "Broccoli",
                    "grams": 80,
                    "kcal": 27.2,
                    "proteins": 2.24,
                    "carbs": 5.6,
                    "fats": 0.32
                }
            ]
        }
        
        try:
            response = requests.post(url, json=data, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Food log created successfully")
                total_kcal = sum(entry["kcal"] for entry in data["entries"])
                print(f"Total calories logged: {total_kcal} kcal")
                return True
            else:
                print(f"❌ Create food log failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Create food log error: {e}")
            return False
    
    def test_get_food_log(self):
        """Test get food log endpoint"""
        print("🧪 Testing Food Logging - Get...")
        
        url = f"{self.base_url}/food-logs/{self.today_date}"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                log = response.json()
                if log:
                    print("✅ Food log retrieved successfully")
                    print(f"Total kcal: {log['total_kcal']} | Proteins: {log['total_proteins']}g | Carbs: {log['total_carbs']}g | Fats: {log['total_fats']}g")
                    print(f"Number of food entries: {len(log['entries'])}")
                else:
                    print("⚠️  No food log found for today")
                return True
            else:
                print(f"❌ Get food log failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get food log error: {e}")
            return False
    
    def test_create_water_log(self):
        """Test add water intake endpoint"""
        print("🧪 Testing Water Logging - Add...")
        
        url = f"{self.base_url}/water-logs"
        
        # Add multiple water entries
        water_amounts = [250, 500, 300, 200]  # ml
        
        try:
            for amount in water_amounts:
                data = {
                    "date": self.today_date,
                    "amount_ml": amount
                }
                response = requests.post(url, json=data, headers=self.get_headers())
                print(f"Adding {amount}ml - Status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"❌ Add water log failed: {response.text}")
                    return False
            
            print(f"✅ Water logs created successfully - Total: {sum(water_amounts)}ml")
            return True
                
        except Exception as e:
            print(f"❌ Create water log error: {e}")
            return False
    
    def test_get_water_log(self):
        """Test get water log endpoint"""
        print("🧪 Testing Water Logging - Get...")
        
        url = f"{self.base_url}/water-logs/{self.today_date}"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                log = response.json()
                print("✅ Water log retrieved successfully")
                print(f"Total intake: {log['total_intake']}ml / {log['goal_ml']}ml goal")
                print(f"Number of water entries: {len(log['entries'])}")
                return True
            else:
                print(f"❌ Get water log failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get water log error: {e}")
            return False
    
    def test_create_sleep_log(self):
        """Test create sleep log endpoint"""
        print("🧪 Testing Sleep Logging - Create...")
        
        url = f"{self.base_url}/sleep-logs"
        data = {
            "date": self.today_date,
            "hours": 7.5,
            "quality": "good",
            "notes": "Slept well, woke up refreshed"
        }
        
        try:
            response = requests.post(url, json=data, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Sleep log created successfully")
                print(f"Sleep: {data['hours']} hours - {data['quality']} quality")
                return True
            else:
                print(f"❌ Create sleep log failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Create sleep log error: {e}")
            return False
    
    def test_get_sleep_log(self):
        """Test get sleep log endpoint"""
        print("🧪 Testing Sleep Logging - Get...")
        
        url = f"{self.base_url}/sleep-logs/{self.today_date}"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                log = response.json()
                if log:
                    print("✅ Sleep log retrieved successfully")
                    print(f"Hours: {log['hours']} | Quality: {log['quality']} | Notes: {log.get('notes', 'N/A')}")
                else:
                    print("⚠️  No sleep log found for today")
                return True
            else:
                print(f"❌ Get sleep log failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get sleep log error: {e}")
            return False
    
    def test_create_mood_log(self):
        """Test create mood log endpoint"""
        print("🧪 Testing Mood Logging - Create...")
        
        url = f"{self.base_url}/mood-logs"
        data = {
            "date": self.today_date,
            "mood": "happy",
            "notes": "Had a productive workout and healthy meals today!"
        }
        
        try:
            response = requests.post(url, json=data, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Mood log created successfully")
                print(f"Mood: {data['mood']} - {data['notes']}")
                return True
            else:
                print(f"❌ Create mood log failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Create mood log error: {e}")
            return False
    
    def test_get_mood_log(self):
        """Test get mood log endpoint"""
        print("🧪 Testing Mood Logging - Get...")
        
        url = f"{self.base_url}/mood-logs/{self.today_date}"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                log = response.json()
                if log:
                    print("✅ Mood log retrieved successfully")
                    print(f"Mood: {log['mood']} | Notes: {log.get('notes', 'N/A')}")
                else:
                    print("⚠️  No mood log found for today")
                return True
            else:
                print(f"❌ Get mood log failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get mood log error: {e}")
            return False
    
    def test_get_dashboard(self):
        """Test get dashboard data endpoint"""
        print("🧪 Testing Dashboard - Get Aggregated Data...")
        
        url = f"{self.base_url}/dashboard/{self.today_date}"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                dashboard = response.json()
                print("✅ Dashboard data retrieved successfully")
                
                # Display user info
                user = dashboard.get('user', {})
                print(f"\n👤 User: {user.get('name')} | BMI: {user.get('bmi')} | Goal: {user.get('goal')}")
                print(f"Daily Calorie Target: {user.get('daily_calorie_target')} kcal")
                
                # Display food data
                food = dashboard.get('food', {})
                print(f"\n🍽️  Food: {food.get('total_kcal')} kcal | Proteins: {food.get('total_proteins')}g | Carbs: {food.get('total_carbs')}g | Fats: {food.get('total_fats')}g")
                
                # Display water data
                water = dashboard.get('water', {})
                print(f"💧 Water: {water.get('total_intake')}ml / {water.get('goal_ml')}ml")
                
                # Display sleep data
                sleep = dashboard.get('sleep', {})
                print(f"😴 Sleep: {sleep.get('hours')} hours | Quality: {sleep.get('quality')}")
                
                # Display mood data
                mood = dashboard.get('mood', {})
                print(f"😊 Mood: {mood.get('mood')}")
                
                return True
            else:
                print(f"❌ Get dashboard failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get dashboard error: {e}")
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Fitness Tracker Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Test date: {self.today_date}")
        print("=" * 80)
        
        test_results = {}
        
        # 1. Authentication Tests
        test_results['registration'] = self.test_user_registration()
        if not self.access_token:
            test_results['login'] = self.test_user_login()
        
        if not self.access_token:
            print("❌ Cannot proceed without valid authentication")
            return test_results
        
        print("\n" + "=" * 80)
        
        # 2. Profile Tests
        test_results['get_profile'] = self.test_get_profile()
        test_results['update_profile'] = self.test_update_profile()
        
        print("\n" + "=" * 80)
        
        # 3. Food Database Tests
        test_results['food_database'] = self.test_get_food_database()
        test_results['food_search'] = self.test_search_food_database()
        
        print("\n" + "=" * 80)
        
        # 4. Food Logging Tests
        test_results['create_food_log'] = self.test_create_food_log()
        test_results['get_food_log'] = self.test_get_food_log()
        
        print("\n" + "=" * 80)
        
        # 5. Water Logging Tests
        test_results['create_water_log'] = self.test_create_water_log()
        test_results['get_water_log'] = self.test_get_water_log()
        
        print("\n" + "=" * 80)
        
        # 6. Sleep Logging Tests
        test_results['create_sleep_log'] = self.test_create_sleep_log()
        test_results['get_sleep_log'] = self.test_get_sleep_log()
        
        print("\n" + "=" * 80)
        
        # 7. Mood Logging Tests
        test_results['create_mood_log'] = self.test_create_mood_log()
        test_results['get_mood_log'] = self.test_get_mood_log()
        
        print("\n" + "=" * 80)
        
        # 8. Dashboard Test
        test_results['dashboard'] = self.test_get_dashboard()
        
        print("\n" + "=" * 80)
        
        # Summary
        print("📊 TEST SUMMARY:")
        print("=" * 80)
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        print(f"Tests Passed: {passed}/{total}")
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print("=" * 80)
        
        return test_results

if __name__ == "__main__":
    tester = FitnessTrackerAPITest()
    results = tester.run_all_tests()