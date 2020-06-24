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

			<redwood-period>
			</redwood-period>
			<redwood-decision
				initial-decision="{{ c }}"
				my-decision="{{ myForecast }}"
				group-decisions="{{ groupDecisions }}">
			</redwood-decision>
			<redwood-channel
				channel="tick"
				on-event="_tick">
			</redwood-channel>

			<template is="dom-if" if="[[ showButton ]]">
				<div id="text">
					<span id="choice">{{ _inGroup }}/1</span> <span id="static_text"> in your group chose</span> <span id="choice"> P</span>
				</div>
			</template>
			<!-- <div id="text">
				Your current pay off is {{ _currentPayoff }}; cumlative is {{ _cumulativePayoff }}
			</div> -->
			<br>
			<!--<div id="payoff">
				<payoff-graph
					max-payoff="300"
					min-payoff="0"
					duration="graphLength"
					myPayoff="_currentPayoff"
					>
				</payoff-graph>
			</div>-->
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
			<br>
			<template is="dom-if" if="[[ showButton ]]">
				<div id="buttons">
					<button
						id="in_button"
						type="button"
						value=1
						on-tap="_changeStatus"
						class="unhiglighted">
						{{ _buttonText }}
					</button>
				</div>
			</template>
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
			myDecisions: {
				type: Object,
				value: [1, self.c],
				computed: 'getMyDecisions(isIn, myForecast)',
			},
			groupDecisions: {
				type: Object,
			},
			showButton: {
				type: Boolean,
			},
			graphLine: {
				type: Number,
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
			_lastPosition: {
				type: Boolean,
				value: true
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
		if(!this.showButton) {
			this.graphLine = -1;
		}
		for(let i = 0; i < this.stepsAhead; i++) {
			this.forecastQueue.push(-1);
		}
	}
	_changeStatus(e){
		// Changes the player's status form in to out.
		this.inBool = !this.inBool;
		if(this.inBool === true){
			// Player went IN
			console.log(true);
			this._buttonText = "Get OUT";
			this.isIn = 1;
			this._inGroup = 1;
		} else{
			// Player went OUT
			console.log(false);
			this._buttonText = "Get IN";
			this.isIn = 0;
			this._inGroup = 0;
		}
	}
	_generateNoise() {
		// Not used anymore left jsut incase was needed again
		noise1 = Math.random();
		noise2 = Math.random();

		this._noise = (noise1 + noise2)*(this.s);
	}
	_tick(e) {
		// actions to happen per tick
		this.forecastQueue.push(this.myCurrForecast)
		this.myForecast = this.forecastQueue.shift();

		// Message from channel
		let tick_msg = e.detail.payload[oTree.participantCode];

		// Value for x_t graph dependant on treatment
		let ifOutValue = (this.treatment.toLowerCase() === "u") ? null : tick_msg.x_t;

		// Updating values on graph
		if(tick_msg.decision === 0 & this._lastPosition === true){
			// Remove slated line to Q value when switching from
			// in to out.
			console.log("vertical line");
			this._updateGraph([this._lastTick, this.c]);
			this._updateGraph([tick_msg.interval, tick_msg.value]);
			this._lastTick = tick_msg.interval;
		} else {
			this._updateGraph([tick_msg.interval, tick_msg.value]);
			this._lastTick = tick_msg.interval
		}

		if(tick_msg.decision === 0){
			this._lastPosition = false;
		} else {
			this._lastPosition = true;
		}


		// Update user payoff value
		this._updatePayoff(tick_msg.value);

		// Updating x_t graph
		if(this.isIn === 1){
			this._X_tGraph([tick_msg.interval, tick_msg.x_t]);
		} else {
			this._X_tGraph([tick_msg.interval, ifOutValue]);
		}

		// Update forecast graph
		this._updateForecast([(tick_msg.interval + this.interval * this.stepsAhead), this.myCurrForecast]);
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
		this.forecastQueue.push(parseFloat(event.target.value));
		this.payoff_graph.updateForecastLine(event.target.value);
	}
	getMyDecisions(isIn, myForecast) {
		return [this.isIn, this.myForecast];
	}
}

window.customElements.define('in-out', InOut);
