import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customerAPI } from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClasses, debounce } from '../utils/helpers';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

const Customers = () => {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: ''
  });

  const queryClient = useQueryClient();

  // Fetch customers
  const { data, isLoading, error } = useQuery(
    ['customers', filters],
    () => customerAPI.getAll(filters),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      keepPreviousData: true,
    }
  );

  // Create customer mutation
  const createCustomerMutation = useMutation(customerAPI.create, {
    onSuccess: () => {
      setShowCreateModal(false);
      queryClient.invalidateQueries('customers');
      alert('Customer created successfully');
    },
    onError: (error) => {
      alert(error.response?.data?.error?.message || 'Failed to create customer');
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation(
    ({ id, data }) => customerAPI.update(id, data),
    {
      onSuccess: () => {
        setSelectedCustomer(null);
        queryClient.invalidateQueries('customers');
        alert('Customer updated successfully');
      },
      onError: (error) => {
        alert(error.response?.data?.error?.message || 'Failed to update customer');
      },
    }
  );

  // Delete customer mutation
  const deleteCustomerMutation = useMutation(customerAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('customers');
      alert('Customer deactivated successfully');
    },
    onError: (error) => {
      alert(error.response?.data?.error?.message || 'Failed to deactivate customer');
    },
  });

  // Debounced search
  const debouncedSearch = debounce((value) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  }, 500);

  const handleSearch = (value) => {
    setSearch(value);
    debouncedSearch(value);
  };

  const handleCreateCustomer = (formData) => {
    createCustomerMutation.mutate(formData);
  };

  const handleUpdateCustomer = (formData) => {
    updateCustomerMutation.mutate({
      id: selectedCustomer.id,
      data: formData
    });
  };

  const handleDeleteCustomer = (customerId) => {
    if (window.confirm('Are you sure you want to deactivate this customer?')) {
      deleteCustomerMutation.mutate(customerId);
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setShowCreateModal(true);
  };

  const customers = data?.data?.customers || [];
  const pagination = data?.data?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer accounts</p>
        </div>
        <button
          onClick={() => {
            setSelectedCustomer(null);
            setShowCreateModal(true);
          }}
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search customers..."
              className="form-input pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
            className="form-input"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Results per page */}
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

      {/* Customers Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            Failed to load customers
          </div>
        ) : customers.length > 0 ? (
          <div className="min-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paybill Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price/Litre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
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
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {customer.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.paybill_account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(customer.price_per_litre)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        customer.outstanding_balance > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(customer.outstanding_balance)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClasses(customer.is_active ? 'active' : 'inactive')}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(customer)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No customers found
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setShowCreateModal(false)}
          onSubmit={selectedCustomer ? handleUpdateCustomer : handleCreateCustomer}
          loading={createCustomerMutation.isLoading || updateCustomerMutation.isLoading}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
};

// Customer Modal Component
const CustomerModal = ({ customer, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    paybill_account: customer?.paybill_account || '',
    price_per_litre: customer?.price_per_litre || '',
    is_active: customer?.is_active !== undefined ? customer.is_active : true,
    notes: customer?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+254712345678"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Paybill Account</label>
              <input
                type="text"
                value={formData.paybill_account}
                onChange={(e) => setFormData(prev => ({ ...prev, paybill_account: e.target.value }))}
                placeholder="123456"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Price per Litre (KES)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_litre}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_litre: e.target.value }))}
                className="form-input"
                required
              />
            </div>

            {customer && (
              <div>
                <label className="form-label">Status</label>
                <select
                  value={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="form-input"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}

            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="form-input"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Saving...' : (customer ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ customer, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{customer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paybill Account:</span>
                  <span className="font-medium">{customer.paybill_account}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={getStatusBadgeClasses(customer.is_active ? 'active' : 'inactive')}>
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Financial Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per Litre:</span>
                  <span className="font-medium">{formatCurrency(customer.price_per_litre)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Balance:</span>
                  <span className={`font-medium ${customer.outstanding_balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.outstanding_balance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Delivery:</span>
                  <span className="font-medium">
                    {customer.last_delivery_at ? formatDate(customer.last_delivery_at) : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Payment:</span>
                  <span className="font-medium">
                    {customer.last_payment_at ? formatDate(customer.last_payment_at) : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {customer.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
              <p className="text-gray-700">{customer.notes}</p>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={onClose}
              className="btn btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customers;
