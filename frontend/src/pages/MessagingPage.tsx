import React from 'react';
import { MessageSquare } from 'lucide-react';

export const MessagingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Messaging</h1>
      </div>
      <div className="card text-center py-12">
        <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg mb-2">Messaging Feature</p>
        <p className="text-gray-500">Coming soon with serverless backend integration</p>
      </div>
    </div>
  );
};
