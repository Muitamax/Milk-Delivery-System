// Format currency for Kenyan Shillings
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Format date for display
export const formatDate = (dateString, options = {}) => {
  const date = new Date(dateString);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return date.toLocaleDateString('en-KE', { ...defaultOptions, ...options });
};

// Format date only (no time)
export const formatDateOnly = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format time only
export const formatTimeOnly = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDateOnly(dateString);
};

// Validate phone number
export const validatePhoneNumber = (phone) => {
  const kenyanPhoneRegex = /^\+254\d{9}$/;
  return kenyanPhoneRegex.test(phone);
};

// Format phone number for display
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  if (phone.startsWith('+254')) {
    return phone;
  }
  return `+254${phone}`;
};

// Calculate percentage
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Generate color based on status
export const getStatusColor = (status) => {
  const colors = {
    confirmed: 'green',
    acknowledged: 'blue',
    disputed: 'red',
    pending: 'yellow',
    matched: 'green',
    unmatched: 'red',
    failed: 'red',
    sent: 'blue',
    active: 'green',
    inactive: 'gray',
  };
  
  return colors[status] || 'gray';
};

// Get status badge classes
export const getStatusBadgeClasses = (status) => {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
  const colorClasses = {
    confirmed: 'bg-green-100 text-green-800',
    acknowledged: 'bg-blue-100 text-blue-800',
    disputed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    matched: 'bg-green-100 text-green-800',
    unmatched: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    sent: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  };
  
  return `${baseClasses} ${colorClasses[status] || 'bg-gray-100 text-gray-800'}`;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

// Download data as CSV
export const downloadCSV = (data, filename) => {
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Truncate text
export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Validate email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate random color
export const generateRandomColor = () => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Check if device is mobile
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Get device info
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  return {
    isMobile: isMobile(),
    userAgent,
    platform,
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
  };
};
