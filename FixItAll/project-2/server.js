const express = require('express')
const app = express()

const cookieParser = require('cookie-parser')
const path = require("path")
const session = require('express-session');

const flash = require('connect-flash')

const ownersRouter = require("./routes/ownersRouter")
const quickBookRouter = require("./routes/quickBookRouter")
const customersRouter = require("./routes/customersRouter")
const serviceProviderRouter = require("./routes/serviceProviderRouter")
const indexRouter = require("./routes/index");
const providerDisplayRouter = require("./routes/providerDisplayRouter");
// const estimateRoute = require('./routes/estimate');

console.log(providerDisplayRouter);

const db = require('./config/db')

const seedOwnersRouter = require("./routes/seedOwnersRouter");
app.use("/", seedOwnersRouter);


require('dotenv').config()

app.use(express.json())
app.use(express.urlencoded({extended : true}))
app.use(cookieParser())

app.use(
    session({
        resave: false,
        saveUninitialized: false,
        secret: process.env.EXPRESS_SESSION_SECRET || 'defaultSecret',
    })
);
app.use(flash())
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

app.use(express.static(path.join(__dirname, "public")))
app.set("view engine", "ejs")

app.use("/", indexRouter);
app.use("/owners", ownersRouter)
app.use("/serviceProvider",serviceProviderRouter)
app.use("/quickBook", quickBookRouter)
app.use("/customers", customersRouter)
app.use("/providers", providerDisplayRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});