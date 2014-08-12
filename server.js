'use strict';

// Server config
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var generateName = require('sillyname');

app.set('port', process.env.PORT || 3000);
server.listen(app.get('port'), function() {
    console.log('Listening on: ' + app.get('port'));
});

app.use(express.static(__dirname + '/static'));

// Routers
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Socket functionality
var usernames = {};
var numUsers = 0;
io.on('connection', function(socket) {
	var username = generateName().replace(/\s/g, '_');
	var userHash = {};
	var rooms = [];

	var addedUser = false;

	socket.emit('assign username', { username: username });
	userHash[username] = socket;

	// New messages
	socket.on('new message', function(data) {
		// Separate private messages
		if (data.charAt(0) == '@') {
			console.log('Private message: ' + data.slice(1, data.length));
			var privateUser = data.match(/\S*/)[0].replace(/^@/, '');
			var privateMessage = data.match(/\s.*/);
			if (typeof privateMessage == 'array') {
				privateMessage = privateMessage[0].replace(/^\s/, '');
			} else {
				console.log('NICE TRY not an array');
			}
			// Add *better* error handling: what if there's no msg?
			// console.log('Private user: ' + privateUser);
			// console.log('Private message: ' + privateMessage);
			var roomName = Math.floor((Math.random() * 100) + 1);
			// Check again rooms[] to make sure we're not already using it
			socket.join(roomName); // Corresponds to user who's sending the msg
			var theirSocket = userHash[privateUser];
			console.log('Their socket' + theirSocket);
		} else {
			// Public messages 
			socket.broadcast.emit('new message', {
				username: socket.username,
				message: data
			});
		}
	});

	// Adding users
	socket.on('add user', function(username) {
		socket.username = username;
		usernames[username] = username;
		++numUsers;
		addedUser = true;
		socket.emit('login', {
			numUsers: numUsers
		});

		// Tell everyone that a user has joined
		socket.broadcast.emit('user joined', {
			username: socket.username,
			numUsers: numUsers
		});
	});

	// Typing? Tell everyone
	socket.on('typing', function() {
		socket.broadcast.emit('typing', {
			username: socket.username
		});
	});

	// Stop typing
	socket.on('stop typing', function() {
		socket.broadcast.emit('stop typing', {
			username: socket.username
		});
	});

	// User disconnects
	socket.on('disconnect', function() {
		if (addedUser) {
			delete usernames[socket.username];
			--numUsers;
			socket.broadcast.emit('user left', {
				username: socket.username,
				numUsers: numUsers
			});
		}
	});
});