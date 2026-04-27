import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  TruckIcon,
  UsersIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CogIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      name: 'Delivery',
      path: '/delivery',
      icon: TruckIcon,
      roles: ['delivery_agent', 'admin']
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: HomeIcon,
      roles: ['admin']
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: UsersIcon,
      roles: ['admin']
    },
    {
      name: 'Payments',
      path: '/payments',
      icon: CreditCardIcon,
      roles: ['admin']
    },
    {
      name: 'Transactions',
      path: '/transactions',
      icon: DocumentTextIcon,
      roles: ['admin']
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: CogIcon,
      roles: ['admin']
    }
  ].filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-lg font-semibold text-gray-900">
                {user?.role === 'admin' ? 'Admin Panel' : 'Milk Delivery'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              
              <button
                onClick={() => navigate('/profile')}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <UserIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav md:hidden">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:w-64 md:bg-white md:border-r md:border-gray-200 md:z-30">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Milk Delivery</h2>
            <p className="text-sm text-gray-500">Kenyan Distributor System</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Content Area */}
      <div className="hidden md:block md:pl-64">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
