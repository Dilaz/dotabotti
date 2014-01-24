Dotabotti
=========


### Commands

#### help [command]

Displays list of commands or if command name is given, help for that command.

#### start

Starts the game in shuffle mode.

#### sign

Add player to current game. If there is no game going, it also starts one in shuffle mode.

#### out

Removes player from current game. If player is team captain in draft mode or the last player signed, current game is canceled.

#### signed

Displays list of players signed in current game.

#### cancel

Cancels current game. All players are remove and game mode is reseted.

#### challenge

Starts game in draft mode and makes current player the captain of radiant team. Challenge is accepted with accept-command.

#### accept

Accepts draft mode challenge and starts signup phase.

#### teams

Displays current teams.

#### game

???

#### sides ["random"]

Swaps radiant and dire team. If parameter "random" is given, sides are randomed.

#### go

Starts the game after shuffle or draft is done. Game is ended with end-command.

#### end <"radiant" | "dire" >

Ends the game and declares given team as winner.

#### pick <user>

Picks given user to your team in draft mode. Only usable by team captains.
