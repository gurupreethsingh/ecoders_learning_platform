import React from "react";
import { Link } from "react-router-dom";

const PageNotFound = () => {
  return (
    <main className="min-h-[50vh]  p-40 text-center">
      {/* 404 big heading */}
      <h1 className="text-7xl sm:text-9xl font-extrabold text-pink-500 mb-4">
        404
      </h1>

      {/* Message */}
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
        Page not found
      </h2>

      {/* Actions */}
      <div className="flex flex-col justify-center pt-4 sm:flex-row gap-4 text-center">
        <Link
          to="/home"
          className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          Back to Homepage
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Go Back
        </button>
      </div>
    </main>
  );
};

export default PageNotFound;
