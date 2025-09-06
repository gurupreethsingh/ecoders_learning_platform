// controllers/InstructorController.js
const mongoose = require("mongoose");
const { Types } = mongoose;
const Instructor = require("../models/InstructorModel");

/* --------------------------------- helpers -------------------------------- */
const csvToArray = (v) =>
  Array.isArray(v)
    ? v.filter(Boolean).map(String)
    : String(v || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

const toObjectIdArray = (input) => {
  const arr = Array.isArray(input) ? input : input ? [input] : [];
  return [...new Set(arr.filter(Boolean))]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
};

const pick = (obj = {}, keys = []) =>
  keys.reduce((acc, k) => {
    if (typeof obj[k] !== "undefined") acc[k] = obj[k];
    return acc;
  }, {});

const parseBool = (v) =>
  typeof v === "boolean"
    ? v
    : typeof v === "string"
    ? v.toLowerCase() === "true"
    : undefined;

const like = (s) =>
  typeof s === "string" && s.length
    ? new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : undefined;

const populateSlim = [
  { path: "degrees", select: "name title code" },
  { path: "semesters", select: "title semister_name semNumber" }, // your model is "Semister"
  { path: "courses", select: "title name code" },
];

/* =============================== CREATE/APPLY ============================== */
async function apply(req, res) {
  try {
    const b = req.body || {};

    const firstName = (b.firstName || "").trim();
    const lastName = (b.lastName || "").trim();
    const email = (b.email || "").trim().toLowerCase();

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, and email are required.",
      });
    }

    const doc = await Instructor.create({
      firstName,
      lastName,
      email,
      phone: b.phone || undefined,
      avatarUrl: b.avatarUrl || undefined,
      bio: b.bio || undefined,
      gender: b.gender || undefined,
      dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : undefined,
      address: b.address || undefined,

      languages: csvToArray(b.languages),
      skills: csvToArray(b.skills),
      areasOfExpertise: csvToArray(b.areasOfExpertise),

      education: Array.isArray(b.education) ? b.education : [],
      certifications: Array.isArray(b.certifications) ? b.certifications : [],
      availability: Array.isArray(b.availability) ? b.availability : [],

      hourlyRate:
        b.hourlyRate === "" || b.hourlyRate == null
          ? undefined
          : Number(b.hourlyRate),
      resumeUrl: b.resumeUrl || undefined,
      idProofUrl: b.idProofUrl || undefined,

      website: b.website || undefined,
      linkedin: b.linkedin || undefined,
      github: b.github || undefined,
      youtube: b.youtube || undefined,
      twitter: b.twitter || undefined,

      upiId: b.upiId || undefined,
      payoutPreference: b.payoutPreference || "UPI",

      degrees: toObjectIdArray(b.degrees),
      semesters: toObjectIdArray(b.semesters),
      courses: toObjectIdArray(b.courses),

      isEmailVerified: !!b.isEmailVerified,
      isKycVerified: !!b.isKycVerified,
      isActive: b.isActive != null ? !!b.isActive : true,
      isDeleted: false,
      applicationStatus: "pending",
      createdBy: req.user?._id || undefined,
    });

    const populated = await Instructor.findById(doc._id).populate(populateSlim);
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ================================== LIST ================================== */
async function list(req, res) {
  try {
    const {
      q,
      status,
      active,
      deleted,
      emailVerified,
      kycVerified,
      minRating,
      city,
      state,
      degree,
      semester,
      course,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (q && q !== "all") {
      const rx = like(q);
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { bio: rx },
        { languages: rx },
        { skills: rx },
        { areasOfExpertise: rx },
      ];
    }

    if (typeof status === "string" && status !== "all")
      filter.applicationStatus = status;

    const activeBool = parseBool(active);
    if (typeof activeBool === "boolean") filter.isActive = activeBool;

    const delBool = parseBool(deleted);
    if (typeof delBool === "boolean") filter.isDeleted = delBool;

    const emv = parseBool(emailVerified);
    if (typeof emv === "boolean") filter.isEmailVerified = emv;

    const kyv = parseBool(kycVerified);
    if (typeof kyv === "boolean") filter.isKycVerified = kyv;

    if (city) filter["address.city"] = like(city);
    if (state) filter["address.state"] = like(state);

    if (degree && Types.ObjectId.isValid(degree))
      filter.degrees = new Types.ObjectId(degree);
    if (semester && Types.ObjectId.isValid(semester))
      filter.semesters = new Types.ObjectId(semester);
    if (course && Types.ObjectId.isValid(course))
      filter.courses = new Types.ObjectId(course);

    if (minRating != null && !Number.isNaN(Number(minRating))) {
      filter.rating = { $gte: Number(minRating) };
    }

    const pg = Math.max(Number(page), 1);
    const lim = Math.max(Number(limit), 1);
    const skip = (pg - 1) * lim;

    const [items, total] = await Promise.all([
      Instructor.find(filter)
        .sort(sort || "-createdAt")
        .skip(skip)
        .limit(lim)
        .populate(populateSlim),
      Instructor.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page: pg,
        limit: lim,
        total,
        totalPages: Math.max(1, Math.ceil(total / lim)),
      },
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ================================= COUNTS ================================= */
async function counts(req, res) {
  try {
    const [byStatus, activeCount, inactiveCount] = await Promise.all([
      Instructor.aggregate([
        { $group: { _id: "$applicationStatus", count: { $sum: 1 } } },
      ]),
      Instructor.countDocuments({ isActive: true, isDeleted: false }),
      Instructor.countDocuments({ isActive: false, isDeleted: false }),
    ]);

    const map = byStatus.reduce((m, x) => ((m[x._id] = x.count), m), {});
    return res.json({
      success: true,
      data: {
        total: Object.values(map).reduce((a, b) => a + b, 0),
        pending: map.pending || 0,
        approved: map.approved || 0,
        rejected: map.rejected || 0,
        deleted: map.deleted || 0,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ================================ GET BY ID ================================ */
// controllers/InstructorController.js
async function getById(req, res) {
  try {
    const { id } = req.params;
    const soft = String(req.query.soft || "") === "1"; // ← add this

    const isObjId = Types.ObjectId.isValid(id);
    console.log("[GET] /api/instructors/get-by-id/:id", { id, isObjId });

    let doc = null;
    if (isObjId) doc = await Instructor.findById(id).populate(populateSlim);
    if (!doc)
      doc = await Instructor.findOne({ _id: id }).populate(populateSlim);

    if (!doc) {
      const payload = {
        success: false,
        message: "Not found",
        debug: {
          id,
          isObjectId: isObjId,
          totalInstructors: await Instructor.countDocuments({}),
        },
      };
      // ← use soft mode to avoid 404
      return soft ? res.json(payload) : res.status(404).json(payload);
    }

    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ============================== GET BY EMAIL ============================== */
async function getByEmail(req, res) {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "email required" });
    const doc = await Instructor.findOne({ email, isDeleted: false }).populate(
      populateSlim
    );
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ============================ UPDATE (PATCH MIX) =========================== */
async function update(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};

    const allowed = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "avatarUrl",
      "bio",
      "gender",
      "dateOfBirth",
      "address",
      "languages",
      "skills",
      "areasOfExpertise",
      "education",
      "certifications",
      "availability",
      "hourlyRate",
      "resumeUrl",
      "idProofUrl",
      "website",
      "linkedin",
      "github",
      "youtube",
      "twitter",
      "upiId",
      "payoutPreference",
      "isActive",
      "isEmailVerified",
      "isKycVerified",
      "applicationStatus",
      "degrees",
      "semesters",
      "courses",
    ];

    const patch = pick(b, allowed);

    if (typeof patch.languages !== "undefined")
      patch.languages = csvToArray(patch.languages);
    if (typeof patch.skills !== "undefined")
      patch.skills = csvToArray(patch.skills);
    if (typeof patch.areasOfExpertise !== "undefined")
      patch.areasOfExpertise = csvToArray(patch.areasOfExpertise);

    if (typeof patch.hourlyRate !== "undefined")
      patch.hourlyRate =
        patch.hourlyRate === "" || patch.hourlyRate == null
          ? undefined
          : Number(patch.hourlyRate);

    if (typeof patch.degrees !== "undefined")
      patch.degrees = toObjectIdArray(patch.degrees);
    if (typeof patch.semesters !== "undefined")
      patch.semesters = toObjectIdArray(patch.semesters);
    if (typeof patch.courses !== "undefined")
      patch.courses = toObjectIdArray(patch.courses);

    if (patch.email) patch.email = String(patch.email).toLowerCase().trim();
    if (patch.dateOfBirth) patch.dateOfBirth = new Date(patch.dateOfBirth);

    if (req.user && req.user._id) patch.updatedBy = req.user._id;

    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: patch },
      { new: true }
    ).populate(populateSlim);

    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* =========================== PROFILE & ADDRESS SETS ======================== */
async function setProfile(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const fields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "avatarUrl",
      "bio",
      "gender",
      "dateOfBirth",
    ];
    const patch = pick(b, fields);
    if (patch.email) patch.email = String(patch.email).toLowerCase().trim();
    if (patch.dateOfBirth) patch.dateOfBirth = new Date(patch.dateOfBirth);
    if (req.user?._id) patch.updatedBy = req.user._id;

    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: patch },
      { new: true }
    ).populate(populateSlim);

    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function setAddress(req, res) {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const patch = {
      address: pick(b, [
        "line1",
        "line2",
        "city",
        "state",
        "country",
        "postalCode",
      ]),
    };
    if (req.user?._id) patch.updatedBy = req.user._id;

    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: patch },
      { new: true }
    ).populate(populateSlim);

    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/* =============================== VERIFICATIONS ============================ */
async function verifyEmail(req, res) {
  try {
    const { id } = req.params;
    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: { isEmailVerified: true, updatedBy: req.user?._id || undefined },
      },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function verifyKyc(req, res) {
  try {
    const { id } = req.params;
    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isKycVerified: true, updatedBy: req.user?._id || undefined } },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/* ================================ SOFT DELETE ============================== */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          applicationStatus: "deleted",
          updatedBy: req.user?._id || undefined,
        },
      },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ================================= HARD DELETE ============================ */
async function hardDelete(req, res) {
  try {
    const { id } = req.params;
    const r = await Instructor.deleteOne({ _id: id });
    if (!r.deletedCount)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, deletedCount: r.deletedCount });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ============================= STATUS MANAGEMENT ========================== */
async function approve(req, res) {
  try {
    const { id } = req.params;
    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          applicationStatus: "approved",
          rejectionReason: null,
          reviewedBy: req.user?._id || undefined,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function reject(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          applicationStatus: "rejected",
          rejectionReason: reason || "Not specified",
          reviewedBy: req.user?._id || undefined,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function toggleActive(req, res) {
  try {
    const { id } = req.params;
    const doc = await Instructor.findOne({ _id: id });
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    doc.isActive = !doc.isActive;
    if (req.user && req.user._id) doc.updatedBy = req.user._id;
    await doc.save();
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function setStatus(req, res) {
  try {
    const { id } = req.params;
    const { applicationStatus, reason } = req.body || {};
    if (
      !["pending", "approved", "rejected", "deleted"].includes(
        applicationStatus
      )
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid applicationStatus" });
    }

    const patch = {
      applicationStatus,
      updatedBy: req.user?._id || undefined,
    };
    if (applicationStatus === "rejected")
      patch.rejectionReason = reason || "Not specified";
    if (applicationStatus === "approved") patch.rejectionReason = null;
    if (applicationStatus === "deleted") {
      patch.isDeleted = true;
      patch.deletedAt = new Date();
    }

    const doc = await Instructor.findOneAndUpdate(
      { _id: id },
      { $set: patch },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

/* ============================= ASSIGNMENT UPDATES ========================= */
async function updateAssignments(req, res) {
  try {
    const { id } = req.params;
    const { degrees: degIn, semesters: semIn, courses: couIn } = req.body || {};
    const degrees = toObjectIdArray(degIn);
    const semesters = toObjectIdArray(semIn);
    const courses = toObjectIdArray(couIn);

    if (!degrees.length && !semesters.length && !courses.length) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one of: degrees[], semesters[], courses[]",
      });
    }

    const update = {};
    if (degrees.length) update.degrees = degrees;
    if (semesters.length) update.semesters = semesters;
    if (courses.length) update.courses = courses;
    if (req.user && req.user._id) update.updatedBy = req.user._id;

    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: update },
      { new: true }
    ).populate(populateSlim);

    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function assignAdd(req, res) {
  try {
    const { id } = req.params;
    const { degrees: degIn, semesters: semIn, courses: couIn } = req.body || {};
    const degrees = toObjectIdArray(degIn);
    const semesters = toObjectIdArray(semIn);
    const courses = toObjectIdArray(couIn);

    const $addToSet = {};
    if (degrees.length) $addToSet.degrees = { $each: degrees };
    if (semesters.length) $addToSet.semesters = { $each: semesters };
    if (courses.length) $addToSet.courses = { $each: courses };

    if (!Object.keys($addToSet).length)
      return res
        .status(400)
        .json({ success: false, message: "Nothing to add" });

    const $set = {};
    if (req.user && req.user._id) $set.updatedBy = req.user._id;

    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $addToSet, $set },
      { new: true }
    ).populate(populateSlim);

    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function assignRemove(req, res) {
  try {
    const { id } = req.params;
    const { degrees: degIn, semesters: semIn, courses: couIn } = req.body || {};
    const degrees = toObjectIdArray(degIn);
    const semesters = toObjectIdArray(semIn);
    const courses = toObjectIdArray(couIn);

    const $pull = {};
    if (degrees.length) $pull.degrees = { $in: degrees };
    if (semesters.length) $pull.semesters = { $in: semesters };
    if (courses.length) $pull.courses = { $in: courses };

    if (!Object.keys($pull).length)
      return res
        .status(400)
        .json({ success: false, message: "Nothing to remove" });

    const $set = {};
    if (req.user && req.user._id) $set.updatedBy = req.user._id;

    const doc = await Instructor.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $pull, $set },
      { new: true }
    ).populate(populateSlim);

    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ================================ BULK ACTIONS ============================ */
async function bulkAction(req, res) {
  try {
    const { ids = [], action, reason } = req.body || {};
    if (!Array.isArray(ids) || !ids.length)
      return res
        .status(400)
        .json({ success: false, message: "ids[] required" });

    const validIds = ids
      .filter(Boolean)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (!validIds.length)
      return res
        .status(400)
        .json({ success: false, message: "No valid ids provided" });

    const reviewerBlock = {
      reviewedBy: req.user?._id || null,
      reviewedAt: new Date(),
    };
    let filter = { _id: { $in: validIds } };
    let $set = {};

    switch (action) {
      case "approve":
        filter.isDeleted = false;
        $set = {
          applicationStatus: "approved",
          rejectionReason: null,
          ...reviewerBlock,
        };
        break;
      case "reject":
        filter.isDeleted = false;
        $set = {
          applicationStatus: "rejected",
          rejectionReason: reason || "Not specified",
          ...reviewerBlock,
        };
        break;
      case "delete":
        $set = {
          isDeleted: true,
          deletedAt: new Date(),
          applicationStatus: "deleted",
        };
        break;
      case "restore":
        $set = {
          isDeleted: false,
          deletedAt: null,
          applicationStatus: "pending",
        };
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid action" });
    }

    const r = await Instructor.updateMany(filter, { $set });
    return res.json({
      success: true,
      matchedCount: r.matchedCount ?? r.n,
      modifiedCount: r.modifiedCount ?? r.nModified,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function quickSearch(req, res) {
  try {
    const { q = "", limit = 10 } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const rx = like(q);
    const items = await Instructor.find({
      isDeleted: false,
      $or: [{ firstName: rx }, { lastName: rx }, { email: rx }],
    })
      .limit(Math.max(Number(limit), 1))
      .sort("-createdAt")
      .select("firstName lastName email avatarUrl");

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  apply,
  list,
  counts,
  getById,
  getByEmail,
  quickSearch,
  update,
  setProfile,
  setAddress,
  verifyEmail,
  verifyKyc,
  remove,
  hardDelete,
  approve,
  reject,
  toggleActive,
  setStatus,
  updateAssignments,
  assignAdd,
  assignRemove,
  bulkAction,
};
