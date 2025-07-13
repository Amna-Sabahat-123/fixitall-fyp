const express = require('express');
const router = express.Router();
const {registerServiceProvider, loginServiceProvider,logoutUser } = require('../controllers/authController')


router.get("/", (req, res) => {
    res.send("Hey users working")
})
router.post("/register", registerServiceProvider )
router.post("/login", loginServiceProvider)
router.get("/logout", logoutUser)

module.exports = router;