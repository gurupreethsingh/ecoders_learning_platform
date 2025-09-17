// routes/CourseRoutes.js
const express = require("express");
const router = express.Router();
const CourseController = require("../controllers/CourseController");

// CRUD
router.post("/create-courses", CourseController.createCourse);
router.get("/list-courses", CourseController.listCourses);
router.get("/get-course-by-id/:id", CourseController.getCourseById);
router.get("/get-course-by-slug/:slug", CourseController.getCourseBySlug);
router.patch("/update-course/:id", CourseController.updateCourse);
router.delete("/delete-course/:id", CourseController.deleteCourse);

// toggles & bulk
router.post("/courses/:id/toggle-published", CourseController.togglePublished);
router.post("/courses/:id/toggle-archived", CourseController.toggleArchived);
router.post("/courses/:id/toggle-featured", CourseController.toggleFeatured);
router.post("/courses/bulk/visibility", CourseController.bulkSetVisibility);
router.get("/courses/counts/summary", CourseController.countsSummary);
router.get("/courses/counts/by-category", CourseController.countsByCategory);
router.get("/courses/counts/by-level", CourseController.countsByLevel);
router.get("/courses/counts/by-access", CourseController.countsByAccessType);
router.get("/courses/facets", CourseController.facets);
router.post("/courses/:id/modules", CourseController.addModule);
router.patch("/courses/:id/modules/:mIndex", CourseController.updateModule);
router.delete("/courses/:id/modules/:mIndex", CourseController.deleteModule);
router.post("/courses/:id/modules/:mIndex/topics", CourseController.addTopic);
router.patch(
  "/courses/:id/modules/:mIndex/topics/:tIndex",
  CourseController.updateTopic
);
router.delete(
  "/courses/:id/modules/:mIndex/topics/:tIndex",
  CourseController.deleteTopic
);
router.patch("/courses/:id/modules/reorder", CourseController.reorderModules);
router.patch(
  "/courses/:id/modules/:mIndex/topics/reorder",
  CourseController.reorderTopics
);
router.post("/courses/:id/enroll", CourseController.enrollStudent);
router.patch("/courses/:id/enrollment", CourseController.updateEnrollment);
router.delete(
  "/courses/:id/enrollment/:studentId",
  CourseController.unenrollStudent
);
router.post("/courses/:id/ratings", CourseController.addOrUpdateRating);
router.post("/courses/:id/threads", CourseController.addThread);
router.post("/courses/:id/threads/:tIndex/replies", CourseController.addReply);

/* ✅ NEW: list courses by semester for CreateAttendance */
router.get(
  "/courses/list-by-semester/:semesterId",
  CourseController.listBySemester
);
module.exports = router;
