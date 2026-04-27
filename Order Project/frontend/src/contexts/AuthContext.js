import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../services/api';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,
};

// Action types
const AUTH_START = 'AUTH_START';
const AUTH_SUCCESS = 'AUTH_SUCCESS';
const AUTH_FAILURE = 'AUTH_FAILURE';
const LOGOUT = 'LOGOUT';
const CLEAR_ERROR = 'CLEAR_ERROR';

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case AUTH_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case AUTH_FAILURE:
      return {
        ...state,
        loading: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    case CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Login function
  const login = async (phone, password) => {
    try {
      dispatch({ type: AUTH_START });
      
      const response = await api.post('/auth/login', { phone, password });
      
      const { token, user } = response.data.data;
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({
        type: AUTH_SUCCESS,
        payload: { token, user },
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      dispatch({
        type: AUTH_FAILURE,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    dispatch({ type: LOGOUT });
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh');
      const { token } = response.data.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return token;
    } catch (error) {
      logout();
      throw error;
    }
  };

  // Check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          dispatch({
            type: AUTH_SUCCESS,
            payload: { token, user },
          });
        } catch (error) {
          console.error('Failed to parse user data:', error);
          logout();
        }
      } else {
        dispatch({ type: AUTH_FAILURE, payload: null });
      }
    };

    initAuth();
  }, []);

  // Clear error function
  const clearError = () => {
    dispatch({ type: CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
