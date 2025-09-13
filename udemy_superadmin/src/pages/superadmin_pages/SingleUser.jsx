// src/pages/users/SingleUser.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaUserShield,
  FaIdBadge, // 👈 add this for ID
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import globalBackendRoute from "@/config/Config.js";

// Keep your role list
const roles = [
  "accountant",
  "author",
  "admin",
  "alumni_relations",
  "business_analyst",
  "content_creator",
  "course_coordinator",
  "customer_support",
  "dean",
  "data_scientist",
  "delivery_agent",
  "department_head",
  "developer",
  "employee",
  "event_coordinator",
  "hr_manager",
  "hod",
  "intern",
  "instructor",
  "legal_advisor",
  "maintenance_staff",
  "marketing_manager",
  "operations_manager",
  "outlet",
  "product_owner",
  "project_manager",
  "principal",
  "qa_lead",
  "recruiter",
  "registrar",
  "researcher",
  "sales_executive",
  "superadmin",
  "student",
  "support_engineer",
  "tech_lead",
  "test_engineer",
  "teacher",
  "user",
  "ux_ui_designer",
  "vendor",
].sort();

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <rect width="100%" height="100%" fill="#e5e7eb"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#6b7280">
    No Image
  </text>
</svg>`);

// Build a reliable image URL from stored avatar + role
const buildImageUrl = (avatar, role) => {
  try {
    if (avatar) {
      const filename = String(avatar).replace(/\\/g, "/").split("/").pop();
      if (filename) {
        const safeRole = role || "others";
        return `${globalBackendRoute}/uploads/${safeRole}/${filename}`;
      }
      const normalized = String(avatar).replace(/\\/g, "/");
      if (/^uploads\//.test(normalized)) {
        return `${globalBackendRoute}/${normalized}`;
      }
    }
  } catch {
    /* fall through */
  }
  return FALLBACK_AVATAR;
};

const handleImageError = (e) => {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = FALLBACK_AVATAR;
};

export default function SingleUser() {
  const { id } = useParams();
  const [userData, setUserData] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [imageSrc, setImageSrc] = useState(FALLBACK_AVATAR);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${globalBackendRoute}/api/single-user/${id}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        );

        const user = res.data;
        setUserData(user);
        setNewRole(user.role);
        setImageSrc(buildImageUrl(user.avatar, user.role));
      } catch (err) {
        console.error("Fetch Error:", err);
        toast.error("Failed to fetch user.");
      }
    };
    fetchUserData();
  }, [id]);

  const handleRoleUpdate = async () => {
    if (!userData) return;
    if (newRole === userData.role) {
      toast.info("No changes detected.");
      return;
    }
    const confirmUpdate = window.confirm(`Change role to "${newRole}"?`);
    if (!confirmUpdate) return;

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${globalBackendRoute}/api/update-user-role/${id}`,
        { role: newRole },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );

      setUserData((prev) => (prev ? { ...prev, role: newRole } : prev));
      toast.success("Role updated!");
      setImageSrc((prev) => buildImageUrl(userData?.avatar, newRole) || prev);
    } catch (err) {
      console.error("Update Error:", err);
      toast.error("Role update failed.");
    }
  };

  if (!userData)
    return <div className="text-center py-10">Loading user...</div>;

  const address = userData.address || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="containerWidth my-8"
    >
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {/* Profile Image */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full sm:w-48 h-auto"
        >
          <img
            src={imageSrc}
            alt={userData.name || "User"}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
            className="rounded-xl border bg-gray-100 w-full h-auto object-cover"
          />
        </motion.div>

        {/* User Info */}
        <div className="w-full">
          <motion.h3
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="headingText mb-4"
          >
            User Details
          </motion.h3>

          <div className="divide-y divide-gray-200 border-t">
            {/* 👇 New ID field */}
            <ProfileField
              icon={<FaIdBadge className="text-purple-600" />}
              label="User ID"
              value={userData._id || "N/A"}
            />
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
              value={address.street || "N/A"}
            />
            <ProfileField
              icon={<FaMapMarkerAlt className="text-indigo-600" />}
              label="City"
              value={address.city || "N/A"}
            />
            <ProfileField
              icon={<FaMapMarkerAlt className="text-pink-500" />}
              label="State"
              value={address.state || "N/A"}
            />
            <ProfileField
              icon={<FaMapMarkerAlt className="text-cyan-600" />}
              label="Postal Code"
              value={address.postalCode || "N/A"}
            />
            <ProfileField
              icon={<FaMapMarkerAlt className="text-teal-600" />}
              label="Country"
              value={address.country || "N/A"}
            />
          </div>

          {/* Role Selection */}
          <div className="mt-6 space-y-2">
            <label className="formLabel">Update Role</label>
            <select
              className="formInput"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value={userData.role} disabled>
                Current Role: {userData.role}
              </option>
              {roles
                .filter((r) => r !== userData.role)
                .map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
            </select>
            <button
              onClick={handleRoleUpdate}
              className="primaryBtn mt-2 w-fit px-4 rounded-full"
            >
              Update Role
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileField({ icon, label, value }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 px-2 sm:px-4">
      <dt className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
        {value}
      </dd>
    </div>
  );
}
