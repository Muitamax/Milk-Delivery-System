import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customerAPI, deliveryAPI } from '../services/api';
import { formatCurrency } from '../utils/helpers';

const Delivery = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [litres, setLitres] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeypad, setShowKeypad] = useState(false);
  const [customerConfirmation, setCustomerConfirmation] = useState({
    method: 'pin',
    data: ''
  });

  const queryClient = useQueryClient();

  // Search customers
  const { data: searchResults, isLoading: searching } = useQuery(
    ['customers', 'search', searchQuery],
    () => customerAPI.search(searchQuery),
    {
      enabled: searchQuery.length >= 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create delivery mutation
  const createDeliveryMutation = useMutation(deliveryAPI.create, {
    onSuccess: (data) => {
      const { delivery, receipt_url } = data.data;
      
      // Reset form
      setSelectedCustomer(null);
      setLitres('');
      setCustomerConfirmation({ method: 'pin', data: '' });
      
      // Show success and open receipt
      alert(`Delivery ${delivery.delivery_id} created successfully!`);
      window.open(receipt_url, '_blank');
      
      // Invalidate customer cache
      queryClient.invalidateQueries('customers');
    },
    onError: (error) => {
      alert(error.response?.data?.error?.message || 'Failed to create delivery');
    },
  });

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
    setShowKeypad(true);
  };

  const handleNumberInput = (number) => {
    if (number === 'clear') {
      setLitres('');
    } else if (number === 'backspace') {
      setLitres(prev => prev.slice(0, -1));
    } else {
      // Allow decimal point and up to 2 decimal places
      if (number === '.' && !litres.includes('.')) {
        setLitres(prev => prev + number);
      } else if (number !== '.' && (!litres.includes('.') || litres.split('.')[1].length < 2)) {
        setLitres(prev => prev + number);
      }
    }
  };

  const calculateTotal = () => {
    if (!selectedCustomer || !litres) return 0;
    const litresNum = parseFloat(litres) || 0;
    return litresNum * selectedCustomer.price_per_litre;
  };

  const calculateNewBalance = () => {
    if (!selectedCustomer || !litres) return selectedCustomer?.outstanding_balance || 0;
    return (selectedCustomer.outstanding_balance || 0) + calculateTotal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer || !litres || parseFloat(litres) <= 0) {
      alert('Please select a customer and enter valid litres');
      return;
    }

    const deliveryData = {
      customer_id: selectedCustomer.id,
      litres: parseFloat(litres),
      customer_confirmation: customerConfirmation.method ? customerConfirmation : undefined
    };

    createDeliveryMutation.mutate(deliveryData);
  };

  const keypadNumbers = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'backspace'
  ];

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Delivery</h1>

      {/* Customer Search */}
      <div className="card mb-6">
        <label className="form-label">Search Customer</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter name or phone number..."
          className="form-input"
          autoFocus
        />

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="mt-3 max-h-48 overflow-y-auto custom-scrollbar">
            {searching ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : searchResults?.data?.customers?.length > 0 ? (
              <div className="space-y-2">
                {searchResults.data.customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                    <div className="text-sm text-gray-500">
                      Balance: {formatCurrency(customer.outstanding_balance)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No customers found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Customer */}
      {selectedCustomer && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Customer Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{selectedCustomer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{selectedCustomer.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price/Litre:</span>
              <span className="font-medium">{formatCurrency(selectedCustomer.price_per_litre)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Balance:</span>
              <span className="font-medium text-orange-600">
                {formatCurrency(selectedCustomer.outstanding_balance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Form */}
      {selectedCustomer && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Litres Input */}
          <div className="card">
            <label className="form-label">Litres Delivered</label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="0.00"
                className="form-input text-2xl font-bold text-center"
                readOnly
              />
              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className="btn btn-secondary"
              >
                {showKeypad ? 'Hide' : 'Show'} Keypad
              </button>
            </div>
          </div>

          {/* Number Keypad */}
          {showKeypad && (
            <div className="card">
              <div className="number-keypad">
                {keypadNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberInput(num)}
                    className={`keypad-btn ${
                      num === 'backspace' ? 'col-span-1 bg-red-100 hover:bg-red-200' : ''
                    } ${num === 'clear' ? 'col-span-3 bg-yellow-100 hover:bg-yellow-200' : ''}`}
                  >
                    {num === 'backspace' ? '⌫' : num === 'clear' ? 'Clear' : num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumberInput('clear')}
                  className="keypad-btn col-span-3 bg-yellow-100 hover:bg-yellow-200"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Calculation Summary */}
          {litres && parseFloat(litres) > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Litres:</span>
                  <span className="font-medium">{parseFloat(litres).toFixed(2)} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate:</span>
                  <span className="font-medium">{formatCurrency(selectedCustomer.price_per_litre)}/L</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Amount:</span>
                  <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>New Balance:</span>
                  <span className="text-orange-600">{formatCurrency(calculateNewBalance())}</span>
                </div>
              </div>
            </div>
          )}

          {/* Customer Confirmation */}
          <div className="card">
            <label className="form-label">Customer Confirmation (Optional)</label>
            <select
              value={customerConfirmation.method}
              onChange={(e) => setCustomerConfirmation(prev => ({ ...prev, method: e.target.value }))}
              className="form-input"
            >
              <option value="">No confirmation</option>
              <option value="pin">PIN</option>
              <option value="signature">Signature</option>
              <option value="ussd">USSD</option>
            </select>
            
            {customerConfirmation.method && (
              <input
                type="text"
                value={customerConfirmation.data}
                onChange={(e) => setCustomerConfirmation(prev => ({ ...prev, data: e.target.value }))}
                placeholder={`Enter ${customerConfirmation.method}`}
                className="form-input mt-3"
              />
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createDeliveryMutation.isLoading || !litres || parseFloat(litres) <= 0}
            className="btn btn-primary w-full flex items-center justify-center"
          >
            {createDeliveryMutation.isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Confirm Delivery'
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default Delivery;
