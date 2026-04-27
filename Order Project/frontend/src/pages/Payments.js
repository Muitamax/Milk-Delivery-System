import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { paymentAPI, customerAPI } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClasses } from '../utils/helpers';
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

const Payments = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    date_from: '',
    date_to: ''
  });
  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const queryClient = useQueryClient();

  // Fetch payments
  const { data, isLoading, error } = useQuery(
    ['payments', filters],
    () => paymentAPI.getAll(filters),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      keepPreviousData: true,
    }
  );

  // Fetch unmatched payments
  const { data: unmatchedPayments } = useQuery(
    'unmatched-payments',
    paymentAPI.getUnmatched,
    {
      staleTime: 1 * 60 * 1000, // 1 minute
      refetchInterval: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch customers for matching
  const { data: customers } = useQuery(
    'customers-for-matching',
    () => customerAPI.getAll({ limit: 1000 }),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Match payment mutation
  const matchPaymentMutation = useMutation(
    ({ paymentId, customerId }) => paymentAPI.matchPayment(paymentId, customerId),
    {
      onSuccess: () => {
        setShowUnmatchedModal(false);
        setSelectedPayment(null);
        setSelectedCustomer('');
        queryClient.invalidateQueries('payments');
        queryClient.invalidateQueries('unmatched-payments');
        alert('Payment matched successfully');
      },
      onError: (error) => {
        alert(error.response?.data?.error?.message || 'Failed to match payment');
      },
    }
  );

  const handleMatchPayment = (payment) => {
    setSelectedPayment(payment);
    setShowUnmatchedModal(true);
  };

  const handleSubmitMatch = () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    matchPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      customerId: selectedCustomer
    });
  };

  const payments = data?.data?.payments || [];
  const pagination = data?.data?.pagination || {};
  const unmatched = unmatchedPayments?.data?.payments || [];
  const customerList = customers?.data?.customers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Manage M-Pesa payments and reconciliation</p>
        </div>
        {unmatched.length > 0 && (
          <button
            onClick={() => setShowUnmatchedModal(true)}
            className="btn btn-secondary mt-4 sm:mt-0 flex items-center"
          >
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            {unmatched} Unmatched Payment{unmatched > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Unmatched Payments Alert */}
      {unmatched.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                {unmatched} Unmatched Payment{unmatched > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-yellow-600">
                These payments require manual reconciliation. Click "Match Payment" to assign them to customers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
            className="form-input"
          >
            <option value="">All Status</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
            <option value="failed">Failed</option>
          </select>
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

      {/* Payments Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            Failed to load payments
          </div>
        ) : payments.length > 0 ? (
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.mpesa_receipt_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.mpesa_transaction_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {payment.customer_name || 'Unmatched'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.payment_timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClasses(payment.status)}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {payment.status === 'unmatched' && (
                        <button
                          onClick={() => handleMatchPayment(payment)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Match
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No payments found
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

      {/* Match Payment Modal */}
      {showUnmatchedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Match Payment to Customer
              </h2>
              
              {selectedPayment && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-medium">{selectedPayment.mpesa_receipt_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{selectedPayment.phone_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(selectedPayment.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="form-label">Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">Choose a customer...</option>
                  {customerList.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowUnmatchedModal(false);
                    setSelectedPayment(null);
                    setSelectedCustomer('');
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitMatch}
                  disabled={matchPaymentMutation.isLoading || !selectedCustomer}
                  className="btn btn-primary flex-1"
                >
                  {matchPaymentMutation.isLoading ? 'Matching...' : 'Match Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
