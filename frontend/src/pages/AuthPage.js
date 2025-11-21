import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { authAPI } from "@/api/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Store, ArrowLeft, Mail, Lock, Phone, Home, Shield } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from "axios";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const GOOGLE_OAUTH_ENABLED = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "your-google-client-id.apps.googleusercontent.com" && GOOGLE_CLIENT_ID.includes(".apps.googleusercontent.com");
const API_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "customer",
    address: "",
    pincode: "",
  });

  // OTP States
  const [showOTPLogin, setShowOTPLogin] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Profile Completion Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [incompleteUser, setIncompleteUser] = useState(null);
  const [incompleteToken, setIncompleteToken] = useState(null);
  const [profileData, setProfileData] = useState({
    phone: "",
    address: "",
    pincode: "",
    role: "customer",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.login(loginData);
      const { access_token, user } = response.data;
      login(user, access_token);
      toast.success("Login successful!");

      if (user.role === "customer") navigate("/customer/dashboard");
      else if (user.role === "retailer") navigate("/retailer/dashboard");
      else if (user.role === "wholesaler") navigate("/wholesaler/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.register(registerData);
      const { access_token, user } = response.data;
      login(user, access_token);
      toast.success("Registration successful!");

      if (user.role === "customer") navigate("/customer/dashboard");
      else if (user.role === "retailer") navigate("/retailer/dashboard");
      else if (user.role === "wholesaler") navigate("/wholesaler/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // OTP Handlers
  const handleSendOTP = async () => {
    if (!otpEmail) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      await authAPI.sendOTP({ email: otpEmail, purpose: "login" });
      setOtpSent(true);
      toast.success("OTP sent to your email!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.verifyOTP({ email: otpEmail, otp });
      const { access_token, user } = response.data;
      login(user, access_token);
      toast.success("Login successful!");

      if (user.role === "customer") navigate("/customer/dashboard");
      else if (user.role === "retailer") navigate("/retailer/dashboard");
      else if (user.role === "wholesaler") navigate("/wholesaler/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await authAPI.googleAuth(credentialResponse.credential);
      const { access_token, user, incomplete_profile } = response.data;
      
      if (incomplete_profile) {
        // Show profile completion modal
        setIncompleteUser(user);
        setIncompleteToken(access_token);
        setProfileData({
          phone: user.phone || "",
          address: user.address || "",
          pincode: user.pincode || "",
          role: user.role || "customer",
        });
        setShowProfileModal(true);
        toast.info("Please complete your profile");
      } else {
        // Profile complete, proceed to login
        login(user, access_token);
        toast.success("Google login successful!");

        if (user.role === "customer") navigate("/customer/dashboard");
        else if (user.role === "retailer") navigate("/retailer/dashboard");
        else if (user.role === "wholesaler") navigate("/wholesaler/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate fields
      if (!profileData.phone || !profileData.address || !profileData.role) {
        toast.error("Please fill all required fields");
        setLoading(false);
        return;
      }

      // Update user profile
      await axios.put(
        `${API_URL}/api/users/${incompleteUser.id}/profile`,
        profileData
      );

      // Fetch updated user data
      const response = await axios.get(
        `${API_URL}/api/users/${incompleteUser.id}/profile`,
        { headers: { Authorization: `Bearer ${incompleteToken}` } }
      );

      const updatedUser = response.data || { ...incompleteUser, ...profileData };

      // Login with updated profile
      login(updatedUser, incompleteToken);
      toast.success("Profile completed successfully!");
      setShowProfileModal(false);

      if (updatedUser.role === "customer") navigate("/customer/dashboard");
      else if (updatedUser.role === "retailer") navigate("/retailer/dashboard");
      else if (updatedUser.role === "wholesaler") navigate("/wholesaler/dashboard");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google login failed");
  };

  const content = (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden p-6">

      {/* Neon floating blobs */}
      <motion.div
        className="absolute top-10 left-10 w-96 h-96 bg-purple-700 rounded-full blur-[140px] opacity-40"
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-blue-700 rounded-full blur-[160px] opacity-40"
        animate={{ x: [0, -60, 40, 0], y: [0, 50, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex items-center justify-center mb-6 space-x-3">
          <Store className="h-10 w-10 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
          <span className="text-4xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">Live MART</span>
        </div>

        <Button variant="ghost" onClick={() => navigate("/")} className="text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl text-white">
          <CardHeader>
            <CardTitle className="text-xl text-white">Welcome</CardTitle>
            <CardDescription className="text-gray-300">Login or create a new account</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 text-white rounded-xl mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login">
                {!showOTPLogin ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400" />
                      <Input
                        className="pl-10 bg-white/10 border-white/20 text-white"
                        type="email"
                        placeholder="Email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-gray-400" />
                      <Input
                        className="pl-10 bg-white/10 border-white/20 text-white"
                        type="password"
                        placeholder="Password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-5 shadow-lg shadow-purple-500/30">
                      {loading ? "Logging in..." : "Login"}
                    </Button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-black px-2 text-gray-400">Or</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowOTPLogin(true)}
                      className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl py-5"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Login with OTP
                    </Button>

                    {GOOGLE_OAUTH_ENABLED && (
                      <div className="flex justify-center mt-4">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={handleGoogleError}
                          theme="filled_black"
                          size="large"
                          text="signin_with"
                          shape="rectangular"
                        />
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400" />
                      <Input
                        className="pl-10 bg-white/10 border-white/20 text-white"
                        type="email"
                        placeholder="Enter your email"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        disabled={otpSent}
                        required
                      />
                    </div>

                    {!otpSent ? (
                      <Button
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-5"
                      >
                        {loading ? "Sending..." : "Send OTP"}
                      </Button>
                    ) : (
                      <>
                        <div className="relative">
                          <Input
                            className="bg-white/10 border-white/20 text-white text-center text-2xl tracking-widest"
                            type="text"
                            placeholder="000000"
                            maxLength="6"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.toUpperCase())}
                            required
                          />
                        </div>
                        <Button
                          onClick={handleVerifyOTP}
                          disabled={loading}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-5"
                        >
                          {loading ? "Verifying..." : "Verify OTP"}
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowOTPLogin(false);
                        setOtpSent(false);
                        setOtp("");
                        setOtpEmail("");
                      }}
                      className="w-full text-white hover:bg-white/10"
                    >
                      Back to password login
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">

                  <div className="relative">
                    <Label>Full Name</Label>
                    <Input
                      className="bg-white/10 border-white/20 text-white"
                      type="text"
                      placeholder="John Doe"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Label>Email</Label>
                    <Input
                      className="bg-white/10 border-white/20 text-white"
                      type="email"
                      placeholder="your@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Label>Phone</Label>
                    <Input
                      className="bg-white/10 border-white/20 text-white"
                      type="tel"
                      placeholder="+1234567890"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Label>Password</Label>
                    <Input
                      className="bg-white/10 border-white/20 text-white"
                      type="password"
                      placeholder="Your password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>I am a</Label>
                    <Select
                      value={registerData.role}
                      onValueChange={(value) => setRegisterData({ ...registerData, role: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="retailer">Retailer</SelectItem>
                        <SelectItem value="wholesaler">Wholesaler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
  <Label>Address</Label>
  <Input
    className="bg-white/10 border-white/20 text-white"
    type="text"
    placeholder="Your address"
    value={registerData.address}
    onChange={(e) =>
      setRegisterData({ ...registerData, address: e.target.value })
    }
    required
  />
</div>

                  <div>
                    <Label>Pincode</Label>
                    <Input
                      className="bg-white/10 border-white/20 text-white"
                      type="text"
                      placeholder="Enter your pincode"
                      value={registerData.pincode}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, pincode: e.target.value })
                      }
                      required
                    />
                  </div>


                <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-5 shadow-lg shadow-purple-500/30">
                  {loading ? "Creating account..." : "Create Account"}
                </Button>

                {GOOGLE_OAUTH_ENABLED && (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-black px-2 text-gray-400">Or sign up with</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="filled_black"
                        size="large"
                        text="signup_with"
                        shape="rectangular"
                      />
                    </div>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-400 mt-4">
        OTP will be sent to your email (or logged in console for testing)
      </p>
    </motion.div>

    {/* Profile Completion Modal */}
    <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide additional information to complete your registration
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleProfileComplete} className="space-y-4">
          <div>
            <Label htmlFor="profile-role">Account Type *</Label>
            <Select
              value={profileData.role}
              onValueChange={(value) => setProfileData({ ...profileData, role: value })}
            >
              <SelectTrigger id="profile-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="wholesaler">Wholesaler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="profile-phone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="profile-phone"
                type="tel"
                placeholder="Enter phone number"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="profile-address">Address *</Label>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="profile-address"
                type="text"
                placeholder="Enter address"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="profile-pincode">
              Pincode {profileData.role === "customer" && "(for retailer matching)"}
            </Label>
            <Input
              id="profile-pincode"
              type="text"
              placeholder="Enter pincode"
              value={profileData.pincode}
              onChange={(e) => setProfileData({ ...profileData, pincode: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Completing Profile..." : "Complete Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>
  );

  return GOOGLE_OAUTH_ENABLED ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {content}
    </GoogleOAuthProvider>
  ) : content;
}

