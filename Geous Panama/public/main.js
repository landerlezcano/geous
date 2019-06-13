var url = '104.248.63.119';
var socket = io.connect(url, {'forceNew': true});
socket = io('/users');

socket.on('connect', function (Socket) {
    socket.emit("new_user_connection");
});

var map;

map_bus();

function map_bus(){
    L.mapbox.accessToken = 'pk.eyJ1IjoibGFuZGVybGMxNyIsImEiOiJjam5senVnemYwY3NlM3dueGwxYjJ3ZGRmIn0.5BI044FEYZnyXvgJs5Ly5Q';
    // MIT-licensed code by Benjamin Becquet
    // https://github.com/bbecquet/Leaflet.PolylineDecorator
    L.RotatedMarker = L.Marker.extend({
    options: { angle: 0 },
    _setPos: function(pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
        // use the CSS transform rule if available
        this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'deg)';
        } else if (L.Browser.ie) {
        // fallback for IE6, IE7, IE8
        var rad = this.options.angle * L.LatLng.DEG_TO_RAD,
        costheta = Math.cos(rad),
        sintheta = Math.sin(rad);
        this._icon.style.filter += ' progid:DXImageTransform.Microsoft.Matrix(sizingMethod=\'auto expand\', M11=' +
            costheta + ', M12=' + (-sintheta) + ', M21=' + sintheta + ', M22=' + costheta + ')';
        }
    }
    });
    L.rotatedMarker = function(pos, options) {
        return new L.RotatedMarker(pos, options);
    };

    var map = L.mapbox.map('map', 'mapbox.emerald', {
        keyboard: false
    })

    var markers = [];
    var drivers = [];
    var driversFirstLoad = [];

    socket.on('getDriversList', function(data){
        console.log(data);
        drivers = data;
        
    });

    socket.on('test',function(data){
        console.log(data)
    });

    socket.on('updateDriverList', function(data){
        console.log(data);
        drivers.push(data);

    });

    socket.on('driverDisconnect', function(data){
        
        var driverId = data.driverId
        
        for (var i = drivers.length - 1; i >= 0; i--) {
            var drive = drivers[i].driverId
            if(driverId === drive){
                markers[i].remove();
                markers.splice(i,1);
                drivers.splice(i, 1);
                driversFirstLoad.splice(i,1);
                console.log("Removed markers: "+markers.length)
                console.log("Removed drivers: "+drivers.length)
                console.log("Removed driversFirstLoad: "+driversFirstLoad.length)
            }
        }
    });

    socket.on('tracking', function(data){
        console.log("markers: "+markers.length)
        console.log("drivers: "+drivers.length)
        console.log("driversFirstLoad: "+driversFirstLoad.length)
        for (var i = drivers.length - 1; i >= 0; i--) {
            var driversId = drivers[i];
            if(driversId.driverId === data.driverId && driversId.socket_client_id === data.driverSocket){
                

                if(driversFirstLoad[i] === undefined){
                    var isLoad = true;
                    driversFirstLoad.push(isLoad);
                    var marker = L.rotatedMarker(new L.LatLng(data.lat, data.long), {
                        icon: L.divIcon({
                            className: 'svg-marker',
                            html: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path d="M15 6.818V8.5l-6.5-1-.318 4.773L11 14v1l-3.5-.682L4 15v-1l2.818-1.727L6.5 7.5 0 8.5V6.818L6.5 4.5v-3s0-1.5 1-1.5 1 1.5 1 1.5v2.818l6.5 2.5z"/></svg>',
                            iconSize: [40, 40],
                        })
                    });
                    markers.push(marker);
                    marker.addTo(map);
                    map.setView(new L.LatLng(data.lat, data.long),15)
                    console.log("Mark ADD for user: "+driversId.driverId)
                }
                
                if(driversFirstLoad[i] == true){
                    console.log("moving marker: "+driversId.driverId)
                    markers[i].options.angle = data.rotation;
                    markers[i].setLatLng(new L.LatLng(data.lat, data.long));
                }
            }
        }
    });
}