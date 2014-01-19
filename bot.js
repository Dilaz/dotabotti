// Libs
var irc = require('irc');
//var mongo = require('mongodb');
//var monk = require('monk');
var events = require('events');
var util = require('util');
var Game = require('./game.js');
var User = require('./user.js');

// Db
//var db = monk('localhost:27017/dotabotti');

// Bot module
function Bot(config) {
	// Init events
	events.EventEmitter.call(this);

	this.config = config;
	var self = this;
	this.game = new Game(this.config);

	// Init IRC-client
	this.client = new irc.Client(config.server, config.nick, {
		channels: config.channels,
		realName: config.realName,
		debug: config.debug
	});

	// Add error listener
	this.client.addListener('error', function(message) {
    	console.log('error: ', message);
	});

	// Add listener for messages
	this.client.addListener('message', function(from, to, text, message) {
		// Check if this is a command
		if (text.substr(0, self.config.commandPrefix.length) == self.config.commandPrefix) {
			// Check which command it was
			var words = text.substr(self.config.commandPrefix.length).split(' ');

			// Emit signal containing command, target & arguments
			self.emit('command:' + words[0].toLowerCase(), {
				from: from,
				to: to,
				arguments: words.splice(1).join(' ')
			});
		}
	});

	//
	// COMMANDS
	//

	// Help
	self.on('command:help', function(data) {
		var commands = [ 'stats', 'sign', 'out', 'cancel', 'start', 'accept', 'challenge', 'teams', 'game', 'sides', 'go', 'shuffle', 'pick', 'end' ];
		commands = commands.join(' ' + self.config.commandPrefix).split(' ');
		self.client.say(data.to, 'Type ' + self.config.commandPrefix + 'help <command> for further instructions. Commands: ' + commands.join(', '));
	});

	// Sign
	self.on('command:sign', function(data) {
		self.game.addPlayer(data.from, function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, data.from + ' signed. ' + resp.players.toString() + '/10');
			}
		});
	});

	// Out
	self.on('command:out', function(data) {
		self.game.removePlayer(data.from, function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				// Check if game was canceled
				if (resp.cancelGame) {
					self.client.say(data.to, 'Captain removed. Canceling the game..');
					self.game.cancelGame(function() {
						// ...
					});

					return;
				}

				self.client.say(data.to, data.from + ' removed. ' + resp.players.toString() + '/10');
			}
		});
	});

	// Signed
	self.on('command:signed', function(data) {
		self.game.getPlayers(function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, resp.players);
			}
		});
	});

	// Cancel
	self.on('command:cancel', function(data) {
		self.game.cancel(function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, 'Game canceled.');
			}
		});
	});

	// Start
	self.on('command:start', function(data) {

	});

	// Accept
	self.on('command:accept', function(data) {
		self.game.accept(data.from, function(resp) {
			console.log(resp);
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, 'Starting a new game (draft mode). Captains are ' + resp.radiantCaptain + ' and ' + resp.direCaptain + '.');
			}
		});
	});

	// Challenge
	self.on('command:challenge', function(data) {
		self.game.challenge(data.from, function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, data.from + ' challenged. Type ' + self.config.commandPrefix + 'accept to accept challenge.');
			}
		});
	});

	// Teams
	self.on('command:teams', function(data) {

	});

	// Game
	self.on('command:game', function(data) {

	});

	// Sides
	self.on('command:sides', function(data) {

	});

	// Go
	self.on('command:go', function(data) {

	});

	// Shuffle
	self.on('command:shuffle', function(data) {

	});

	// Pick
	self.on('command:pick', function(data) {

	});

	// End
	self.on('command:end', function(data) {

	});
};

// Bot inherits event emitter
util.inherits(Bot, events.EventEmitter);

// Export Bot as module
module.exports = Bot;
