import React from 'react';
import { useQuery } from 'react-query';
import { dashboardAPI } from '../services/api';
import { formatCurrency, getRelativeTime } from '../utils/helpers';
import {
  TruckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { data: metrics, isLoading, error } = useQuery(
    'dashboard-metrics',
    dashboardAPI.getMetrics,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 2 * 60 * 1000, // 2 minutes
    }
  );

  const { data: activity } = useQuery(
    'dashboard-activity',
    dashboardAPI.getRecentActivity,
    {
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    );
  }

  const data = metrics?.data;
  const recentActivity = activity?.data?.activities || [];

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-1 text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <TrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your milk delivery business</p>
      </div>

      {/* Today's Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Deliveries"
            value={data?.today?.total_deliveries || 0}
            icon={TruckIcon}
            color="blue"
          />
          <MetricCard
            title="Litres Delivered"
            value={`${(data?.today?.total_litres || 0).toFixed(1)} L`}
            icon={TruckIcon}
            color="green"
          />
          <MetricCard
            title="Revenue"
            value={formatCurrency(data?.today?.total_value || 0)}
            icon={CurrencyDollarIcon}
            color="yellow"
          />
          <MetricCard
            title="Payments Received"
            value={formatCurrency(data?.today?.total_payments || 0)}
            icon={CurrencyDollarIcon}
            color="green"
          />
        </div>
      </div>

      {/* Business Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outstanding Balance */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Active Customers</p>
                <p className="text-xl font-bold text-gray-900">
                  {data?.active_customers || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Outstanding Total</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(data?.outstanding_total || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">New Customers</p>
                <p className="text-xl font-bold text-green-600">
                  {data?.today?.new_customers || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unmatched Payments</p>
                <p className="text-xl font-bold text-red-600">
                  {data?.unmatched_payments || 0}
                </p>
              </div>
            </div>

            {/* Weekly Comparison */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">This Week vs Today</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Deliveries</span>
                  <div className="text-right">
                    <span className="font-medium">{data?.today?.total_deliveries || 0}</span>
                    <span className="text-gray-500 mx-2">/</span>
                    <span className="text-gray-500">{data?.this_week?.total_deliveries || 0}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Litres</span>
                  <div className="text-right">
                    <span className="font-medium">{(data?.today?.total_litres || 0).toFixed(1)}L</span>
                    <span className="text-gray-500 mx-2">/</span>
                    <span className="text-gray-500">{(data?.this_week?.total_litres || 0).toFixed(1)}L</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Value</span>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(data?.today?.total_value || 0)}</span>
                    <span className="text-gray-500 mx-2">/</span>
                    <span className="text-gray-500">{formatCurrency(data?.this_week?.total_value || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h3>
            <div className="space-y-3">
              {(data?.unmatched_payments || 0) > 0 && (
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {data?.unmatched_payments} Unmatched Payment{data?.unmatched_payments > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-red-600">
                      Requires manual reconciliation
                    </p>
                  </div>
                </div>
              )}
              
              {(data?.outstanding_total || 0) > 50000 && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      High Outstanding Balance
                    </p>
                    <p className="text-xs text-yellow-600">
                      {formatCurrency(data?.outstanding_total)} total owed
                    </p>
                  </div>
                </div>
              )}

              {data?.today?.total_deliveries === 0 && (
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <TruckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      No Deliveries Today
                    </p>
                    <p className="text-xs text-blue-600">
                      Check with delivery agents
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="card">
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      activity.activity_type === 'delivery' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {activity.activity_type === 'delivery' ? (
                        <TruckIcon className="h-4 w-4 text-blue-600" />
                      ) : (
                        <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.activity_type === 'delivery' ? 'Delivery' : 'Payment'} - {activity.customer_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.delivery_agent_name} • {getRelativeTime(activity.delivery_timestamp || activity.payment_timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.activity_type === 'delivery' ? `${activity.litres}L` : formatCurrency(activity.total_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(activity.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
