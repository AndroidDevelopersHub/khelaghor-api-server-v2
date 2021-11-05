const express = require("express");
const db = require("../../api/db");
const _response = require('../../common/middleware/api-response')
let config = require("../../../middleware/config.json");
let jwt = require('jsonwebtoken');


module.exports = async function (req, res, next) {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];
    jwt.verify(token, config.secret, function (err, decoded) {
        if (err) return res.status(500).send({auth: false, message: 'Failed to authenticate token.'});
        else req.user = decoded.id[0]; next();
    });
}
