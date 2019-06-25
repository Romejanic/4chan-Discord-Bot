const https = require("https");

let apiUrl = "https://a.4cdn.org/{0}/{1}.json";
let imgUrl = "https://i.4cdn.org/{0}/{1}{2}";
let postUrl = "https://boards.4chan.org/{0}/thread/{1}";

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
                }
                
                if(!catalog) {
                    reject({ board_not_found: board });
                    return;
                }
                let threads = catalog[0].threads;
                let thread = threads[Math.floor(Math.random() * threads.length)];

                resolve({
                    image: imgUrl.format(board, thread.tim, thread.ext),
                    text: thread.com,
                    author: thread.name,
                    id: thread.no,
                    timestamp: thread.now,
                    permalink: postUrl.format(board, thread.no)
                });
            });
        }).on("error", (err) => {
            reject(err);
        });;
    });
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
    getRandomPost: getRandomPost
};