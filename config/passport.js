var LocalStrategy = require("passport-local").Strategy;
var User = require('../models/user'); 
var bcrypt = require('bcryptjs');

module.exports = function(passport){
    
    passport.use(new LocalStrategy(async function(username, password, done){
        try {
            const user = await User.findOne({ username: username });
            if(!user) {
                return done(null, false, { message: 'No user found' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if(isMatch){
                return done(null, user);
            } else {
                return done(null, false, { message: 'Wrong password' });
            }
        } catch(err) {
            console.error(err);
            return done(err);
        }
    }));

    passport.serializeUser(function(user, done){
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done){
        User.findById(id).then(user => {
            done(null, user);
        }).catch(err => {
            done(err);
        });
    });
};
