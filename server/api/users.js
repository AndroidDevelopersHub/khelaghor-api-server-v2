const express = require("express");
const db = require("./db");
const router = express.Router();
let jwt = require("jsonwebtoken");
const config = require("../../middleware/config.json"); // refresh
let tokenChecker = require("../../middleware/tockenchecker");
const tokenList = {};
const _response = require('../common/middleware/api-response')
const responsemsg = require('../common/middleware/response-msg')
const commonStrings = require('../common/middleware/common-strings')
const responsecode = require('../common/middleware/response-code')
const response = require('../common/middleware/api-response')
const Joi = require('@hapi/joi')
const bcrypt = require('bcrypt');
const commonServe = require('../common/services/commonServices')
const validateAuthUser = require('../common/middleware/validateAuthorizeUser')
const isMaintenence = require('../common/middleware/isMaintenence')
const nodemailer = require("nodemailer");


module.exports = function (router) {
    router.post('/user', create);
    router.post('/user-login', login);
    router.get('/user',validateAuthUser, user_list);
    router.put('/user',validateAuthUser, update);
    router.post('/user-balance-update',validateAuthUser, userBalanceUpdate);
    router.get('/user-details',validateAuthUser, details);
    router.post('/send-otp', forgotPassword);
    router.post('/verify-otp', verifyOtp);
    router.delete('/user',validateAuthUser, _delete);
}

async function create(req,res){
    let responseData = {}
    const schema = Joi.object({
        username: Joi.string().required(),
        firstname: Joi.string().required(),
        lastname: Joi.string().required(),
        email: Joi.string().email().required(),
        phone: Joi.string().required(),
        salt: Joi.string().required(),
    });
    const {error} = schema.validate(req.body);
    if (error) return _response.apiFailed(res, error.details[0].message)

    let inputs = req.body;

    try {
        let isExist = await db.awaitQuery("SELECT firstname FROM users WHERE username = '"+inputs.username+"' OR  email = '"+inputs.email+"' OR  phone = '"+inputs.phone+"' ")
        console.log(isExist)
        if (isExist.length === 0){
            inputs.salt = await bcrypt.hash(inputs.salt, 10);

            try {
                await db.awaitQuery("INSERT INTO users SET ? ",inputs)
                let iam = await db.awaitQuery("SELECT * FROM users WHERE email = '"+inputs.email+"' OR username = '"+inputs.username+"' ")
                var token = jwt.sign({ id: iam}, config.secret, {
                    expiresIn: 86400
                });
                responseData = iam[0]
                responseData.token = token
                return _response.apiSuccess(res,"", responseData)

            }catch (e) {
                return  _response.apiWarning(res,e)
            }

        }else {
            return _response.apiWarning(res,responsemsg.alreadyExist)
        }


    }catch (e) {
        console.log(e)
       return  _response.apiWarning(res, e)
    }



}

async function login (req,res){
    let responseData = {}
    let inputs = req.body;

    const schema = Joi.object({
        email: Joi.string().required(),
        salt: Joi.string().required(),
    });
    const {error} = schema.validate(req.body);
    if (error) return _response.apiFailed(res, error.details[0].message)


    try {
        let get_data = await db.awaitQuery("SELECT * FROM users WHERE email = '"+inputs.email+"'");
        if (get_data.length > 0){
            bcrypt.compare(inputs.salt, get_data[0].salt, function(err, result) {
                if (result){
                    var token = jwt.sign({ id: get_data}, config.secret, {
                        expiresIn: 86400
                    });
                    responseData = get_data[0]
                    responseData.token = token
                    return _response.apiSuccess(res,"", responseData)
                }else {
                    return _response.apiWarning(res, "Wrong email or password!")
                }
                // result == true
            });
        }else {
            return _response.apiWarning(res, "user not found!")
        }


        /*let iam = await db.awaitQuery("SELECT * FROM users WHERE email = '"+inputs.email+"' OR username = '"+inputs.username+"' ")
        var token = jwt.sign({ id: iam}, config.secret, {
            expiresIn: 86400
        });
        responseData = iam[0]
        responseData.token = token
        return _response.apiSuccess(res,"", responseData)*/

    }catch (e) {
        return  _response.apiWarning(res,e)
    }


}

