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
		ready : 5,
		live : 6,
		ended : 7
	};

	// Gamemode enum
	this.Gamemode = {
		draft : 0,
		shuffle : 1
	};

	// Teams
	this.Teams = [
		'Radiant',
		'Dire'
	];

	// Drafting object
	this.draft = {
		players: [],
		pickingTeam: 0,
		pickingCaptain: null
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

	// Private methods

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

	this.clearTeams = function() {
		this.radiantPlayers = [];
		this.direPlayers = [];
	}

	this.startDraft = function() {
		// Copy all player names to draft-object
		var self = this;
		this.players.forEach(function(player) {
			// Skip captains
			if (player.name == self.radiantCaptain || player.name == self.direCaptain) {
				return;
			}

			// Add player to list
			self.draft.players.push(player.name);
		});

		// Add captains to teams
		this.radiantPlayers.push(this.radiantCaptain);
		this.direPlayers.push(this.direCaptain);

		// Set picking captain name
		this.draft.pickingCaptain = this.radiantCaptain;
	}

	this.endDraft = function() {
		// Clear the draft-object
		this.draft.players = [];
		this.pickingTeam = 0;
		this.pickingCaptain = null;

		// Clear the teams
		this.clearTeams();
	}
};

//
// Methods
//

/**
 * Adds player to the game
 * @param {String}   user     Player name to be added
 * @param {Function} callback Callback function to call after fail or success
 */
Game.prototype.addPlayer = function(user, callback) {
	// Check game state
	if (this.gamestate == this.Gamestate.ended) {
		// Start the game in shuffle-mode
		return callback({
			error: null,
			startGame: true,
			user: user
		});
	}
	// Any other gamestate
	else if (this.gamestate != this.Gamestate.signup) {
		return callback({
			error: true,
			message: "Invalid gamestate"
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

	// Check player amount
	if (this.players.length == 10) {
		// Change game state according to mode
		if (this.gamemode == this.Gamemode.shuffle) {
			this.gamestate = this.Gamestate.shuffle;
		}
		else {
			this.gamestate = this.Gamestate.draft;
			this.startDraft();
		}
	}

	// Yay, done
	callback({
		error: null,
		players: this.players.length
	});
}

/**
 * Removes player from the game
 * @param  {String}   user     	User to be removed
 * @param  {Function} callback 	Callback function
 */
Game.prototype.removePlayer = function(user, callback) {
	// Check if player is captain
	if ((this.radiantCaptain != null && user == this.radiantCaptain)
	 || (this.direCaptain != null && user == this.direCaptain)) {
		// Done.
		return callback({
			error: null,
			cancelGame: true,
			players: this.players.length
		});
	}

	// Check game state
	if ([ this.Gamestate.signup, this.Gamestate.shuffle, this.Gamestate.draft, this.Gamestate.ready ].indexOf(this.gamestate) == -1) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Check if player is in the game
	var playerFound = false;
	for (var i in this.players) {
		if (this.players[i].name == user) {
			// Remove player from list and return
			this.players.splice(i, 1);
			playerFound = true;
			break;
		}
	}

	// Player not found
	if (!playerFound) {
		return callback({
			error: true,
			message: "You haven't signed"
		});
	}

	// If game was full, return to signup state
	var returnToSignup = false;
	if (this.gamestate == this.Gamestate.shuffle) {
		this.gamestate = this.Gamestate.signup;
		returnToSignup = true;
	}
	else if (this.gametate == this.Gamestate.draft
	|| this.gamestate == this.Gamestate.ready) {
		// End draft
		this.endDraft();
		this.gamestate = this.Gamestate.signup;
		returnToSignup = true;
	}

	// Done
	callback({
		error: null,
		players: this.players.length,
		returnToSignup: returnToSignup
	});

}

/**
 * Starts the game in draft mode
 * @param  {String}   user     User that starts the draft
 * @param  {Function} callback Callback function
 */
Game.prototype.challenge = function(user, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.ended) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Change game mode
	this.gamemode = this.Gamemode.draft;

	// Add player to list
	var newUser = new User(user);
	this.players.push(newUser);

	// Add player as radiant captain
	this.radiantCaptain = newUser.name;

	// Change game state
	this.gamestate = this.Gamestate.challenged;

	// Yay, done
	callback({
		error: null
	});
}

/**
 * Accepts challenge to draft game after challenge
 * @param  {String}   user     User that accepts the challenge
 * @param  {Function} callback Callback function
 */
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
	this.direCaptain = newUser.name;

	// Change game state
	this.gamestate = this.Gamestate.signup;

	// Yay, done
	callback({
		error: null,
		radiantCaptain: this.radiantCaptain,
		direCaptain: this.direCaptain
	});
}

/**
 * Picks given player to team in draft state
 * @param  {String}   user     User giving the command
 * @param  {String}   picked   First argument, player to be picked
 * @param  {Function} callback Callback function
 */
Game.prototype.pick = function(user, picked, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.draft) {
		return callback({
			error: true,
			message: "Invalid gamestate"
		});
	}

	// Check that picked player is given
	if (!picked || picked.length == 0) {
		return callback({
			error: true,
			message: "Player name not given"
		});
	}

	// Check that user is captain
	if (user != this.radiantCaptain && user != this.direCaptain) {
		return callback({
			error: true,
			message: "Only captains can pick players"
		});
	}

	// Get picking player name
	var pickingPlayer;
	if (this.draft.pickingTeam == 0) {
		pickingPlayer = this.radiantCaptain;
	}
	else {
		pickingPlayer = this.direCaptain;
	}

	// Check that current user is the picking captain
	if (user != pickingPlayer) {
		return callback({
			error: true,
			message: "It's not your turn to pick."
		});
	}

	// Check that picked player is in the game
	var playerFound = false;
	for (var i in this.players) {
		if (this.players[i].name.toLowerCase() == picked.toLowerCase()) {
			playerFound = true;
		}
	}
	if (!playerFound) {
		return callback({
			error: true,
			message: "Could not find player " + picked
		});
	}

	// Check that player is not already picked
	playerFound = false;
	var player = null;
	for (var i in this.draft.players) {
		if (this.draft.players[i].toLowerCase() == picked.toLowerCase()) {
			playerFound = true;
			player = this.draft.players[i];
		}
	}
	if (!playerFound) {
		return callback({
			error: true,
			message: "Player was already picked"
		});
	}

	// Add player to current team
	if (this.draft.pickingTeam == 0) {
		this.radiantPlayers.push(player);
	}
	else {
		this.direPlayers.push(player);
	}

	// Remove player from available players
	this.draft.players.splice(this.draft.players.indexOf(player), 1);

	// Check if draft is done
	if (this.draft.players.length == 0) {
		this.gamestate = this.Gamestate.ready;
	}

	// Change picking team
	this.draft.pickingTeam = (this.draft.pickingTeam + 1) % 2;
	if (this.draft.pickingTeam == 0) {
		this.draft.pickingCaptain = this.radiantCaptain;
	}
	else {
		this.draft.pickingCaptain = this.direCaptain;
	}

	// Done
	callback({
		error: null
	});
}

