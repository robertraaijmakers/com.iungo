"use strict";

const Homey 		= require('homey');
const events		= require('events');
const IungoRouter	= require('./includes/iungoRouter.js');
const IungoDiscover	= require('./includes/iungoDiscover.js').IungoDiscover;
const findIungosInterval = 600000;

class App extends Homey.App {

	async onInit() {		
		this.setMaxListeners(0);
		this._iungos = {};
		
		this.findIungos();
		this.homey.setInterval( this.findIungos.bind(this), findIungosInterval );
	}

	/*
		Iungo methods
	*/
	findIungos() {		
		var discovery = new IungoDiscover();
		discovery.findDriver(((err, result) =>
		{
			let host = result;
			console.log(host);
		
			if(typeof host === 'undefined' || host === null || host === '')
			{
				return;
			}
			
			let iungo = {
				id: "abc-123",
				ip: "http://" + host
			};
			
			this._initIungo(iungo);
			
		}).bind(this));
	}

	_initIungo( iungo ) {
		console.log("_initIungo");
		
		iungo.id = iungo.id.toLowerCase();

		// Skip if already found but update ip if changed
		if( this._iungos[ iungo.id ] instanceof IungoRouter ) {

			if( this._iungos[ iungo.id ].address !== iungo.ip ) {
				this.log(`Iungo ip has changed from ${this._iungos[ iungo.id ].address} to ${iungo.ip}`);
				this._iungos[ iungo.id ].setAddress( iungo.ip );
			}

			return;
		}

		console.log("Found iungo");
		this.log(`Found iungo ${iungo.id} @ ${iungo.ip}`);

		this._iungos[ iungo.id ] = new IungoRouter( iungo.id, iungo.ip, this.homey );
		this._iungos[ iungo.id ]
			.on('log', this.log.bind( this, `[${iungo.id}]`) )
			.on('error', this.error.bind( this, `[${iungo.id}]`) )
			.on('iungo_available', () => {
				this.emit('iungo_available', this._iungos[ iungo.id ] );
			})
			.init()
	}

	getIungoes() {
		return this._iungos;
	}

	getIungo( iungoId ) {
		if( typeof iungoId !== 'string' ) return new Error('invalid_iungo');
		return this._iungos[ iungoId.toLowerCase() ] || new Error('invalid_iungo');
	}
}

module.exports = App;