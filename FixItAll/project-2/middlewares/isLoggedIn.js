const jwt = require('jsonwebtoken')
const userModel = require("../models/user-model")

module.exports = async function (req, res, next) {
    // Check if the token exists in cookies
    if (!req.cookies.token) {
        req.flash("error", "You need to login first")
        return res.redirect("/") // Redirect to login page if no token
    }

    try {
        // Decode the token and verify it
        let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY)
        
        // Find the user based on the decoded email
        let user = await userModel.findOne({ email: decoded.email }).select("-password")

        // If the user is not found, return an error
        if (!user) {
            req.flash("error", "User not found")
            return res.redirect("/") // Redirect if user doesn't exist
        }

        // Add the user to the request object
        req.user = user

        // Proceed to the next middleware/route handler
        next()
    } catch (err) {
        // Handle any errors, including invalid token or other issues
        req.flash("error", "Something went wrong.")
        return res.redirect("/") // Redirect to login on error
    }
}
