var angular = require("angular");

function MainController($scope, socket) {
    $scope.test = "Testing";
    $scope.twitchActive = false;
    $scope.logged = false;
    socket.on("message", function(data) {
        $scope.data = data;
    });
}

angular.module("MeleeCPUTournament")
    .controller("mainController", ['$scope', 'socket', MainController]);
