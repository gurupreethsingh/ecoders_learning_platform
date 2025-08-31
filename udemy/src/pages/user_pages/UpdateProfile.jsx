import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import { MdSave } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import globalBackendRoute from "../../config/Config";

export default function UpdateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: { street: "", city: "", state: "", postalCode: "", country: "" },
    avatar: "",
    role: "",
  });
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `${globalBackendRoute}/api/getUserById/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const user = res.data;
        setFormData({
          ...user,
          address: {
            street: user.address?.street || "",
            city: user.address?.city || "",
            state: user.address?.state || "",
            postalCode: user.address?.postalCode || "",
            country: user.address?.country || "",
          },
        });
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("address.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => setAvatar(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const form = new FormData();
    try {
      for (let key in formData) {
        if (key === "address")
          form.append("address", JSON.stringify(formData.address));
        else form.append(key, formData[key]);
      }
      if (avatar) form.append("avatar", avatar);

      await axios.put(`${globalBackendRoute}/api/update-profile/${id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Profile updated successfully!");
      navigate(`/profile/${id}`);
    } catch (err) {
      console.error("Error updating profile:", err.response || err);
      alert("Failed to update profile.");
    }
  };

  const getImageUrl = (avatar) => {
    if (!avatar) return "https://via.placeholder.com/150";
    return `${globalBackendRoute}/${avatar.replace(/\\/g, "/")}`;
  };

  return (
    // Top/Bottom gap + bottom border for section; responsive horizontal padding + desktop width limit for side gaps
    <div className="w-full border-b pt-6 pb-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Centered header block (matches auth pages) */}
        <div className="flex flex-col items-center justify-center">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white
                           bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"
          >
            <MdSave className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-xl md:text-2xl font-semibold text-gray-900 text-center">
            Update profile
          </h1>
          <div className="h-0.5 w-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 rounded-full mt-1"></div>
        </div>

        {/* Main content */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-start items-center gap-6 sm:gap-8">
          {/* Avatar */}
          <div className="w-36 h-36 sm:w-48 sm:h-48">
            <img
              src={getImageUrl(formData.avatar)}
              alt={formData.name}
              className="w-full h-full object-cover rounded-xl border bg-gray-100"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "https://via.placeholder.com/150?text=No+Image";
              }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full">
            <h2 className="subHeadingTextMobile lg:subHeadingText mb-4">
              Details
            </h2>

            <EditableField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              icon={<FaUser className="text-blue-600" />}
            />
            <EditableField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              icon={<FaEnvelope className="text-green-600" />}
            />
            <EditableField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              icon={<FaPhone className="text-yellow-600" />}
            />
            <EditableField
              label="Street"
              name="address.street"
              value={formData.address.street}
              onChange={handleChange}
              icon={<FaMapMarkerAlt className="text-purple-600" />}
            />
            <EditableField
              label="City"
              name="address.city"
              value={formData.address.city}
              onChange={handleChange}
              icon={<FaMapMarkerAlt className="text-indigo-600" />}
            />
            <EditableField
              label="State"
              name="address.state"
              value={formData.address.state}
              onChange={handleChange}
              icon={<FaMapMarkerAlt className="text-pink-500" />}
            />
            <EditableField
              label="Postal Code"
              name="address.postalCode"
              value={formData.address.postalCode}
              onChange={handleChange}
              icon={<FaMapMarkerAlt className="text-cyan-600" />}
            />
            <EditableField
              label="Country"
              name="address.country"
              value={formData.address.country}
              onChange={handleChange}
              icon={<FaMapMarkerAlt className="text-teal-600" />}
            />

            {/* Upload */}
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 px-2 sm:px-4">
              <dt className="flex items-center text-sm font-medium text-gray-700 gap-2">
                Profile Image
              </dt>
              <dd className="mt-1 sm:col-span-2 sm:mt-0">
                <label htmlFor="profileImage" className="fileUploadBtn">
                  Choose File
                </label>
                <input
                  id="profileImage"
                  type="file"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </dd>
            </div>

            {/* Save button — gradient, compact, responsive */}
            <div className="mt-6 text-center">
              <button
                type="submit"
                className="inline-flex w-fit items-center justify-center gap-2 rounded-full
                           bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600
                           px-4 py-2 text-sm font-medium text-white
                           hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-700
                           focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <MdSave /> Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditableField({ icon, label, name, value, onChange }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 px-2 sm:px-4">
      <dt className="flex items-center text-sm font-medium text-gray-700 gap-2">
        {icon} {label}
      </dt>
      <dd className="mt-1 sm:col-span-2 sm:mt-0">
        <div className="text-sm text-gray-900 border-b border-gray-300 pb-1">
          <input
            type="text"
            name={name}
            value={value || ""}
            onChange={onChange}
            className="w-full bg-transparent focus:outline-none"
          />
        </div>
      </dd>
    </div>
  );
}
