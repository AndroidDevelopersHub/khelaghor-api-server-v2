const mysql = require("mysql-await");
const path = require('path')
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
})
let whichServer = 23;  // 1 for Dev server 2 for Local server
let connection = null;
if (whichServer === 1) {
    // Dev
   /* connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT
    }); */
    // Dev
    connection = mysql.createConnection({
        host: "127.0.0.1 ",
        user: "andrmgvf_game",
        password: "1982gonzoO",
        database: "andrmgvf_game",
        port: "3306"
    });
} else {
    //Local
    connection = mysql.createConnection({
        /*host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD, // "" , "root"
        database: process.env.DATABASE,
        port: process.env.PORT*/

        host: "localhost",
        user: "root",
        password: "123456",
        database: "khelaghor",
        port: 8889

    });
}
connection.connect((err) => {
    if (err) throw err;
    console.log("Connected!");
});


module.exports = connection;
