// File: WholesalerDashboard.jsx
// Original path: /mnt/data/WholesalerDashboard.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  ShoppingCart,
  Package,
  IndianRupee,
  Home,
  LogOut,
  Plus,
} from "lucide-react";

import { productsAPI, categoriesAPI } from "@/api/api";
import { toast } from "sonner";

export default function WholesalerDashboard() {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    products_count: 0,
    orders_count: 0,
    total_revenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    price: "",
    stock: "",
    image_url: "",
    unit: "piece",
  });

  const userId = user?.id;

  // LOAD DATA
  useEffect(() => {
    if (!userId) return;
    loadDashboardData();
  }, [userId]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const [prodRes, catRes] = await Promise.all([
        productsAPI.getAll({ available_only: false }),
        categoriesAPI.getAll(),
      ]);

      const allProducts = prodRes.data ?? prodRes;
      const mine = Array.isArray(allProducts) ? allProducts.filter((p) => p.seller_id === userId) : [];

      setProducts(mine);
      setCategories(catRes.data ?? []);

      await loadStats(mine.length);
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats(localCount) {
    try {
      const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const url = `${API_BASE}/api/dashboard/wholesaler?user_id=${userId}`;

      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();

      setStats({
        products_count: localCount,
        orders_count: data.orders_count ?? 0,
        total_revenue: data.total_revenue ?? 0,
      });
    } catch (err) {
      console.warn("Stats load failed:", err);
    }
  }

  // SAVE PRODUCT
  async function saveProduct(e) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        seller_id: userId,
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, payload);
        toast.success("Product updated!");
      } else {
        await productsAPI.create(payload);
        toast.success("Product added!");
      }

      setDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      loadDashboardData();
    } catch (err) {
      console.error("Save product error:", err);
      toast.error("Failed to save product");
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      category_id: "",
      price: "",
      stock: "",
      image_url: "",
      unit: "piece",
    });
  }

  function startEdit(p) {
    setEditingProduct(p);
    setFormData({
      name: p.name || "",
      description: p.description || "",
      category_id: p.category_id || "",
      price: p.price ?? "",
      stock: p.stock ?? "",
      image_url: p.image_url || "",
      unit: p.unit || "piece",
    });
    setDialogOpen(true);
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete product?")) return;
    try {
      await productsAPI.delete(id);
      toast.success("Deleted!");
      loadDashboardData();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Delete failed");
    }
  }

  if (loading) return <div className="p-6 text-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b14] to-[#14141f] text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#e8e8f2]">Wholesaler Dashboard</h1>
            <p className="text-[#b8b8d4] mt-1">Welcome, {user?.name}!</p>
          </div>

          {/* HOME + LOGOUT buttons */}
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

        {/* ADD PRODUCT BUTTON (Top-right) + DIALOG */}
        <div className="flex justify-end mb-8">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#6a8bff] text-white px-5 py-2 rounded-lg shadow-lg hover:bg-[#8198ff]"
                onClick={() => {
                  resetForm();
                  setEditingProduct(null);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-[#1e1e2f] border border-[#2a2a3d] text-white max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              </DialogHeader>

              <form className="space-y-4" onSubmit={saveProduct}>
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    required
                    className="bg-[#262636] border border-[#2a2a3d] text-white"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows={3}
                    className="bg-[#262636] border border-[#2a2a3d] text-white"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger className="bg-[#262636] text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e2f] border border-[#2a2a3d] text-white">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      required
                      className="bg-[#262636] border border-[#2a2a3d] text-white"
                    />
                  </div>

                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="0"
                      required
                      className="bg-[#262636] border border-[#2a2a3d] text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="bg-[#262636] border border-[#2a2a3d] text-white"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-500 text-gray-300"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" className="bg-[#6a8bff] text-white">
                    {editingProduct ? "Update Product" : "Create Product"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <Card className="bg-[#1e1e2f] border border-[#2a2a3d] shadow-xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#b8b8d4]">Total Products</p>
                <p className="text-3xl font-bold mt-1 text-[#e8e8f2]">{stats.products_count}</p>
              </div>
              <Package className="h-12 w-12 text-[#6a8bff]" />
            </CardContent>
          </Card>

          <Card className="bg-[#1e12e1e2f] border border-[#2a2a3d] shadow-xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#b8b8d4]">Total Orders</p>
                <p className="text-3xl font-bold mt-1 text-[#e8e8f2]">{stats.orders_count}</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-[#5cffbd]" />
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e2f] border border-[#2a2a3d] shadow-xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#b8b8d4]">Total Revenue</p>
                <p className="text-3xl font-bold mt-1 text-[#e8e8f2]">₹{stats.total_revenue}</p>
              </div>
              <IndianRupee className="h-12 w-12 text-[#c58bff]" />
            </CardContent>
          </Card>
        </div>

        {/* PRODUCT GRID */}
        <Card className="bg-[#1e1e2f] border border-[#2a2a3d] shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#e8e8f2]">Your Products</CardTitle>
          </CardHeader>

          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12 text-[#b8b8d4]">No products yet. Click “Add Product” above.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((p) => (
                  <div key={p.id} className="bg-[#262636] border border-[#2a2a3d] rounded-xl p-4 hover:shadow-xl transition">
                    <img src={p.image_url || "https://via.placeholder.com/420x240"} className="w-full h-48 object-cover rounded-lg mb-4" alt={p.name} />

                    <h3 className="text-lg font-semibold text-[#e8e8f2]">{p.name}</h3>

                    <p className="text-[#b8b8d4] text-sm mt-1 line-clamp-2">{p.description}</p>

                    <div className="flex justify-between items-center mt-4">
                      <span className="text-[#6a8bff] font-bold text-lg">₹{p.price}</span>

                      <span className="px-2 py-1 text-sm rounded bg-[#1e1e2f] border border-[#2a2a3d] text-white">Stock: {p.stock}</span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 border-[#6a8bff] text-[#6a8bff]" onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProduct(p.id)}>
                        Delete
                      </Button>
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
