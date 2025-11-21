# server.py
print("🔥 BACKEND LOADED FROM:", __file__)
print("🔥 SERVER LOADED FROM:", __file__)
print("🔥🔥🔥 THIS IS THE TOP OF THE REAL SERVER FILE:", __file__)

from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import bcrypt
import jwt
import uuid
import logging
import os
import certifi
import re
import json

# ================= CONFIG =====================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "oops_db")
SECRET_KEY = os.getenv("JWT_SECRET", "secret")
ALGO = "HS256"
TOKEN_EXP = 60 * 24 * 7  # minutes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")

app = FastAPI(title="LiveMART API (Full)")

# ================= IMPROVED CORS CONFIGURATION =====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

client = None
db = None

# =============== DB CONNECT =================
@app.on_event("startup")
async def connect_db():
    global client, db
    if not MONGO_URL:
        logger.error("MONGO_URL not set in environment (.env)")
        raise RuntimeError("MONGO_URL not configured")

    client = AsyncIOMotorClient(MONGO_URL, tls=True, tlsCAFILE=certifi.where())
    db = client[DB_NAME]

    logger.info("MongoDB connected")

    try:
        # create indexes used in your app
        await db.products.create_index("id", unique=True)
        await db.categories.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.orders.create_index("id", unique=True)
        await db.transactions.create_index("id", unique=True)
        await db.cart.create_index("user_id", unique=True)
        await db.purchases.create_index("id", unique=True)
        await db.feedback.create_index("id", unique=True)  # ADD THIS LINE
    except Exception:
        logger.exception("Index creation skipped or failed (non-fatal)")

# ================= MODELS ==========================
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    role: str
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(User):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# ================ HELPERS ===========================
def hash_pw(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

def verify_pw(pwd: str, hashed: str) -> bool:
    return bcrypt.checkpw(pwd.encode(), hashed.encode())

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = (datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXP)).timestamp()
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGO)

def safe_float(x, default=0.0):
    try:
        return float(x)
    except Exception:
        return default

def safe_int(x, default=0):
    try:
        return int(x)
    except Exception:
        return default

def regex_icase(s: str):
    return {"$regex": re.escape(s), "$options": "i"}

# ================== AUTH ============================
@api.post("/auth/register", response_model=Token)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_pw(data.password)
    user_dict = data.model_dump()
    user_dict.pop("password", None)
    user = User(**user_dict)

    doc = user.model_dump()
    doc["password"] = hashed

    await db.users.insert_one(doc)

    token = create_token({"sub": user.email, "user_id": user.id})
    return Token(access_token=token, user=user)

