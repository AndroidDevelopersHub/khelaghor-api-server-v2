const db = require("../../api/db");

module.exports = {

    addDailyBonus: async function(title ,uid ,point){
        const body = {
            title: title,
            uid:uid,
            point: point
        }

        db.query("INSERT INTO daily_bonus SET ?", body , (err, result) => {
            if (!err) {
                return result
            } else {
                return  err
            }
        });

    }


}