// Libs
var Bot = require('./bot.js');
var fs = require('fs');

// Configs
var config = require('./config.json');

// Create draftbot
var bot = new Bot(config);

// Watch file changes in config-file
fs.watchFile('config.json', function (curr, prev) {
	// Reload file
	fs.readFile('config.json', function(err, data) {
		config = JSON.parse(data);
		bot.reloadConfigs(config);
	});
});
