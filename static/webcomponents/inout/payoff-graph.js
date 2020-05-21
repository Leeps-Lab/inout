import {html,PolymerElement} from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';

let MY_COLOR = 'rgb(9, 153, 18)';

let OTHER_COLORS = [
    'rgb(0,0,0)',
    'rgb(255,0,86)',
    'rgb(158,0,142)',
    'rgb(14,76,161)',
    'rgb(255,229,2)',
    'rgb(0,95,57)',
    'rgb(0,255,0)',
    'rgb(1,0,103)',
    'rgb(149,0,58)',
    'rgb(255,147,126)',
    'rgb(164,36,0)',
    'rgb(0,21,68)',
    'rgb(145,208,203)',
    'rgb(98,14,0)',
    'rgb(107,104,130)',
    'rgb(0,0,255)',
    'rgb(0,125,181)',
    'rgb(106,130,108)',
    'rgb(0,174,126)',
    'rgb(194,140,159)',
    'rgb(190,153,112)',
    'rgb(0,143,156)',
    'rgb(95,173,78)',
    'rgb(255,0,0)',
    'rgb(255,0,246)',
    'rgb(255,2,157)',
    'rgb(104,61,59)',
    'rgb(255,116,163)',
    'rgb(150,138,232)',
    'rgb(152,255,82)',
    'rgb(167,87,64)',
    'rgb(1,255,254)',
    'rgb(255,238,232)',
    'rgb(254,137,0)',
    'rgb(189,198,255)',
    'rgb(1,208,255)',
    'rgb(187,136,0)',
    'rgb(117,68,177)',
    'rgb(165,255,210)',
    'rgb(255,166,254)',
    'rgb(119,77,0)',
    'rgb(122,71,130)',
    'rgb(38,52,0)',
    'rgb(0,71,84)',
    'rgb(67,0,44)',
    'rgb(181,0,255)',
    'rgb(255,177,103)',
    'rgb(255,219,102)',
    'rgb(144,251,146)',
    'rgb(126,45,210)',
    'rgb(189,211,147)',
    'rgb(229,111,254)',
    'rgb(222,255,116)',
    'rgb(0,255,120)',
    'rgb(0,155,255)',
    'rgb(0,100,1)',
    'rgb(0,118,255)',
    'rgb(133,169,0)',
    'rgb(0,185,23)',
    'rgb(120,130,49)',
    'rgb(0,255,198)',
    'rgb(255,110,65)',
    'rgb(232,94,190)',
];

export class PayoffGraph extends PolymerElement {

    constructor(){
        super();
    }

    static get template() {
        return html `
            <style>
                canvas {
                    width: 100%;
                    height: 100%;
                }
            </style>
            <canvas id='canvas'></canvas>
        `
    }

    static get properties() {
        return {
            maxPayoff: {
                type: Number,
            },
            minPayoff: {
                type: Number,
            },
            duration: {
                type: Number,
            },
            myPayoff: {
                type: Number,
                observer: '_addPayoffToHistory',
            },
            _payoffHistory: {
                type: Array,
                value: () => [],
            },
        }
    }

    ready() {
        super.ready();
        setTimeout(() => {
            this.canvas = this.$.canvas;
            this.width = this.canvas.clientWidth;
            this.height = this.canvas.clientHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.yMin = 0 - this.maxPayoff * 0.1;
            this.yMax = this.maxPayoff * 1.05;
            this.yRange = this.yMax - this.yMin;
            this.yScale = this.height / this.yRange;

            this.ctx = this.canvas.getContext('2d');
        });
    }

    roundStart() {
        window.setTimeout(() => {
            this.start_time = performance.now();

            this.xMin = this.start_time;
            this.xMax = this.xMin + this.duration * 1000;
            this.xRange = this.xMax - this.xMin;
            this.xScale = this.width / this.xRange;

            this.last_time = this.start_time;

            requestAnimationFrame(this._tick.bind(this));
        });
    }

    _transformContext() {
        // changes bounds and scale of context so that x goes from xmin to xmax
        // and y goes from ymin to ymax
        this.ctx.scale(this.xScale, -this.yScale);
        this.ctx.translate(-this.xMin, -this.yMax)
    }

    _tick(now) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this._drawPayoffHistory(now);
        this._drawXAxis();

        if (now > this.start_time + this.duration * 1000) {
            return;
        }
        requestAnimationFrame(this._tick.bind(this));
    }

    _drawPayoffHistory(now) {
        const ctx = this.ctx;

        ctx.save();
        ctx.save();
        this._transformContext();

        const payoffHistory = this.get('_payoffHistory');

        ctx.beginPath();
        for (let i = 0; i < payoffHistory.length - 1; i++) {
            const {payoff: payoff, time: cur_time} = payoffHistory[i];
            const {time: next_time} = payoffHistory[i + 1];

            ctx.rect(cur_time, 0, next_time - cur_time, payoff - this.minPayoff);
        }

        const {payoff: payoff, time: time} = payoffHistory[payoffHistory.length - 1];
        ctx.rect(time, 0, now - time, payoff - this.minPayoff);

        ctx.restore();

        ctx.fillStyle = MY_COLOR;
        ctx.fill();

        ctx.restore();
    }

    _drawXAxis() {
        const ctx = this.ctx;

        ctx.save();

        const y = this.yMax * this.yScale
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.restore();
    }

    _addPayoffToHistory(payoff) {
        if (payoff) {
            this.push('_payoffHistory', {
                payoff: payoff,
                time: performance.now()
            });
        }
    }
}

window.customElements.define('payoff-graph', PayoffGraph);
