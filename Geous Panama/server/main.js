// Server settings
var express = require('express');
var app = express();
var url = '52.20.199.44';
var port = 80;
app.listen(3000, url);
var server = require('http').Server(app).listen(port);
var io = require('socket.io')(server);

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.status(200).send("Hello world");
});

// App Variables

var DriverList = [];

// Socket connection for drivers
var DriverNSP = io.of('/drivers').on('connection', function (driver_socket) {

    // get info about new driver when is online
    driver_socket.on('driver_session', function (data) {

        console.log(data);

        var DriveRoute = data.DriverRoute;
        var driverId = data.userId;

        // var driver_info = {
        //     "DriverRoute": DriveRoute,
        //     "driverId": driverId,
        //     "socket_client_id": driver_socket.client.id
        // }

        if (DriverList.length < 1) {
            // DriverList.push(driver_info)
            DriverList.push({
                DriverRoute         : DriveRoute,
                driverId            : driverId,
                socket_client_id    : driver_socket.client.id
            });
            io.of('users').in(DriveRoute).emit('updateDriverList', DriverList)
            // socket.broadcast.emit('updateDriverList', DriverList);
        } else {
            for (var i = DriverList.length - 1; i >= 0; i--) {
                if (DriverList[i].driverId === data.userId || DriverList[i].socket_client_id === driver_socket.client.id) {
                    driver_socket.disconnect();
                    console.log("DriverList: " + DriverList[i].driverId);
                    console.log("An session already exist for this user or client id " + driver_socket.client.id);
                    console.log("Cancel Driver connection");
                    break;
                } else {
                    DriverList.push({
                        DriverRoute         : DriveRoute,
                        driverId            : driverId,
                        socket_client_id    : driver_socket.client.id
                    });

                    var DriverRouteList = [];
                    DriverRouteList.push(DriverList[DriverList.length-1]);

                    io.of('users').in(DriveRoute).emit('updateDriverList', DriverRouteList)
                    console.log("Update Driver List...");
                }
            }
        }
    });

    // get new location from driver and emit to clients
    driver_socket.on('new_location', function (data) {
        for (var i = DriverList.length - 1; i >= 0; i--) {
            var driver = DriverList[i];
            var DriverRoute = data.DriverRoute;

            if (driver.driverId == data.driverId && DriverList[i].socket_client_id == driver_socket.client.id) {

                if (DriverRoute === driver.DriverRoute) {
                    var location = {
                        DriverRoute     : DriverRoute,
                        driverId        : driver.driverId,
                        driverSocket    : driver.socket_client_id,
                        lat             : data.lat,
                        long            : data.long,
                        rotation        : data.rotation
                    }
                    // socket.broadcast.emit('location', location);
                    io.of('users').in(DriverRoute).volatile.emit('tracking', location)
                    // io.sockets.in('users').emit('message')
                    console.log(location);
                } else {
                    console.log("THE ROUTE " + driver.DriverRoute + " CHANGED TO " + DriverRoute);
                }
                break;
            }
        }
    });

    driver_socket.on('disconnect', function (data) {

        for (var i = DriverList.length - 1; i >= 0; i--) {
            var driver = DriverList[i];
            if (driver.socket_client_id === driver_socket.client.id) {

                driver_socket.disconnect();
                DriverList.splice(i, 1);
                io.of('users').in('test').emit('driverDisconnect', driver)
                console.log("User Disconnected Socket ID: " + driver_socket.id)
                console.log('User Disconnected client ID: ' + driver_socket.client.id);
            }
        }
    });
});

// Socket connection for users
var UserNSP = io.of('/users').on('connection', function (user_socket) {
    // Send list of drivers to the client when new user is connected

    user_socket.on('new_user_connection', function (data) {
        var cliend_id = user_socket.id;
        var roomName = "test";
        user_socket.join(roomName);

        var DriverRouteList = [];

        for (var i = DriverList.length - 1; i >= 0; i--) {
            if(DriverList[i].DriverRoute === roomName){
                DriverRouteList.push(DriverList[i]);
            }
        }
        io.of('/users').in(roomName).volatile.sockets[cliend_id].emit('getDriversList', DriverRouteList)
        console.log("new_user_connection: " + cliend_id + " " + DriverRouteList);
    });

    user_socket.on('JoinRoute', function (data) {
        var cliend_id = user_socket.client.id;
        var roomName = "test";
        user_socket.join(roomName);
        io.to(cliend_id).volatile.emit('getDriversList', DriverList)
    });

    user_socket.on('LeaveRoute', function (data) {
        var cliend_id = user_socket.client.id;
        var roomName = "test";
        user_socket.leave(roomName);
    });

    user_socket.on('disconnect', function (data) {
        user_socket.disconnect();
        console.log("user DISCONNECTED "+user_socket.id)
    })
});

//server.listen(80, function () {
//    console.log("Servidor corriendo en http://" + url + ":" + port);
//});
