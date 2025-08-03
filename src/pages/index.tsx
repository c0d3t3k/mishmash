import React from 'react';
import { Link } from '@tanstack/react-router';
import '@/pages/index.css';

export default function HomePage() {
  return (
    <div className="w-full h-full py-20">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-8 mb-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-7xl font-bold text-neutral-800 dark:text-neutral-200 mb-8">
            Create Stunning Collages
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              with AI Power
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-12 max-w-4xl mx-auto">
            Mishmash combines intuitive drag-and-drop design with AI-powered background removal 
            to help you create professional collages in minutes, not hours.
          </p>
          <div className="flex justify-center">
            <Link
              to="/login"
              className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Start Creating
            </Link>
          </div>
        </div>
      </div>


      {/* Key Features Section */}
      <div className="max-w-7xl mx-auto px-8 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              AI Background Removal
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Remove backgrounds with precision using advanced AI models, all processed locally in your browser.
            </p>
          </div>
          
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              Drag & Drop Interface
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Intuitive drag-and-drop controls make creating complex collages as simple as moving files on your desktop.
            </p>
          </div>
          
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              Real-time Collaboration
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Share your collages instantly with generated links and collaborate with others in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-8 text-center">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 md:p-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Ready to Start Creating?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already using Mishmash to bring their visual stories to life.
          </p>
          <Link
            to="/login"
            className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
          >
            Get Started for Free
          </Link>
        </div>
      </div>
    </div>
  );
}