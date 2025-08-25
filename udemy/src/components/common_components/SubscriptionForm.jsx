import React from "react";
import { FaCalendarAlt, FaRegHandshake, FaShieldAlt } from "react-icons/fa";

const SubscriptionForm = () => {
  return (
    // <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-100 py-14 px-4 md:px-10 lg:px-24">
    <div className="bg-white py-14 px-4 md:px-10 lg:px-24">
      <h2 className="text-3xl font-bold text-purple-700 mb-10 text-center lg:text-left">
        Subscribe to Our Newsletter
      </h2>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[200px]">
            <div className="flex items-start gap-4">
              <div className="bg-purple-100 p-3 rounded-full text-purple-700 text-2xl">
                <FaCalendarAlt />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Weekly Tech Insights</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Get curated weekly articles on the latest tech trends,
                  industry updates, job opportunities, and best practices —
                  straight to your inbox.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[200px]">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600 text-2xl">
                <FaShieldAlt />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Spam, Ever</h3>
                <p className="text-sm text-gray-600 mt-1">
                  We respect your inbox. You’ll only receive valuable content
                  related to learning, career, and growth. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Card 3 */}
          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[200px]">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-full text-green-600 text-2xl">
                <FaRegHandshake />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Career Support</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Access resources that help you crack interviews, explore
                  career paths, and discover top-rated courses each week.
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Form */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-8 flex flex-col justify-between min-h-[200px]">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-purple-700">
                Newsletter
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Join 10,000+ learners receiving updates on tech news, career
                tips, and industry-focused learning paths every week.
              </p>
            </div>
            <div>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full text-sm transition-all"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionForm;
