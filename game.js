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
		shuffle : 1,
		balanced : 2
	};

	// Variables
	this.config = config;
	this.gamestate = this.Gamestate.ended;
	this.players = [];
	this.direPlayers = [];
	this.radiantPlayers = [];
	this.radiantCaptain = null;
	this.direCaptain = null;
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
	else if (players.length == 10) {
		return callback({
			error: true,
			message: "Game is full"
		});
	}

	// Check if player is already in the game
	for (var i in players) {
		if (players[i].name == user) {
			return callback({
				error: true,
				message: "You have already signed"
			});
		}
	}

	// Add player to list
	players.push(new User(user));

	// Yay, done
	callback({
		error: null,
		players: this.players.length
	});
}

Game.prototype.removePlayer = function(user, callback) {
	// Check if player is captain
	if (user == this.radiantCaptain || user == this.direCaptain) {
		// Done.
		return callback({
			error: null,
			players: 0,
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

	// Check if player is already in the game
	for (var i in players) {
		if (players[i].name == user) {
			// Remove player from list and return
		}
	}

	// Player not found
	callback({
		error: true,
		message: "You haven't signed in"
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
		players: list.join(' ')
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
	this.players = [];

	// Remove teams
	this.radiantPlayers = [];
	this.direPlayers = [];

	// Reset gamestate
	this.gamestate = this.Gamestate.ended;

	// Yay, done
	callback({
		error: null
	})
}

Game.prototype.start = function(callback) {
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

	// Change gamestate
	this.gamestate = this.Gamestate.live;

	// Done
	callback({
		error: null;
	});
}

// Export Game-object as module
module.exports = Game;
