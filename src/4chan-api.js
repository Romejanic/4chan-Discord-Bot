const https = require("https");

let apiUrl = "https://a.4cdn.org/{0}/{1}.json";
let imgUrl = "https://i.4cdn.org/{0}/{1}{2}";
let postUrl = "https://boards.4chan.org/{0}/thread/{1}";

function getPostFromThread(thread, board) {
    return {
        image: imgUrl.format(board, thread.tim, thread.ext),
        text: thread.com,
        author: thread.name,
        id: thread.no,
        timestamp: thread.now,
        permalink: postUrl.format(board, thread.no)
    };
}

function getRandomPost(board) {
    return new Promise((resolve, reject) => {
        https.get(apiUrl.format(board, "catalog"), (res) => {
            if(res.statusCode == 404) {
                reject({ board_not_found: board });
                return;
            }

            let json = "";
            res.on("data", (data) => {
                json += data.toString();
            });
            res.on("end", () => {
                let catalog;
                try {
                    catalog = JSON.parse(json);
                } catch(e) {
                    reject(e);
                    return;
                }
                
                if(!catalog) {
                    reject({ board_not_found: board });
                    return;
                }
                let threads = catalog[0].threads;
                let thread = threads[Math.floor(Math.random() * threads.length)];

                resolve(getPostFromThread(thread, board));
            });
        }).on("error", (err) => {
            reject(err);
        });;
    });
}

function getPost(id, board) {
    return new Promise((resolve, reject) => {
        https.get(apiUrl.format(board, `thread/${id}`), (res) => {
            if(res.statusCode == 404) {
                reject({ post_not_found: id });
                return;
            }

            let json = "";
            res.on("data", (data) => {
                json += data.toString();
            });
            res.on("end", () => {
                let thread;
                try {
                    thread = JSON.parse(json);
                } catch(e) {
                    reject(e);
                    return;
                }

                if(!thread) {
                    reject({ post_not_found: id });
                    return;
                }

                resolve(getPostFromThread(thread.posts[0], board));
            });
        }).on("error", (err) => {
            reject(err);
        });
    })
}

function getBoard(board) {
    if(board.startsWith("/")) {
        board = board.substring(1, board.length);
    }
    if(board.endsWith("/")) {
        board = board.substring(0, board.length - 1);
    }
    return board;
}

// implement String.format as expected
// Source: https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
            return typeof args[number] != 'undefined'
                        ? args[number]
                        : match;
        });
    };
}

module.exports = {
    getRandomPost: getRandomPost,
    getPost: getPost,
    getBoardName: getBoard
};