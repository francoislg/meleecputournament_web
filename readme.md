## MeleeCPUTournament (web)

This project powers [SuperSmashBotsShowdown](https://www.twitch.tv/supersmashbotsshowdown). It runs SSBU continuously, on real hardware, using Arduinos as controllers.

The idea was to create a 24/7 Saltybets where people can enter their own character to compete.

## Disclaimer

First, this is just a fun project, done mostly to learn things. This code was *not* cleaned up. It _runs_, but some of the things here are not super readable.

Also, the project does not always run 100% standalone, glitches occur, and I have to manually intervene to reconnect controllers sometimes, or reboot the PC running it.

## Legacy

This used to run Super Smash Bros Melee, but the bots were kinda boring, so I switched over to Super Smash Bros Ultimate, hence the title mismatch.

Also, the project used to run on Yuzu, using virtual controllers. It nows runs on a *real* Switch, with a hardware setup.

## Hardware

To run using a real Switch, you need two Teensys wired up in a specific way into another microcontroller connected to the PC.

In short, you need:

* Arduino -> Teensy #1 (using wires)
* Arduino -> Teensy #2 (using wires)
* Both Teensys -> Directly into the Switch
* PC -> Arduino (using serial Communication)

The arduino uses a couple of pins that it knows is "p1 - A button" or "p2 - left", and simply sends the commands that it receives from the runner over USB serial communication.

The Teensys use a special library (see below) so that it is detected as a controller when plugged into an USB slot. It then pressed the button when it receives a signal from specific pins.

Be aware that sometimes, the commands have some kind of delay, so many, many things in the Runner have some double-checks to ensure that the right thing was done.

## Software Mode

Software mode works by taking screenshots of the screen. It tried to detect the position of the Yuzu window, and infer everything around it. *It must not be hidden by another window*, which is pretty annoying if you actually want to use your PC for something else, hence why I recommend using real Hardware.

## Different projects and their roles

### Runner

Has the actual meat of the project, which detects what is the current state of the game, and presses buttons to navigate through menus and such.

It uses screenshot references and compares them with the current video feed to detect where we are at.

### Server

Its job is to run and provides matches for the "runner" to play. It has socket connections for the runner and overlay to provide the required information when needed.

For instance, "runner" might report that the match is over. Server will get this, update the match result, then send a new match to play.

### Server/scripts

Scripts that are used to interact with the Mongo database. For instance, `report.ts` is used to fetch all the matches and fill the [Spreadsheet](https://docs.google.com/spreadsheets/d/1ZNuetoT2-R5X5Y-tCvwBo89fNR_uDr2szkmFgMpCpUM/edit?usp=sharing) with it.

DB migrations are usually done by hand here since we only have one DB.

### Overlay

A simple webapp that is used as an overlay in the Twitch stream.

### Arduino/serial

The code that runs on the Arduino connected to the PC.

### Arduino/ATMega32U4-Switch-Fightstick

This code was adapted from [ATMega32U4-Switch-Fightstick](https://github.com/fluffymadness/ATMega32U4-Switch-Fightstick) to have the Teensys detected as actual controllers on the Switch.

## The Runner, and some of its quirks

### Yuzu Mode

There are a couple of `IS_USING_REAL_SWITCH` that _should_, in theory, if set to false, revert the code to Yuzu-mode, but it has not been tested since the switch to real Hardware.

### Stateless

The Runner itself doesn't really have a state by itself. It receives matches to play, do that, then report the results.

This means that everything must depend on what is *seen* by the video feed.

It uses color matching, with some error margin, but we double-check *every* state. If the state is not the same *twice in a row* (with a slight delay), we retry it until we get the same result twice in a row. This ensures that we don't immediately react on a false positive (e.g. detecting that we are on a winning screen because the match appears to have some yellow in the same region)

When we select a character, we double-check that the right character was picked, otherwise we assume we have to select it again.

When we detect we are on the "main menu", we know what combination of buttons we should press to get into the Character Selection Screen, but we don't assume that we are really there until we "capture" that the current screen in the CSS.

The order in which screens are detected is also important, e.g. the "In Match" should take absolute priority, because it is the only one that doesn't do anything and have nothing that can break the state. You can see why pressing "Start" in the middle of a match would be troublesome.

Because some latency may occur, we may unintentionally press the "Team Battles" option, so we have a check in place to ensure that we set it back, otherwise the Win detection at the end of a match won't be properly triggered.

## The Server, and some of its quirks

### pc-server

Its goal is to manage matches to play and the result of those matches. It starts tournament mode if required, and updates the overlay.

When a "match" is created, it is not immediately played to allow people to bet on it (since betting is always on the next match).

### overlay-server

Its goal is to forward information to the overlay. In the end, this is pretty straightforward, the only thing to notice is to be careful to re-use the same types/interfaces between the two projects to ensure that you don't read data that doesn't exist.

### chat-server

Everything related to Twitch Chat is located there. It handles commands send by users, the messages sent on winning a match, and so on.

In the end, `createCommands` is the most important section, keys are the first word read in the chat, so `url: async () => ...` contains the code for the `!url` or `!at url` command. The rest of the line is sent over in the `...args`, split by space, so you can easily define the expected arguments in the function (see `bet: ` for reference, which has this signature: `async ({ userName, userId }, playerNum, amount, replace)`).

`channel.say` is used to send something, and early `return;` are usually exceptions.

Code in there should be pretty reliable and give clear error messages when something is missing.

### Tournament Mode

Tournament mode might get triggered if there are a number of different people entering a character. (search for `NUMBER_OF_ENTRIES_FOR_TOURNAMENT`)

When in this mode, everything is managed through [Challonge](https://challonge.com/users/tournamentsautomator), so we have to set custom metadata to match the entry back in our DB.

It gives a couple of points for winning a match, but a whole lot more points if you win the tournament.

When a tournament is started, it is played until the whole tournament is done.

The code for it has not been updated for a while, so I'm not entirely sure it still works perfectly.

In the past, everything used to be a tournament, so all of the things related to that are in `tournament-commands`. But the tournament were taking too much time (even at the minimum 4 players), so "single matches" mode was implemented (`singlematches-commands`).

### Single Match Mode

Single match runs a single match with 2 characters from different people (to ensure that someone doesn't clog the queue by themselves).

### Points

In either mode, winnings are returned by the command, then applied by the pc-server. Default points are in `POINTS`

### Mii Configuration

Initially, there was only 1 kinda random Mii configuration per type. However, this is not how the SmashCPU Discord uses those, so we had to switch them over to a new one.

For legacy (or future-proofing?) reasons, `miiConfiguration` is now included in the `EntryModel`, which allows us to split them into different characters in the Google Sheet and other places.

### Ruleset

The current ruleset is currently located in `CURRENT_RULESET`. It is static, but if want to change it, you must also pre-select another ruleset on your Switch beforehand.

This ruleset is used to split off the types of play (`chaotic` being with items, `fair` being with the less randomness possible, `other` being all the matches before introducing rulesets).

It would be nice to be able to vote on the ruleset in chat, but it requires to code ruleset detection in the Runner, which is a bit too hard for what it is worth.

### Characters

Names entered in the chat are located in `CHARACTERS`. Names must not have spaces, otherwise it won't be properly detected in the chat commands.

`characterDefs` holds the aliases that are possible when generating a random name with this character. Some characters that do not have a space by default, so an alias that has spaces makes for a more beautiful generated name. We can also add fun ones in there, for variety. Do not put things that are too long to not make it clip over in the overlay.

There are also `prefixes` and `suffixes` to generated names, which have some *chances* of appearing. The random "y" suffix also add some variety. See `generateName` for the actual percentages.

## Actually using the things

First, good luck!

You need to setup the hardware if you want hardware mode (I should probably do a schematics), or Yuzu

Most of the things that you _really_ need are in the top-level `package.json`.

* `connect` allows me to properly connect the controllers when the Switch has been turned off. I get in the "controller sync" menu of the Switch, unplug the controllers, plug them again, and run the `connect` command. It usually takes a retry, but when both controllers are seen, I exit the script, exit the menu with my own controller, and run `start`
* `start` runs the overlay, server, and runner. It takes a bit of time to compile, don't worry. There is a bit of an egg/chicken problem: Server requires OBS to properly capture the video and get the state, while OBS required Overlay to properly render the overlay, so I usually open OBS, then hide/show the overlay when everything is booted up.
* `dev` should run everything in watch mode, so you can modify anything and it will reboot. Useful for testing new features.
* `restart`/`stop` to stop the background processes
* `report` to fill in the Spreadsheet.

## Acknowledgements

The Twitch streamer that decided to do a Melee CPU tournament about 9-10 years ago, which prompted this idea in the past. Sorry I don't remember you, it's been a while.

[SaltyBet](https://www.saltybet.com/), which is thoroughly amazing.

I could not have done this without [ATMega32U4-Switch-Fightstick](https://github.com/fluffymadness/ATMega32U4-Switch-Fightstick), this was pretty much the cornerstone of the real hardware implementation.