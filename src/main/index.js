var angular = require("angular");
require("angular-twitch");

angular.module("MeleeCPUTournament", ["angular-twitch"]);

require("./controllers/mainController");
require("./factories/socket");
