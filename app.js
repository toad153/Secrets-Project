//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const { authenticate } = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

mongoose.set('strictQuery', true);

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

var password = process.env.MONGO_ID;

mongoose.connect("mongodb+srv://admin-adwait:"+ password +"@cluster0.5wvwwig.mongodb.net/userDB", { useNewUrlParser: true });
// mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOrCreate({ username: profile.displayName, googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.get("/login", function (req, res) {
    res.render("login", { errMsg: "", username: "", password: "" });
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        }
    });
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("");
    }
});

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
    User.findById(req.user._id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function () {
                    res.redirect("/secrets");
                });
            }
        }
    });
});


app.get("/logout", function (req, res) {
    req.logout((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});

app.post("/register", function (req, res) {

    // bcrypt.genSalt(saltRounds, function (err, salt) {
    //     bcrypt.hash(req.body.password, salt, function (err, hash) {
    //         const newUser = new User({
    //             email: req.body.username,
    //             password: hash
    //         });
    //         newUser.save(function (err) {
    //             if (err) {
    //                 console.log(err)
    //             } else {
    //                 res.render("secrets");
    //             }
    //         });
    //     });
    // });

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            });
        }
    });

});

// app.post("/login", (req, res) => {
//     // const username = req.body.username;
//     // const password = req.body.password;

//     // User.findOne({ email: username }, (err, foundUser) => {
//     //     if (err) {
//     //         console.log(err);
//     //     } else {
//     //         if (foundUser) {
//     //             bcrypt.compare(password, foundUser.password, function (err, result) {
//     //                 if (result === true) {
//     //                     res.render("secrets");
//     //                     console.log("New login (" + username + ")");
//     //                 } else {
//     //                     res.render("login", { errMsg: "Email or password incorrect", username: username, password: password });
//     //                 }
//     //             });
//     //         }
//     //     }
//     // });

//     const user = new User({
//         username: req.body.username,
//         password: req.body.password
//     });

//     req.login(user, function(err){
//         if (err){
//             console.log(err);
//         } else {
//             passport.authenticate("local")
//         }
//     });

// });

app.post("/login", passport.authenticate("local"), function (req, res) {
    res.redirect("/secrets");
});

app.listen(process.env.PORT || 3000, function () {
    console.log("Server is running on port 3000.");
});


