const User = require('../models/user');
const bcrypt = require('bcryptjs');

exports.getLogin = (req, res, next) => {
    res.render('login');
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findByEmail(email)
        .then(user => {
            if (!user) {
                // User not found, redirect back to login with an error message
                return res.redirect('/auth/login');
            }
            // Compare hashed password
            bcrypt.compare(password, user.password, (err, doMatch) => {
                if (err) {
                    console.log(err);
                    return res.redirect('/auth/login');
                }
                if (doMatch) {
                    // Passwords match, redirect to user dashboard or home page
                    // You can also implement session logic here if needed
                    req.session.userEmail = email; // Store email in session
                    req.session.isAuth = true;
                    return res.redirect('/dashboard');
                } else {
                    // Passwords do not match, redirect back to login
                    return res.redirect('/auth/login');
                }
            });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/auth/login');
        });
};


exports.getRegister = (req, res, next) => {
    res.render('register');
};

exports.postRegister = (req, res, next) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    User.findByEmail(email)
        .then(user => {
            if (user) {
                return res.redirect('/register');
            }
            const newUser = new User(username, email, password);
            return newUser.save();
        })
        .then(result => {
            res.redirect('/auth/login');
        })
        .catch(err => {
            console.log(err);
            res.redirect('/auth/register');
        });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/auth/login');
    });
};