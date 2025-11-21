import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShoppingCart, Store, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Check backend connection first
  useEffect(() => {
    checkBackendConnection();
  }, []);

  useEffect(() => {
    if (!id) {
      toast.error("Product not found");
      navigate("/customer/dashboard");
      return;
    }

    if (backendOnline) {
      loadProduct();
    }
  }, [id, backendOnline]);

  const checkBackendConnection = async () => {
    try {
      console.log("🔍 Checking backend connection...");
      const response = await fetch('http://127.0.0.1:8000/api/health');
      if (response.ok) {
        console.log("✅ Backend is online");
        setBackendOnline(true);
      } else {
        console.log("❌ Backend returned error status");
        setBackendOnline(false);
      }
    } catch (error) {
      console.error("❌ Backend connection failed:", error);
      setBackendOnline(false);
      toast.error("Backend server is not running. Please start the server.");
    }
  };

  const loadProduct = async () => {
    try {
      console.log("🔄 Loading product:", id);
      
      const response = await fetch(`http://127.0.0.1:8000/api/products/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load product: ${response.status}`);
      }
      
      const productData = await response.json();
      console.log("✅ Product loaded:", productData);
      
      // Ensure numeric values
      productData.price = Number(productData.price) || 0;
      productData.stock = Number(productData.stock) || 0;
      productData.rating = Number(productData.rating) || 0;
      
      setProduct(productData);
      setFeedback([]); // Empty feedback for now
    } catch (error) {
      console.error("❌ Load error:", error);
      toast.error("Failed to load product. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!user) {
      toast.error("Please login to add to cart");
      return;
    }

    if (!backendOnline) {
      toast.error("Backend server is offline");
      return;
    }

    try {
      console.log(`🛒 Adding to cart: ${product.id}, quantity: ${quantity}`);
      
      const response = await fetch(`http://127.0.0.1:8000/api/cart/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cart error response:", errorText);
        throw new Error('Failed to add to cart');
      }

      const result = await response.json();
      console.log("✅ Cart response:", result);
      toast.success("Added to cart!");
    } catch (error) {
      console.error("❌ Cart error:", error);
      toast.error("Failed to add to cart. Please try again.");
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to submit feedback");
      return;
    }

    if (!backendOnline) {
      toast.error("Backend server is offline");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmittingFeedback(true);

    try {
      console.log(`📝 Submitting feedback for product: ${id}`);
      
      const response = await fetch(`http://127.0.0.1:8000/api/feedback/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: id,
          rating: parseInt(rating),
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Feedback error response:", errorText);
        throw new Error('Failed to submit feedback');
      }

      const newFeedback = await response.json();
      console.log("✅ Feedback submitted:", newFeedback);
      
      toast.success("Feedback submitted successfully!");
      
      // Reset form
      setComment("");
      setRating("5");

      // Add to local state
      const userFeedback = {
        id: newFeedback.id || Date.now().toString(),
        user_name: user.name || "You",
        rating: parseInt(rating),
        comment: comment.trim(),
        created_at: new Date().toISOString()
      };

      setFeedback(prev => [userFeedback, ...prev]);

    } catch (error) {
      console.error("❌ Feedback submission error:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Render star rating component
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((num) => (
          <span
            key={num}
            className={`text-xl ${
              num <= Math.round(rating || 0)
                ? "text-yellow-400"
                : "text-gray-300"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Backend offline state
  if (!backendOnline) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md mx-auto">
              <h2 className="text-xl font-bold mb-2">Backend Server Offline</h2>
              <p className="mb-4">Please start your backend server to continue.</p>
              <div className="space-y-2 text-sm text-left mb-4">
                <p>💡 <strong>To fix this:</strong></p>
                <p>1. Open terminal in your backend folder</p>
                <p>2. Run: <code>uvicorn server:app --host 127.0.0.1 --port 8000 --reload</code></p>
                <p>3. Wait for "Uvicorn running on http://127.0.0.1:8000"</p>
                <p>4. Refresh this page</p>
              </div>
              <Button onClick={checkBackendConnection}>
                Check Connection Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
            <Button onClick={() => navigate("/customer/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="grid md:grid-cols-2 gap-10 mb-14">
          {/* Product Image */}
          <Card className="rounded-xl overflow-hidden">
            <img
              src={product.image_url || "https://via.placeholder.com/600"}
              alt={product.name}
              className="w-full h-96 object-cover"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/600x400/6B7280/FFFFFF?text=Image+Not+Found";
              }}
            />
          </Card>

          {/* Product Info */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">{product.name}</h1>

            <div className="flex items-center gap-2 text-gray-600">
              <Store className="h-4 w-4" />
              <span>Seller: {product.seller_id}</span>
            </div>

            {/* Rating - Clean layout */}
            <div className="flex items-center gap-3">
              {renderStars(product.rating)}
              <span className="text-gray-600">({feedback.length} reviews)</span>
            </div>

            <div className="text-3xl font-bold text-blue-600">
              ₹{product.price?.toFixed(2) || '0.00'}
            </div>

            <Badge className={product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : "Out of Stock"}
            </Badge>

            <p className="text-gray-700">{product.description}</p>

            {user?.role === "customer" && product.stock > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="text-xl font-semibold w-12 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </Button>
                </div>

                <Button onClick={addToCart} className="w-full py-3">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart - ₹{((product.price || 0) * quantity).toFixed(2)}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews ({feedback.length})</h2>

          {/* Add Review Form */}
          {user?.role === "customer" && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
                
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div>
                    <Label>Rating</Label>
                    <Select value={rating} onValueChange={setRating}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ Very Good</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ Good</SelectItem>
                        <SelectItem value="2">⭐⭐ Fair</SelectItem>
                        <SelectItem value="1">⭐ Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Your Review</Label>
                    <Textarea
                      placeholder="Share your experience with this product..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[100px]"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full py-3"
                    disabled={submittingFeedback || !comment.trim()}
                  >
                    {submittingFeedback ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {feedback.length === 0 ? (
              <Card className="text-center py-8">
                <div className="text-gray-500">
                  <span className="text-4xl">⭐</span>
                  <h3 className="text-xl font-semibold mb-2 mt-4">No Reviews Yet</h3>
                  <p className="text-lg">Be the first to review this product!</p>
                </div>
              </Card>
            ) : (
              feedback.map((review) => (
                <Card key={review.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-lg">
                        {review.user_name || "Anonymous User"}
                      </p>
                      <div className="flex items-center mt-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-gray-700 mt-4">
                      {review.comment}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;