@api.post("/auth/login", response_model=Token)
async def login(data: UserLogin):
    user_doc = await db.users.find_one({"email": data.email})
    if not user_doc or not verify_pw(data.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_doc.pop("password", None)
    user = User(**user_doc)

    token = create_token({"sub": user.email, "user_id": user.id})
    return Token(access_token=token, user=user)

# ============== HEALTH CHECK =========================
@api.get("/health")
async def health_check():
    """Check if database is connected"""
    try:
        # Test database connection
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# ============== TEST CART ENDPOINT ==================
@api.get("/test-cart/{uid}")
async def test_cart(uid: str):
    """Test endpoint to verify cart works"""
    print(f"🧪 Testing cart for user: {uid}")
    
    # Check if user exists
    user = await db.users.find_one({"id": uid})
    if not user:
        return {"error": "User not found", "user_id": uid}
    
    # Try to get/create cart
    cart = await db.cart.find_one({"user_id": uid}) or {"user_id": uid, "items": []}
    
    return {
        "user_exists": True,
        "user_role": user.get("role"),
        "cart_found": "items" in cart,
        "cart_items_count": len(cart.get("items", [])),
        "user_id_received": uid
    }

# ================= FEEDBACK - FIXED VERSION =========================
# ================= FEEDBACK - FIXED VERSION =========================
@api.options("/feedback/{uid}")
async def options_feedback(uid: str):
    """Handle OPTIONS preflight for feedback"""
    return JSONResponse(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    )

@api.post("/feedback/{uid}")
async def create_feedback(uid: str, payload: dict = Body(...)):
    """Create feedback - FIXED VERSION"""
    try:
        print(f"📝 Creating feedback for user: {uid}")
        print(f"📝 Feedback payload: {json.dumps(payload, indent=2)}")
        
        # Validate required fields
        if not payload.get("product_id"):
            raise HTTPException(status_code=400, detail="product_id is required")
        
        # Validate rating
        rating = safe_int(payload.get("rating", 5))
        if rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

        # Create feedback document
        feedback_data = {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "user_name": "User",  # You can fetch actual user name if needed
            "product_id": payload.get("product_id"),
            "rating": rating,
            "comment": payload.get("comment", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        print(f"📝 Inserting feedback: {feedback_data}")

        # Insert feedback
        result = await db.feedback.insert_one(feedback_data)
        print(f"✅ Feedback inserted with ID: {result.inserted_id}")

        # Remove MongoDB _id before returning
        feedback_data.pop('_id', None)
        return feedback_data

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Feedback creation error: {str(e)}")
        logger.error(f"Feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ============== GET FEEDBACK FOR PRODUCT ==================
@api.get("/feedback/product/{product_id}")
async def get_product_feedback(product_id: str):
    """Get all feedback for a specific product"""
    try:
        print(f"📝 Getting feedback for product: {product_id}")
        
        # Return empty array for now since we don't have feedback data
        # You can implement this later when you have actual feedback data
        return []
        
    except Exception as e:
        print(f"❌ Get feedback error: {str(e)}")
        return []  # Return empty array instead of error

# ============== SEED-DATA ============================
@api.post("/seed-data")
async def seed_data():
    wholesalers = [
        {"id": "wh1", "name": "Wholesaler One", "role": "wholesaler", "email": "wh1@example.com", "phone": "000", "password": hash_pw("password")},
        {"id": "ret1", "name": "Retailer One", "role": "retailer", "email": "ret1@example.com", "phone": "111", "password": hash_pw("password")},
    ]

    categories = [
        {"id": "c1", "name": "Fruits"},
        {"id": "c2", "name": "Dairy"},
        {"id": "c3", "name": "Bakery"},
    ]

    products = [
        {"id": "p_wh_apple", "name": "Apple (WH)", "category_id": "c1", "price": 70.0, "stock": 500, "seller_id": "wh1", "description": "Fresh red apples", "image_url": "https://via.placeholder.com/420x280/FF6B6B/white?text=Apple"},
        {"id": "p_wh_milk", "name": "Milk (WH)", "category_id": "c2", "price": 40.0, "stock": 300, "seller_id": "wh1", "description": "Fresh dairy milk", "image_url": "https://via.placeholder.com/420x280/4ECDC4/white?text=Milk"},
        {"id": "p_wh_bread", "name": "Bread (WH)", "category_id": "c3", "price": 35.0, "stock": 200, "seller_id": "wh1", "description": "Fresh baked bread", "image_url": "https://via.placeholder.com/420x280/45B7D1/white?text=Bread"},
        {"id": "p_ret_bread", "name": "Bread (Retail)", "category_id": "c3", "price": 50.0, "stock": 20, "seller_id": "ret1", "description": "Premium bread", "image_url": "https://via.placeholder.com/420x280/F7DC6F/white?text=Premium+Bread"},
    ]

    for u in wholesalers:
        await db.users.update_one({"id": u["id"]}, {"$set": u}, upsert=True)

    for c in categories:
        await db.categories.update_one({"id": c["id"]}, {"$set": c}, upsert=True)

    for p in products:
        await db.products.update_one({"id": p["id"]}, {"$set": p}, upsert=True)

    return {"message": "seeded"}

# ================= PRODUCTS ===========================
@api.get("/products")
async def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    available_only: Optional[bool] = True,
    seller_id: Optional[str] = None,
    limit: int = 1000,
):
    q: Dict[str, Any] = {}

    if seller_id:
        q["seller_id"] = seller_id

    if category_id and category_id != "all":
        q["category_id"] = category_id

    if search:
        q["$or"] = [
            {"name": regex_icase(search)},
            {"description": regex_icase(search)},
        ]

    if min_price is not None or max_price is not None:
        pf = {}
        if min_price is not None:
            pf["$gte"] = min_price
        if max_price is not None:
            pf["$lte"] = max_price
        q["price"] = pf

    if available_only:
        q["stock"] = {"$gt": 0}

    items = await db.products.find(q, {"_id": 0}).to_list(length=limit)

    for it in items:
        it["price"] = safe_float(it.get("price", 0))
        it["stock"] = safe_int(it.get("stock", 0))
        it["rating"] = safe_float(it.get("rating", 0))

    return items

@api.get("/products/retailer/{rid}")
async def get_products_by_retailer(rid: str):
    items = await db.products.find(
        {"seller_id": rid, "stock": {"$gt": 0}}, {"_id": 0}
    ).to_list(1000)

    for it in items:
        it["price"] = safe_float(it.get("price", 0))
        it["stock"] = safe_int(it.get("stock", 0))
        it["rating"] = safe_float(it.get("rating", 0))

    return items

@api.get("/products/{pid}")
async def get_product(pid: str):
    item = await db.products.find_one({"id": pid}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Product not found")

    item["price"] = safe_float(item.get("price", 0))
    item["stock"] = safe_int(item.get("stock", 0))
    item["rating"] = safe_float(item.get("rating", 0))

    return item

@api.post("/products")
async def create_product(payload: dict = Body(...)):
    if "id" not in payload or not payload["id"]:
        payload["id"] = str(uuid.uuid4())

    payload["price"] = safe_float(payload.get("price", 0))
    payload["stock"] = safe_int(payload.get("stock", 0))

    if "rating" not in payload:
        payload["rating"] = 0

    await db.products.update_one({"id": payload["id"]}, {"$set": payload}, upsert=True)
    doc = await db.products.find_one({"id": payload["id"]}, {"_id": 0})

    return doc

@api.put("/products/{pid}")
async def update_product(pid: str, payload: dict = Body(...)):
    if "price" in payload:
        payload["price"] = safe_float(payload["price"])
    if "stock" in payload:
        payload["stock"] = safe_int(payload["stock"])
    if "rating" in payload:
        payload["rating"] = safe_float(payload["rating"])

    await db.products.update_one({"id": pid}, {"$set": payload})

    doc = await db.products.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Product not found")

    doc["rating"] = safe_float(doc.get("rating", 0))
    return doc

@api.delete("/products/{pid}")
async def delete_product(pid: str):
    res = await db.products.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"message": "Product deleted"}

# ================= CATEGORIES ========================
@api.get("/categories")
async def get_categories():
    return await db.categories.find({}, {"_id": 0}).to_list(1000)

@api.post("/categories")
async def create_category(payload: dict = Body(...)):
    if "id" not in payload or not payload["id"]:
        payload["id"] = str(uuid.uuid4())

    payload["name"] = str(payload.get("name", "")).strip()

    await db.categories.update_one({"id": payload["id"]}, {"$set": payload}, upsert=True)

    doc = await db.categories.find_one({"id": payload["id"]}, {"_id": 0})
    return doc

# ================= CART ============================
@api.get("/cart/{uid}")
async def get_cart(uid: str):
    # Validate user ID format
    if not uid or len(uid) < 5:
        raise HTTPException(400, "Invalid user ID format")
    
    cart = await db.cart.find_one({"user_id": uid}, {"_id": 0})

    # FIX: If cart does not exist or items is not a list, normalize
    if not cart or not isinstance(cart.get("items"), list):
        return {"user_id": uid, "items": []}

    # Optional: Ensure quantity is safe
    for it in cart["items"]:
        it["quantity"] = safe_int(it.get("quantity", 1))

    return cart

@api.post("/cart/{uid}")
async def add_to_cart(uid: str, payload: dict = Body(...)):
    # Validate user ID format
    if not uid or len(uid) < 5:
        raise HTTPException(400, "Invalid user ID format")
    
    pid = payload.get("product_id")
    qty = safe_int(payload.get("quantity", 1))

    if not pid:
        raise HTTPException(400, "product_id required")

    product = await db.products.find_one({"id": pid}, {"_id": 0})
    if not product:
        raise HTTPException(400, f"Invalid product ID: {pid}")

    # FIX: Always return items=[] if broken
    cart = await db.cart.find_one({"user_id": uid}) or {"user_id": uid, "items": []}
    if not isinstance(cart.get("items"), list):
        cart["items"] = []

    updated = False
    for item in cart["items"]:
        if item["product_id"] == pid:
            item["quantity"] = safe_int(item["quantity"]) + qty
            updated = True
            break

    if not updated:
        cart["items"].append({"product_id": pid, "quantity": qty})

    await db.cart.replace_one({"user_id": uid}, cart, upsert=True)
    
    # Return the updated cart without MongoDB _id
    cart.pop('_id', None)
    return cart

@api.put("/cart/{uid}/{itemId}")
async def update_cart_item(uid: str, itemId: str, quantity: int = Query(...)):
    # Validate user ID format
    if not uid or len(uid) < 5:
        raise HTTPException(400, "Invalid user ID format")
    
    cart = await db.cart.find_one({"user_id": uid})
    if not cart:
        raise HTTPException(404, "Cart not found")

    found = False
    for item in cart["items"]:
        if item["product_id"] == itemId:
            item["quantity"] = safe_int(quantity)
            found = True
            break

    if not found:
        raise HTTPException(404, "Item not in cart")

    await db.cart.replace_one({"user_id": uid}, cart)
    
    # Return without MongoDB _id
    cart.pop('_id', None)
    return cart

@api.delete("/cart/{uid}/{itemId}")
async def remove_cart_item(uid: str, itemId: str):
    # Validate user ID format
    if not uid or len(uid) < 5:
        raise HTTPException(400, "Invalid user ID format")
    
    cart = await db.cart.find_one({"user_id": uid})
    if not cart:
        raise HTTPException(404, "Cart not found")

    cart["items"] = [i for i in cart["items"] if i["product_id"] != itemId]

    await db.cart.replace_one({"user_id": uid}, cart)
    
    # Return without MongoDB _id
    cart.pop('_id', None)
    return cart

@api.delete("/cart/{uid}")
async def clear_cart(uid: str):
    # Validate user ID format
    if not uid or len(uid) < 5:
        raise HTTPException(400, "Invalid user ID format")
    
    await db.cart.delete_one({"user_id": uid})
    return {"message": "Cart cleared"}

# ================= ORDERS ===========================
@api.post("/orders/{uid}")
async def place_order(uid: str, payload: dict = Body(...)):
    try:
        print(f"🎯 Creating order for user: {uid}")
        print(f"📦 Payload received: {json.dumps(payload, indent=2)}")
        
        if "items" not in payload:
            raise HTTPException(400, "Items missing")

        if not payload.get("delivery_address"):
            raise HTTPException(400, "Delivery address required")

        # Validate user exists
        user = await db.users.find_one({"id": uid})
        if not user:
            raise HTTPException(404, f"User not found: {uid}")

        order_items = []
        total = 0.0

        # CHECK STOCK FIRST
        for it in payload["items"]:
            pid = it["product_id"]
            qty = safe_int(it["quantity"])
            product = await db.products.find_one({"id": pid})

            if not product:
                raise HTTPException(404, f"Product not found: {pid}")

            if product["stock"] < qty:
                raise HTTPException(400, f"Insufficient stock for {product['name']}")

        # BUILD ORDER ITEMS
        for it in payload["items"]:
            pid = it["product_id"]
            qty = safe_int(it["quantity"])
            product = await db.products.find_one({"id": pid})

            subtotal = product["price"] * qty
            total += subtotal

            order_items.append({
                "product_id": pid,
                "product_name": product["name"],
                "quantity": qty,
                "price": product["price"],
                "total": subtotal,
                "seller_id": product["seller_id"]
            })

        order = {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "items": order_items,
            "total_amount": total,
            "delivery_address": payload["delivery_address"],
            "payment_method": payload.get("payment_method", "online"),
            "payment_status": "pending",
            "order_status": "placed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # SAVE ORDER
        await db.orders.insert_one(order)

        # REDUCE STOCK AFTER SAVING ORDER
        for it in payload["items"]:
            await db.products.update_one({"id": it["product_id"]}, {"$inc": {"stock": -safe_int(it["quantity"])}})

        # CLEAR CART
        await db.cart.delete_one({"user_id": uid})

        # Remove MongoDB _id before returning
        order.pop('_id', None)
        return order

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order creation failed: {str(e)}")
        raise HTTPException(500, f"Internal server error: {str(e)}")

@api.get("/orders/{uid}")
async def get_orders(uid: str):
    items = await db.orders.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    return items

@api.get("/orders/detail/{oid}")
async def get_order_detail(oid: str):
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    return order

# ================= DASHBOARD =========================
@api.get("/dashboard/retailer")
async def retailer_dashboard(user_id: Optional[str] = None):
    if not user_id:
        return {"products_count": 0, "orders_count": 0, "total_revenue": 0}

    # Count retailer's products
    products_count = await db.products.count_documents({"seller_id": user_id})

    # Get orders where retailer sold products (as seller)
    orders_as_seller = await db.orders.find({"items.seller_id": user_id}).to_list(2000)
    
    # Get purchases where retailer bought from wholesalers
    purchases_from_wholesalers = await db.purchases.find({"retailer_id": user_id}).to_list(2000)

    orders_count = 0
    revenue = 0

    # Calculate revenue from sales (as seller)
    for order in orders_as_seller:
        included = False
        for item in order["items"]:
            if item["seller_id"] == user_id:
                included = True
                revenue += item["total"]
        if included:
            orders_count += 1

    # Add purchase count (buying from wholesalers)
    orders_count += len(purchases_from_wholesalers)

    print(f"🎯 Retailer Dashboard - User: {user_id}")
    print(f"🎯 Products: {products_count}, Orders: {orders_count}, Revenue: {revenue}")

    return {
        "products_count": products_count,
        "orders_count": orders_count,
        "total_revenue": revenue
    }

@api.get("/dashboard/wholesaler")
async def wholesaler_dashboard(user_id: str = Query(..., description="User ID")):
    """SIMPLE WORKING VERSION - No complex logic"""
    try:
        print(f"🎯 SIMPLE DASHBOARD for: {user_id}")
        
        # 1. Count products
        products_count = await db.products.count_documents({"seller_id": user_id})
        
        # 2. SIMPLE: Get ALL purchases and filter manually
        all_purchases = await db.purchases.find({}).to_list(1000)
        
        # Case-insensitive filter
        matching_purchases = []
        for purchase in all_purchases:
            purchase_wholesaler = purchase.get("wholesaler_id", "")
            if purchase_wholesaler.lower() == user_id.lower():
                matching_purchases.append(purchase)
        
        orders_count = len(matching_purchases)
        total_revenue = sum(p.get("total_amount", 0) for p in matching_purchases)
        
        print(f"💰 SIMPLE CALCULATION: {orders_count} orders, ₹{total_revenue} revenue")
        
        # 3. Return simple result
        result = {
            "products_count": products_count,
            "orders_count": orders_count,
            "total_revenue": total_revenue
        }
        
        print(f"✅ FINAL: {result}")
        return result
        
    except Exception as e:
        print(f"❌ SIMPLE DASHBOARD ERROR: {str(e)}")
        return {
            "products_count": 0,
            "orders_count": 0,
            "total_revenue": 0
        }

# ================= SHOPS ============================
@api.get("/shops")
async def get_shops():
    return await db.shops.find({}, {"_id": 0}).to_list(1000)

# ----------------- REGISTER ROUTES -------------------
app.include_router(api)

print("🔥 USING THIS EXACT SERVER FILE:", __file__)
print("🔥 ROUTES LOADED:")
for r in app.routes:
    print(" →", r.path, r.methods if hasattr(r, 'methods') else '')