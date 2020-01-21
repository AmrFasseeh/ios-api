let express = require('express'),
    app = express(),
    // port = 3000;
    port = process.env.PORT;

const { DateTime } = require("luxon");
DateTime.local().setZone('Africa/Cairo');

var now = DateTime.local();
console.log(now.toString());

let d = new Date();
console.log(d);



// let de = momentTZ();
// console.log(de.format());



let md5 = require('md5');
let bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
let mysql = require('mysql');

// Testing 1
// let con = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "",
//     database: "Attendance"
// });

// Testing 2
// let con = mysql.createConnection({
//     host: "localhost",
//     user: "montazad_rmzcrm",
//     password: "",
//     database: "montazad_rmzcrm"
// });

// Live Database
let con = mysql.createConnection({
    host: "70.40.220.120",
    user: "montazad_attend",
    password: "@Rmz2020",
    database: "montazad_attend",
    port: "3306"
});

let connection;

function handleDisconnect() {
    connection = mysql.createConnection(con); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}


con.connect(function (err) {
    // handleDisconnect();
    if (err) throw err;
    console.log("Connected!");

    // Checks the database for the user
    // Returns usernameCheck and passwordCheck in JSON
    // The 2 values are Boolean values
    app.post('/login', (req, res) => {
        let sql = "SELECT * from users";
        let userData;
        console.log(req.body);
        if (req.body) {
            console.log("Requested");
        }
        con.query(sql, function (err, result) {
            if (err) throw err;
            let passwordCheck = false;
            let usernameCheck = false;
            for (let i = 0; i < result.length; i++) {
                if (result[i].username == req.body.username) {
                    usernameCheck = true;
                    if (result[i].password == req.body.password) {
                        passwordCheck = true;
                        userData = result[i]
                        console.log(userData);
                    }
                }

            }

            if (usernameCheck && passwordCheck) {
                let message = '{ "usernameCheck":"True", "passwordCheck":"True", "name": '.concat('"', userData.fullname, '", "id": "',
                    userData.id, '"', '}');
                let loginPassed = JSON.parse(message);
                res.send(loginPassed);
            } else if (usernameCheck) {
                res.send(JSON.parse('{ "usernameCheck":"True", "passwordCheck":"False"}'));
            } else {
                let loginFailed = JSON.parse('{ "usernameCheck":"False", "passwordCheck":"False"}');
                res.send(loginFailed);
            }
        });
    });

    // This checks if the user has already checked in today or not
    // This returns logged_in_today and logged_out_today in JSON
    // The 2 values are Boolean values
    app.post('/check', (req, res) => {
        let ip = req.ip;
        ip = ip.replace("::ffff:", "");
        let checkInQuery = "SELECT * FROM us_record where user_id = '" + req.body.id + "' " +
            "ORDER BY login_time_record DESC LIMIT 1";
        console.log(checkInQuery);
        con.query(checkInQuery, function (err, result) {
            if (err) throw err;
            if (result.length === 0) { // If the user logged in for the first time

                let queryResult = '{ "logged_in_today": "False", ' +
                    ' "logged_out_today": "False" }';
                console.log(queryResult);
                let query1 = "SELECT * FROM logup where user_logup = " + req.body.id;
                con.query(query1, function (err1, result1) {
                    if (err1) throw err1;
                    if (result1.length === 0) {
                        let insertQuery = "INSERT INTO logup " +
                            "(user_logup, time_logup, ip_logup) value " +
                            "(" + req.body.id + ", '0000000000', '" + ip + "')";
                        console.log(insertQuery);
                        // let insertUsRecordQuery = "INSERT INTO us_record (user_id, sv_record) VALUE " +
                        //     " (" + req.body.id + ", 0)";

                        con.query(insertQuery, function (err2, result2) {
                            if (err2) throw err2;
                            console.log(result2);
                        });
                        // con.query(insertUsRecordQuery, function (err3, result3) {
                        //     if (err3) throw err3;
                        //     console.log(result3);
                        // });
                    }
                })
                res.send(JSON.parse(queryResult));
            } else {
                let i;
                let userData = result[0];

                let loginTime = Number(userData.login_time_record + "000");
                let logoutTime = Number(userData.logout_time_record + "000");
                let today = new Date().setHours(0, 0, 0, 0);
                let loginDate = new Date(loginTime).setHours(0, 0, 0, 0);
                let logoutDate = new Date(logoutTime).setHours(0, 0, 0, 0);

                if (today === loginDate) {
                    console.log("*** Same day ***");
                }

                console.log(userData);
                console.log(loginTime);

                let queryResult = '{ "LoginTimeRecord": "' + userData.login_time_record +
                    '", "LogoutTimeRecord": "' + userData.logout_time_record + '",' +
                    '"login_yr_record": "' + userData.login_yr_record + '", ' +
                    '"login_mo_record": "' + userData.login_mo_record + '", ' +
                    '"login_dy_record": "' + userData.login_dy_record + '", ' +
                    '"login_hr_record": "' + userData.login_hr_record + '", ' +
                    '"login_mn_record": "' + userData.login_mn_record + '", ' +
                    '"login_sc_record": "' + userData.login_sc_record + '"';

                if (today === loginDate) {
                    queryResult += ', "logged_in_today": "True", ';
                } else {
                    queryResult += ', "logged_in_today": "False", ';
                }

                if (today === logoutDate) {
                    queryResult += '"logged_out_today": "True" ';
                } else {
                    queryResult += '"logged_out_today": "False" ';
                }

                queryResult += '}';

                console.log(queryResult);

                res.send(JSON.parse(queryResult));
            }
        })
    });

    setInterval(function () {
        con.query('SELECT 1');
    }, 5000);

    // This basically inserts/updates some value in the database to display the QR code on the webpage
    app.post('/displayQR', (req, res) => {
        console.log("Here");

        let check6 = "";

        let checkQuery = "SELECT * FROM us_record WHERE user_id = " + req.body.id +
            " ORDER BY login_time_record DESC LIMIT 1";

        con.query(checkQuery, function (err, result) {
            if (err) throw err;
            console.log("Result is ");
            console.log(result[0]);
            console.log("Done");
            // console.log(result[0].login_time_record);
            if (!(result.length === 0)) {
                console.log(result[0].login_time_record);
                let loginTime10 = Number(result[0].login_time_record + "000");
                console.log("Here");
                console.log(result[0].login_time_record);
                let logoutTime10 = Number(result[0].logout_time_record + "000");
                let today = new Date().setHours(0, 0, 0, 0);
                let loginDate10 = new Date(loginTime10).setHours(0, 0, 0, 0);
                let logoutDate10 = new Date(logoutTime10).setHours(0, 0, 0, 0);

                if (loginDate10 === today && logoutDate10 === today) {
                    check6 = "asdsa";
                    console.log("Thank You" + check6);
                } else if (loginDate10 === today) {
                    check6 = "check_out";
                    console.log(check6);
                } else {
                    console.log(loginDate10);
                    console.log(today);

                    check6 = "check_in";
                    console.log(check6);
                }
            } else {
                let today = new Date().setHours(0, 0, 0, 0);
                // console.log(loginDate10);
                console.log(today);

                check6 = "check_in";
                console.log(check6);
            }
            let check = check6;

            let findUser;
            if (check == "check_in") {
                console.log("logup");
                findUser = "select * from logup where user_logup = " + req.body.id;
            } else if (check == "check_out") {
                console.log("logout");
                findUser = "select * from logout where user_logup = " + req.body.id;
            }
            console.log(findUser);

            let ip = req.ip;
            ip = ip.replace("::ffff:", "");
            let rand = Math.floor(Math.random() * 1000000);
            let time = Math.floor(Date.now() / 1000);
            let key = md5(time + "-" + rand + "-" + ip);
            con.query(findUser, function (err, result) {
                if (err) throw err;
                console.log(result);
                let insertQuery;

                if (result.length === 0) { // If the user logged in for the first time
                    if (check == "check_in") {
                        insertQuery = "insert into logup " +
                            "(user_logup, time_logup, ip_logup, status_logup, key_logup) value" +
                            "(" + req.body.id + ", '" + time + "', '" +
                            ip + "', " + "1" + ", '" + key + "')";
                    } else if (check == "check_out") {
                        insertQuery = "insert into logout " +
                            "(user_logup, time_logup, ip_logup, status_logup, key_logup) value" +
                            "(" + req.body.id + ", '" + time + "', '" +
                            ip + "', " + "1" + ", '" + key + "')";
                    }
                    con.query(insertQuery, function (err, result1) {
                        // if (err) throw err;
                        if (err) {
                            handleDisconnect();
                        }
                        console.log(result1);
                        res.send(result1);
                    });
                } else {
                    if (check == "check_in") { // The following query makes the qrcode to appear on the page
                        insertQuery = "update logup set " +
                            "time_logup = '" + time +
                            "', ip_logup = '" + ip +
                            "', status_logup = 1" +
                            ", key_logup = '" + key +
                            "' where user_logup = " + req.body.id;
                    } else if (check == "check_out") { // The following code makes the qrcode to appear on the page
                        insertQuery = "update logout set " +
                            "time_logup = '" + time +
                            "', ip_logup = '" + ip +
                            "', status_logup = 1" +
                            ", key_logup = '" + key +
                            "' where user_logup = " + req.body.id;
                    }
                    console.log(insertQuery);

                    con.query(insertQuery, function (err, result1) {
                        // if (err) throw err;
                        if (err) {
                            handleDisconnect();
                        }
                        console.log(result1);
                        res.send(result1);
                    })
                }
            });
        });

    });

    // If the keys match then this will check the user in
    app.post('/checkIn', (req, res) => {
        let key = req.body.key.substr(req.body.key.length - 32);
        let id = req.body.id;
        let name = req.body.name;
        console.log("Key = " + key);
        let sqlQuery = "SELECT * FROM logup WHERE user_logup = " + id;
        con.query(sqlQuery, function (err, result) {
            if (err) throw err;
            console.log(result[0].key_logup);

            if (result.length === 0) {
                res.send('{ "key_verified": "False" }');
            } else if (result.length === 1) {
                if (result[0].key_logup == key) {
                    let time = Date.now();
                    let year = new Date(time).getFullYear();
                    let month = new Date(time).getMonth() + 1;
                    let day = new Date(time).getDate();
                    let hour = new Date(time).getHours();
                    let minute = new Date(time).getMinutes();
                    let second = new Date(time).getSeconds();
                    time = Math.floor(time / 1000);

                    if (month < 10) {
                        month = "0" + month;
                    }
                    if (day < 10) {
                        day = "0" + day;
                    }
                    if (hour < 10) {
                        hour = "0" + hour;
                    }
                    if (minute < 10) {
                        minute = "0" + minute;
                    }
                    if (second < 10) {
                        second = "0" + second;
                    }
                    console.log(year);
                    console.log(month);
                    console.log(day);
                    console.log(hour);
                    console.log(minute);
                    console.log(second);

                    let updateQuery = "INSERT INTO us_record (user_id, name_record, login_time_record, login_yr_record, login_mo_record, " +
                        " login_dy_record, login_hr_record, login_mn_record, login_sc_record) VALUE " +
                        " (" + id + ", '" + name + "', '" + time + "', '" + year + "', '" + month + "', '" + day + "', '" + hour + "', '" + minute + "', '" + second + "')";
                    console.log(updateQuery);
                    con.query(updateQuery, function (err, result1) {
                        if (err) throw err;
                        console.log(result1);
                    })

                    // Make the status to zero to make the qrcode disappear
                    let statusQuery = "UPDATE logup SET status_logup = 0 WHERE user_logup = " + id;
                    con.query(statusQuery, function (err, result1) {
                        if (err) throw err;
                        console.log(result1);
                    });

                    res.send('{ "key_verified": "True" }');
                } else {
                    res.send('{ "key_verified": "False" }');
                }
            }

        });
    });

    // If the keys match then this will check the user out
    app.post('/checkOut', (req, res) => {
        console.log("Check Out");

        let key = req.body.key.substr(req.body.key.length - 32);
        let id = req.body.id;
        console.log("Key = " + key);
        let sqlQuery = "SELECT * FROM logout WHERE user_logup = " + id;
        console.log(sqlQuery);

        con.query(sqlQuery, function (err, result) {
            if (err) throw err;
            if (result.length === 0) {
                res.send('{ "key_verified": "False" }');
            } else if (result.length === 1) {
                if (result[0].key_logup == key) {
                    let time = Date.now();
                    let year = new Date(time).getFullYear();
                    let month = new Date(time).getMonth() + 1;
                    let day = new Date(time).getDate();
                    let hour = new Date(time).getHours();
                    let minute = new Date(time).getMinutes();
                    let second = new Date(time).getSeconds();
                    time = Math.floor(time / 1000);

                    if (month < 10) {
                        month = "0" + month;
                    }
                    if (day < 10) {
                        day = "0" + day;
                    }
                    if (hour < 10) {
                        hour = "0" + hour;
                    }
                    if (minute < 10) {
                        minute = "0" + minute;
                    }
                    if (second < 10) {
                        second = "0" + second;
                    }
                    console.log(year);
                    console.log(month);
                    console.log(day);
                    console.log(hour);
                    console.log(minute);
                    console.log(second);

                    let updateQuery = "UPDATE us_record SET " +
                        "logout_time_record = '" + time +
                        "', logout_yr_record = '" + year +
                        "', logout_mo_record = '" + month +
                        "', logout_dy_record = '" + day +
                        "', logout_hr_record = '" + hour +
                        "', logout_mn_record = '" + minute +
                        "', logout_sc_record = '" + second +
                        "' WHERE user_id = " + id +
                        " ORDER BY login_time_record DESC LIMIT 1";
                    console.log(updateQuery);
                    con.query(updateQuery, function (err, result1) {
                        if (err) throw err;
                        console.log(result1);

                    });

                    // Make the status to zero to make the qrcode disappear
                    let statusQuery = "UPDATE logout SET status_logup = 0 WHERE user_logup = " + id;
                    con.query(statusQuery, function (err, result) {
                        if (err) throw err;
                        console.log(result);
                    });

                    res.send('{ "key_verified": "True" }');
                } else {
                    res.send('{ "key_verified": "False" }');
                }
            }
        });
    });

    // This basically fetches attendance record from the database
    app.post('/getUserData', (req, res) => {
        let id = req.body[0].id;
        var today = new Date();
        let month;
        if (req.body[0].month) {
            month = req.body[0].month;
        } else {
            month = today.getMonth();
        }
        let year;
        if (req.body[0].year) {
            year = req.body[0].year;
        } else {
            year = today.getFullYear();
        }
        console.log(id);
        console.log(month);
        console.log(year);

        let query = "select * from us_record where user_id = " + id + " and " +
            "login_yr_record = " + year + " and login_mo_record = " + month + " order by id desc";

        con.query(query, function (err, result) {
            if (err) throw err;
            let i;
            for (i = 0; i < result.length; i++) {
                console.log(result[i]);
            }
            // console.log(result);
            res.send(result);
        });
        // res.send("Hello");
    });

    app.listen(port);

    console.log('API server started on: ' + port);
});

