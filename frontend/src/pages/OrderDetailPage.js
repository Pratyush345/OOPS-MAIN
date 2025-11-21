import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ordersAPI } from '@/api/api';
import { toast } from 'sonner';
import { MapPin, CreditCard, ArrowLeft } from 'lucide-react';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await ordersAPI.getOrderDetail(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Order not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED — removed PACKED step
  const getStatusSteps = () => {
    const steps = [
      { key: 'placed', label: 'Order Placed' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'shipped', label: 'Shipped' },
      { key: 'delivered', label: 'Delivered' },
    ];

    const statusIndex = steps.findIndex(s => s.key === order.order_status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= statusIndex,
      current: index === statusIndex,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p>Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gray-50" data-testid="order-detail-page">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/orders')}
          className="mb-6"
          data-testid="back-to-orders-btn"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ================= ORDER DETAILS ================= */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">
                      Order #{order.id.substring(0, 8)}
                    </h1>

                    <p className="text-gray-600">
                      Placed on{' '}
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <Badge
                    className={
                      order.order_status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }
                  >
                    <span className="capitalize">{order.order_status}</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* ================= ORDER TRACKING ================= */}
            <Card>
              <CardHeader>
                <CardTitle>Order Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusSteps.map((step, index) => (
                    <div key={step.key} className="flex items-center">
                      <div className="flex flex-col items-center mr-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            step.completed
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {step.completed ? '✓' : index + 1}
                        </div>

                        {index < statusSteps.length - 1 && (
                          <div
                            className={`w-0.5 h-8 ${
                              step.completed ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        )}
                      </div>
                      <p
                        className={`font-semibold ${
                          step.current
                            ? 'text-blue-600'
                            : step.completed
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ================= ORDER ITEMS ================= */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => {
                    const itemTotal = (item.price * item.quantity).toFixed(2);

                    return (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-semibold">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            ₹{item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>

                        <p className="font-semibold">
                          ₹{itemTotal}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ================= PRICE SUMMARY + DELIVERY ================= */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-20">

              {/* Price Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{order.total_amount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="text-green-600">FREE</span>
                  </div>

                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>₹{order.total_amount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-2 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Delivery Address</p>
                      <p className="text-sm text-gray-600">{order.delivery_address}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Payment Method</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {order.payment_method}
                      </p>
                      <Badge variant="outline" className="mt-1 text-green-600">
                        Paid
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
