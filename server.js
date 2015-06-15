var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.use('/static', express.static(__dirname + '/static'));

app.get('/sendEvent', function(req, res) {
  io.sockets.emit("message", {
      "somekindof":"data"
  });
});

io.on('connection', function (socket) {
  socket.emit("message", "CONNECTED");
});

server.listen(80);
