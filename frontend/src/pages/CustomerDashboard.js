// CustomerDashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { categoriesAPI, productsAPI, cartAPI, healthAPI } from "@/api/api";
import { toast } from "sonner";

import { Search, ShoppingCart, Minus, Plus, Package } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Client-side cart fallback
const clientSideCart = {
  addItem: (product, quantity) => {
    const cart = JSON.parse(localStorage.getItem('customer_cart') || '{}');
    if (!cart.items) cart.items = [];
    
    const existingIndex = cart.items.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: quantity,
        image_url: product.image_url
      });
    }
    
    localStorage.setItem('customer_cart', JSON.stringify(cart));
    return cart;
  },
  
  getCart: () => {
    return JSON.parse(localStorage.getItem('customer_cart') || '{"items": []}');
  }
};

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ❗ CUSTOMER ID (not retailer)
  const CUSTOMER_ID = user?.id;

  // ❗ Retailer from which customer buys — Use preferred_retailer_id from user profile or fallback
  const RETAILER_ID = user?.preferred_retailer_id || "9b155690-f6b4-4119-b3d0-4f4e8d717e18";

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");

  const [quantities, setQuantities] = useState({});
  const [showQtyBox, setShowQtyBox] = useState({});
  const [inputFocused, setInputFocused] = useState({}); // Track focused inputs

  // ----------------------------------------
  // Debug user data on load
  // ----------------------------------------
  useEffect(() => {
    console.log("👤 Current user:", user);
    console.log("🆔 Customer ID:", CUSTOMER_ID);
    console.log("🏪 Retailer ID:", RETAILER_ID);
    
    // Test backend connection
    testBackendConnection();
  }, [user]);

  // ----------------------------------------
  // Test backend connection
  // ----------------------------------------
  const testBackendConnection = async () => {
    try {
      console.log("🔗 Testing backend connection...");
      const healthResponse = await healthAPI.check();
      console.log("✅ Backend health:", healthResponse.data);
      
      if (CUSTOMER_ID) {
        const cartTest = await healthAPI.testCart(CUSTOMER_ID);
        console.log("🛒 Cart test result:", cartTest.data);
      }
    } catch (error) {
      console.error("❌ Backend connection failed:", error);
      toast.error("Backend server is not responding");
    }
  };

  // ----------------------------------------
  // Load initial data
  // ----------------------------------------
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, priceRange]);

  // ----------------------------------------
  // Fetch categories
  // ----------------------------------------
  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  // ----------------------------------------
  // Fetch products from retailer
  // ----------------------------------------
  const fetchProducts = async () => {
    setLoading(true);

    try {
      const res = await productsAPI.getByRetailer(RETAILER_ID);
      let filtered = res.data;

      // Filter by category
      if (selectedCategory !== "all") {
        filtered = filtered.filter(p => p.category_id === selectedCategory);
      }

      // Search filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
      }

      // Price filtering
      filtered = filtered.filter(p => {
        const price = p.price;
        switch (priceRange) {
          case "under100":
            return price <= 100;
          case "100to500":
            return price >= 100 && price <= 500;
          case "500to1000":
            return price >= 500 && price <= 1000;
          case "1000to5000":
            return price >= 1000 && price <= 5000;
          case "above5000":
            return price >= 5000;
          default:
            return true;
        }
      });

      // Quantity box defaults
      const qty = {};
      const show = {};
      const focused = {};
      filtered.forEach(p => {
        qty[p.id] = 1;
        show[p.id] = false;
        focused[p.id] = false;
      });

      setProducts(filtered);
      setQuantities(qty);
      setShowQtyBox(show);
      setInputFocused(focused);
    } catch (e) {
      console.error("❌ Fetch products error:", e);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // Update quantity (bounded properly)
  // ----------------------------------------
  const updateQuantity = (product, value) => {
    let num = Number(value);
    if (isNaN(num) || num < 1) num = 1;
    if (num > product.stock) num = product.stock;

    setQuantities(prev => ({ ...prev, [product.id]: num }));
  };

  // ----------------------------------------
  // Handle input focus - clear initial value
  // ----------------------------------------
  const handleInputFocus = (productId) => {
    setInputFocused(prev => ({ ...prev, [productId]: true }));
    
    // Clear the initial "1" when user focuses on input for the first time
    if (quantities[productId] === 1) {
      setQuantities(prev => ({ ...prev, [productId]: "" }));
    }
  };

  // ----------------------------------------
  // Handle input blur - ensure valid value
  // ----------------------------------------
  const handleInputBlur = (productId, product) => {
    setInputFocused(prev => ({ ...prev, [productId]: false }));
    
    // If input is empty or invalid, set to minimum 1
    if (!quantities[productId] || quantities[productId] === "" || quantities[productId] < 1) {
      setQuantities(prev => ({ ...prev, [productId]: 1 }));
    }
  };

  // ----------------------------------------
  // Handle input change with better UX
  // ----------------------------------------
  const handleInputChange = (product, value) => {
    // Allow empty string for better UX while typing
    if (value === "") {
      setQuantities(prev => ({ ...prev, [product.id]: "" }));
      return;
    }

    let num = Number(value);
    if (isNaN(num)) {
      // If not a number, keep the string for display but don't update the actual quantity
      return;
    }

    // Apply bounds
    if (num < 1) num = 1;
    if (num > product.stock) num = product.stock;

    setQuantities(prev => ({ ...prev, [product.id]: num }));
  };

  // ----------------------------------------
  // Add to cart - DEBUGGING VERSION
  // ----------------------------------------
  const addToCart = async (product) => {
    if (!CUSTOMER_ID) {
      toast.error("Please log in as a customer first!");
      return;
    }

    // Validate IDs
    console.log("🛒 Add to Cart Debug:", {
      customerId: CUSTOMER_ID,
      productId: product.id,
      quantity: quantities[product.id],
      product: product.name
    });

    let qty = quantities[product.id] || 1;
    
    // Ensure quantity is valid number
    if (isNaN(qty) || qty < 1) {
      qty = 1;
      setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    }
    
    if (qty > product.stock) qty = product.stock;

    try {
      const payload = {
        product_id: product.id,
        quantity: qty
      };

      console.log("📦 Sending payload:", payload);
      console.log("🔗 URL will be:", `http://127.0.0.1:8000/api/cart/${CUSTOMER_ID}`);

      const response = await cartAPI.addItem(CUSTOMER_ID, payload);
      
      console.log("✅ Cart API Response:", response.data);
      toast.success("Added to cart!");
      setShowQtyBox(prev => ({ ...prev, [product.id]: true }));

    } catch (err) {
      console.error("❌ Cart Error Details:", {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });

      // Specific error handling
      if (err.code === 'ERR_NETWORK') {
        toast.error("Cannot connect to server. Check if backend is running.");
        
        // Fallback to localStorage
        console.log("🔄 Using localStorage fallback...");
        clientSideCart.addItem(product, qty);
        toast.success("Added to cart (offline mode)");
        setShowQtyBox(prev => ({ ...prev, [product.id]: true }));
        
      } else if (err.response?.status === 500) {
        toast.error("Server error. Check backend logs.");
      } else if (err.response?.status === 404) {
        toast.error("Cart service unavailable.");
      } else if (err.response?.status === 400) {
        toast.error(`Invalid request: ${err.response?.data?.detail || 'Check user ID'}`);
      } else {
        toast.error(`Failed to add to cart: ${err.response?.data?.detail || err.message}`);
      }
    }
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Blue bar to show icons clearly */}
      <div className="w-full h-16 bg-[#0d1b3d] shadow-md"></div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0d1b3d]">
            Welcome, {user?.name}!
          </h1>
          <p className="text-gray-600">Products available from your retailer</p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-[#0d1b3d]">
            Shop by Category
          </h2>

          <div className="flex gap-3 overflow-x-auto pb-2">
            <Badge
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className="cursor-pointer px-4 py-2"
            >
              All Products
            </Badge>

            {categories.map(c => (
              <Badge
                key={c.id}
                variant={selectedCategory === c.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(c.id)}
                className="cursor-pointer px-4 py-2"
              >
                {c.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Search + Price Filter */}
        <div className="mb-8 grid md:grid-cols-3 gap-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              fetchProducts();
            }}
            className="md:col-span-2"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Button className="bg-[#0d1b3d] text-white hover:bg-[#142853]">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="border-blue-400">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="under100">Under ₹100</SelectItem>
              <SelectItem value="100to500">₹100 - ₹500</SelectItem>
              <SelectItem value="500to1000">₹500 - ₹1000</SelectItem>
              <SelectItem value="1000to5000">₹1000 - ₹5000</SelectItem>
              <SelectItem value="above5000">Above ₹5000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* PRODUCT GRID */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            No products available from your retailer
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <Card key={product.id} className="hover:shadow-xl">
                <div onClick={() => navigate(`/product/${product.id}`)}>
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={product.image_url || "https://via.placeholder.com/300"}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <CardContent>
                    <h3 className="font-semibold text-[#0d1b3d]">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex justify-between my-2">
                      <span className="text-lg font-bold text-blue-600">
                        ₹{product.price}
                      </span>
                    </div>

                    {product.stock > 0 ? (
                      <Badge className="text-green-600" variant="outline">
                        In Stock: {product.stock}
                      </Badge>
                    ) : (
                      <Badge className="text-red-600" variant="outline">
                        Out of Stock
                      </Badge>
                    )}
                  </CardContent>
                </div>

                <CardFooter className="flex flex-col gap-3">
                  {/* Quantity box */}
                  {showQtyBox[product.id] && (
                    <div className="flex gap-3 items-center bg-gray-100 p-2 rounded-xl">
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={quantities[product.id] <= 1}
                        onClick={() =>
                          updateQuantity(product, quantities[product.id] - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <Input
                        type="number"
                        min={1}
                        max={product.stock}
                        value={quantities[product.id]}
                        onChange={e =>
                          handleInputChange(product, e.target.value)
                        }
                        onFocus={() => handleInputFocus(product.id)}
                        onBlur={() => handleInputBlur(product.id, product)}
                        className="w-16 text-center"
                        placeholder="1"
                      />

                      <Button
                        size="icon"
                        variant="outline"
                        disabled={quantities[product.id] >= product.stock}
                        onClick={() =>
                          updateQuantity(product, quantities[product.id] + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* ADD TO CART BUTTON */}
                  <Button
                    className="w-full bg-[#0d1b3d] text-white hover:bg-[#142853]"
                    disabled={product.stock === 0}
                    onClick={() => addToCart(product)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {showQtyBox[product.id]
                      ? `Update (${quantities[product.id] || 1})`
                      : "Add to Cart"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;