import React, { useState } from 'react';
import ConnectionApproval from '../components/ConnectionApproval';

const TestConnectionPage = () => {
  const [showApproval, setShowApproval] = useState(true);

  const mockRequest = {
    origin: 'https://test-site.com',
    title: 'Test DApp Site',
    favicon: '',
    tabId: 123,
    requestId: 'test-request-123'
  };

  const handleApprove = () => {
    console.log('✅ Test: Connection approved');
    alert('Test: Connection approved!');
    setShowApproval(false);
  };

  const handleReject = () => {
    console.log('❌ Test: Connection rejected');
    alert('Test: Connection rejected!');
    setShowApproval(false);
  };

  if (!showApproval) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-800 text-white p-6">
        <h2 className="text-xl font-bold mb-4">Test Complete!</h2>
        <p className="text-center text-gray-300 mb-4">
          The connection approval component is working correctly.
        </p>
        <button
          onClick={() => setShowApproval(true)}
          className="bg-cyan-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-cyan-300 transition-colors"
        >
          Test Again
        </button>
      </div>
    );
  }

  return (
    <ConnectionApproval
      connectionRequest={mockRequest}
      onApprove={handleApprove}
      onReject={handleReject}
      isVisible={true}
    />
  );
};

export default TestConnectionPage;
