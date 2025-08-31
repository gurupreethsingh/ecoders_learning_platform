import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaUserShield,
} from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import globalBackendRoute from "../../config/Config";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${globalBackendRoute}/api/getUserById/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUserData(response.data);
      } catch (error) {
        console.error("Error fetching user data:", error.message);
      }
    };
    fetchUserData();
  }, [id]);

  const handleUpdateProfile = () => navigate(`/update-profile/${userData._id}`);

  const getImageUrl = (avatar) => {
    if (!avatar) return "https://placehold.co/150x150?text=No+Image";
    return `${globalBackendRoute}/${avatar.replace(/\\/g, "/")}`;
  };

  if (!userData) return <div className="text-center py-8">Loading...</div>;

  return (
    // 1) Left/right gaps on desktop + 5) top/bottom gap + bottom border
    <div className="w-full border-b pt-6 pb-8">
      {/* Constrained, centered container with responsive horizontal padding */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 3) Page heading at the top (centered, consistent with auth pages) */}
        <div className="flex flex-col items-center justify-center">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <FaUser className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-xl md:text-2xl font-semibold text-gray-900 text-center">
            Profile
          </h1>
          <div className="h-0.5 w-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-full mt-1" />
        </div>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mt-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start items-center gap-6 sm:gap-8">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-36 h-36 sm:w-48 sm:h-48"
            >
              <img
                src={getImageUrl(userData.avatar)}
                alt={userData.name}
                className="w-full h-full object-cover rounded-xl border bg-gray-100"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://placehold.co/150x150?text=No+Image";
                }}
              />
            </motion.div>

            {/* User Info */}
            <div className="w-full">
              {/* (Kept your animated subheading for section clarity) */}
              <motion.h3
                className="subHeadingTextMobile lg:subHeadingText mb-4"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                Details
              </motion.h3>

              <div className="border-t border-gray-200 divide-y divide-gray-100 rounded-md">
                <ProfileField
                  icon={<FaUser className="text-blue-600" />}
                  label="Full Name"
                  value={userData.name}
                />
                <ProfileField
                  icon={<FaEnvelope className="text-green-600" />}
                  label="Email"
                  value={userData.email}
                />
                <ProfileField
                  icon={<FaPhone className="text-yellow-600" />}
                  label="Phone"
                  value={userData.phone || "N/A"}
                />
                <ProfileField
                  icon={<FaUserShield className="text-red-500" />}
                  label="Role"
                  value={userData.role}
                />
                <ProfileField
                  icon={<FaMapMarkerAlt className="text-purple-600" />}
                  label="Street"
                  value={userData.address?.street || "N/A"}
                />
                <ProfileField
                  icon={<FaMapMarkerAlt className="text-indigo-600" />}
                  label="City"
                  value={userData.address?.city || "N/A"}
                />
                <ProfileField
                  icon={<FaMapMarkerAlt className="text-pink-500" />}
                  label="State"
                  value={userData.address?.state || "N/A"}
                />
                <ProfileField
                  icon={<FaMapMarkerAlt className="text-cyan-600" />}
                  label="Postal Code"
                  value={userData.address?.postalCode || "N/A"}
                />
                <ProfileField
                  icon={<FaMapMarkerAlt className="text-teal-600" />}
                  label="Country"
                  value={userData.address?.country || "N/A"}
                />
              </div>

              {/* 2) Update button with matching gradient color + visible border/focus */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleUpdateProfile}
                  className="inline-flex w-fit items-center justify-center gap-2 rounded-full
                             bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600
                             px-4 py-2 text-sm font-medium text-white
                             hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700
                             focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <MdEdit /> Update
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 px-2 sm:px-4">
      <dt className="flex items-center text-sm font-medium text-gray-700 gap-2">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 break-words">
        {value}
      </dd>
    </div>
  );
}
