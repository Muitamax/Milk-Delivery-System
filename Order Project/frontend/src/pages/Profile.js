import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';
import {
  UserIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Your account information and settings</p>
      </div>

      {/* User Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
        
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
            <UserIcon className="h-10 w-10 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
            <p className="text-gray-600 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              value={user.name}
              readOnly
              className="form-input bg-gray-50"
            />
          </div>
          <div>
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              value={user.phone}
              readOnly
              className="form-input bg-gray-50"
            />
          </div>
          {user.email && (
            <div className="md:col-span-2">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="form-input bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Role Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Role & Permissions</h2>
        
        <div className="flex items-start space-x-3">
          <ShieldCheckIcon className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-medium text-gray-900 capitalize">
              {user.role.replace('_', ' ')}
            </h3>
            <div className="mt-2 text-sm text-gray-600">
              {user.role === 'admin' ? (
                <div>
                  <p>As an administrator, you have full access to:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Customer management</li>
                    <li>Payment reconciliation</li>
                    <li>Transaction history</li>
                    <li>User management</li>
                    <li>System settings</li>
                    <li>Reports and analytics</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p>As a delivery agent, you have access to:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Create new deliveries</li>
                    <li>View customer information</li>
                    <li>Generate receipts</li>
                    <li>View your delivery history</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Last Login</p>
              <p className="text-sm font-medium text-gray-900">Just now</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">User ID</p>
              <p className="text-sm font-medium text-gray-900">{user.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        
        <div className="space-y-3">
          <button className="w-full btn btn-secondary flex items-center justify-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            View Activity History
          </button>
          
          <button className="w-full btn btn-secondary flex items-center justify-center">
            <ShieldCheckIcon className="h-5 w-5 mr-2" />
            Security Settings
          </button>
          
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full btn btn-danger flex items-center justify-center"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign Out?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="btn btn-danger flex-1"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
