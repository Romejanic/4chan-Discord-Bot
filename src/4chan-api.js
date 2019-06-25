const http = require("http");

function getRandomPost(board) {
    return {
        board: board
    };
}

module.exports = {
    getRandomPost: getRandomPost
};