async function user_list(req,res){
    if (req.user.type !== 1){
        return _response.apiFailed(res, "Permission denied!")
    }
    let limit = 500;
    let page = 1;
    let totalDocs = 0;
    if (req.query.page) {
        page = req.query.page
    }
    if (req.query.limit) {
        limit = req.query.limit
    }
    let offset = (page - 1) * limit

    try{
        let count = await db.awaitQuery("SELECT COUNT(*) AS total FROM users");
        totalDocs = count[0].total
    }catch (e) {
        return _response.apiFailed(res, e)
    }

    //Search by String
    if (req.query.search_string && req.query.search_string !== '') {

        let a = "%"+req.query.search_string+"%"
        try{
            let result = await db.awaitQuery("SELECT * FROM users WHERE CONCAT(username, email,phone) LIKE '" + a + "' ORDER BY users.id DESC LIMIT " + limit + " OFFSET " + offset + " ")
            if (result.length > 0) {
                return _response.apiSuccess(res, result.length + " " + responsemsg.userFound, result, {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalDocs: totalDocs
                })
            } else {
                return _response.apiFailed(res, responsemsg.userListIsEmpty)
            }
        }catch (e) {
            return _response.apiFailed(res, e)
        }


    } else {
        try{
            let result = await db.awaitQuery("SELECT * FROM users ORDER BY users.id DESC LIMIT " + limit + " OFFSET " + offset + "")
            if (result.length > 0) {
                return _response.apiSuccess(res, result.length + " " + responsemsg.userFound, result, {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalDocs: totalDocs
                })
            } else {
                return _response.apiFailed(res, responsemsg.userListIsEmpty)
            }
        }catch (e) {
            return _response.apiFailed(res, e)
        }
    }
}

async function update(req, res) {
    let formData = []
    delete req.body.raw_balance
    delete req.body.winning_balance
    const saltRounds = 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(req.body.salt, salt);
    delete req.body.salt //= hash
    delete req.body.raw_balance
    delete req.body.winning_balance
    //req.body.hash = salt

    try {
        let result = await db.awaitQuery("SELECT * FROM `users` WHERE uid='" + req.params.id + "'");
        if (result.length > 0) {
            try {
                let result2 = await db.awaitQuery("UPDATE users SET ? WHERE uid='" + req.params.id + "' " , req.body);
                return _response.apiSuccess(res, responsemsg.userUpdateSuccess)
            }catch (e) {
                return _response.apiFailed(res, e)
            }
        }
    }catch (e) {
        return _response.apiFailed(res, e)
    }
}

async function userBalanceUpdate(req,res) {

    // 1 means sum
    // 2 means sub


    // which_balance = 1 means raw balance
    // which_balance = 2 means winning balance
    // which_balance = 3 means winning balance + raw balance

    let cut_balance = parseInt(req.body.new_balance);
    let which_balance = parseInt(req.body.which_balance);
    let sum_or_sub = parseInt(req.body.sum_or_sub);

    let uid;
    if (req.user.type === 0){
        uid = req.user.id
    }else if (req.user.type === 1){
        uid = req.body.id
    }
    let user_info = await db.awaitQuery("SELECT * FROM users WHERE id = "+uid+" ")
    user_info = user_info[0]
    let winning_balance = parseInt(user_info.winning_balance)
    let currentBalance = parseInt(user_info.raw_balance)

    if (which_balance === 1){
        if (sum_or_sub ===1){
            console.log(sum_or_sub)
            let result = await db.awaitQuery("UPDATE `users` SET ?  WHERE id = '" + uid + "' ", {raw_balance: Math.abs(currentBalance + cut_balance).toFixed(0)})
            return _response.apiSuccess(res, "", result)
        }else if (sum_or_sub ===2 ){
            let result = await db.awaitQuery("UPDATE `users` SET ?  WHERE id = '" + uid + "' ", {raw_balance: Math.abs(currentBalance - cut_balance).toFixed(0)})
            return _response.apiSuccess(res, "", result)
        }
    }else if (which_balance === 2){
        if (sum_or_sub ===1){
            console.log(sum_or_sub)
            let result = await db.awaitQuery("UPDATE `users` SET ?  WHERE id = '" + uid + "' ", {winning_balance: Math.abs(winning_balance + cut_balance).toFixed(0)})
            return _response.apiSuccess(res, "", result)
        }else if (sum_or_sub ===2 ){
            let result = await db.awaitQuery("UPDATE `users` SET ?  WHERE id = '" + uid + "' ", {winning_balance: Math.abs(winning_balance - cut_balance).toFixed(0)})
            return _response.apiSuccess(res, "", result)
        }
    }
}

