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

// // Service Provider Dashboard Route
// router.get('/dashboard/:providerId', async (req, res) => {
//     try {
//       const { providerId } = req.params;
      
//       // Get provider details
//       const provider = await serviceProviderModel.findById(providerId);
//       if (!provider) {
//         return res.status(404).send('Service provider not found');
//       }
  
//       // Get all bookings for this provider
//       const bookings = await quickBookModel.find({ 
//         providerId: providerId 
//       }).sort({ createdAt: -1 });
  
//       // Calculate basic stats
//       const stats = {
//         totalBookings: bookings.length,
//         todayBookings: bookings.filter(b => {
//           const today = new Date();
//           const bookingDate = new Date(b.createdAt);
//           return bookingDate.toDateString() === today.toDateString();
//         }).length,
//         upcomingBookings: bookings.filter(b => 
//           new Date(b.availableTime) > new Date()
//         ).length
//       };
  
//       // Format bookings for display
//       const formattedBookings = bookings.map(booking => ({
//         id: booking._id,
//         customerName: booking.fullName,
//         service: booking.serviceCategory,
//         phone: booking.phone,
//         location: booking.location,
//         description: booking.desc,
//         bookingDate: new Date(booking.createdAt).toLocaleDateString('en-US', {
//           year: 'numeric',
//           month: 'short',
//           day: 'numeric'
//         }),
//         bookingTime: new Date(booking.createdAt).toLocaleTimeString('en-US', {
//           hour: '2-digit',
//           minute: '2-digit'
//         }),
//         availableTime: new Date(booking.availableTime).toLocaleString('en-US', {
//           year: 'numeric',
//           month: 'short',
//           day: 'numeric',
//           hour: '2-digit',
//           minute: '2-digit'
//         }),
//         email: booking.email
//       }));
  
//       res.render('servicesdashboard', {
//         provider: provider,
//         bookings: formattedBookings,
//         stats: stats,
//         user: req.session.user || null
//       });
  
//     } catch (error) {
//       console.error('❌ Error loading service provider dashboard:', error);
//       res.status(500).send('Server error occurred');
//     }
//   });