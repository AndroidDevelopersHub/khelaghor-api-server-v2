const mysql = require("mysql");
const express = require("express");
const app = express();
let bodyParser = require("body-parser");
let nodemailer = require("nodemailer");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const morgan = require("morgan");
const _ = require("lodash");
let multer, storage, path, crypto;
multer = require("multer");
path = require("path");
crypto = require("crypto");
var CronJob = require('cron').CronJob;
let jwt = require("jsonwebtoken");
const config = require("./middleware/config.json"); // refresh
let tokenChecker = require("./middleware/tockenchecker");
const db = require('./server/api/db')
const today = new Date().toISOString();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json({type: "application/*+json"}));


// enable files upload
app.use(
    fileUpload({
        createParentPath: true,
    })
);

app.use(express.static('public'));
app.use('/gallery', express.static('gallery'));

//add other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(express.static("uploads"));
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization');
    next();
});
app.listen(config.port);


// Router
const router = require('./server/api/index')
app.use(router)


app.get("/secure", tokenChecker.checkToken, (req, res) => {
    res.json({
        success: true,
        message: "SecureSite login Successs",
    });
});

var job = new CronJob('0 2 *  * *', function() {
    console.log('You will see this message every second');
    db.query("UPDATE daily_task SET ? ", {createdAt: new Date()} ,(err , result) =>{
        if (!err){
            console.log("Ok")
        }else{
            console.log("Not Ok")
        }
    })

}, null, true, 'America/Los_Angeles');
job.start();



