# OOPS-MAIN - E-Commerce Platform

A full-stack e-commerce platform with customer, retailer, and wholesaler dashboards. Features include product management, cart functionality, order processing, and multiple authentication methods.

## Features

- **Multiple User Roles**: Customer, Retailer, and Wholesaler dashboards
- **Authentication Options**:
  - Password-based login
  - OTP via email
  - Google OAuth sign-in
- **Pincode-based Retailer Matching**: Customers are automatically matched with retailers in their area
- **Product Management**: Browse, search, and filter products by category
- **Shopping Cart**: Add, update, and remove items
- **Order Management**: Place orders and track order history
- **Product Feedback**: Rate and review products

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- MongoDB Atlas account
- Google Cloud Console account (for OAuth)
- Gmail account with App Password (for OTP emails)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Pratyush345/OOPS-MAIN.git
cd OOPS-MAIN
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
cd backend
python -m venv ../.venv
source ../.venv/bin/activate  # On Windows: ..\.venv\Scripts\activate
pip install -r requirements.txt
```

#### Configure Backend Environment

Create a `.env` file in the `backend` directory by copying the example:

```bash
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
# MongoDB Atlas
MONGO_URL=your-mongodb-connection-string

# JWT
JWT_SECRET=your-secure-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS
CORS_ORIGINS=*

# Email/OTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
OTP_EXPIRY_MINUTES=5

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

#### Start the Backend Server

```bash
cd backend
python -m uvicorn server:app --reload
```

The backend will run on `http://127.0.0.1:8000`

### 3. Frontend Setup

#### Install Node Dependencies

```bash
cd frontend
npm install
```

#### Configure Frontend Environment

Create a `.env` file in the `frontend` directory:

```bash
cp .env.example .env
```

Edit `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://127.0.0.1:8000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

WDS_SOCKET_PORT=3000
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
DISABLE_ESLINT_PLUGIN=true
```

#### Start the Frontend Server

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## Configuration Details

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Add a database user with read/write permissions
4. Whitelist your IP address or allow access from anywhere (0.0.0.0/0)
5. Copy the connection string and add it to `MONGO_URL` in backend/.env

### Google OAuth Setup

1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen
6. Set Application type to "Web application"
7. Add Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
8. Copy the Client ID and Client Secret to your .env files

### Gmail App Password Setup

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords"
4. Select "Mail" and "Other (Custom name)"
5. Generate the password
6. Copy the 16-character password to `SMTP_PASSWORD` in backend/.env

## Usage

### User Registration

1. Navigate to `http://localhost:3000`
2. Click on "Register" tab
3. Fill in your details:
   - Name
   - Email
   - Password
   - Phone
   - Address
   - Pincode (important for retailer matching)
   - Role (customer/retailer/wholesaler)
4. Click "Register"

### Login Options

#### Password Login

- Enter your email and password
- Click "Login"

#### OTP Login

1. Click "Login with OTP" button
2. Enter your email
3. Click "Send OTP"
4. Check your email for the 6-character code
5. Enter the OTP and click "Verify OTP"

#### Google OAuth

- Click "Sign in with Google" button
- Select your Google account
- Authorize the application

### Customer Dashboard

- Browse products from your assigned retailer
- Filter products by category
- View product details and ratings
- Add items to cart
- Adjust quantities
- Proceed to checkout
- View order history

### Retailer Dashboard

- View sales analytics
- Manage product inventory
- Track orders from customers
- View revenue statistics

### Wholesaler Dashboard

- View business metrics
- Manage product catalog
- Track retailer orders
- Monitor sales performance

## API Documentation

Once the backend is running, access the interactive API documentation:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Project Structure

```
OOPS-MAIN/
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Backend configuration
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard and page components
│   │   ├── components/    # Reusable UI components
│   │   ├── api/          # API client functions
│   │   ├── context/      # React context providers
│   │   └── hooks/        # Custom React hooks
│   ├── public/
│   ├── package.json
│   └── .env              # Frontend configuration
└── README.md
```

## Troubleshooting

### Backend Issues

**MongoDB Connection Error**

- Verify your connection string in backend/.env
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure database user credentials are correct

**OTP Email Not Sending**

- Verify SMTP credentials in backend/.env
- Check if 2-Step Verification is enabled on Gmail
- Ensure you're using an App Password, not your regular password

**Google OAuth Error**

- Verify Client ID and Secret are correct
- Check Authorized JavaScript origins in Google Console
- Wait 2-3 minutes for changes to propagate

### Frontend Issues

**Cannot Connect to Backend**

- Ensure backend server is running on port 8000
- Check REACT_APP_BACKEND_URL in frontend/.env
- Verify CORS settings in backend/.env

**Google Sign-in Button Not Visible**

- Check if REACT_APP_GOOGLE_CLIENT_ID is set correctly
- Ensure the Client ID is valid (not placeholder text)

## Technologies Used

### Backend

- FastAPI - Web framework
- Motor - Async MongoDB driver
- PyJWT - JSON Web Token authentication
- bcrypt - Password hashing
- pyotp - OTP generation
- google-auth - Google OAuth verification
- aiosmtplib - Async email sending

### Frontend

- React - UI framework
- React Router - Navigation
- Axios - HTTP client
- TailwindCSS - Styling
- shadcn/ui - Component library
- @react-oauth/google - Google OAuth integration

## License

This project is for educational purposes.
