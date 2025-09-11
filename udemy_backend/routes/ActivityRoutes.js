// udemy_backend/routes/ActivityRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ctrl = require("../controllers/ActivityController.js");
const { verifyToken } = require("../middleware/authMiddleware.js");

const router = express.Router();

/* ------------------ uploads/multer setup ------------------ */
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "file", ext)
      .replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

// Allow common doc types (doc, docx, xls, xlsx, pdf), images, zips
const allowed = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/gif",
  "text/plain",
]);
const fileFilter = (_req, file, cb) => {
  if (allowed.has(file.mimetype)) return cb(null, true);
  // let uncommon mimetypes pass if the extension looks OK (fallback)
  const okExt = /\.(pdf|doc|docx|xls|xlsx|png|jpe?g|gif|zip|txt)$/i.test(
    file.originalname || ""
  );
  return cb(null, okExt);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
});

/** ---------------------------------------
 * Activities (CRUD / publish / archive)
 * --------------------------------------*/
router.post("/create-activity", verifyToken, ctrl.create);
router.get("/get-activity/:id", verifyToken, ctrl.getById);
router.patch("/update-activity/:id", verifyToken, ctrl.update);
router.delete("/delete-activity/:id", verifyToken, ctrl.remove);

router.post("/publish-activity/:id", verifyToken, ctrl.publish);
router.post("/archive-activity/:id", verifyToken, ctrl.archive);

/** ---------------------------------------
 * Listing / Filtering / Counts / Sorting
 * --------------------------------------*/
router.get("/list-activities", verifyToken, ctrl.list); // ?page&limit&sort&...filters
router.post("/filter-activities", verifyToken, ctrl.filter); // body: { page, limit, sort, ...filters }

router.get("/count-activities", verifyToken, ctrl.countAll);
router.get("/count-activities-by-status", verifyToken, ctrl.countByStatus);
router.get(
  "/count-activities-by-audience-type",
  verifyToken,
  ctrl.countByAudienceType
);

/** ---------------------------------------
 * Assignments (per-user progress)
 * --------------------------------------*/
// :id = activityId
router.get("/list-activity-assignments/:id", verifyToken, ctrl.listAssignments);

// :id = assignmentId
router.get("/get-activity-assignment/:id", verifyToken, ctrl.getAssignment);
router.post(
  "/mark-activity-assignment-status/:id",
  verifyToken,
  ctrl.markAssignmentStatus
);

/** ---------------------------------------
 * Submissions (upload / review / grade)
 * --------------------------------------*/
// :id = activityId
// Accept multipart form-data: field "files"
router.post(
  "/submit-activity/:id",
  verifyToken,
  upload.array("files", 10),
  ctrl.submit
);

router.get("/list-activity-submissions/:id", verifyToken, ctrl.listSubmissions);
router.get(
  "/export-activity-submissions-csv/:id",
  verifyToken,
  ctrl.exportSubmissionsCsv
);

// :id = submissionId
router.get("/get-activity-submission/:id", verifyToken, ctrl.getSubmission);
router.post(
  "/review-activity-submission/:id",
  verifyToken,
  ctrl.reviewSubmission
);
router.post(
  "/grade-activity-submission/:id",
  verifyToken,
  ctrl.gradeSubmission
);

/** ---------------------------------------
 * Convenience for current user
 * --------------------------------------*/
router.get("/my-activity-assignments", verifyToken, ctrl.myAssignments);

module.exports = router;
