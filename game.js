// Libs
var User = require('./user.js');

// Game object
function Game(config) {
	// Gamestate enum
	this.Gamestate = {
		challenged : 0,
		accepted : 1,
		signup : 2,
		draft : 3,
		shuffle : 4,
		balance : 5,
		live : 6,
		ended : 7
	};

	// Gamemode enum
	this.Gamemode = {
		draft : 0,
		shuffle : 1
	};

	// Variables
	this.config = config;
	this.gamestate = this.Gamestate.ended;
	this.gamemode = this.Gamemode.draft;
	this.players = [];
	this.direPlayers = [];
	this.radiantPlayers = [];
	this.radiantCaptain = null;
	this.direCaptain = null;

	this.shufflePlayers = function() {
		// ?? :D
		for(var j, x, i = this.players.length; i; j = Math.floor(Math.random() * i), x = this.players[--i], this.players[i] = this.players[j], this.players[j] = x);
	}

	this.splitTeams = function() {
		// Copy list
		var list = this.players.concat();
		this.radiantPlayers = list.splice(0,5);
		this.direPlayers = list;
	}
};

//
// Methods
//

/**
 * Add player to the game
 * @param string   user     Player name to be added
 * @param {Function} callback Callback function to call after fail or success
 */
Game.prototype.addPlayer = function(user, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.signup) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}
	// Check player amount
	else if (this.players.length == 10) {
		return callback({
			error: true,
			message: "Game is full"
		});
	}

	// Check if player is already in the game
	for (var i in this.players) {
		if (this.players[i].name == user) {
			return callback({
				error: true,
				message: "You have already signed"
			});
		}
	}

	// Add player to list
	this.players.push(new User(user));

	// Yay, done
	callback({
		error: null,
		players: this.players.length
	});
}

Game.prototype.removePlayer = function(user, callback) {
	// Check if player is captain
	if ((this.radiantCaptain != null && user == this.radiantCaptain.name)
	 || (this.direCaptain != null && user == this.direCaptain.name)) {
		// Done.
		return callback({
			error: null,
			cancelGame: true
		});
	}

	// Check game state
	if (this.gamestate != this.Gamestate.signup) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Check if player is in the game
	for (var i in this.players) {
		if (this.players[i].name == user) {
			// Remove player from list and return
			this.players.splice(i, 1);

			// Done
			return callback({
				error: null,
				players: this.players.length
			});
		}
	}

	// Player not found
	callback({
		error: true,
		message: "You haven't signed"
	});
}

Game.prototype.challenge = function(user, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.ended) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Change game mode
	this.gamemode = this.Gamemode.shuffle;

	// Add player to list
	var newUser = new User(user);
	this.players.push(newUser);

	// Add player as radiant captain
	this.radiantCaptain = newUser;

	// Change game state
	this.gamestate = this.Gamestate.challenged;

	// Yay, done
	callback({
		error: null
	});
}

Game.prototype.accept = function(user, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.challenged) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Check if user is already challenger
	if (user == this.radiantCaptain.name) {
		return callback({
			error: true,
			message: user + " is already a captain"
		});
	}

	// Add player to list
	var newUser = new User(user);
	this.players.push(newUser);

	// Add player as radiant captain
	this.direCaptain = newUser;

	// Change game state
	this.gamestate = this.Gamestate.signup;

	// Yay, done
	callback({
		error: null,
		radiantCaptain: this.radiantCaptain.name,
		direCaptain: this.direCaptain.name
	});
}

// Name obfuscation function to disable highlight
function obfuscate_name(name) {
	return '[' + name[0] + ']' + name.substr(1);
}

Game.prototype.getPlayers = function(callback) {
	// Check if list is empty
	if (this.players.length == 0) {
		return callback({
			error: null,
			players: "No players signed up"
		});
	}

	// Get list of players
	var list = [];
	for (var i in this.players) {
		list.push(obfuscate_name(this.players[i].name));
	}

	// Return list of nicks
	callback({
		error: null,
		players: list.join(' ') + ' (' + this.players.length + '/10)'
	});
}

Game.prototype.cancel = function(callback) {
	// Check game state
	if (this.gamestate == this.Gamestate.ended) {
		// No game to cancel, carry on
		return callback({
			error: true,
			message: "No game to cancel"
		});
	}

	// Remove captains
	this.direCaptain = null;
	this.radiantCaptain = null;

	// Remove players
	this.players.forEach(function(player) {
		delete player;
	});
	this.players = [];

	// Remove teams
	this.radiantPlayers = [];
	this.direPlayers = [];

	// Reset gamestate
	this.gamestate = this.Gamestate.ended;

	// Yay, done
	callback({
		error: null
	});
}

Game.prototype.go = function(user, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.signup) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Check players
	if (this.players.length != 10) {
		return callback({
			error: true,
			message: "Game is not full"
		});
	}

	// Check that user is in the game
	var found = false;
	this.players.forEach(function(player) {
		if (player.name == user) {
			found = true;
			return;
		}
	});
	if (!found) {
		return callback({
			error: true,
			message: user + " is not in the game"
		});
	}

	// If this is draft, start drafting
	if (this.gamemode == this.Gamemode.drafting) {
		this.gamestate = this.Gamestate.live;
	}
	else {
		// Shuffle -> game is live
		this.gamestate = this.Gamestate.live;
	}

	// Done
	callback({
		error: null
	});
}

Game.prototype.start = function(callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.ended) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Change gamestate
	this.gamestate = this.Gamestate.signup;

	// Change gamemode
	this.gamemode = this.Gamemode.shuffle;

	// Done
	callback({
		error: null
	});
}

Game.prototype.shuffle = function(callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.signup) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Check players
	if (this.players.length != 10) {
		return callback({
			error: true,
			message: "Not enough players"
		});
	}

	// Check gamemode
	if (this.gamemode != this.Gamemode.shuffle) {
		return callback({
			error: true,
			message: "Invalid gamemode"
		});
	}

	// Shuffle players
	this.shufflePlayers();

	// Split players into teams
	this.splitTeams();

	// Get team names
	var radiantPlayers = [];
	var direPlayers = [];
	for (var i = 0; i < 5; i++) {
		radiantPlayers.push(this.radiantPlayers[i].name);
		direPlayers.push(this.direPlayers[i].name);
	}

	// Done
	callback({
		error: null,
		radiantPlayers: radiantPlayers.join(', '),
		direPlayers: direPlayers.join(', ')
	});
}

Game.prototype.end = function(winner, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.live) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Check winner
	if (!winner || (winner.toLowerCase() != 'dire' && winner.toLowerCase() != 'radiant')) {
		return callback({
			error: true,
			message: "Invalid winning team. Use 'dire' or 'radiant'"
		});
	}

	// Change gamestate
	this.gamestate = this.Gamestate.end;

	// Clear captains
	this.direCaptain = null;
	this.radiantCaptain = null;

	// Remove players
	this.players.forEach(function(player) {
		delete player;
	});
	this.players = [];

	// Clear teams
	this.radiantPlayers = [];
	this.direPlayers = [];

	// Done
	callback({
		error: null,
		winner: winner
	});
}

// Export Game-object as module
module.exports = Game;
