const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const ownerModel = require('../models/owner-model');
const quickBookModel = require('../models/quickBookModal');
const customerModel = require('../models/user-model');
const serviceProviderModel = require('../models/serviceProvider-model');

// ✅ Define middleware BEFORE routes
function isAuthenticated(req, res, next) {
    if (req.session && req.session.ownerId) {
        return next();
    }
    req.flash("error", "Please login to access the dashboard");
    res.redirect("/owners/admin/login");
}

// ✅ Now your admin route will work
router.get("/admin", isAuthenticated, async function (req, res) {
    try {
        const quickBookTotal = await quickBookModel.countDocuments();
        const customerBookingTotal = await customerModel.countDocuments();
        const totalBookings = quickBookTotal + customerBookingTotal;

        const completed = await quickBookModel.countDocuments({ status: "completed" });
        const cancelled = await quickBookModel.countDocuments({ status: "cancelled" });
        const upcoming = await quickBookModel.countDocuments({ status: "upcoming" });

        const totalProviders = await serviceProviderModel.countDocuments();
        const totalCustomers = await customerModel.countDocuments();

        res.render("adminDashboard", {
            totalBookings,
            completed,
            cancelled,
            upcoming,
            totalProviders,
            totalCustomers
        });
    } catch (err) {
        console.error("Error loading admin dashboard:", err);
        req.flash("error", "Dashboard load failed.");
        res.redirect("/owners/admin/login");
    }
});

module.exports = router;
