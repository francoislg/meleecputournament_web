var jwt = require('jsonwebtoken');

function LoginManager(mongo){
    this.mongo = mongo;
}

LoginManager.prototype.getToken = function(user, password){
    var obj = {};
    obj[user] = password;
    var token = jwt.sign(obj, 'shhhh');
    return token;
};

module.exports = LoginManager;
