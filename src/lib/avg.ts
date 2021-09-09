/**
 * Calculates a 'rolling average'. I don't think this is really a rolling average
 * but idk what it is called. Allows you to calculate an approximate average on
 * an endless series of data. It also allows you to save the average and continue
 * in a new session.
 */

export default class RollingAverage {

    private max = 10
    private numbers: number[] = []

    private _pointer = 1;

    constructor(start = 0, max = 10) {
        if(max < 2) {
            throw "Maximum value count must be at least 2!";
        }
        this.max = max;
        this.numbers = [ start ];
    }

    getAverage() {
        let sum = 0;
        this.numbers.forEach((v) => {
            sum += v;
        });
        return sum / this.getValueCount();
    }

    addValue(n: number) {
        this.numbers[this._pointer++] = n;
        // once max value reached, start overwriting values
        if(this._pointer >= this.max) {
            this._pointer = 0;
        }
    }

    getValueCount() {
        return Math.min(this.numbers.length, this.max);
    }

}