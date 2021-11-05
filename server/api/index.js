var router = require('express').Router();
const today = new Date().toISOString();


router.get('/', (req,res)=>{
    res.send(' '+ today);
})

require('./users')(router)
require('./match')(router)




module.exports = router;


