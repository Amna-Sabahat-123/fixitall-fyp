const express = require('express');
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const serviceProviderModel = require("../models/serviceProvider-model"); // 👈 Add this

// Homepage
router.get("/", function(req, res) {
    const error = req.flash("error"); // Flash message from registration/login
    const showSignup = req.query.showSignup === "true"; // optional
    res.render("index", { error, showSignup });
});


// Dashboard (Protected)
router.get("/dashboard", isLoggedIn , function(req,res){
    res.render("dashboard")
});

router.get("/customers/dashboard", isLoggedIn, (req, res) => {
  res.render("customerdashboard", { user: req.user }); // optional: pass user
});


// Static Pages
router.get("/About" , function(req,res){
    res.render("AboutUs.ejs")
});
router.get("/Services" , function(req,res){
    res.render("Services.ejs")
});
router.get("/Contact" , function(req,res){
    res.render("Contactus.ejs")
});
router.get("/FAQ" , function(req,res){
    res.render("faqs.ejs")
});

// ✅ NEW: Providers page for QuickBook
router.get("/providers", async (req, res) => {
    try {
        const category = req.query.category;
        if (!category) {
            req.flash("error", "No category selected.");
            return res.redirect("/");
        }

        const providers = await serviceProviderModel.find({ serviceCategory: category });

        res.render("providers", { category, providers });
    } catch (err) {
        console.error("❌ Failed to load providers:", err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
