import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, IndianRupee, Home, LogOut } from "lucide-react";

import { productsAPI } from "@/api/api";

export default function RetailerDashboard() {
  const { user, retailerStats, loadRetailerStats } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // -------------------
  // LOAD DASHBOARD DATA
  // -------------------
  useEffect(() => {
    if (!user?.id) return;

    loadRetailerStats(user.id);
    loadProducts();
    connectWebSocket();
  }, [user]);

  // -------------------
  // LOAD PRODUCTS
  // -------------------
  const loadProducts = async () => {
    try {
      setLoading(true);

      const res = await productsAPI.getAll({ available_only: false });
      const all = res.data ?? res;

      const mine = Array.isArray(all)
        ? all.filter((p) => p.seller_id === user.id)
        : [];

      setProducts(mine);
    } catch (err) {
      console.error("Product load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // REALTIME WEBSOCKET
  // -------------------------------
  const connectWebSocket = () => {
    if (!user?.id) return;

    const base = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

    // Convert http → ws
    const wsUrl = base.replace("http://", "ws://").replace("https://", "wss://") + "/ws";

    console.log("Connecting WebSocket →", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WS OPEN");
      ws.send(JSON.stringify({ type: "subscribe", user_id: user.id }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("WS MESSAGE:", msg);

        if (msg.type === "new_order" && msg.sellers?.includes(user.id)) {
          console.log("🔔 New order received → refreshing stats");
          loadRetailerStats(user.id);
        }
      } catch (err) {
        console.error("WS PARSE ERROR:", err);
      }
    };

    ws.onclose = () => {
      console.log("WS CLOSED");
    };

    return () => ws.close();
  };

  // -------------------------------
  //   UI START
  // -------------------------------
  if (loading)
    return <div className="p-6 text-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b14] to-[#14141f] text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#e8e8f2]">
              Retailer Dashboard
            </h1>
            <p className="text-[#b8b8d4] mt-1">Welcome, {user?.name}!</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-[#6a8bff] text-[#6a8bff] hover:bg-[#262636]"
              onClick={() => (window.location.href = "/")}
            >
              <Home className="h-4 w-4 mr-1" /> Home
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/auth";
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>

        {/* BUY BUTTON */}
        <div className="flex justify-end mb-8">
          <Button
            onClick={() => (window.location.href = "/retailer/buy")}
            className="bg-[#6a8bff] text-white px-5 py-2 rounded-lg shadow-lg hover:bg-[#8198ff]"
          >
            <ShoppingCart className="h-4 w-4 mr-2" /> Buy From Wholesaler
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {/* PRODUCTS */}
          <Card className="bg-[#1e1e2f] border border-[#2a2a3d] shadow-xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#b8b8d4]">Products</p>
                <p className="text-3xl font-bold mt-1 text-[#e8e8f2]">
                  {products.length}
                </p>
              </div>
              <Package className="h-12 w-12 text-[#6a8bff]" />
            </CardContent>
          </Card>

          {/* ORDERS */}
          <Card className="bg-[#1e1e2f] border border-[#2a2a3d] shadow-xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#b8b8d4]">Customer Orders</p>
                <p className="text-3xl font-bold mt-1 text-[#e8e8f2]">
                  {retailerStats.orders}
                </p>
              </div>
              <ShoppingCart className="h-12 w-12 text-[#5cffbd]" />
            </CardContent>
          </Card>

          {/* REVENUE */}
          <Card className="bg-[#1e1e2f] border border-[#2a2a3d] shadow-xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#b8b8d4]">Total Revenue</p>
                <p className="text-3xl font-bold mt-1 text-[#e8e8f2]">
                  ₹{retailerStats.revenue}
                </p>
              </div>
              <IndianRupee className="h-12 w-12 text-[#c58bff]" />
            </CardContent>
          </Card>
        </div>

        {/* PRODUCT GRID */}
        <Card className="bg-[#1e1e2f] border border-[#2a2a3d] shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#e8e8f2]">
              Your Products
            </CardTitle>
          </CardHeader>

          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12 text-[#b8b8d4]">
                No products yet. Buy from wholesaler to add stock.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#262636] border border-[#2a2a3d] rounded-xl p-4 hover:shadow-xl transition"
                  >
                    <img
                      src={p.image_url || "https://via.placeholder.com/420x240"}
                      alt={p.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />

                    <h3 className="text-lg font-semibold text-[#e8e8f2]">
                      {p.name}
                    </h3>

                    <p className="text-[#b8b8d4] text-sm mt-1 line-clamp-2">
                      {p.description}
                    </p>

                    <div className="flex justify-between items-center mt-4">
                      <span className="text-[#6a8bff] font-bold text-lg">
                        ₹{Number(p.price).toFixed(2)}
                      </span>

                      <span className="px-2 py-1 text-sm rounded bg-[#1e1e2f] border border-[#2a2a3d] text-white">
                        Stock: {p.stock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
