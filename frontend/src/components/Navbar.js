import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Store, ShoppingCart, User, LogOut, Package } from 'lucide-react';
import { cartAPI } from '@/api/api';
import { useEffect } from 'react';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchCartCount();
    }
  }, [user]);

  const fetchCartCount = async () => {
    try {
      const response = await cartAPI.getCart(user.id);
      setCartCount(response.data.length);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDashboard = () => {
    if (user.role === 'customer') navigate('/customer/dashboard');
    else if (user.role === 'retailer') navigate('/retailer/dashboard');
    else if (user.role === 'wholesaler') navigate('/wholesaler/dashboard');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={handleDashboard}
            data-testid="logo"
          >
            <Store className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">Live MART</span>
          </div>

          <div className="flex items-center space-x-4">
            {user?.role === 'customer' && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/cart')}
                data-testid="cart-button"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            )}

            {(user?.role === 'retailer' || user?.role === 'wholesaler' || user?.role === 'customer') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/orders')}
                data-testid="orders-button"
              >
                <Package className="h-5 w-5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="user-menu-button">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDashboard} data-testid="dashboard-menu-item">
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/orders')} data-testid="orders-menu-item">
                  Orders
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="logout-menu-item">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;