import React from "react";
import SubscriptionForm from "../common_components/SubscriptionForm";
import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaBookOpen,
  FaCogs,
  FaMobileAlt,
  FaFlask,
  FaChalkboardTeacher,
  FaLink,
  FaShieldAlt,
} from "react-icons/fa";

const Footer = () => {
  return (
    <div className="bg-gray-800 text-white">
      {/* ✅ Subscription Form */}
      <div className="">
        <SubscriptionForm />
      </div>

      {/* ✅ Footer Grid */}
      <div className="p-5 md:px-10 lg:px-24 mt-10">
        {/* Bottom Info */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 pb-10 text-gray-300">
          {/* Address */}
          <div>
            <div className="flex items-center gap-2 mb-3 font-bold text-white">
              <FaMapMarkerAlt className="text-purple-400 text-lg" />
              <h4 className="text-lg">Address</h4>
            </div>
            <p className="text-sm">
              123 Knowledge Lane,
              <br />
              Bangalore, KA 560001, India
            </p>
            <p className="mt-2 text-sm">Email: support@ecoders.in</p>
            <p className="text-sm">Phone: +91 98765 43210</p>
          </div>

          {/* Website Links */}
          <div>
            <div className="flex items-center gap-2 mb-3 font-bold text-white">
              <FaLink className="text-indigo-400 text-lg" />
              <h4 className="text-lg">Website</h4>
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-indigo-400">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-400">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-400">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-400">
                  Testimonials
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-400">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <div className="flex items-center gap-2 mb-3 font-bold text-white">
              <FaLink className="text-pink-400 text-lg" />
              <h4 className="text-lg">Follow Us</h4>
            </div>
            <div className="flex gap-4 text-xl text-gray-400">
              <a href="#" className="hover:text-pink-400">
                <FaFacebookF />
              </a>
              <a href="#" className="hover:text-pink-400">
                <FaTwitter />
              </a>
              <a href="#" className="hover:text-pink-400">
                <FaInstagram />
              </a>
              <a href="#" className="hover:text-pink-400">
                <FaLinkedinIn />
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <div className="flex items-center gap-2 mb-3 font-bold text-white">
              <FaShieldAlt className="text-red-400 text-lg" />
              <h4 className="text-lg">Legal</h4>
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-red-400">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400">
                  Refund Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400">
                  Code of Conduct
                </a>
              </li>
            </ul>
          </div>

          {/* Popular Courses */}
          <div>
            <div className="flex items-center gap-2 mb-3 font-bold text-white">
              <FaBookOpen className="text-green-400 text-lg" />
              <h4 className="text-lg">Popular Courses</h4>
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-green-400">
                  Full Stack Web Dev
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400">
                  Data Science
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400">
                  AI & ML
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400">
                  UI/UX Design
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400">
                  DevOps & Cloud
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-700">
          © {new Date().getFullYear()} Ecoders Learning Pvt Ltd. All rights
          reserved.
        </div>
      </div>
    </div>
  );
};

export default Footer;
