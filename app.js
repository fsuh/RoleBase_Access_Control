const express = require("express");
const createHttpError = require("http-errors");
const morgan = require("morgan");
const mongoose = require("mongoose");
require("dotenv").config();
const session = require("express-session");
const connectFlash = require("connect-flash");
const passport = require("passport");
const MongoStore = require("connect-mongo");
const { ensureLoggedIn } = require("connect-ensure-login");
const connectDB = require("./db/connect");

const indexRouter = require("./routes/index");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5010;

app.use(morgan("dev"));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      //secure: true,
      httpOnly: true,
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      dbName: "session",
    }),
  })
);
// for passport js initiation
app.use(passport.authenticate("session"));
// app.use(passport.initialize());
// app.use(passport.session());

require("./utils/passport.auth");

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use(connectFlash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/user", ensureLoggedIn({ redirectTo: "/auth/login" }), userRouter);
app.use(
  "/admin",
  ensureLoggedIn({ redirectTo: "/auth/login" }),
  ensureAdmin,
  adminRouter
);

app.use((req, res, next) => {
  next(createHttpError.NotFound());
});
app.use((error, req, res, next) => {
  error.status = error.status || 500;
  res.status(error.status);
  res.render("error_40x", { error });
});

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(PORT, () => console.log(` Server is listening on ${PORT}...`));
  } catch (error) {
    console.log(error);
  }
};

start();

// mongoose
//   .connect(process.env.MONGO_URI, {
//     dbName: process.env.DB_NAME,
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => {
//     console.log("connected...");
//     app.listen(PORT, () => console.log(`Server is runing on port ${PORT}`));
//   })
//   .catch((err) => console.log(err.message));

// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//     next();
//   } else {
//     res.redirect("/auth/login");
//   }
// }

function ensureAdmin(req, res, next) {
  if (req.user.role === "ADMIN") {
    next();
  } else {
    req.flash("warning", "you are not authorized to see this route");
    res.redirect("/");
  }
}

function ensureModerator(req, res, next) {
  if (req.user.role === "MODERATOR") {
    next();
  } else {
    req.flash("warning", "you are not authorized to see this route");
    res.redirect("/");
  }
}
