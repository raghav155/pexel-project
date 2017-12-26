const {toJson} = require('unsplash-js');

module.exports = function (app,passport,connection,upload,axios) {

    app.get('/',function (req,res) {


        var query = "select photos.user_id, filename, photoloc, username FROM photos INNER JOIN profilepic ON photos.user_id = profilepic.user_id INNER JOIN users ON photos.user_id = users.user_id order by photos.likes;";
        var results;

        //console.log(results)

        new Promise(function (resolve,reject) {
            connection.execute(query,function (err,rows) {
                if(err){
                    console.log(err);
                    reject();
                }else {
                    results = rows;
                    //console.log(results);
                    resolve();
                }
            });

        }).then(function () {
            if(req.user) {
                //console.log(req.user)
                connection.execute("select * from users where user_id = " + "'" + req.user.user_id + "';" , function (err, rows) {
                    if (err) {
                        console.log(err);
                    }else{
                        res.render('index',{data : rows[0],results : results});
                    }
                });

            }else{
                res.render('index',{data : req.user,results: results});
            }

        }).catch(function () {
            res.render('index',{data : req.user,results : undefined});
        });

    });

    app.get('/new-photos',function (req,res) {


        var query = "select photos.user_id, filename, photoloc, username FROM photos INNER JOIN profilepic ON photos.user_id = profilepic.user_id INNER JOIN users ON photos.user_id = users.user_id;";
        var results;

        //console.log(results)

        new Promise(function (resolve,reject) {
            connection.execute(query,function (err,rows) {
                if(err){
                    console.log(err);
                    reject();
                }else {
                    results = rows;
                    //console.log(results);
                    resolve();
                }
            });

        }).then(function () {
            if(req.user) {
                //console.log(req.user)
                connection.execute("select * from users where user_id = " + "'" + req.user.user_id + "';" , function (err, rows) {
                    if (err) {
                        console.log(err);
                    }else{
                        res.render('index',{data : rows[0],results : results});
                    }
                });

            }else{
                res.render('index',{data : req.user,results: results});
            }

        }).catch(function () {
            res.render('index',{data : req.user,results : undefined});
        });

    });

    app.get('/profile/:extname/:id',function (req,res) {
        //console.log(req.params.id)
        var file = req.params.id + "." + req.params.extname;
        var query = "SELECT photos.user_id, filename, username, photoloc, insta_u, facebook_u, google_u, photocount from photos INNER JOIN profilepic ON photos.user_id = profilepic.user_id INNER JOIN users ON photos.user_id = users.user_id WHERE photos.filename = " + "'" + file + "';"

        connection.execute(query,function (err,rows) {
            if(err){
                res.redirect('/');
            }else{
                //console.log(rows)
                if(req.isAuthenticated()) {
                    var q = "select * from likes where filename = " + "'" + file + "' AND user_pid = " + "'" + req.user.user_id + "';";
                    connection.execute(q, function (err, result) {
                        if (err) {
                            res.redirect('/');
                        } else {
                            res.render('userp', {data: rows[0], user: req.user, isliked: result[0]});
                        }
                    })
                }else{
                    res.render('userp', {data: rows[0], user: req.user, isliked: undefined});
                }
            }

        });
    });

    app.get('/login',function (req,res) {
        if(req.user) {
            //console.log(req.user)
            res.redirect('/'); ///change it to profile with  already login message

        }else{

            res.render('login',{message : req.flash('loginMessage')});
        }


    })

    app.get('/register',function (req,res) {
        res.render('register',{message : req.flash('signupMessage')})
    })



    app.post('/register',passport.authenticate('local-signup',{
        successRedirect : '/profile',
        failureRedirect : '/register',
        failureFlash : true
    }));
    //
    app.post('/login',passport.authenticate('local-login',{

        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }));

    app.get('/auth/google',passport.authenticate('google',{scope : ['https://www.googleapis.com/auth/plus.login','profile','email']}));
    app.get('/auth/google/callback',

        passport.authenticate('google',{

            successRedirect : '/profile',
            failureRedirect : '/login'
        })

    );

    app.get('/auth/facebook',passport.authenticate('facebook',{scope : ['public_profile','email']}));

    app.get('/auth/facebook/callback',

        passport.authenticate('facebook',{
            successRedirect : '/profile',
            failureRedirect : '/login'
        })
    );

    app.get('/user/edit-profile',isLoggedIn,function (req,res) {

        connection.execute("select * from profilepic where user_id = " + "'" + req.user.user_id + "';",function (err,rows) {
            if(err){
                console.log(err);
            }
            res.render('editprof',{data : req.user,photoloc : rows[0].photoloc});
        });
    });
    
    app.post('/user/edit-profile',isLoggedIn,function (req,res) {
        //console.log(req.body);
        let uname = req.body.first + " " + req.body.last;
        let offr = req.body.cbox == 'on' ? 1 : 0;
        var query = "update users set username = "  + "'" + uname + "'" ;
        var q1 = '';
        var q2 = "where user_id = " + "'" + req.user.user_id + "';";


        if(req.body.email != undefined){
           q1 = ",email = " + "'" + req.body.email + "', bio = " + "'" + req.body.bio + "', offers = " + offr + ", insta_u = " + "'" + req.body.insta_u + "', facebook_u = " + "'" + req.body.facebook_u + "', google_u = " + "'" + req.body.google_u + "' ";
        }else{
            q1 = ", bio = " + "'" + req.body.bio + "', offers = " + offr + " ";
        }

        connection.execute(query + q1 + q2,function (err,rows) {
            if(err){
                console.log(err);
                res.redirect('/');
            }else{
                req.flash('updateMessage','Your profile has been successfully updated..')
                res.redirect('/profile');///redirect to profile with flash message
            }
        })
    })

    app.get('/profile',isLoggedIn,function (req,res) {
        connection.execute("select * from profilepic where user_id = " + "'" + req.user.user_id + "';",function (err,rows1) {
            if(err){
                console.log(err);
            }

            connection.execute("select * from photos where user_id = " + "'" + req.user.user_id + "';",function (err1,rows) {
                if(err){
                    console.log(err1);
                }else{
                   connection.execute("select count(likes.user_pid) as likecount from likes where likes.user_pid = " + "'" + req.user.user_id + "';",function (errr,result) {
                       if(errr){
                           console.log(errr);
                       }else{
                           res.render('profile',{data : req.user,photoloc : rows1[0].photoloc,message : req.flash('updateMessage'),photos : rows,likecount : result[0].likecount});
                       }
                   })
                }
            })
        });
    });

    app.post('/profile',isLoggedIn,function (req,res) {
        upload(req,res,function (err) {
            if(err){
                console.log(err);
                req.flash('updateMessage','There was some problem uploading your photo..Please Try agian later..');
                res.redirect('/profile');
            }else{
                if(req.file != undefined){
                    //console.log(req.file);
                    var q = "update profilepic set photoloc = " + "'" + "./images/uploads/" + req.file.filename + "'  where user_id = " + "'" + req.user.user_id + "';"
                    connection.execute(q,function (err,rows) {
                        //console.log(rows)
                        req.flash('updateMessage','Profile Picture Updated Successfully..');
                        res.redirect('/profile');
                    });
                }else{
                    req.flash('updateMessage','There was some problem uploading your photo..Please Try agian later..');
                    res.redirect('/profile');
                }
            }
        });
    });

    app.post('/profile/like',function (req,res) {
        if(req.isAuthenticated()){
            //console.log('hiii')
            var likes;
            connection.execute("select likes from photos where filename = " + "'" + req.body.filename + "';",function (err,rows) {
                if(err){
                    console.log(err);
                }else{
                    likes = rows[0].likes;
                   // console.log(likes)
                }
            })
            var query = "select * from likes where filename = " + "'" + req.body.filename + "' AND user_pid = " + "'" + req.user.user_id + "';";

            connection.execute(query,function (err,rows) {
                if(err){
                    console.log(err);
                }else{
                    // console.log(rows)
                    if(rows[0]){
                        var q = "DELETE FROM likes WHERE filename = " + "'" + req.body.filename + "'  AND user_pid = " + "'" + req.user.user_id + "';";
                        connection.execute(q,function (err1,result) {
                            if(err1){
                                console.log(err1);
                            }else {
                                console.log('in here')
                                console.log(result)
                            }
                        });
                        connection.execute("update photos set likes = " + (likes-1) + " where filename = " + "'" + req.body.filename + "';",function (errr,ans) {
                            if(errr){
                                console.log(errr);
                            }
                        });
                    }else{
                        var query2 = "insert into likes(filename,user_pid) values(" + "'" + req.body.filename + "', " + "'" + req.user.user_id + "');";

                        connection.execute(query2,function (err2,rows1) {
                            if(err){
                                console.log(err2);
                            }
                        });
                        connection.execute("update photos set likes = " + (likes+1) + " where filename = " + "'" + req.body.filename + "';",function (errr,ans) {
                            if(errr){
                                console.log(errr);
                            }
                        });
                    }
                }
            });

        }else{
            res.status(404).send({ error: "Something is wrong"});
        }
    });


    app.get('/upload',isLoggedIn,function (req,res) {
        res.render('upload',{data : req.user})
    });

    app.post('/upload',isLoggedIn,function (req,res) {
        upload(req,res,function (err) {
            if(err){
                //console.log(err);
                req.flash('updateMessage',err);
                res.redirect('/profile');
            }else{
                if(req.file != undefined){
                    var query = "insert into photos(user_id,filename,tags) values(" + "'" + req.user.user_id + "'," + "'" + req.file.filename + "'," + "'" + req.body.taglist + "');"
                    var query2 = "select photocount from users where user_id = " + "'" + req.user.user_id + "';";
                    connection.execute(query2,function (err,rows) {
                        var count = rows[0].photocount + 1;
                        var query3 = "update users set photocount = " + "'" + count + "' where user_id = " + "'" + req.user.user_id + "';"
                        connection.execute(query3,function (err,rows) {
                            if(err){
                                console.log(err);
                            }
                        });

                    });
                    connection.execute(query,function (err,rows) {
                        if(err){
                            console.log(err);
                        }else{
                            //console.log(req.body);
                            req.flash('updateMessage','Photo uploaded successfully');
                            res.redirect('/profile');
                        }
                    });
                }
            }
        })
    })

    app.get('/logout',function (req,res) {
        req.logout();
        res.redirect('/');
    });
    
    app.post('/download',function (req,res) {
        //console.log(req.body.filename)
        //var path=require('path');
        var file = req.body.fname;
        //console.log(req.body)
        var path = './public/images/uploads/' + file;
        //console.log(path)
       res.download(path); // magic of download fuction
    });


    app.get('/photo-license',function (req,res) {

            res.render('photolicense',{data : req.user});

    });
    
    app.get('/search/:id',function (req,res) {
        var API_KEY = '7504311-79d557883a8ee8d5acccce48c';
        var URL = "https://pixabay.com/api/?key="+API_KEY+"&q="+encodeURIComponent(req.params.id) + "&per_page=50";

        axios.get(URL)
            .then(function (response) {
                res.render('search',{data : req.user,query : req.params.id,results : response.data.hits});
                //console.log(response.data.hits);
            })
            .catch(function (error) {
                console.log(error);
            });

       // res.render('search',{results : json.results,query : req.params.id,data : req.user});
    })







    function isLoggedIn(req,res,next) {
        if(req.isAuthenticated()){
            return next();
        }else{
            req.flash('loginMessage','Please Login First');
            res.redirect('/login');
        }
    }
}