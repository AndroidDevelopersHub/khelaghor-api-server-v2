var responsecode = require('../middleware/response-code')
var responsemsg = require('../middleware/response-msg')

module.exports = {
   apiSuccess: function apiSuccess(res, msg , data, pagination){
       return res.status(200).json({
           status: responsecode.statusOk,
           message: msg,
           data: data,
           pagination: pagination
       });
   },

    apiFailed: function apiFailed(res, msg, data){
        return res.status(400).json({
            status: responsecode.statusNo,
            message: msg,
            data: data
        });
    },


    apiWarning: function apiWarning(res, msg,data){
        return res.status(400).json({
            status: responsecode.statusNo,
            message: msg,
            data: data
        });
    },
    apiMaintenance: function apiWarning(res, msg,data){
        return res.status(503).json({
            status: 5,
            message: msg,
            data: data
        });
    }

}
