// CheckoutPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import useRazorpay from "react-razorpay";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cartAPI, productsAPI, ordersAPI, healthAPI } from "@/api/api";
import { toast } from "sonner";
import { CreditCard, Wallet, ShoppingCart } from "lucide-react";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, loadRetailerStats } = useAuth();
  const [Razorpay] = useRazorpay();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    checkBackendHealth();
    fetchCart();
  }, []);

  const formatPrice = (n) => Number(n).toLocaleString("en-IN");

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      await healthAPI.check();
      setBackendStatus("healthy");
    } catch (error) {
      console.error("Backend health check failed:", error);
      setBackendStatus("unhealthy");
      toast.error("Backend server is not responding");
    }
  };

  const fetchCart = async () => {
    try {
      if (!user?.id) {
        toast.error("Please log in first");
        navigate("/login");
        return;
      }

      console.log("🛒 Fetching cart for user:", user.id);
      const response = await cartAPI.getCart(user.id);

      const rawItems = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];

      console.log("📦 Raw cart items:", rawItems);

      if (rawItems.length === 0) {
        toast.error("Your cart is empty");
        navigate("/cart");
        return;
      }

      const enriched = await Promise.all(
        rawItems.map(async (item) => {
          try {
            const p = await productsAPI.getById(item.product_id);
            return { 
              ...item, 
              product: p.data,
              quantity: Number(item.quantity) || 1
            };
          } catch {
            return {
              ...item,
              product: {
                id: item.product_id,
                name: "Unknown Product",
                price: 0,
                image_url: "",
                unit: "",
                seller_id: "unknown"
              },
              quantity: Number(item.quantity) || 1
            };
          }
        })
      );

      setCartItems(enriched);
    } catch (err) {
      console.error("❌ Cart load error:", err);
      if (err.response?.status === 404) {
        // Cart doesn't exist yet, that's fine
        setCartItems([]);
        toast.error("Your cart is empty");
        navigate("/cart");
      } else {
        toast.error("Failed to load cart");
      }
    }
  };

  const calculateTotal = () =>
    cartItems.reduce(
      (sum, item) => sum + Number(item.product?.price || 0) * Number(item.quantity || 1),
      0
    );

  // ------------------------------------------------
  //   RAZORPAY PAYMENT HANDLER
  // ------------------------------------------------
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!deliveryAddress.trim()) {
      toast.error("Please enter delivery address");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      const total = calculateTotal();
      const items = cartItems.map((it) => ({
        product_id: it.product.id,
        quantity: it.quantity,
      }));

      // If payment method is COD, create order directly
      if (paymentMethod === "cod") {
        const payload = {
          items,
          delivery_address: deliveryAddress,
          payment_method: "cod",
        };

        console.log("🎯 Placing COD order with payload:", payload);
        const response = await ordersAPI.create(user.id, payload);
        console.log("✅ Order created:", response.data);

        // Update seller stats
        const sellerIds = [
          ...new Set(cartItems.map((it) => it.product.seller_id).filter(id => id && id !== "unknown")),
        ];
        sellerIds.forEach((sid) => {
          if (loadRetailerStats) {
            loadRetailerStats(sid);
          }
        });

        toast.success("Order placed successfully!");
        navigate(`/order/${response.data.id}`);
        return;
      }

      // Razorpay payment flow
      console.log("🎯 Creating Razorpay order for amount:", total);

      // Step 1: Create Razorpay order on backend
      const orderResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          currency: "INR",
          user_id: user.id,
          items,
          delivery_address: deliveryAddress,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create payment order");
      }

      const orderData = await orderResponse.json();
      console.log("✅ Razorpay order created:", orderData);

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100, // Convert to paise
        currency: orderData.currency,
        name: "LiveMART",
        description: "Order Payment",
        order_id: orderData.order_id,
        handler: async function (response) {
          console.log("✅ Payment successful:", response);

          try {
            // Step 3: Verify payment on backend
            const verifyResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                user_id: user.id,
                items,
                delivery_address: deliveryAddress,
                total_amount: total,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            const verifyData = await verifyResponse.json();
            console.log("✅ Payment verified:", verifyData);

            // Update seller stats
            const sellerIds = [
              ...new Set(cartItems.map((it) => it.product.seller_id).filter(id => id && id !== "unknown")),
            ];
            sellerIds.forEach((sid) => {
              if (loadRetailerStats) {
                loadRetailerStats(sid);
              }
            });

            toast.success("Payment successful! Order placed.");
            navigate(`/order/${verifyData.order.id}`);
          } catch (error) {
            console.error("❌ Payment verification error:", error);
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        theme: {
          color: "#7C3AED",
        },
        modal: {
          ondismiss: function() {
            console.log("Payment cancelled");
            toast.error("Payment cancelled");
            setLoading(false);
          }
        }
      };

      const razorpayInstance = new Razorpay(options);
      razorpayInstance.open();

    } catch (error) {
      console.error("❌ Order error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      let errorMessage = "Failed to place order";
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = "Cannot connect to server. Please check your connection.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }

      toast.error(errorMessage);
      setLoading(false);
    }
  };

  if (backendStatus === "unhealthy") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Backend Server Unavailable</strong>
            <p>Please make sure your backend server is running on http://127.0.0.1:8000</p>
          </div>
          <Button onClick={checkBackendHealth}>Retry Connection</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Your cart is empty</p>
            <Button onClick={() => navigate("/cart")}>Return to Cart</Button>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder}>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Enter delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <RadioGroupItem value="razorpay" id="razorpay" />
                        <Label htmlFor="razorpay" className="cursor-pointer flex items-center">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pay Online (Razorpay)
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="cursor-pointer flex items-center">
                          <Wallet className="mr-2 h-4 w-4" />
                          Cash on Delivery
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex justify-between text-sm border-b pb-2"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{item.product.name}</div>
                            <div className="text-gray-500 text-xs">
                              Qty: {item.quantity} × ₹{formatPrice(item.product.price)}
                            </div>
                          </div>
                          <span className="font-semibold">
                            ₹{formatPrice(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{formatPrice(calculateTotal())}</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Delivery</span>
                        <span className="text-green-600">FREE</span>
                      </div>

                      <div className="border-t pt-2 flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>₹{formatPrice(calculateTotal())}</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || backendStatus !== "healthy"}
                      className="w-full mt-6"
                    >
                      {loading ? "Placing Order…" : "Place Order"}
                    </Button>

                    {backendStatus !== "healthy" && (
                      <p className="text-sm text-red-600 mt-2 text-center">
                        Backend server is unavailable
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;