// Name obfuscation function to disable highlight
function obfuscate_name(name) {
	return '[' + name[0] + ']' + name.substr(1);
}

/**
 * Gets list of players signed in the game
 * @param  {Function} callback Callback function
 */
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

/**
 * Cancels the game
 * @param  {Function} callback Callback function
 */
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

	// End draft just in case
	this.endDraft();

	// Yay, done
	callback({
		error: null
	});
}

/**
 * Starts the game after draft or shuffle
 * @param  {String}   user     User giving the command
 * @param  {Function} callback Callback function
 */
Game.prototype.go = function(user, callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.shuffle
	&& this.gamestate != this.Gamestate.ready) {
		return callback({
			error: true,
			message: "Invalid gamestate"
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

	// Change gamestate to live
	this.gamestate = this.Gamestate.live;

	// Done
	callback({
		error: null
	});
}

/**
 * Starts the game in shuffle mode
 * @param  {Function} callback Callback function
 */
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

/**
 * Shuffles the players and teams in shuffle mode
 * @param  {Function} callback Callback function
 */
Game.prototype.shuffle = function(callback) {
	// Check game state
	if (this.gamestate != this.Gamestate.shuffle) {
		return callback({
			error: true,
			message: "Invalid gamestate"
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

/**
 * Ends the game after it has gone live
 * @param  {String}   winner   Winning team. 'radiant' or 'dire'
 * @param  {Function} callback Callback function
 */
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

	// End draft just in case
	this.endDraft();

	// Done
	callback({
		error: null,
		winner: winner
	});
}

/**
 * Lists Radiant and Dire team players
 * @param  {Function} callback Callback function
 */
Game.prototype.teams = function(callback) {
	// Check game state
	if ([this.Gamestate.draft, this.Gamestate.live, this.Gamestate.shuffle].indexOf(this.gamestate) == -1) {
		return callback({
			error: true,
			message: "No teams selected yet"
		});
	}

	// Return teams
	callback({
		error: null,
		radiantPlayers: this.radiantPlayers.join(', '),
		direPlayers: this.direPlayers.join(', ')
	});
}

// Export Game-object as module
module.exports = Game;
