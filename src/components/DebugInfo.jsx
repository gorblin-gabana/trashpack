import React from 'react';
import { useNavigate } from 'react-router-dom';

const DebugInfo = () => {
  const navigate = useNavigate();
  const currentUrl = window.location.href;
  const hash = window.location.hash;
  const search = window.location.search;

  // Parse hash parameters
  const hashParams = new URLSearchParams(hash.split('?')[1] || '');
  const hashParamsObj = Object.fromEntries(hashParams.entries());

  // Parse search parameters
  const searchParams = new URLSearchParams(search);
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  const testConnectionApproval = () => {
    // Create a full URL to test the connection approval flow
    const fullUrl = chrome.runtime.getURL('popup.html') +
      '?page=connection-request&' +
      'origin=http%3A//test.com&' +
      'title=Test%20Site&' +
      'favicon=&' +
      'tabId=123&' +
      'requestId=test123#/connection-request';

    console.log('🧪 Testing connection approval page with URL:', fullUrl);

    // Open in new popup window to test
    chrome.windows.create({
      url: fullUrl,
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    });
  };

  const testStandaloneConnection = () => {
    console.log('🧪 Testing standalone connection approval');
    navigate('/test-connection');
  };

  const testTrashpackConnect = async () => {
    console.log('🧪 Testing window.trashpack.connect() from extension popup');

    // First, check if we can access the current tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);

      // Inject script into the current tab to test trashpack.connect()
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          console.log('🧪 Testing trashpack.connect() from injected script');
          if (window.trashpack) {
            console.log('✅ window.trashpack found:', window.trashpack);
            window.trashpack.connect().then(result => {
              console.log('✅ Connect result:', result);
            }).catch(error => {
              console.error('❌ Connect error:', error);
            });
          } else {
            console.error('❌ window.trashpack not found');
          }
        }
      });
    } catch (error) {
      console.error('Error testing trashpack connect:', error);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 text-xs z-50 max-h-48 overflow-y-auto">
      <div><strong>🔍 DEBUG INFO:</strong></div>
      <div><strong>Full URL:</strong> {currentUrl}</div>
      <div><strong>Hash:</strong> {hash || 'none'}</div>
      <div><strong>Search:</strong> {search || 'none'}</div>
      <div><strong>Hash Params:</strong> {JSON.stringify(hashParamsObj)}</div>
      <div><strong>Search Params:</strong> {JSON.stringify(searchParamsObj)}</div>
      <div><strong>Auth param from hash:</strong> {hashParams.get('auth') || 'none'}</div>
      <div><strong>RequestId from hash:</strong> {hashParams.get('requestId') || 'none'}</div>
      <div><strong>ReturnTo from hash:</strong> {hashParams.get('returnTo') || 'none'}</div>
                  <div className="flex flex-col gap-1 mt-1">
        <div className="flex gap-1">
          <button
            onClick={testConnectionApproval}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
          >
            🧪 Test Approval w/ URL
          </button>
          <button
            onClick={testStandaloneConnection}
            className="bg-green-500 text-white px-2 py-1 rounded text-xs"
          >
            🧪 Test Standalone
          </button>
        </div>
        <button
          onClick={testTrashpackConnect}
          className="bg-purple-500 text-white px-2 py-1 rounded text-xs"
        >
          🧪 Test trashpack.connect()
        </button>
      </div>
    </div>
  );
};

export default DebugInfo;
