import {html,PolymerElement} from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/src/redwood-decision/redwood-decision.js';
import '/static/otree-redwood/src/redwood-period/redwood-period.js';
import '/static/otree-redwood/src/redwood-channel/redwood-channel.js';
import './payoff-graph.js';
import './payout-graph.js';

export class InOut extends PolymerElement {
	constructor() {
		super();
	}

	static get template() {
		return html `
			<style>
				#choice {
					font-weight: bold;
				}
				#text {
					text-align: center;
					display: inline-block;
					width: 90%;
				}
				#slider-container {
					display: inline-block;
					width: 50px;
					height: 500px;
					position: relative;
				}
				#graph {
					width: 100%;
					text-align: center;
				}
				#slider {
					position: absolute;
					-webkit-appearance: slider-vertical;
					height: 82%;
				}
				#payoff {
					width: 50%;
				}
				#buttons {
					text-align: center;
				}
				.unhiglighted {
					border: 1px solid #000000;
					background: #ffffff;

				}
				.unhiglighted {
					border: 1px solid #000000;
					background: #ffffff;

				}

			</style>

			<redwood-decision
				initial-decision="{{ -1 }}"
				my-decision="{{ myForecast }}"
				group-decisions="{{ groupDecisions }}">
			</redwood-decision>

			<redwood-channel
				channel="tick"
				on-event="_tick">
			</redwood-channel>
			<div id="graph">
				<payout-graph id="text"
					game-Constant='[[ graphLine ]]'
					graph-length='[[ graphLength ]]'
					>
				</payout-graph>
				<div id="slider-container">
					<input
						id="slider"
						type="range"
						min='0'
						max='300'
						value='{{c}}'
						step="0.01"
						on-change="_sliderValueChanged">
				</div>
			</div>
		`
	}

	static get properties() {
		return {
			isIn: {
				type: Number,
				value: 1,
			},
			c: {
				type: Number,
			},
			a: {
				type: Number,
			},
			s: {
				type: Number,
			},
			treatment: {
				type: String,
			},
			inBool: {
				type: Boolean,
				value: true
			},
			myForecast: {
				type: Number,
				value: 0,
			},
			myCurrForecast: {
				type: Number,
				value: 0,
			},
			groupDecisions: {
				type: Object,
			},
			initialDecision: {
				type: Number,
			},
			showButton: {
				type: Boolean,
			},
			graphLine: {
				type: Number,
			},
			xT: {
				type: Number,
			},
			ticks: {
				type: Number,
				value: 0,
			},
			_timeLeft: {
				type: Number,
				value: 60,
			},
			graphLength: {
				type: Number,
			},
			_inGroup:{
				type: Number,
				value: 1,
			},
			_currentPayoff: {
				type: Number,
				value: 0,
			},
			_cumulativePayoff: {
				type: Number,
				value: 0,
			},
			_buttonText: {
				type: String,
				value: "Get OUT"
			},
			_lastTick: {
				type: Number,
				value: 0,
			},
			forecastQueue: {
				type: Array,
				value: []
			},
			stepsAhead: {
				type: Number,
			},
			interval: {
				type: Number,
			},
		}
	}

	ready() {
		super.ready();
		console.log("in-out.html");
		this.payoff_graph = this.shadowRoot.querySelector('payout-graph');
		for(let i = 0; i < this.stepsAhead - 1; i++) {
			this.forecastQueue.push(-1);
		}
	}
	_tick(e) {
		// actions to happen per tick
		this.ticks += 1;
		this.forecastQueue.push(this.myCurrForecast);
		this.myForecast = this.forecastQueue.shift();
		if(this.myForecast == 1 && this.ticks < this.stepsAhead) {
			this.myForecast = this.initialDecision;
		}
		console.log("my decision " + this.myForecast);

		// Message from channel
		let tick_msg = e.detail.payload;

		// this._updateGraph([tick_msg.interval, tick_msg.value]);
		this._lastTick = tick_msg.interval;

		this.updateX_T(tick_msg.noise);

		console.log("x_t " + this.xT);

		// Update graph
		this._X_tGraph([tick_msg.interval, this.xT]);

		// Update forecast graph
		this._updateForecast([(tick_msg.interval + this.interval * this.stepsAhead), this.myCurrForecast]);
	}
	updateX_T(noise) {
		let ave = this.forecastAve();
		if(ave == -1) {
			return
		}
		this.xT = (this.c + this.a * (this.forecastAve() - this.c) + this.s * noise);
	}
	forecastAve() {
		let total = 0;
		let valid = 0;
		let codes = Object.keys(this.groupDecisions);
		for (let code of codes) {
			if(this.groupDecisions[code] > 0) {
				console.log(this.groupDecisions[code]);
				total += this.groupDecisions[code];
				valid += 1;
			}
		}

		console.log("valid " + valid);

		if(valid == 0) {
			return -1;
		}

		return total/valid;
	}
	_updateGraph(data) {
		//Send update value to payoff polymer graph
		this.payoff_graph.addPersonalData(data);
	}
	_updateForecast(data) {
		this.payoff_graph.addForecastData(data);
	}
	_updatePayoff(current){
		// Update payoff display value after truncation
		this._currentPayoff = current;
		let trunc = this._cumulativePayoff + current;
		this._cumulativePayoff = Math.trunc(trunc);
	}
	_X_tGraph(data){
		// Send X_t data to graph
		this.payoff_graph.addX_tData(data);
	}
	_sliderValueChanged(event) {
		this.myCurrForecast = parseFloat(event.target.value);
		//this.myForecast = parseFloat(event.target.value);
		// this.forecastQueue.push(parseFloat(event.target.value));
		this.payoff_graph.updateForecastLine(event.target.value);
	}
	getMyDecisions(isIn, myForecast) {
		return [this.isIn, this.myForecast];
	}
}

window.customElements.define('in-out', InOut);
