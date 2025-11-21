import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { categoriesAPI } from '@/api/api';

import { Store, ArrowRight, ShoppingBag, Package, Users } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === "customer") navigate("/customer/dashboard");
      if (user.role === "retailer") navigate("/retailer/dashboard");
      if (user.role === "wholesaler") navigate("/wholesaler/dashboard");
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* NAVBAR */}
      <nav className="backdrop-blur-md bg-black/40 sticky top-0 border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-8 w-8 text-purple-500 drop-shadow-[0_0_10px_#a855f7]" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Live MART
            </span>
          </div>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => navigate("/auth")}
            >
              Login
            </Button>

            <Button
              className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/40"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]">
            The Future of Online Delivery
          </h1>

          <p className="text-gray-300 mt-6 max-w-2xl mx-auto text-lg">
            Customers • Retailers • Wholesalers — all connected in a seamless futuristic marketplace.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 shadow-[0_0_15px_#a855f7]"
              onClick={() => navigate('/auth')}
            >
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white backdrop-blur-lg"
              onClick={() => navigate('/auth')}
            >
              Become a Seller
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-gradient-to-b from-black to-purple-900/20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Why Choose Us?
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            {[{
              icon: <ShoppingBag className="h-12 w-12 text-purple-400" />,
              title: "Customers",
              desc: "Shop thousands of products with lightning-fast delivery.",
            },
            {
              icon: <Package className="h-12 w-12 text-pink-400" />,
              title: "Retailers",
              desc: "Manage inventory, orders, and supply with ease.",
            },
            {
              icon: <Users className="h-12 w-12 text-blue-400" />,
              title: "Wholesalers",
              desc: "Sell in bulk and expand your distribution rapidly.",
            }].map((f, i) => (
              <Card
                key={i}
                className="bg-black/40 border-white/10 hover:border-purple-500 transition-all hover:shadow-[0_0_25px_#a855f7]"
              >
                <CardContent className="text-center py-10">
                  {f.icon}
                  <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
                  <p className="text-gray-400 mt-2">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-8 text-center border-t border-white/10">
        <p className="text-gray-400">&copy; 2025 Live MART</p>
      </footer>
    </div>
  );
};

export default LandingPage;
