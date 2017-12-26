const express = require('express');
const uid = require('uid');
const bodyparser = require('body-parser');
const cookieparser = require('cookie-parser');
const path = require('path');
const passport = require('passport');
const flash = require('connect-flash');
const mysql = require('mysql2');
const multer = require('multer');
require('isomorphic-fetch');
const axios = require('axios');

const Unsplash = require('unsplash-js').default;

const unsplash = new Unsplash({
    applicationId: "85e7b334524a56f60666a2a56a19a9533e9ff2d44b80d3ff4c57aa8e4053e3d5",
    secret: " df8ed08406448c7337922b9641d1e35a59cda8b28a12aaaf88b8a31a46471a40",
    callbackUrl: "urn:ietf:wg:oauth:2.0:oob"
});

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, uid(10) + '-' + file.fieldname + path.extname(file.originalname))
    }
});
var upload = multer(

    {
        storage: storage,
        fileFilter : function (req,file,cb) {
            checkFileType(file,cb);
        }

    }


).single('myImage');

function checkFileType(file,cb) {
    const filetype = /jpeg|jpg|png|gif/;

    const extname = filetype.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetype.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    }else{
        return cb('Error : Images only');
    }
}





const expresssession = require('express-session');
const app = express();

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'raghav',
    password : '9896266570',
    database: 'dbpexel'
});

app.set('view engine','ejs');


app.use(expresssession({
    secret: "Blah Blah Blah",
    resave : false,
    saveUninitialized : false
}));

app.use(cookieparser());
app.use(bodyparser.urlencoded({extended: true}));
//passport config
app.use(passport.initialize());
app.use(passport.session());//persistent login sessions
app.use(flash());//use connect-flash for flashing messages stored in session
app.use(express.static(path.join(__dirname,'public')));
app.use('/profile/jpeg',express.static(path.join(__dirname,'public')));
app.use('/search',express.static(path.join(__dirname,'public')));

require('./config/passportconfig')(passport,connection);
require('./routes/route')(app,passport,connection,upload,axios);



app.listen(4000,function () {
    console.log('server started on port 4000')
})