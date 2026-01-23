import React from 'react';
import { Calendar } from 'lucide-react';

export const RemindersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
      </div>
      <div className="card text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg mb-2">Reminders Feature</p>
        <p className="text-gray-500">Coming soon with serverless backend integration</p>
      </div>
    </div>
  );
};
