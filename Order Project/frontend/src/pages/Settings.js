import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { dashboardAPI, smsAPI } from '../services/api';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  // Fetch system stats
  const { data: systemStats } = useQuery(
    'system-stats',
    async () => {
      const [metrics, smsStats] = await Promise.all([
        dashboardAPI.getMetrics(),
        smsAPI.getStats()
      ]);
      return { metrics: metrics.data, sms: smsStats.data };
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'reporting', name: 'Reporting', icon: ChartBarIcon },
    { id: 'mobile', name: 'Mobile', icon: DevicePhoneMobileIcon },
  ];

  const TabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings stats={systemStats} />;
      case 'notifications':
        return <NotificationSettings stats={systemStats} />;
      case 'security':
        return <SecuritySettings />;
      case 'reporting':
        return <ReportingSettings />;
      case 'mobile':
        return <MobileSettings />;
      default:
        return <GeneralSettings stats={systemStats} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your system preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <TabContent />
      </div>
    </div>
  );
};

// General Settings Component
const GeneralSettings = ({ stats }) => {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Active Customers</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.metrics?.active_customers || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Outstanding Total</p>
            <p className="text-2xl font-bold text-orange-600">
              KES {(stats?.metrics?.outstanding_total || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Today's Deliveries</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats?.metrics?.today?.total_deliveries || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">SMS Success Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.sms?.success_rate || 0}%
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Business Name</label>
            <input
              type="text"
              defaultValue="Milk Delivery Business"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Business Phone</label>
            <input
              type="tel"
              defaultValue="+254712345678"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">M-Pesa Paybill</label>
            <input
              type="text"
              defaultValue="123456"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Default Price per Litre</label>
            <input
              type="number"
              step="0.01"
              defaultValue="50.00"
              className="form-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings = ({ stats }) => {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">SMS Notifications</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Delivery Confirmations</h3>
              <p className="text-sm text-gray-500">Send SMS to customers after each delivery</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Payment Receipts</h3>
              <p className="text-sm text-gray-500">Send SMS when payments are received</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Balance Reminders</h3>
              <p className="text-sm text-gray-500">Send weekly balance reminders to customers</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">SMS Statistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Sent</p>
            <p className="text-xl font-bold text-gray-900">
              {stats?.sms?.total_sent || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Successful</p>
            <p className="text-xl font-bold text-green-600">
              {stats?.sms?.successful || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-xl font-bold text-red-600">
              {stats?.sms?.failed || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Success Rate</p>
            <p className="text-xl font-bold text-blue-600">
              {stats?.sms?.success_rate || 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Security Settings Component
const SecuritySettings = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Policies</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Require Strong Passwords</h3>
              <p className="text-sm text-gray-500">Enforce minimum password complexity</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Session Timeout</h3>
              <p className="text-sm text-gray-500">Automatically log out after inactivity</p>
            </div>
            <select className="form-input max-w-xs">
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
              <option>8 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500">Require 2FA for admin users</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reporting Settings Component
const ReportingSettings = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Generation</h2>
        
        <div className="space-y-4">
          <div>
            <label className="form-label">Default Report Period</label>
            <select className="form-input">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This month</option>
              <option>Last month</option>
              <option>This year</option>
            </select>
          </div>

          <div>
            <label className="form-label">Export Format</label>
            <select className="form-input">
              <option>CSV</option>
              <option>Excel</option>
              <option>PDF</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Auto-generate Monthly Reports</h3>
              <p className="text-sm text-gray-500">Send monthly business reports via email</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Settings Component
const MobileSettings = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mobile App Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Offline Mode</h3>
              <p className="text-sm text-gray-500">Allow deliveries without internet connection</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6"></span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">GPS Location</h3>
              <p className="text-sm text-gray-500">Capture location with each delivery</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Customer Signatures</h3>
              <p className="text-sm text-gray-500">Require customer signature on delivery</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
            </button>
          </div>

          <div>
            <label className="form-label">Default Map View</label>
            <select className="form-input">
              <option>Satellite</option>
              <option>Street Map</option>
              <option>Terrain</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
