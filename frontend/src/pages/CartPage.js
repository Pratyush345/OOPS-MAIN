import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cartAPI, productsAPI } from "@/api/api";
import { toast } from "sonner";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local editable quantity state for typing box
  const [localQty, setLocalQty] = useState({});

  useEffect(() => {
    fetchCart();
  }, []);

  // Format ₹ with commas
  const formatPrice = (price) =>
    "₹" + Number(price).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  // Fetch + attach product details
  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await cartAPI.getCart(user.id);

      const items = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];

      const enriched = await Promise.all(
        items.map(async (item) => {
          const productId = item.product_id;

          let product = item.product;
          if (!product) {
            try {
              const resp = await productsAPI.getById(productId);
              product = resp.data;
            } catch {
              product = {
                id: productId,
                name: "Unnamed Product",
                price: 0,
                stock: 0,
                unit: "",
                image_url: "",
              };
            }
          }

          return {
            ...item,
            id: productId, // stable id
            product,
          };
        })
      );

      setCartItems(enriched);

      // Set typed quantity buffer
      const qtyMap = {};
      enriched.forEach((i) => (qtyMap[i.id] = i.quantity.toString()));
      setLocalQty(qtyMap);

    } catch (error) {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sync local qty while typing (NO VALIDATION HERE)
   */
  const updateLocalQuantity = (id, value) => {
    setLocalQty((prev) => ({ ...prev, [id]: value }));
  };

  /**
   * Update backend quantity AFTER leaving field or pressing +/- buttons
   */
  const updateQuantity = async (item, newQty) => {
    const qty = Number(newQty);
    if (isNaN(qty) || qty < 1) return;

    if (qty > item.product.stock) {
      toast.error("Not enough stock available");
      return;
    }

    try {
      await cartAPI.updateItem(user.id, item.product_id, qty);

      // Optimistic update (no full reload)
      setCartItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, quantity: qty } : p
        )
      );

      setLocalQty((prev) => ({ ...prev, [item.id]: String(qty) }));

    } catch {
      toast.error("Update failed");
    }
  };

  const removeItem = async (item) => {
    try {
      await cartAPI.removeItem(user.id, item.product_id);
      setCartItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const calculateTotal = () =>
    cartItems.reduce(
      (t, i) => t + i.product.price * i.quantity,
      0
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-10">Loading cart...</div>
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Start shopping to add items</p>
              <Button onClick={() => navigate("/customer/dashboard")}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT — CART ITEMS */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">

                    <img
                      src={item.product.image_url || "https://via.placeholder.com/150"}
                      alt={item.product.name}
                      className="w-24 h-24 object-cover rounded"
                    />

                    <div className="flex-1">
                      <h3 className="font-semibold">{item.product.name}</h3>

                      <p className="text-sm text-gray-600 mb-2">
                        {formatPrice(item.product.price)} per {item.product.unit}
                      </p>

                      {/* QUANTITY INPUT */}
                      <div className="flex items-center gap-4">
                        
                        {/* - button */}
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>

                        {/* Editable Input */}
                        <input
                          className="w-14 text-center border rounded p-1"
                          value={localQty[item.id]}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^\d*$/.test(v)) updateLocalQuantity(item.id, v);
                          }}
                          onBlur={(e) => {
                            let v = e.target.value.trim();

                            if (v === "" || Number(v) < 1) v = "1";
                            if (Number(v) > item.product.stock) {
                              toast.error("Out of stock");
                              v = String(item.product.stock);
                            }

                            updateQuantity(item, Number(v));
                          }}
                        />

                        {/* + button */}
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        {/* REMOVE */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => removeItem(item)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>

                    {/* ITEM TOTAL */}
                    <div className="text-right font-semibold">
                      {formatPrice(item.product.price * item.quantity)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* RIGHT — ORDER SUMMARY */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="text-green-600">FREE</span>
                  </div>

                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                </div>

                <Button className="w-full" onClick={() => navigate("/checkout")}>
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => navigate("/customer/dashboard")}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CartPage;
