import React, { useState, useEffect } from 'react';
import { Check, X, Globe, Shield, AlertTriangle } from 'lucide-react';

const ConnectionApproval = ({
  connectionRequest,
  onApprove,
  onReject,
  isVisible
}) => {
  const [loading, setLoading] = useState(false);

  if (!isVisible || !connectionRequest) return null;

  const { origin, favicon, title } = connectionRequest;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[360px] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
          <h2 className="text-white text-xl font-bold flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            Connection Request
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Site Info */}
          <div className="flex items-center mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 mr-3">
              {favicon ? (
                <img
                  src={favicon}
                  alt="Site favicon"
                  className="w-8 h-8 rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <Globe className="w-8 h-8 text-gray-500" style={{display: favicon ? 'none' : 'flex'}} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {title || 'Unknown Site'}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {origin}
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Before connecting:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Only connect to sites you trust</li>
                <li>This site will be able to view your wallet address</li>
                <li>This site may request transaction signatures</li>
              </ul>
            </div>
          </div>

          {/* Permissions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              This site is requesting permission to:
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                View your wallet address
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Request transaction signatures
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Suggest transactions to approve
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="w-4 h-4 inline mr-1" />
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Connecting...
                </div>
              ) : (
                <>
                  <Check className="w-4 h-4 inline mr-1" />
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionApproval;
