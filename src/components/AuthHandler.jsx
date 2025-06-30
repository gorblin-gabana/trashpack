import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const AuthHandler = ({ children }) => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();
  const [isConnectionRequest, setIsConnectionRequest] = useState(false);
  const [requestId, setRequestId] = useState(null);

    useEffect(() => {
    // Check if this popup was opened for a connection request
    // Parse from hash since we're using hash routing
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.split('?')[1] || '');

    const authParam = hashParams.get('auth');
    const requestIdParam = hashParams.get('requestId');
    const returnToParam = hashParams.get('returnTo');

    console.log('🔍 AuthHandler checking URL params:', {
      fullUrl: window.location.href,
      hash: hash,
      hashSplit: hash.split('?'),
      queryPart: hash.split('?')[1],
      auth: authParam,
      requestId: requestIdParam,
      returnTo: returnToParam,
      isAuthenticated
    });

    if (authParam === 'true' && requestIdParam && returnToParam === 'connection') {
      console.log('✅ Connection request detected in AuthHandler');
      setIsConnectionRequest(true);
      setRequestId(requestIdParam);

      // If already authenticated, proceed immediately
      if (isAuthenticated) {
        console.log('✅ Already authenticated, proceeding with connection...');
        handleAuthCompleted(requestIdParam);
      }
    } else {
      console.log('❌ Connection request NOT detected:', {
        authCheck: authParam === 'true',
        requestIdCheck: !!requestIdParam,
        returnToCheck: returnToParam === 'connection'
      });
    }
  }, [isAuthenticated]);

    const handleAuthCompleted = (reqId) => {
    console.log('🔗 Sending AUTH_COMPLETED for requestId:', reqId);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'AUTH_COMPLETED',
        requestId: reqId
      }, (response) => {
        console.log('📨 AUTH_COMPLETED response:', response);

        if (response && response.success) {
          console.log('✅ AUTH_COMPLETED successful, connection approval should open');
        } else {
          console.error('❌ AUTH_COMPLETED failed:', response);
        }

        // Close this popup after a short delay
        setTimeout(() => {
          console.log('🔒 Closing auth popup...');
          window.close();
        }, 1000);
      });
    } else {
      console.error('❌ Chrome runtime not available');
    }
  };

  // Listen for authentication changes
  useEffect(() => {
    if (isConnectionRequest && isAuthenticated && requestId) {
      console.log('✅ Authentication completed for connection request');
      handleAuthCompleted(requestId);
    }
  }, [isAuthenticated, isConnectionRequest, requestId]);

  return (
    <>
      {isConnectionRequest && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 text-sm z-50">
          {isAuthenticated
            ? '🔗 Connecting to dApp - Proceeding with approval...'
            : '🔗 Connecting to dApp - Please authenticate your wallet'
          }
        </div>
      )}
      {children}
    </>
  );
};

export default AuthHandler;
