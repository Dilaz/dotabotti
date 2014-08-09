// Libs
var irc = require('irc');
//var mongo = require('mongodb');
//var monk = require('monk');
var events = require('events');
var util = require('util');
var Game = require('./game.js');
var User = require('./user.js');
var commands = require('./commands.json');

// Db
//var db = monk('localhost:27017/dotabotti');

// Bot module
function Bot(config) {
	// Init events
	events.EventEmitter.call(this);

	this.config = config;
	var self = this;
	this.game = new Game();

	this.activityTimer = null;
	this.gameChannel = null;

	// Function to set the game cancel -timer
	self.resetTimer = function() {
		if (self.activityTimer) {
			clearTimeout(self.activityTimer);
		}

		self.activityTimer = setTimeout(function() {
			self.client.say(self.gameChannel, 'Game will be canceled in 1 minute. You can reset the timer by ' + self.config.commandPrefix + 'sign or ' + self.config.commandPrefix + 'reset');
			self.activityTimer = setTimeout(function() {
				self.emit('command:cancel', {to: self.gameChannel});
			}, 60000);
		}, self.config.gameCancelTimer * 60000);
	}
	self.endTimer = function() {
		if (self.activityTimer) {
			clearTimeout(self.activityTimer);
			self.activityTimer = null;
		}
	}

	// Init IRC-client
	this.client = new irc.Client(config.server, config.nick, {
		channels: config.channels,
		realName: config.realName,
		debug: config.debug,
		floodProtection: true
	});

	// Add error listener
	this.client.addListener('error', function(message) {
    	console.log('error: ', message);
	});

	this.client.addListener('raw', function(message) {
		// Nick in use
		if (message.command == '437') {
			// Change nick to altNick
			self.client.send('NICK', self.config.altNick);
		}
	});

	// Add listener for messages
	this.client.addListener('message', function(from, to, text, message) {
		// Make sure this is on a channel
		if (to[0] != '#') {
			// Ignore it
			return;
		}

		// Check if this is a command
		if (text.substr(0, self.config.commandPrefix.length) == self.config.commandPrefix) {
			// Check which command it was
			var words = text.substr(self.config.commandPrefix.length).split(' ');

			// Emit signal containing command, target & arguments
			self.emit('command:' + words[0].toLowerCase(), {
				from: from,
				to: to,
				args: words.splice(1)
			});
		}
	});

	// Add listener for nick change
	this.client.addListener('nick', function(oldnick, newnick, channels, message) {
		// Check if current game has player with that name
		for (var i in self.game.players) {
			if (self.game.players[i].name == oldnick) {
				// Change the name
				self.game.players[i].name = newnick;

				// Check draft pool
				for (var j in self.game.draft.players) {
					if (self.game.draft.players[j] == oldnick) {
						self.game.draft.players[j] = newnick;
						break;
					}
				}

				// Check radiant team 
				for (var j in self.game.radiantPlayers) {
					if (self.game.radiantPlayers[j] == oldnick) {
						self.game.radiantPlayers[j] = newnick;
						break;
					}
				}

				// Check dire team 
				for (var j in self.game.direPlayers) {
					if (self.game.direPlayers[j] == oldnick) {
						self.game.direPlayers[j] = newnick;
						break;
					}
				}

				// Check captains
				if (self.game.radiantCaptain == oldnick) {
					self.game.radiantCaptain = newnick;
				}
				else if (self.game.direCaptaina == oldnick) {
					self.game.direCaptain = newnick;
				}

				// Also check picking captain
				if (self.game.draft.pickingCaptain == oldnick) {
					self.game.draft.pickingCaptain = newnick;
				}

				// Done
				break;
			}
		}
	});

	// Add command name and prefix to command help
	for (var command in commands) {
		commands[command] = commands[command]
			.replace('_COMMAND_', this.config.commandPrefix + command)
			.replace('_PREFIX_', this.config.commandPrefix);
	}


	//
	// COMMANDS
	//

	// Help
	self.on('command:help', function(data) {
		var command = data.args[0];
		// Check if command is given
		if (command) {
			// Remove prefix from command
			if (command.indexOf(self.config.commandPrefix) == 0) {
				command = command.substr(self.config.commandPrefix.length);
			}

			// Check if command exists
			if (typeof(commands[command]) == 'undefined') {
				self.client.say(data.to, "Unknown command");
			}
			else {
				console.log(command.indexOf(self.config.commandPrefix));
				self.client.say(data.to, commands[command]);
			}
		}
		// List all commands
		else {
			var commandString = '';
			var commandList = [];
			for (var command in commands) {
				commandList.push(self.config.commandPrefix + command);
			}
			commandString = commandList.join(', ');
			self.client.say(data.to, 'Type ' + self.config.commandPrefix + 'help <command> for further instructions. Commands: ' + commandString);
		}
	});

	// Sign
	self.on('command:sign', function(data) {
		self.resetTimer();

		self.game.addPlayer(data.from, function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				// Check if game should be started
				if (resp.startGame) {
					self.emit('command:start', data);
				}
				else {
					self.client.say(data.to, data.from + ' signed. (' + resp.players.toString() + '/10)');
					if (resp.players == 10) {
						if (self.game.gamemode == self.game.Gamemode.shuffle) {
							self.client.say(data.to, "Game is full. You can start with " + self.config.commandPrefix + "go or shuffle teams again with " + self.config.commandPrefix + 'shuffle.');
							self.emit('command:shuffle', data);
						}
						else {
							self.client.say(data.to, 'Game is full. Draft starts. ' + self.game.Teams[self.game.draft.pickingTeam] + '\'s turn to pick. Captain: ' + self.game.draft.pickingCaptain);
							self.client.say(data.to, 'Available players: ' + self.game.draft.players.join(', '));
						}
					}
				}
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
				self.client.say(data.to, data.from + ' removed. (' + resp.players.toString() + '/10)');

				// Check if game was canceled
				if (resp.cancelGame) {
					self.client.say(data.to, 'Captain removed. Canceling the game..');
					self.emit('command:cancel', data);

				}
				else if (resp.players == 0) {
					self.client.say(data.to, 'No players signed. Canceling the game..');
					self.emit('command:cancel', data);
				}
				else if (resp.returnToSignup) {
					if (self.game.gamemode == self.game.Gamemode.shuffle) {
						self.client.say(data.to, 'Game was full and a player left. Returning to signup');
					}
					else {
						self.client.say(data.to, 'Draft canceled. Returning to signup');
					}
				}
			}
		});
	});

	// Signed
	self.on('command:signed', function(data) {
			return self.client.say(data.to, 'hv.');
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
		self.endTimer();
		self.game.cancel(function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, 'Game canceled');
			}
		});
	});

	// Start
	self.on('command:start', function(data) {
		self.resetTimer();
		self.gameChannel = data.to;
		self.game.start(function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, 'Starting a new game (shuffle mode)');

				// Also sign up current user
				self.emit('command:sign', data);
			}
		});
	});

	// Accept
	self.on('command:accept', function(data) {
		self.resetTimer();
		self.game.accept(data.from, function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, 'Starting a new game (draft mode). Captains are ' + resp.radiantCaptain + ' and ' + resp.direCaptain);
			}
		});
	});

	// Challenge
	self.on('command:challenge', function(data) {
		self.resetTimer();
		self.gameChannel = data.to;
		self.game.challenge(data.from, function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, data.from + ' challenged. Type ' + self.config.commandPrefix + 'accept to accept challenge');
			}
		});
	});

	// Teams
	self.on('command:teams', function(data) {
		self.game.teams(function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, "[Radiant]: " + resp.radiantPlayers + " [Dire]: " + resp.direPlayers);
			}
		});
	});

	// Game
	self.on('command:game', function(data) {
		self.client.say(data.to, 'Mitä odotit et tästä tapahtuu? :|');
	});

	// Sides
	self.on('command:sides', function(data) {
		self.resetTimer();
		self.game.sides(data.args[0], function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, "[Radiant]: " + resp.radiantPlayers + " [Dire]: " + resp.direPlayers);
			}
		});
	});

	// Go
	self.on('command:go', function(data) {
		self.endTimer();
		self.game.go(data.from, function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, 'GAME ON. GL HF BIG PLAYS!!1');
			}
		});
	});

	// Shuffle
	self.on('command:shuffle', function(data) {
		self.resetTimer();
		self.game.shuffle(function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, '[Radiant]: ' + resp.radiantPlayers + ' [Dire]: ' + resp.direPlayers);
			}
		});
	});

	// Pick
	self.on('command:pick', function(data) {
		self.resetTimer();
		self.game.pick(data.from, data.args[0], function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, '[Radiant]: ' + self.game.radiantPlayers.join(', ') + ' [Dire]: ' + self.game.direPlayers.join(', '));

				// Check if draft is done
				if (self.game.draft.players.length == 0) {
					self.client.say(data.to, 'Draft is done. You can start the game with ' + self.config.commandPrefix + 'go');
				}
				else {
					self.client.say(data.to, self.game.Teams[self.game.draft.pickingTeam] + '\'s turn to pick. Captain: ' + self.game.draft.pickingCaptain);
					self.client.say(data.to, 'Available players: ' + self.game.draft.players.join(', '));
				}
			}
		});
	});

	// End
	self.on('command:end', function(data) {
		self.endTimer();
		self.game.end(data.args[0], function(resp) {
			if (resp.error) {
				self.client.say(data.to, 'Error: ' + resp.message);
			}
			else {
				self.client.say(data.to, 'Game ended. Winner is ' + resp.winner + '!');
			}
		});
	});

	// Status
	self.on('command:status', function(data) {
		var gamestate = null;
		var gamemode = null;

		// Get gamestate
		for (var key in self.game.Gamestate) {
			if (self.game.Gamestate[key] == self.game.gamestate) {
				gamestate = key;
				break;
			}
		}

		// Get gamemode
		for (var key in self.game.Gamemode) {
			if (self.game.Gamemode[key] == self.game.gamemode) {
				gamemode = key;
				break;
			}
		}
		
		self.client.say(data.to, 'Gamestate: ' + gamestate + ', Gamemode: ' + gamemode + ', Players signed: ' + self.game.players.length + '/10');
	});

	// Reset
	self.on('command:reset', function(data) {
		if (self.game.gamestate != self.game.Gamestate.ended) {
			self.resetTimer();
			self.client.say(data.to, 'Timer cleared');
		}
		else {
			self.client.say(data.to, 'Error: Invalid gamestate');
		}
	});
};

// Bot inherits event emitter
util.inherits(Bot, events.EventEmitter);

/**
 * Reloads bot's configs
 * @param  {Object} config New configs
 */
Bot.prototype.reloadConfigs = function(config) {
	console.log('New configs:');
	console.log(config);
	this.config = config;
}


// Export Bot as module
module.exports = Bot;
