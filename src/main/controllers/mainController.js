var angular = require("angular");

function MainController ($scope) {
    $scope.test = "Testing";
}

angular.module("MeleeCPUTournament")
    .controller("mainController", ['$scope', MainController]);
