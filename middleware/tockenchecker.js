let jwt = require('jsonwebtoken');
const config = require('./config.json');

let checkToken = (req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers['authorization'] || ''; // Express headers are auto converted to lowercase

    if (token) {
        if (token.startsWith('Bearer ')) {
            // Remove Bearer from string
            token = token.slice(7, token.length);
        }

        jwt.verify(token, config.secret, (err, decoded) => {
            if (err) {
                res.status(401)
                return res.json({
                    success: false,
                    message: 'Token is not valid'
                });
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        res.status(400)
        return res.json({
            success: false,
            message: 'Auth token required'
        });
    }



};

module.exports = {
    checkToken: checkToken
};
