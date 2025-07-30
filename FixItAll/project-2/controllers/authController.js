const userModel = require('../models/user-model');
const serviceModel = require('../models/serviceProvider-model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/generateToken');

// Register normal user
// module.exports.registerUser = async (req, res) => {
//   try {
//     let { fullName, email, phone, password, location, agreement } = req.body;

//     let user = await userModel.findOne({ email });
//     if (user) {
//       const error = ["You already have an account, please login."];
//       return res.render("index", {
//         error,
//         showSignup: true
//       });
//     }


//     bcrypt.genSalt(10, function (err, salt) {
//       bcrypt.hash(password, salt, async function (err, hash) {
//         if (err) {
//           req.flash("error", "Something went wrong. Please try again.");
//           return res.redirect("/");
//         } else {
//           let newUser = await userModel.create({
//             fullName,
//             email,
//             phone,
//             location,
//             agreement: agreement === 'on',
//             password: hash
//           });

//           let token = generateToken(newUser);
//           res.cookie("token", token);
//           res.render("customersdashboard", { user: newUser });
//         }
//       });
//     });
//   } catch (err) {
//     console.log(err.message);
//     req.flash("error", "Server error. Please try again later.");
//     return res.redirect("/");
//   }
// };


module.exports.registerUser = async (req, res) => {
  console.log("📥 Received registration data:", req.body);
  try {
    const { fullName, email, phone, password, location, agreement } = req.body;
    // console.log("📥 Received registration data:", req.body);
    console.log("Missing any field?", {
      fullNameMissing: !fullName,
      emailMissing: !email,
      phoneMissing: !phone,
      passwordMissing: !password,
      locationMissing: !location
    });


    if (!fullName || !email || !phone || !password || !location) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ success: false, message: "You already have an account, please login." });
    }

    const salt = await bcrypt.genSalt(10);
    if (!salt) {
      return res.status(500).json({ success: false, message: "Error generating salt." });
    }

    const hashedPassword = await bcrypt.hash(password, salt);
    if (!hashedPassword) {
      return res.status(500).json({ success: false, message: "Error hashing password." });
    }

    const newUser = await userModel.create({
      fullName,
      email,
      phone,
      location,
      agreement: agreement === 'on',
      password: hashedPassword,
    });

    const token = generateToken(newUser);
    res.cookie("token", token, { httpOnly: true });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Registration Error:", err);

    // Optional: Special error handling for duplicate key (email already exists)
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({ success: false, message: "Email is already registered." });
    }

    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};



// Login normal user
module.exports.loginUser = async function (req, res) {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });

  if (!user) {
    req.flash("error", "Email or password incorrect");
    return res.redirect("/?showLogin=true");
  }

  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      let token = generateToken(user);
      res.cookie("token", token);

      // ✅ Save user info in session
      req.session.user = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        location: user.location
      };

      res.render("customerdashboard", { user });
    } else {
      req.flash("error", "Email or password incorrect");
      return res.redirect("/");
    }
  });
};

// Logout (works for both user and service provider)
module.exports.logoutUser = async function (req, res) {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.redirect("/");
};


module.exports.registerServiceProvider = async (req, res) => {
  try {
    let {
      fullName,
      email,
      phone,
      password,
      agreement,
      baseRate,
      serviceCategory,
      location,
      description,
    } = req.body;

    // Get coordinates
    let lat = req.body.lat;
    let lng = req.body.lng;
    let coordinates = lat && lng ? [parseFloat(lng), parseFloat(lat)] : [0, 0];

    // Check if already exists
    let existingProvider = await serviceModel.findOne({ email });
    if (existingProvider) {
      req.flash("error", "You already have an account, please login.");
      return res.redirect("/");
    }

    // Build availability array
    // Build availability array (updated format)
    let availability = [];
    if (req.body.availability) {
      for (let key in req.body.availability) {
        const entry = req.body.availability[key];
        if (entry.day && entry.from && entry.to) {
          availability.push({
            day: entry.day,
            from: entry.from,
            to: entry.to
          });
        }
      }
    }


    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        req.flash("error", "Server error. Please try again.");
        return res.redirect("/");
      }

      bcrypt.hash(password, salt, async function (err, hash) {
        if (err) {
          req.flash("error", "Something went wrong. Please try again.");
          return res.redirect("/");
        }

        const newProvider = await serviceModel.create({
          fullName,
          email,
          phone,
          password: hash,
          agreement: agreement === 'on',
          baseRate,
          availability,
          serviceCategory,
          description,
          userType: "service_provider",
          address: location,
          location: {
            type: "Point",
            coordinates: coordinates
          }
        });

        const token = generateToken(newProvider);
        res.cookie("token", token);
        res.render("servicesdashboard", { serviceProvider: newProvider });
      });
    });
  } catch (err) {
    console.error("Registration Error:", err.message);
    req.flash("error", "Server error. Please try again later.");
    return res.redirect("/");
  }
};



module.exports.loginServiceProvider = async function (req, res) {
  let { email, password } = req.body;
  let serviceProvider = await serviceModel.findOne({ email });

  if (!serviceProvider) {
    req.flash("error", "Email or password incorrect");
    return res.redirect("/");
  }

  bcrypt.compare(password, serviceProvider.password, function (err, result) {
    if (result) {
      let token = generateToken(serviceProvider);
      res.cookie("token", token);
      res.render("servicesdashboard", { serviceProvider });
    } else {
      req.flash("error", "Email or password incorrect");
      return res.redirect("/");
    }
  });
};
// Login service provider
