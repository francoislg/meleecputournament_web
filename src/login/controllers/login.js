var angular = require("angular");

function LoginController($scope, socket) {
    $scope.test = "Testing";
    $scope.twitchActive = false;
    $scope.logged = false;
    socket.on("message", function(data) {
        $scope.data = data;
    });
}

angular.module("MeleeCPUTournament")
    .controller("loginController", ['$scope']);