async function details(req, res) {
    if (req.query.lite_data){
        let result;
        if (req.user.type === 0){
            result =  await db.awaitQuery("SELECT id,username,email  FROM `users` WHERE id='" + req.user.id + "'");
        }else if (req.user.type === 1){
            result = await db.awaitQuery("SELECT id,username,email   FROM `users` WHERE id='" + req.query.id + "'");
        }
        if (result.length > 0) {
            return _response.apiSuccess(res, result.length + " " + responsemsg.userFound, result)
        } else {
            return _response.apiWarning(res, responsemsg.userListIsEmpty)
        }
    }
    else {
        let result;
        if (req.user.type === 0){
            result =  await db.awaitQuery("SELECT * FROM `users` WHERE id='" + req.user.id + "'");
        }else if (req.user.type === 1){
            result = await db.awaitQuery("SELECT * FROM `users` WHERE id='" + req.query.id + "'");
        }
        if (result.length > 0) {
            return _response.apiSuccess(res, result.length + " " + responsemsg.userFound, result)
        } else {
            return _response.apiWarning(res, responsemsg.userListIsEmpty)
        }
    }
}

async function _delete(req, res) {
    if (req.user.type !== 1){
        return _response.apiFailed(res, "Permission denied!")
    }
    if (req.query.id) {
        db.query("SELECT * FROM `users` WHERE id='" + req.query.id + "'", (err, result) => {
            if (!result.length) {
                return _response.apiWarning(res, responsemsg.userListIsEmpty)
            } else {
                db.query("DELETE FROM `users` WHERE id='" + req.query.id + "'", (err, result) => {
                    if (!err) {
                        return _response.apiSuccess(res, responsemsg.userDeleteSuccess)
                    } else {
                        return _response.apiFailed(res, err)
                    }
                });
            }

        });
    } else {
        return _response.apiWarning(res, 'Please select id')
    }
}

async function forgotPassword(req,res){
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    let responseData = {}
    const schema = Joi.object({
        email: Joi.string().email(),
    });
    const {error} = schema.validate(req.body);
    if (error) return _response.apiFailed(res, error.details[0].message)


    let otp = await db.awaitQuery("SELECT email,createdAt,id FROM otp WHERE email ='"+req.body.email+"' ")
    if (otp.length > 0){
        await db.awaitQuery("DELETE FROM otp WHERE email ='"+req.body.email+"' ")
        await db.awaitQuery("INSERT INTO otp SET ?",{email: req.body.email,code:randomNumber})
    }else {
        //TODO : Insert
        await db.awaitQuery("INSERT INTO otp SET ?",{email: req.body.email,code:randomNumber})
    }

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'andro.dev.hub@gmail.com',
            pass: '@#$1982gonzoO'
        }
    });

    const mailOptions = {
        from: 'Android Developer Hub', // sender address
        to: req.body.email, // list of receivers
        subject: 'OTP', // Subject line
        html: `${randomNumber}`
    }

    transporter.sendMail(mailOptions, async function (err, info) {
        if(err){
            console.log(err)
            return _response.apiWarning(res,"OTP Send failed")
        }
        else {
           return _response.apiSuccess(res,"OTP Send successfully")
        }
    })


}

async function verifyOtp(req,res){
    const schema = Joi.object({
        otp: Joi.string(),
        email: Joi.string().email(),
        salt: Joi.string().required(),
    });
    const {error} = schema.validate(req.body);
    if (error) return _response.apiFailed(res, error.details[0].message)

    try{
        let result = await db.awaitQuery("SELECT *  FROM otp WHERE email = '"+req.body.email+"' ");
        console.log(result)
        if (result.length>0){
            let saltX = await bcrypt.hash(req.body.salt, 10)
            await db.awaitQuery("UPDATE users SET salt = '"+saltX+"' WHERE email ='"+req.body.email+"' ")
            return _response.apiSuccess(res,"Success")
        }else {
            return _response.apiWarning(res,"not matched")
        }
    }catch (e){
        return _response.apiFailed(res,e)
    }

}








