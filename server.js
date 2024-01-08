require("dotenv").config();

const fs = require("fs");
const path = require("path");
const https = require("https");
const express = require("express");
const helmet = require("helmet");
const passport = require("passport");
const { Strategy } = require("passport-google-oauth20");
const cookieSession = require("cookie-session");

const PORT = 3000;

const config = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  COOKIE_KEY_1: process.env.COOKIE_KEY_1,
  COOKIE_KEY_2: process.env.COOKIE_KEY_2,
};

const AUTH_OPTIONS = {
  callbackURL: "/auth/google/callback",
  clientID: config.CLIENT_ID,
  clientSecret: config.CLIENT_SECRET,
};

function verfiyCallback(accessToken, refreshToken, profile, done) {
  console.log("Google profile", profile);
  done(null, profile); // if error, can pass an error in the first params; pass profile means authenticated
}

passport.use(new Strategy(AUTH_OPTIONS, verfiyCallback));

// save the session to the cookie
passport.serializeUser((user, done) => {
  done(null, user);
});

// read the session from the cookie
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

const app = express();
app.use(helmet());

// session needs to be set up before passport uses it, but we want helmet to check headers
app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000,
    keys: [config.COOKIE_KEY_1, config.COOKIE_KEY_2],
  })
);
app.use(passport.initialize()); // this helps us to set up passport specifically the passport session
app.use(passport.session()); // it authenticates the session that's being set to our server, it uses above keys and it validates that everything is signed as it should
// and it then sets the value of the user property on our request object
// This passport session middleware will allow the deserialize usr function to be called
// which in turn sets req.user, which we can use in any of our express middleware.

function checkLoggedIn(req, res, next) {
  // req.user,
  const isLoggedIn = true;
  if (!isLoggedIn) {
    return res.status(401).json({ error: "you must log in!" });
  }
}

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: true,
  }),
  (req, res) => {
    console.log("google called us back");
  }
);

app.get("/auth/logout", (req, res) => {});

app.get("/secret", (req, res) => {
  return res.send("Your personal secret value is 42!");
});

app.get("/failure", (req, res) => {
  return res.send("Failed to log in!");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

https
  .createServer(
    {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    },
    app
  )
  .listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
  });
