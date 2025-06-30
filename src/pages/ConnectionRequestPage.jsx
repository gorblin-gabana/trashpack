import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConnectionApproval from '../components/ConnectionApproval';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';

const ConnectionRequestPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { walletAddress } = useWalletStore();
  const [loading, setLoading] = useState(false);

  // Get connection request details from URL params
  const origin = searchParams.get('origin');
  const title = searchParams.get('title');
  const favicon = searchParams.get('favicon');
  const tabId = searchParams.get('tabId');
  const requestId = searchParams.get('requestId');

  // Debug logging
  console.log('🔗 ConnectionRequestPage loaded with params:', {
    fullUrl: window.location.href,
    hash: window.location.hash,
    search: window.location.search,
    searchParams: searchParams.toString(),
    origin,
    title,
    favicon,
    tabId,
    requestId,
    isAuthenticated,
    walletAddress
  });

  const connectionRequest = {
    origin,
    title: title ? decodeURIComponent(title) : 'Unknown Site',
    favicon: favicon ? decodeURIComponent(favicon) : null
  };

  // Check if we have required parameters
  const hasRequiredParams = origin && tabId && requestId;
  console.log('🔗 Required params check:', { hasRequiredParams, origin, tabId, requestId });

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleApprove = async () => {
    if (!origin || !tabId || !requestId) {
      console.error('Missing connection request parameters');
      return;
    }

    try {
      setLoading(true);

      // Add site to connected sites
      const { connectedSites = [] } = await chrome.storage.sync.get(['connectedSites']);
      const updatedSites = [...new Set([...connectedSites, origin])];
      await chrome.storage.sync.set({ connectedSites: updatedSites });

      // Send approval response to background script
      chrome.runtime.sendMessage({
        type: 'CONNECTION_APPROVED',
        requestId,
        tabId: parseInt(tabId),
        origin,
        publicKey: walletAddress
      });

      // Close the popup
      window.close();
    } catch (error) {
      console.error('Error approving connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requestId || !tabId) {
      console.error('Missing connection request parameters');
      return;
    }

    try {
      setLoading(true);

      // Send rejection response to background script
      chrome.runtime.sendMessage({
        type: 'CONNECTION_REJECTED',
        requestId,
        tabId: parseInt(tabId),
        origin
      });

      // Close the popup
      window.close();
    } catch (error) {
      console.error('Error rejecting connection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show error if required parameters are missing
  if (!hasRequiredParams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Invalid Connection Request</h2>
          <p className="text-gray-600 mb-4">Missing required connection parameters.</p>
          <div className="text-sm text-left bg-gray-100 p-3 rounded mb-4">
            <div><strong>URL:</strong> {window.location.href}</div>
            <div><strong>Origin:</strong> {origin || 'missing'}</div>
            <div><strong>Tab ID:</strong> {tabId || 'missing'}</div>
            <div><strong>Request ID:</strong> {requestId || 'missing'}</div>
          </div>
          <button
            onClick={() => window.close()}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ConnectionApproval
        connectionRequest={connectionRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        isVisible={true}
      />
    </div>
  );
};

export default ConnectionRequestPage;
