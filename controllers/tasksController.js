const User = require('../models/user');
const Task = require('../models/task');

exports.postTask = (req, res, next) => {
    const title = req.body.title;
    const description = req.body.description;
    const userEmail = req.session.userEmail;

    // First, find the user by email to get the user ID
    User.findByEmail(userEmail)
        .then(user => {
            if (!user) {
                throw new Error('No user found with that email');
            }
            // Now we have the user, so we can get the ID
            const ownerId = user.id;
            
            // Create a new task with the user ID
            const newTask = new Task(title, description, ownerId);
            return newTask.save();
        })
        .then(result => {
            res.redirect('/dashboard'); // or wherever you want to redirect after creating the task
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Error creating the task');
        });
};
