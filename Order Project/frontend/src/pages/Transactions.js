import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { transactionAPI, customerAPI } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClasses } from '../utils/helpers';
import {
  MagnifyingGlassIcon,
  UserIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const Transactions = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    type: '',
    customer_id: '',
    date_from: '',
    date_to: ''
  });
  const [showCustomerFilter, setShowCustomerFilter] = useState(false);

  // Fetch transactions
  const { data, isLoading, error } = useQuery(
    ['transactions', filters],
    () => transactionAPI.getAll(filters),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      keepPreviousData: true,
    }
  );

  // Fetch customers for filter
  const { data: customers } = useQuery(
    'customers-for-filter',
    () => customerAPI.getAll({ limit: 1000 }),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const transactions = data?.data?.transactions || [];
  const pagination = data?.data?.pagination || {};
  const customerList = customers?.data?.customers || [];

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'delivery':
        return <ArrowUpIcon className="h-4 w-4 text-blue-600" />;
      case 'payment':
        return <ArrowDownIcon className="h-4 w-4 text-green-600" />;
      case 'adjustment':
        return <AdjustmentsHorizontalIcon className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getAmountColor = (type, amount) => {
    if (type === 'delivery') return 'text-blue-600';
    if (type === 'payment') return 'text-green-600';
    if (type === 'adjustment') {
      return amount > 0 ? 'text-orange-600' : 'text-green-600';
    }
    return 'text-gray-900';
  };

  const formatAmount = (type, amount) => {
    const sign = type === 'delivery' ? '+' : type === 'payment' ? '-' : amount >= 0 ? '+' : '-';
    return `${sign}${formatCurrency(Math.abs(amount))}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-600">Complete transaction history and audit trail</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value, page: 1 }))}
            className="form-input"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value, page: 1 }))}
            className="form-input"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
            className="form-input"
          >
            <option value="">All Types</option>
            <option value="delivery">Deliveries</option>
            <option value="payment">Payments</option>
            <option value="adjustment">Adjustments</option>
          </select>
          
          <div className="relative">
            <button
              onClick={() => setShowCustomerFilter(!showCustomerFilter)}
              className="form-input text-left flex items-center justify-between"
            >
              <span>
                {filters.customer_id 
                  ? customerList.find(c => c.id === filters.customer_id)?.name || 'Select Customer'
                  : 'All Customers'
                }
              </span>
              <UserIcon className="h-4 w-4 text-gray-400" />
            </button>
            
            {showCustomerFilter && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, customer_id: '', page: 1 }));
                    setShowCustomerFilter(false);
                  }}
                >
                  All Customers
                </div>
                {customerList.map((customer) => (
                  <div
                    key={customer.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setFilters(prev => ({ ...prev, customer_id: customer.id, page: 1 }));
                      setShowCustomerFilter(false);
                    }}
                  >
                    {customer.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <select
            value={filters.limit}
            onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
            className="form-input"
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            Failed to load transactions
          </div>
        ) : transactions.length > 0 ? (
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance After
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTransactionIcon(transaction.transaction_type)}
                        <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                          {transaction.transaction_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.customer_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.customer_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {transaction.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getAmountColor(transaction.transaction_type, transaction.amount)}`}>
                        {formatAmount(transaction.transaction_type, transaction.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.balance_after)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.created_by_name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No transactions found
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
            {Math.min(filters.page * filters.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page <= 1}
              className="btn btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {filters.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page >= pagination.pages}
              className="btn btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {transactions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-xl font-bold text-gray-900">
                {pagination.total}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Deliveries</p>
              <p className="text-xl font-bold text-blue-600">
                {transactions.filter(t => t.transaction_type === 'delivery').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-xl font-bold text-green-600">
                {transactions.filter(t => t.transaction_type === 'payment').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Adjustments</p>
              <p className="text-xl font-bold text-yellow-600">
                {transactions.filter(t => t.transaction_type === 'adjustment').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
