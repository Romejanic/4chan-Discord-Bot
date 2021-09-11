import * as https from 'https';
import format from './str-format';

let apiUrl = "https://a.4cdn.org/{0}/{1}.json";
let imgUrl = "https://i.4cdn.org/{0}/{1}{2}";
let postUrl = "https://boards.4chan.org/{0}/thread/{1}";
let boardsUrl = "https://a.4cdn.org/boards.json";

export interface ChanPost {
    image: string,
    text: string,
    author: string,
    id: number,
    timestamp: string,
    permalink: string
};

export interface ChanBoard {
    title: string,
    nsfw: boolean
};

interface ApiPost {
    tim: string,
    ext: string,
    com: string,
    name: string,
    no: number,
    now: string
}

function getPostFromThread(thread: ApiPost, board: string): ChanPost {
    return {
        image: format(imgUrl, board, thread.tim, thread.ext),
        text: thread.com,
        author: thread.name,
        id: thread.no,
        timestamp: thread.now,
        permalink: format(postUrl, board, thread.no)
    };
}

export function getRandomPost(board) {
    return new Promise((resolve, reject) => {
        https.get(format(apiUrl, board, "catalog"), (res) => {
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

export function getPost(id: number, board: string) {
    return new Promise((resolve, reject) => {
        https.get(format(apiUrl, board, `thread/${id}`), (res) => {
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

export function getBoards(): Promise<{ [name: string]: ChanBoard }> {
    return new Promise((resolve, reject) => {
        https.get(boardsUrl, (res) => {
            if(res.statusCode != 200) {
                reject({ error: res.statusMessage });
                return;
            }

            let json = "";
            res.on("data", (data) => {
                json += data.toString();
            });
            res.on("end", () => {
                let data = JSON.parse(json);
                let boardList = {};

                for(let v of data.boards) {
                    boardList[v.board] = {
                        title: v.title,
                        nsfw: v.ws_board === 0
                    };
                };

                resolve(boardList);
            });
        }).on("error", reject);
    });
}

export function getBoardName(board: string) {
    if(board.startsWith("/")) {
        board = board.substring(1, board.length);
    }
    if(board.endsWith("/")) {
        board = board.substring(0, board.length - 1);
    }
    return board;
}