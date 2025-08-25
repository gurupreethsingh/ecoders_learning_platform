import React, { useState, useEffect } from "react";
import { FaPython, FaJava, FaDatabase, FaReact, FaRobot } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../../../udemy_superadmin/src/config/Config";

const mockCourses = [
  {
    id: "1",
    title: "Mastering Java",
    slug: "mastering-java",
    category: "Java",
    description: "Learn Java from beginner to advanced level.",
    icon: <FaJava className="text-4xl text-red-500" />,
    isPaid: true,
  },
  {
    id: "2",
    title: "Complete Python Bootcamp",
    slug: "complete-python-bootcamp",
    category: "Python",
    description: "From basics to deep learning in Python.",
    icon: <FaPython className="text-4xl text-yellow-500" />,
    isPaid: false,
  },
  {
    id: "3",
    title: "Database Testing with MySQL",
    slug: "mysql-database-testing",
    category: "Database Testing Mysql",
    description: "Test databases effectively using MySQL.",
    icon: <FaDatabase className="text-4xl text-blue-500" />,
    isPaid: false,
  },
  {
    id: "4",
    title: "ReactJS for Web Development",
    slug: "reactjs-web-dev",
    category: "Web Development",
    description: "Frontend mastery with React.",
    icon: <FaReact className="text-4xl text-cyan-500" />,
    isPaid: true,
  },
  {
    id: "5",
    title: "Selenium with Java Automation",
    slug: "selenium-java-automation",
    category: "Selenium Java",
    description: "Automate real-world projects using Selenium + Java.",
    icon: <FaRobot className="text-4xl text-purple-700" />,
    isPaid: true,
  },
  {
    id: "6",
    title: "Selenium with Python Automation",
    slug: "selenium-python-automation",
    category: "Selenium Python",
    description: "Automate real-world projects using Selenium + Python.",
    icon: <FaRobot className="text-4xl text-purple-500" />,
    isPaid: false,
  },
];

const AllCategories = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllCategories();
  }, []);

  const fetchAllCategories = async () => {
    try {
      console.log("Fetching all the course categories...");
      const res = await axios.get(`${globalBackendRoute}/api/all-categories`);
      // adjust if your API route differs
      if (res.data && Array.isArray(res.data)) {
        setCategories(res.data.map((cat) => cat.name)); // assuming each category object has a 'name'
      } else {
        console.error("Unexpected response:", res.data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const filteredCourses =
    selectedCategory === "All"
      ? mockCourses
      : mockCourses.filter((course) => course.category === selectedCategory);

  return (
    <div className="category_container">
      <div className="px-4 md:px-8 lg:px-12 py-8">
        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`text-sm md:text-base px-3 py-1 font-medium border-b-2 transition whitespace-nowrap ${
              selectedCategory === "All"
                ? "text-purple-600 border-purple-600"
                : "text-gray-700 border-transparent hover:text-purple-600 hover:border-purple-600"
            }`}
          >
            All
          </button>

          {categories.map((cat, index) => (
            <button
              key={index}
              onClick={() => setSelectedCategory(cat)}
              className={`text-sm md:text-base px-3 py-1 font-medium border-b-2 transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "text-purple-600 border-purple-600"
                  : "text-gray-700 border-transparent hover:text-purple-600 hover:border-purple-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course Cards */}
        <div className="all_categories border-t border-b py-5 container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">
                No courses found for "{selectedCategory}"
              </div>
            ) : (
              filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-purple-300"
                  onClick={() => {
                    const userId = localStorage.getItem("userId");

                    if (course.isPaid) {
                      if (userId) {
                        navigate(`/user-course/${userId}/${course.id}`);
                      } else {
                        alert("Please log in to access this paid course.");
                      }
                    } else {
                      navigate(`/user-course/${course.slug}/${course.id}`);
                    }
                  }}
                >
                  {/* Paid Badge */}
                  {course.isPaid && (
                    <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                      Paid
                    </span>
                  )}

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

                  {/* View Details */}
                  <div className="mt-auto text-center text-sm text-purple-500 hover:underline">
                    View Details →
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllCategories;
