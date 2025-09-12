// // udemy_backend/routes/NotificationRoutes.js
// const express = require("express");
// const ctrl = require("../controllers/NotificationController");
// const { verifyToken } = require("../middleware/authMiddleware");

// const router = express.Router();

// /** ---------- Authenticated user endpoints ---------- */
// router.get("/my-notification-feed", verifyToken, ctrl.myFeed);
// router.get("/my-unseen-notification-count", verifyToken, ctrl.unseenCountForMe);
// router.post("/mark-delivery-seen/:id", verifyToken, ctrl.markSeenForMe);
// router.post("/dismiss-delivery/:id", verifyToken, ctrl.dismissForMe);

// /** ---------- Admin endpoints (controller enforces role=superadmin) ---------- */
// // CRUD
// router.post("/create-notification", verifyToken, ctrl.create);
// router.get("/list-notifications", verifyToken, ctrl.list);
// router.get("/count-notifications", verifyToken, ctrl.countAll);
// router.get("/count-notifications-by-status", verifyToken, ctrl.countByStatus);
// router.get(
//   "/count-notifications-by-category",
//   verifyToken,
//   ctrl.countByCategory
// );
// router.post("/filter-notifications", verifyToken, ctrl.filter);

// router.get("/get-notification/:id", verifyToken, ctrl.getById);
// router.patch("/update-notification/:id", verifyToken, ctrl.update);
// router.delete("/delete-notification/:id", verifyToken, ctrl.remove);

// // Send / Schedule / Cancel / Duplicate
// router.post("/schedule-notification/:id", verifyToken, ctrl.schedule);
// router.post("/send-notification/:id", verifyToken, ctrl.sendNow);
// router.post("/cancel-notification/:id", verifyToken, ctrl.cancel);
// router.post("/duplicate-notification/:id", verifyToken, ctrl.duplicate);

// // Deliveries
// router.get(
//   "/list-notification-deliveries/:id",
//   verifyToken,
//   ctrl.listDeliveries
// );
// router.get(
//   "/export-notification-deliveries-csv/:id",
//   verifyToken,
//   ctrl.exportDeliveriesCsv
// );
// router.get("/get-notification-seen-stats/:id", verifyToken, ctrl.seenStats);

// // Resend
// router.post(
//   "/resend-notification-to-user/:id/:userId",
//   verifyToken,
//   ctrl.resendToUser
// );
// router.post("/resend-notification-to-role/:id", verifyToken, ctrl.resendToRole);
// router.post(
//   "/resend-notification-to-users/:id",
//   verifyToken,
//   ctrl.resendToUsers
// );

// // Bulk
// router.post("/bulk-delete-notifications", verifyToken, ctrl.bulkDelete);
// router.post("/bulk-update-notification-status", verifyToken, ctrl.bulkStatus);
// router.post("/bulk-duplicate-notifications", verifyToken, ctrl.bulkDuplicate);

// module.exports = router;

//

//

//

// udemy_backend/routes/NotificationRoutes.js
const express = require("express");
const ctrl = require("../controllers/NotificationController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

/** ---------- Authenticated user endpoints ---------- */
router.get("/my-notification-feed", verifyToken, ctrl.myFeed);
router.get("/my-unseen-notification-count", verifyToken, ctrl.unseenCountForMe);
router.post("/mark-delivery-seen/:id", verifyToken, ctrl.markSeenForMe);
router.post("/dismiss-delivery/:id", verifyToken, ctrl.dismissForMe);

/** ---------- Admin endpoints (controller enforces role=superadmin) ---------- */
// CRUD
router.post("/create-notification", verifyToken, ctrl.create);
router.get("/list-notifications", verifyToken, ctrl.list);
router.get("/count-notifications", verifyToken, ctrl.countAll);
router.get("/count-notifications-by-status", verifyToken, ctrl.countByStatus);
router.get(
  "/count-notifications-by-category",
  verifyToken,
  ctrl.countByCategory
);
router.post("/filter-notifications", verifyToken, ctrl.filter);

router.get("/get-notification/:id", verifyToken, ctrl.getById);
router.patch("/update-notification/:id", verifyToken, ctrl.update);
router.delete("/delete-notification/:id", verifyToken, ctrl.remove);

// Send / Schedule / Cancel / Duplicate
router.post("/schedule-notification/:id", verifyToken, ctrl.schedule);
router.post("/send-notification/:id", verifyToken, ctrl.sendNow);
router.post("/cancel-notification/:id", verifyToken, ctrl.cancel);
router.post("/duplicate-notification/:id", verifyToken, ctrl.duplicate);

// Deliveries
router.get(
  "/list-notification-deliveries/:id",
  verifyToken,
  ctrl.listDeliveries
);
router.get(
  "/export-notification-deliveries-csv/:id",
  verifyToken,
  ctrl.exportDeliveriesCsv
);
router.get("/get-notification-seen-stats/:id", verifyToken, ctrl.seenStats);

// Resend
router.post(
  "/resend-notification-to-user/:id/:userId",
  verifyToken,
  ctrl.resendToUser
);
router.post("/resend-notification-to-role/:id", verifyToken, ctrl.resendToRole);
router.post(
  "/resend-notification-to-users/:id",
  verifyToken,
  ctrl.resendToUsers
);

// Bulk
router.post("/bulk-delete-notifications", verifyToken, ctrl.bulkDelete);
router.post("/bulk-update-notification-status", verifyToken, ctrl.bulkStatus);
router.post("/bulk-duplicate-notifications", verifyToken, ctrl.bulkDuplicate);

module.exports = router;
