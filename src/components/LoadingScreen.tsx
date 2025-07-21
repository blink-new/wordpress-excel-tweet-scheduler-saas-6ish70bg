import React from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">T</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TweetScheduler Pro</h1>
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-gray-600 mt-4">Loading your dashboard...</p>
      </div>
    </div>
  )
}