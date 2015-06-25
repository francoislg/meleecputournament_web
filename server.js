var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var LoginManager = require("./server/LoginManager");
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/myproject';

app.use('/dist', express.static(__dirname + '/dist'));

app.get('/sendEvent', function(req, res) {
  io.sockets.emit("message", {
      "somekindof":"data"
  });
  res.end("received");
});

app.post("/signin", function(req, res){
    var params = req.body;
    res.end(token);
});

io.on('connection', function (socket) {
  socket.emit("message", "CONNECTED");
});

server.listen(3000);
