const Task = require('../models/task'); // Require the Task model

exports.getDashboard = (req, res, next) => {
    if(req.session.isAuth){
        const userEmail = req.session.userEmail; // Retrieve the user's ID from the session
        
        Task.findByUserEmail(userEmail) // Assuming you have this method implemented in your Task model
            .then(tasks => {
                res.render('dashboard', {tasks: tasks});
            })
            .catch(err => {
                console.log(err);
                res.redirect("/auth/login");
            });
    }else{
        res.redirect("/auth/login");
    }
};
