import {html,PolymerElement} from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
// other imports go here

export class PayoutGraph extends PolymerElement {
	constructor() {
		super();
	}

	static get template() {
		return html `
			<style>
				#graph {
					/*padding-left: 25%;*/
				}
			</style>

			<div id="graph"></div>
		`
	}

	static get properties() {
		return {
			treatment: {
				type: String,
			},
			gameConstant:{
				type: Number,
			},
			initialValue:{
				type: Number,
			},
			graphLength:{
				type: Number,
			},
			stepsAhead: {
				type: Number,
			},
			initSeries: {
				type: Object,
			},
			_index: {
				type: Number,
				value: 0
			}
		}
	}

	ready() {
		super.ready();
		console.log("Graph loaded");
		// let initSer = [];
		// for(let i = 0; i < this.stepsAhead; i++) {
		//     initSer.push(null);
		// }
		//this.initSeries = initSer;
		// Async inits chart at end of event queue.
		setTimeout(this._initChart.bind(this), 1);

	}
	_initChart() {
		console.log("initializing graph");
		let series = [
			{
				type: 'area',
				color: '#00FF00',
				name: "Value (me)",
				data: [],
				marker: {enabled: false},
				showInLegend: false
			},
			{
				type: 'line',
				name: "Actual",
				data: [],
			},
			{
				type: 'line',
				name: "Forecast",
				showInLegend: false,
				data: this.initSeries,
				color: '#FF0000',
				marker: {symbol: "diamond"}
			}
		];

		this.graph_obj = Highcharts.chart ({
			chart: {
				animation: false,
				renderTo: this.$.graph,
				width: 1000,
				height: 500
			},
			title: {
				text: "",

			},
			xAxis: {
				min: 0,
				max: (this.graphLength * 1.25), // Period length
				title: {
					text: 'Period'
				},
			},
			yAxis: {
				min: 0,
				max: 300,
				title: {
					text: 'Value'
				},

				plotLines: [{
					color: "#000000",
					width: 1,
					value: this.gameConstant,
					label: {
						text: (this.gameConstant + " - Q payout"),
						align: "right",
						style: {
							fontSize: 10,
						}
					}
				},
				{
					color: "#000000",
					width: 0.5,
					value: this.gameConstant,
				}]
			},
			credits: {
				enabled: false
			},
			tooltip: {
				enabled: false
			},
			// plotOptions setting 'hover' state to false disables entire graph display
			// plotOptions setting 'enableMouseTracking' series to false disables entire graph display
			// Removes the faded appearance of other lines when mouse hovers over a paticular line
			plotOptions: {
				series: {
					states: {
						inactive: {
							opacity: 1,
						},
					},
				},
			},
			series: series

		});


	}
	addPersonalData(dataArr) {
		this.graph_obj.series[0].addPoint(dataArr);
	}
	addX_tData(dataArr) {
		// Push stochastic value to its series
		this.graph_obj.series[1].addPoint(dataArr);
	}
	addForecastData(dataArr) {
		this.graph_obj.series[2].addPoint(dataArr);
	}
	updateForecastLine(data) {
		this.graph_obj.yAxis[0].plotLinesAndBands[1].options.value = data;
		this.graph_obj.yAxis[0].update();
	}
}

window.customElements.define('payout-graph', PayoutGraph);
