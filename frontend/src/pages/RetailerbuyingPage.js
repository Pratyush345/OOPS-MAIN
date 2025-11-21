import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { productsAPI } from "@/api/api";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RetailerBuyingPage() {
  const { user } = useAuth();
  const [whProducts, setWhProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [markup, setMarkup] = useState(20);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await productsAPI.getAll({ available_only: true });
      const all = res.data ?? res;

      setWhProducts(all.filter((p) => p.seller_id !== user.id));
    } catch (err) {
      toast.error("Failed to load wholesaler products");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPurchase() {
  if (!selected) return toast.error("Select a product");

  const payload = {
    wholesaler_id: selected.seller_id,
    product_id: selected.id,
    retailer_id: user.id,
    quantity: Number(qty),
    markup_percent: Number(markup),
  };

  console.log("🛒 Sending purchase payload:", payload);
  console.log("🔗 Full URL:", "http://127.0.0.1:8000/api/purchase/from-wholesaler");

  try {
    // Add more detailed request info
    const requestDetails = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    };
    
    console.log("📤 Request details:", requestDetails);

    const resp = await fetch("http://127.0.0.1:8000/api/purchase/from-wholesaler", requestDetails);

    console.log("📡 Response received:");
    console.log("   Status:", resp.status);
    console.log("   Status Text:", resp.statusText);
    console.log("   Headers:", Object.fromEntries(resp.headers.entries()));
    console.log("   OK:", resp.ok);
    console.log("   Redirected:", resp.redirected);
    console.log("   Type:", resp.type);

    // Check if it's a CORS preflight issue
    if (resp.status === 405 && resp.type === 'opaque') {
      console.warn("⚠️ Possible CORS preflight issue");
    }

    const responseText = await resp.text();
    console.log("📄 Response body:", responseText);

    if (!resp.ok) {
      // Try to parse as JSON for better error message
      let errorMessage = `HTTP ${resp.status}: `;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage += errorData.detail || responseText;
      } catch {
        errorMessage += responseText;
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log("✅ Purchase successful:", result);
    
    toast.success(result.message || "Purchase successful!");

    setSelected(null);
    setQty(1);
    setMarkup(20);
    load();

    setTimeout(() => {
      window.location.href = "/retailer/dashboard";
    }, 1000);

  } catch (err) {
    console.error("❌ Purchase error details:", {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    
    // More specific error handling
    if (err.message.includes("405")) {
      toast.error("Server rejected POST method - check CORS configuration");
    } else if (err.message.includes("CORS")) {
      toast.error("CORS blocked the request - check server CORS settings");
    } else if (err.message.includes("Network Error")) {
      toast.error("Network error - check if server is running");
    } else {
      toast.error(err.message || "Purchase failed ⚠");
    }
  }
}

  // Test endpoint function - add this for debugging
  async function testEndpoint() {
    try {
      console.log("🧪 Testing purchase endpoint...");
      const testResp = await fetch("http://127.0.0.1:8000/api/purchase/test");
      const testData = await testResp.json();
      console.log("🧪 Endpoint test result:", testData);
      toast.success("Endpoint test successful!");
    } catch (err) {
      console.error("🧪 Endpoint test failed:", err);
      toast.error("Endpoint test failed - check server");
    }
  }

  if (loading)
    return <div className="text-center text-white p-10">Loading products…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0C0C15] to-[#161624] text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">
            Buy from Wholesaler
          </h1>
          <Button 
            onClick={testEndpoint}
            variant="outline" 
            className="border-[#6A8BFF] text-[#6A8BFF]"
          >
            Test Connection
          </Button>
        </div>

        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {whProducts.map((p) => (
            <Card
              key={p.id}
              className="p-4 bg-[#1C1C2B] border border-[#28283E] rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer"
            >
              <CardContent>
                {/* IMAGE */}
                <img
                  src={p.image_url || "https://via.placeholder.com/420x280"}
                  alt={p.name}
                  className="w-full h-44 object-cover rounded-xl mb-4 border border-[#33334a]"
                />

                <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{p.description}</p>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-[#6A8BFF] font-bold text-lg">
                    ₹{p.price}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#2d2d40] border border-[#3a3a52]">
                    Stock: {p.stock}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1 bg-[#6A8BFF] hover:bg-[#5876e6]"
                    onClick={() => setSelected(p)}
                  >
                    Select
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-600 text-gray-400"
                    onClick={() => {
                      console.log("🔍 Product details:", p);
                      toast.info(`Seller: ${p.seller_id}`);
                    }}
                  >
                    ℹ️
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {whProducts.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-20">
            <p className="text-lg">No wholesaler products available</p>
            <p className="text-sm mt-2">Try running /api/seed-data on your server</p>
          </div>
        )}

        {/* MODAL */}
        {selected && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="bg-[#1E1E2F] border border-[#2A2A3D] p-6 rounded-2xl w-[90%] max-w-lg shadow-2xl">

              <h2 className="text-2xl font-bold text-white">
                Buying: {selected.name}
              </h2>
              
              <div className="text-sm text-gray-400 mt-1">
                From: {selected.seller_id}
              </div>

              {/* IMAGE */}
              <img
                src={selected.image_url || "https://via.placeholder.com/420x280"}
                className="w-full h-48 object-cover rounded-xl mt-4 mb-4 border border-[#33334a]"
              />

              <div className="text-gray-300 mb-4">{selected.description}</div>

              {/* PRODUCT INFO */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-400">Wholesale Price:</span>
                  <div className="text-white font-semibold">₹{selected.price}</div>
                </div>
                <div>
                  <span className="text-gray-400">Available Stock:</span>
                  <div className="text-white font-semibold">{selected.stock}</div>
                </div>
              </div>

              {/* INPUT FIELDS */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300">Quantity</label>
                  <Input
                    type="number"
                    value={qty}
                    min={1}
                    max={selected.stock}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="bg-[#2A2A40] text-white border border-[#3C3C55]"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Max: {selected.stock} units available
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-300">Markup %</label>
                  <Input
                    type="number"
                    value={markup}
                    min={0}
                    max={100}
                    onChange={(e) => setMarkup(Number(e.target.value))}
                    className="bg-[#2A2A40] text-white border border-[#3C3C55]"
                  />
                </div>

                <div className="p-3 bg-[#2A2A40] rounded-lg border border-[#3C3C55]">
                  <label className="text-sm text-gray-300">Retail Price Calculation</label>
                  <div className="text-lg font-bold text-white mt-2">
                    ₹{(selected.price * (1 + markup / 100)).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    (₹{selected.price} + {markup}% markup)
                  </div>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  className="border-[#6A8BFF] text-[#6A8BFF]"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#6A8BFF] hover:bg-[#5876e6]"
                  onClick={confirmPurchase}
                  disabled={qty > selected.stock}
                >
                  {qty > selected.stock ? "Insufficient Stock" : "Confirm Purchase"}
                </Button>
              </div>

              {qty > selected.stock && (
                <div className="text-red-400 text-sm mt-2 text-center">
                  Cannot order more than available stock
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}