import React, { useState } from "react";
import { FaPython, FaJava, FaDatabase, FaReact, FaRobot } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const optedCourses = [
  {
    id: "1",
    title: "Mastering Java",
    slug: "mastering-java",
    category: "Java",
    description: "Learn Java from beginner to advanced level.",
    icon: <FaJava className="text-4xl text-red-500" />,
    progress: 45,
  },
  {
    id: "2",
    title: "Complete Python Bootcamp",
    slug: "complete-python-bootcamp",
    category: "Python",
    description: "From basics to deep learning in Python.",
    icon: <FaPython className="text-4xl text-yellow-500" />,
    progress: 70,
  },
  {
    id: "3",
    title: "Database Testing with MySQL",
    slug: "mysql-database-testing",
    category: "Database Testing Mysql",
    description: "Test databases effectively using MySQL.",
    icon: <FaDatabase className="text-4xl text-blue-500" />,
    progress: 20,
  },
  {
    id: "4",
    title: "ReactJS for Web Development",
    slug: "reactjs-web-dev",
    category: "Web Development",
    description: "Frontend mastery with React.",
    icon: <FaReact className="text-4xl text-cyan-500" />,
    progress: 90,
  },
  {
    id: "5",
    title: "Selenium with Java Automation",
    slug: "selenium-java-automation",
    category: "Selenium Java",
    description: "Automate real-world projects using Selenium + Java.",
    icon: <FaRobot className="text-4xl text-purple-700" />,
    progress: 35,
  },
];

const AllOptedCourses = () => {
  const navigate = useNavigate();

  return (
    <div className="category_container">
      <div className="px-4 md:px-8 lg:px-12 py-8">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          Your Opted Courses
        </h2>

        {/* Courses Grid */}
        <div className="all_categories border-t border-b py-5 container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {optedCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 flex flex-col justify-between hover:ring-2 hover:ring-purple-300"
              >
                {/* Icon */}
                <div className="mb-4 flex justify-center">{course.icon}</div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 text-center">
                  {course.description}
                </p>

                {/* Progress Bar */}
                <div className="w-full mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Resume Button */}
                <div
                  onClick={() =>
                    navigate(`/resume-course/${course.slug}/${course.id}`)
                  }
                  className="mt-auto text-center text-sm text-purple-600 font-medium hover:underline cursor-pointer"
                >
                  Resume Course →
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllOptedCourses;
