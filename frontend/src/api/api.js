// api.js
import axios from "axios";

// -------------------------------------
// BASE URL
// -------------------------------------

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API_URL = `${BACKEND_URL}/api`;
console.log("Loaded BACKEND_URL =", process.env.REACT_APP_BACKEND_URL);
console.log("FINAL API_URL =", API_URL);

// -------------------------------------
// AXIOS INSTANCE WITH ERROR HANDLING
// -------------------------------------
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data);
    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("❌ Response error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.code === 'ERR_NETWORK') {
      console.error("Network error - check if backend is running on", API_URL);
    }
    
    return Promise.reject(error);
  }
);

// ======================================================
// ⭐ HEALTH CHECK API
// ======================================================
export const healthAPI = {
  check: () => api.get(`/health`),
  testCart: (userId) => api.get(`/test-cart/${userId}`),
};

// ======================================================
// ⭐ AUTH API
// ======================================================
export const authAPI = {
  register: (data) => api.post(`/auth/register`, data),
  login: (data) => api.post(`/auth/login`, data),
};

// ======================================================
// ⭐ CATEGORIES API
// ======================================================
export const categoriesAPI = {
  getAll: () => api.get(`/categories`),
  create: (data) => api.post(`/categories`, data),
};

// ======================================================
// ⭐ PRODUCTS API
// ======================================================
export const productsAPI = {
  // GET with filters
  getAll: (params) => api.get(`/products`, { params }),

  // GET by ID
  getById: (id) => {
  if (!id || id === "undefined") {
    console.error("❌ productsAPI.getById called with INVALID ID:", id);
    return Promise.reject("Invalid product ID");
  }
  return api.get(`/products/${id}`);
},


  // GET retailer products only
  getByRetailer: (retailerId) =>
    api.get(`/products`, {
      params: {
        seller_id: retailerId,
        available_only: true,
      },
    }),

  create: (data) => api.post(`/products`, data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// ======================================================
// ⭐ CART API - FIXED VERSION
// ======================================================
export const cartAPI = {
  getCart: (userId) => api.get(`/cart/${userId}`),

  addItem: (userId, data) => api.post(`/cart/${userId}`, data),

  // FIXED: Use query parameter correctly
  updateItem: (userId, productId, quantity) =>
    api.put(`/cart/${userId}/${productId}?quantity=${quantity}`),

  removeItem: (userId, productId) =>
    api.delete(`/cart/${userId}/${productId}`),

  clearCart: (userId) => api.delete(`/cart/${userId}`),
};

// ======================================================
// ⭐ ORDERS API
// ======================================================
// ======================================================
// ⭐ ORDERS API
// ======================================================
// ======================================================
// ⭐ ORDERS API - ADD THIS METHOD
// ======================================================
export const ordersAPI = {
  getAll: () => api.get(`/orders`), // ADD THIS LINE
  create: (userId, payload) => api.post(`/orders/${userId}`, payload),
  getUserOrders: (userId) => api.get(`/orders/${userId}`),
  getOrderDetail: (orderId) => api.get(`/orders/detail/${orderId}`),
};

// ======================================================
// ⭐ FEEDBACK API
// ======================================================
export const feedbackAPI = {
  create: (userId, data) => api.post(`/feedback/${userId}`, data),
  getProductFeedback: (productId) => api.get(`/feedback/product/${productId}`),
};

// ======================================================
// ⭐ SHOPS API
// ======================================================
export const shopsAPI = {
  getNearby: (lat, lng, radius) =>
    api.get(`/shops`, {
      params: { lat, lng, radius },
    }),
};
// ======================================================
// ⭐ PURCHASE API (ADD THIS TO YOUR api.js)
// ======================================================
export const purchaseAPI = {
  fromWholesaler: (payload) => api.post(`/purchase/from-wholesaler`, payload),
  confirm: (payload) => api.post(`/purchase/confirm`, payload),
  test: () => api.get(`/purchase/test`),
};

// ======================================================
// ⭐ DASHBOARD API
// ======================================================
// ======================================================
// ⭐ DASHBOARD API - FIXED VERSION
// ======================================================
// ======================================================
// ⭐ DASHBOARD API - FIXED VERSION
// ======================================================
// ======================================================
// ⭐ DASHBOARD API - FIXED VERSION
// ======================================================
export const dashboardAPI = {
  getRetailerDashboard: (userId) =>
    api.get(`/dashboard/retailer?user_id=${userId}`),

  getWholesalerDashboard: (userId) =>
    api.get(`/dashboard/wholesaler?user_id=${userId}`),
    
  // ADD THIS METHOD that's missing
  getWholesalerStats: (userId) => 
    api.get(`/dashboard/wholesaler?user_id=${userId}`)
};

// ======================================================
// ⭐ SEED DATA API
// ======================================================
export const seedDataAPI = {
  seed: () => api.post(`/seed-data`),
};

export default api;