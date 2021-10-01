import * as https from 'https';
import { decode } from 'html-entities';
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

export interface ChanBoardData {
    [name: string]: ChanBoard
};

export interface ChanCachedBoards {
    boards: ChanBoardData,
    updated: number
};

interface ApiPost {
    tim: string,
    ext: string,
    com: string,
    name: string,
    no: number,
    now: string
}

export function getPostFromThread(thread: ApiPost, board: string): ChanPost {
    return {
        image: format(imgUrl, board, thread.tim, thread.ext),
        text: thread.com,
        author: thread.name,
        id: thread.no,
        timestamp: thread.now,
        permalink: format(postUrl, board, thread.no)
    };
}

export function getPostsFromBoard(board: string): Promise<ApiPost[]> {
    return new Promise((resolve, reject) => {
        https.get(format(apiUrl, board, "catalog"), (res) => {
            if(res.statusCode !== 200) {
                reject({ error: res.statusMessage });
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

                resolve(catalog[0].threads);
            });
        }).on("error", (err) => {
            reject(err);
        });;
    });
}

export async function getRandomPost(board: string): Promise<ChanPost> {
    let threads = await getPostsFromBoard(board);
    let thread  = threads[Math.floor(Math.random() * threads.length)];
    return getPostFromThread(thread, board);
}

export function getPost(id: number, board: string): Promise<ChanPost> {
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

export function getBoards(): Promise<ChanBoardData> {
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
                let boardList: ChanBoardData = {};

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
    board = board.toLowerCase();
    if(board.startsWith("/")) {
        board = board.substring(1, board.length);
    }
    if(board.endsWith("/")) {
        board = board.substring(0, board.length - 1);
    }
    return board;
}

//-----------------------------------------------------//
const boardCache: ChanCachedBoards = {
    boards: null,
    updated: 0
};
const CACHE_TIME = 20 * 60 * 1000;

export async function validateBoard(board: string) {
    await checkBoardCache();
    // check if board exists
    return [ Object.keys(boardCache.boards).includes(board), boardCache.boards[board]?.nsfw ];
}

export async function getCachedBoards(): Promise<ChanCachedBoards> {
    await checkBoardCache();
    return boardCache;
}

async function checkBoardCache() {
    // check if cache is expired
    if(Date.now() - boardCache.updated > CACHE_TIME) {
        // fetch list of boards from 4chan
        boardCache.boards = await getBoards();
        boardCache.updated = Date.now();

        // if in dev environment, print message
        if(process.argv.indexOf("-dev") > -1) {
            console.log("[API] Refreshed board cache, found " + Object.keys(boardCache.boards).length + " boards");
        }
    }
}

export function processPostText(post: ChanPost) {
    let postText = "";
    if(post.text) {
        postText = decode(post.text);
        postText = postText.length > 2000 ? postText.substring(0, 2000) + "..." : postText;
        postText = postText.replace(/<br>/gi, "\n");
        postText = postText.replace(/<\/span>/gi, "");
        postText = postText.replace(/<span class=\"quote\">/gi, "");
    }
    return postText;
}