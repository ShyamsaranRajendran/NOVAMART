exports.isUser = function(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash('danger', 'Please log in.');
        res.redirect('/user/login'); // Use absolute path
    }
};

exports.isAdmin = function(req, res, next) {
    if (req.isAuthenticated() && req.user && req.user.admin === 1) {
        next();
    } else {
        req.flash('danger', 'Please log in as admin.');
        res.redirect('/user/login'); // Use absolute path
    }
};
