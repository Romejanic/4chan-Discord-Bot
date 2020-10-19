const fs = require("fs").promises;
const RollingAverage = require("./avg");

const STATS_FILE = "stats.json";

const DAILY_INTERVAL = 1000 * 60 * 60 * 24;  // 1000ms * 60secs * 60mins * 24hrs
const SAVE_INTERVAL  = 1000 * 60 * 5;        // 1000ms * 60secs * 5mins

class Stats {

    totalServed = 0
    dailyServed = new RollingAverage()
    todayServed = 0

    _dailyInterval = undefined
    _saveInterval = undefined

    async load() {
        const ref = this;
        // create daily interval
        if(!this._dailyInterval) {
            this._dailyInterval = setInterval(() => {
                ref.dailyServed.addValue(ref.todayServed);
                ref.todayServed = 0;
            }, DAILY_INTERVAL);
        }
        // create save interval
        if(!this._saveInterval) {
            this._saveInterval = setInterval(() => {
                ref.save().catch(err => {
                    console.error("[Stats] Failed to write stats to file!", err);
                });
            }, SAVE_INTERVAL); 
        }
        // load stats from file
        try {
            // check that the file exists
            await fs.access(STATS_FILE, require("fs").constants.F_OK);
        } catch(e) {
            console.error("[Stats] No stats file exists! Creating new stats...");
            return;
        }
        // at this point, the file exists
        let jsonData = await fs.readFile(STATS_FILE);
        let jsonObj = JSON.parse(jsonData.toString());
        this.totalServed = jsonObj.total;
        this.dailyServed = new RollingAverage(jsonObj.daily);
        this.todayServed = jsonObj.today;
        if(Date.now() - jsonObj.timestamp > DAILY_INTERVAL) {
            // reset if bot hasn't been running longer than a day
            this.dailyServed.addValue(this.todayServed);
            this.todayServed = 0;
        }
        console.log("[Stats] Loaded stats: total = " + this.totalServed + ", daily = " + this.dailyServed + ", today = " + this.todayServed);
    }

    async save() {
        let jsonData = JSON.stringify({
            total: this.totalServed,
            daily: this.getDailyAverage(),
            today: this.todayServed,
            timestamp: Date.now()
        }, undefined, 4);
        await fs.writeFile(STATS_FILE, jsonData);
        // print debug message
        if(process.argv.indexOf("-dev") > -1) {
            console.log("[Stats] Saved statistics to file", STATS_FILE);
        }
    }

    servedRequest() {
        this.totalServed++;
        this.todayServed++;
    }

    getDailyAverage() {
        return Math.round(this.dailyServed.getAverage());
    }

}

module.exports = Stats;