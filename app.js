"use strict";

// function init() {
	// var request = require('request');
	// Homey.log("Iungo app ready!");
	
// }

const events		= require('events');
const IungoRouter	= require('./includes/iungoRouter.js');
const IungoDiscover	= require('./includes/iungoDiscover.js').IungoDiscover;
const findIungosInterval = 600000;

class App extends events.EventEmitter {

	constructor() {
		super();

		this.setMaxListeners(0);
		this._iungos = {};
		this.init = this._onExportsInit.bind(this);
	}

	/*
		Helper methods
	*/
	log() {
		console.log.bind(this, '[log]' ).apply( this, arguments );
	}

	error() {
		console.error.bind( this, '[error]' ).apply( this, arguments );
	}

	/*
		Iungo methods
	*/
	findIungos() {		
		// Get IP settings from app settings page.
		// I don't know how to do a proper discovery function otherwise that would be nice
		// Then you can add multiple Iungos
		//let host = Homey.manager('settings').get('iungo_host');
		
		var discovery = new IungoDiscover();
		discovery.findDriver(((err, result) => {
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

		this._iungos[ iungo.id ] = new IungoRouter( iungo.id, iungo.ip );
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

	/*
		Export methods
	*/
	_onExportsInit() {
		console.log(`${Homey.manifest.id} running...`);
		this.findIungos();
		setInterval( this.findIungos.bind(this), findIungosInterval );
	}
}

module.exports = new App();