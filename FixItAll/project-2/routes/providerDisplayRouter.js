const express = require("express");
const router = express.Router();
const ServiceProvider = require("../models/serviceProvider-model");

router.get("/", async (req, res) => {
  const category = req.query.category;

  try {
    const providers = await ServiceProvider.find({
      serviceCategory: category,
      userType: "service_provider",
    });

    res.render("providers", { category, providers });
  } catch (error) {
    console.error("Error fetching providers:", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
