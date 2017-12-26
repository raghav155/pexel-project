const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcrypt-nodejs');
const uid = require('uid');

module.exports = function (passport,connection) {
    passport.serializeUser(function (user,done) {
        done(null,user);
    });

    passport.deserializeUser(function(id, done) {
        connection.query("select * from users where user_id = " + "'" + id + "'",function(err,rows){
            //console.log(id)
            //console.log('hioooooooooooooo')
            //console.log(rows.length)
            done(err, rows[0]);
        });
    });

    passport.use('local-signup',new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
    },
        function (req,email,password,done) {
        //console.log(email)
            let query = 'select * from users where email = ' + "'" + email + "'";
        //console.log(query)
            connection.execute(query,function (err,result) {
                if(err){
                    return done(err);
                }

                if(result.length > 0){
                    return done(null,false,req.flash('signupMessage', 'That email is already taken.'));
                } else{
                    // if there is no user with that email
                    // create the user

                    var newUserMysql = new Object();
                    var keyP = generateHash(password);

                    newUserMysql.email    = email;
                    newUserMysql.password = keyP; // use the generateHash function in our user model
                    var uname = req.body.first + " " + req.body.last;
                    var uiid = uid();
                    var valid_offer = req.body.cbox === 'on' ? 1 : 0;

                    // var insertQuery = "INSERT INTO users (user_id, username, email, u_password, islocal, offers ) values ( ? ,?, ?, ?, ?)" ;
                    // console.log(insertQuery);
                    connection.execute("INSERT INTO users (user_id, username, email, u_password, islocal, offers ) values (" + "'" + uiid + "'," + "'" + uname + "'," + "'" + email + "'," + "'" + keyP + "',"  + 1 + "," + 1 +");",function(err,rows){
                        if(err){
                            console.log(err)
                        }
                        connection.execute("INSERT INTO profilepic(user_id) values (" + "'" + uiid + "');",function (err,rows) {
                            if(err){
                                console.log(err);
                            }
                        })

                        //console.log(rows)
                        newUserMysql.id = uiid;

                        return done(null, newUserMysql.id);
                    });
                }
            });
        }));



    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form
            console.log(email)

            connection.execute("SELECT * FROM users WHERE email = '" + email + "'",function(err,rows){
                if (err)
                    return done(err);
                if (rows.length == 0) {
                    return done(null, false, req.flash('loginMessage', 'No user found.Try again..')); // req.flash is the way to set flashdata using connect-flash
                }

                var opass = rows[0].u_password;

                if(opass == null){
                    return done(null, false, req.flash('loginMessage', 'Cant use this method for login..Please try another method')); // req.flash is the way to set flashdata using connect-flash
                }
                // if the user is found but the password is wrong
                if (!(decryptPass(password,opass)))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.Try again..')); // create the loginMessage and save it to session as flashdata

                // all is well, return successful user
                //console.log(rows)
                return done(null, rows[0].user_id);

            });



        }));

    var configAuth = require('./auth');

    passport.use(new GoogleStrategy({
            clientID        : configAuth.googleAuth.clientID,
            clientSecret    : configAuth.googleAuth.clientSecret,
            callbackURL     : configAuth.googleAuth.callbackURL,
        },

        function (token,refreshToken,profile,done) {
            //console.log(profile);
            process.nextTick(function () {
               // console.log(profile);


                connection.execute("select * from users where user_id = " + "'" + profile.id + "';",function (err,rows) {
                    if(err){
                        //console.log('errr')
                        return done(err);
                    }
                    if(rows.length){
                        //console.log('reccahh')
                        return done(null,rows[0].user_id);
                    }else{
                        //var profpic = profpic.photos[0].value;
                        connection.execute("INSERT INTO users (user_id, username, email, islocal, offers ) values (" + "'" + profile.id + "'," + "'" + profile.displayName + "'," + "'" + profile.emails[0].value + "',"  + 0 + "," + 1 +");",function(err,rows){
                            if(err){
                               // console.log('exec errr')
                                console.log(err)
                            };
                            //console.log('at last')
                            if(profile.photos != undefined){
                                connection.execute("INSERT INTO profilepic(user_id,photoloc) values (" + "'" + profile.id + "'," + "'" + profile.photos[0].value + "');",function (err,rows) {
                                    if(err){
                                        console.log(err);
                                    }
                                })
                            }
                            return done(null, profile.id);
                        });
                    }
                })
            });
        }

    ));

    passport.use(new FacebookStrategy({

            clientID : configAuth.facebookAuth.clientID,
            clientSecret : configAuth.facebookAuth.clientSecret,
            callbackURL : configAuth.facebookAuth.callbackURL,
            profileFields: ['id', 'displayName', 'picture.type(large)', 'email']
            // profileFields: ['id', 'emails', 'name']
        },

        function (token,refreshToken,profile,done) {

            process.nextTick(function () {
                console.log(profile)
                console.log(profile.id);

                connection.execute("select * from users where user_id = " + "'" + profile.id + "';",function (err,rows) {
                    if(err){
                        //console.log('errr')
                        return done(err);
                    }
                    if(rows.length){
                        //console.log('reccahh')
                        return done(null,rows[0].user_id);
                    }else{
                        //console.log(profile);
                        var query = '';
                        if(profile.emails === undefined){
                           query =  "INSERT INTO users (user_id, username, islocal, offers ) values (" + "'" + profile.id + "'," + "'" + profile.displayName + "'," + 0 + "," + 1 +");"
                        }else{
                            query = "INSERT INTO users (user_id, username, email, islocal, offers ) values (" + "'" + profile.id + "'," + "'" + profile.displayName + "'," + "'" + profile.emails[0].value + "'," + 0 + "," + 1 +");"
                        }
                        connection.execute(query,function(err,rows){
                            if(err){
                                // console.log('exec errr')
                                console.log(err)
                            }
                            if(profile.photos != undefined){
                                connection.execute("INSERT INTO profilepic(user_id,photoloc) values (" + "'" + profile.id + "'," + "'" + profile.photos[0].value + "');",function (err,rows) {
                                    if(err){
                                        console.log(err);
                                    }
                                })
                            }
                            //console.log('at last')
                            return done(null, profile.id);
                        });
                    }
                })

            })
        }

    ))

}

function generateHash(password) {
    return bcrypt.hashSync(password,bcrypt.genSaltSync(8),null);
}

function decryptPass(password,opass) {
    return bcrypt.compareSync(password,opass);
}