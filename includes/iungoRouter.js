'use strict';

const Homey = require('homey');
const events	= require('events');
const _			= require('underscore');
const Iungo		= require('../includes/iungo.js').Iungo;

const pollInterval = 5000;
const energyMeterCapabilitiesMap = {
	'available': 'present',
	'gas': 'meter_gas',
	'gas_usage': 'measure_gas',
	'usage': 'measure_power',
	'T1': 'meter_power.t1',
	'T2': 'meter_power.t2',
	'-T1': 'meter_power.rt1',
	'-T2': 'meter_power.rt2',
	'L1I': 'measure_current.l1',
	'L2I': 'measure_current.l2',
	'L3I': 'measure_current.l3',
	'L1Pimp': 'measure_power.l1i',
	'L2Pimp': 'measure_power.l2i',
	'L3Pimp': 'measure_power.l3i',
	'L1Pexp': 'measure_power.l1e',
	'L2Pexp': 'measure_power.l2e',
	'L3Pexp': 'measure_power.l3e'
}

const energyMeterSettingsMap = {
	'Cost-T1': 'Cost-T1',
	'Cost-T2': 'Cost-T2',
	'Cost-nT1': 'Cost-nT1',
	'Cost-nT2': 'Cost-nT2',
	'Cost-gas': 'Cost-gas',
	'Gas-interval': 'Gas-interval'
}

const waterMeterSettingsMap = {
	'offset': 'offset'
}

const solarMeterSettingsMap = {
	'offset': 'offset'
}

class IungoRouter extends events.EventEmitter {

	constructor( id, address ) {
		super();

		this.setMaxListeners(0);

		this._debug 	= true;

		// Get detailed device data (via UPNP??)
		this.id 			= id.toLowerCase();
		this.address 		= address;
		this.name 			= "IungoBox";
		this.modelId 		= "default";
		this.modelName 		= undefined;
		this.icon 			= `/app/${Homey.manifest.id}/assets/images/routers/${this.modelId}.svg`;

		this._energyMeters	= {};
		this._waterMeters 	= {};
		this._sockets		= {};
		this._solarMeters	= {};
		this._client 		= new Iungo("", "", address);
	}

	/*
		Helper methods
	*/
	debug() {
		if( this._debug ) {
			this.log.apply( this, arguments );
		}
	}

	log() {
		if( Homey.app ) {
			Homey.app.log.bind( Homey.app, `[${this.constructor.name}][${this.id}]` ).apply( Homey.app, arguments );
		}
	}

	error() {
		if( Homey.app ) {
			Homey.app.error.bind( Homey.app, `[${this.constructor.name}][${this.id}]` ).apply( Homey.app, arguments );
		}
	}

	/*
		Public methods
	*/
	init( callback ) {
		this.debug('init');

		callback = callback || ( err => {
			if( err ) return this.error( err );
		})

		this._client = new Iungo("", "", this.address);
		
		// Set refresh interval
		if( this._refreshInterval ) clearInterval(this._refreshInterval);
		this._refreshInterval = setInterval( this._refreshDevices.bind(this), pollInterval);
		
		
		this._refreshDevices((err) =>
		{
			this.log(err);
			this.log('iungo_available');
			this.emit('iungo_available');
			callback( null );
		});
	}

	setAddress( address ) {
		this.address = address;

		if(typeof this._client === 'undefined')
		{
			return;
		}
		
		if(typeof this._client.options === 'undefined')
		{
			this._client.options = {};
		}
		
		this._client.options.url = address;
	}

	isAuthenticated() {
		return true;
	}

	register( username, password, callback ) {
		callback = callback || function(){}

		Homey.manager('settings')
			 .set(`iungo_settings_${this.id}`.toLowerCase(), { username: username, password: password });
		
		this.init(callback);
	}
	
	/*
		Generic device methods
	*/
	getDevice(oid)
	{
		// Get a device by ID.
		console.log("_getDevice");
		return this._client.getDevice(oid);
	}

	/*
		Generic save	
	*/
	save( type, instance, action, value )
	{
		this.debug('save', type, instance, action, value);
		
		switch(action)
		{
			case 'name':
				this.debug("Setting name for ", instance.id, value);
				this._client.setDeviceName(instance.id, value, (err, result) => { });
				return Promise.resolve(true);
			break;
			case 'settings':
				this.debug("Setting settings for ", instance.id, value);
				this._client.setDeviceSettings(instance.id, value, (err, result) => { });
				return Promise.resolve(true);
			break;
		}
		
		if( type === 'energy_meter' )
			return this.savePower( instance, action, value );

		if( type === 'water_meter' )
			return this.saveWater( instance, action, value );

		if ( type === 'socket' )
			return this.saveSocket ( instance, action, value );
			
		if ( type === 'solar_meter' )
			return this.saveSolarMeter ( instance, action, value );

		return new Error('invalid_type');
	}

	savePower ( settings, action, value )
	{
		this.debug('savePower');
		console.log( settings );
		return Promise.resolve(false);
	}
	
	saveWater ( settings, action, value )
	{
		this.debug('savePower');
		console.log( settings );
		return Promise.resolve(false);
	}
	
	saveSolarMeter ( settings, action, value )
	{
		this.debug('saveSolarMeter');
		console.log( settings );
		return Promise.resolve(false);
	}
	
	saveSocket ( instance, action, value )
	{
		this.debug('saveSocket');
		
		switch(action)
		{
			case 'onoff':
				this._client.setDeviceOnOff(instance.id, value, (err, result) => { });
				return Promise.resolve(true);
			break;
		}
		
		//console.log( settings );
		return Promise.resolve(false);		
	}

	/*
		Private methods
	*/
	_testAuthentication( callback ) {
		this.debug('_testAuthentication');

		callback = callback || function(){}
		callback();
	}

	_refreshDevices( callback ) {
		this.debug('_refreshDevices');

		callback = callback || function(){}

		// Refresh all devices and there information.
		this._client.getDevices((function(err, response)
		{
			if(response === null)
			{
				console.log(err);
			}
			
			for(var obj in response.objects)
			{				
				var device = response.objects[obj];
				//console.log(device.type);
				
				if(device.type.indexOf("energy") !== -1)
				{
					// Energy meter, fill all values
					var meter = parseEnergyMeterValues(device.oid, device.name, device.driver, device.propsval);
					this._energyMeters[meter.id] = meter;
					this.emit('refresh-'+meter.id);
				}
				else if(device.type.indexOf("water") !== -1)
				{
					// Water meter
					var meter = parseWaterMeterValues(device.oid, device.name, device.driver, device.propsval);
					this._waterMeters[meter.id] = meter;
					this.emit('refresh-'+meter.id);
				}
				else if(device.type.indexOf("powerswitch") !== -1)
				{
					// Wall socket
					var socket = parseSocketValues(device.oid, device.name, device.driver, device.propsval);
					this._sockets[socket.id] = socket;
					this.emit('refresh-'+socket.id);
				}
				else if(device.type.indexOf("solar") !== -1)
				{
					// Wall socket
					var meter = parseSolarMeterValues(device.oid, device.name, device.driver, device.propsval);
					this._solarMeters[meter.id] = meter;
					this.emit('refresh-'+meter.id);
				}
			}
			
			callback();
		}).bind(this));
	}
	
	getEnergyMeter( meterId ) {
		let device = _.findWhere( this._energyMeters, { uniqueId: meterId });
		if(typeof device === 'undefined' || device === null)
		{
			return new Error('invalid_energy_meter');
		}
		
		if(typeof device.present !== 'undefined' && device.present !== true)
		{
			return new Error('invalid_energy_meter');
		}
		
		return device;
	}
	
	getWaterMeter( meterId ) {
		let device = _.findWhere( this._waterMeters, { uniqueId: meterId });
		if(typeof device === 'undefined' || device === null || device.present !== true)
		{
			return  new Error('invalid_water_meter');
		}
		
		return device;
	}
	
	getSocket( socketId ) {
		let device = _.findWhere( this._sockets, { uniqueId: socketId });
		//console.log(this._sockets);
		if(typeof device === 'undefined' || device === null || device.present !== true)
		{
			console.log("Socket is invalid");
			console.log(device);
			return  new Error('invalid_socket');
		}
		
		return device;
	}
	
	getSolarMeter( meterId ) {
		let device = _.findWhere( this._solarMeters, { uniqueId: meterId });
		if(typeof device === 'undefined' || device === null || device.present !== true)
		{
			return  new Error('invalid_solar_meter');
		}
		
		return device;
	}
}

module.exports = IungoRouter;

function parseEnergyMeterValues(oid, name, type, properties)
{
	// Register device variables
	let energyMeter = 
	{
		id: oid,
		uniqueId: oid,
		name: name,
		modelId: type.replace("energy-","").replace("energymeter-",""),
		settings: {}
	}
	
	var measurePowerImport = 0;
	var measurePowerExport = 0;
	
	for(var obj in properties)
	{
		var property = properties[obj];
		
		if(typeof energyMeterCapabilitiesMap[property.id] !== 'undefined')
		{
			energyMeter[energyMeterCapabilitiesMap[property.id]] = property.value;
		}
		
		if(typeof energyMeterSettingsMap[property.id] !== 'undefined')
		{
			energyMeter['settings'][energyMeterSettingsMap[property.id]] = property.value;
		}
		
		if(property.id == "L1Pimp" || property.id == "L2Pimp" || property.id == "L3Pimp" )
		{
			energyMeter[energyMeterCapabilitiesMap[property.id]] = property.value*1000;
			measurePowerImport += property.value;
		}
		
		if(property.id == "L1Pexp" || property.id == "L2Pexp" || property.id == "L3Pexp" )
		{
			energyMeter[energyMeterCapabilitiesMap[property.id]] = property.value*1000;
			measurePowerExport += property.value;
		}
	}
	
	energyMeter["measure_power.import"] = measurePowerImport*1000;
	energyMeter["measure_power.export"] = measurePowerExport*1000;

	return energyMeter;
}

function parseWaterMeterValues(oid, name, type, properties)
{
	// Register device variables
	let waterMeter = 
	{
		id: oid,
		uniqueId: oid,
		name: name,
		modelId: type.replace("water",""),
		present: true,
		settings: {}
	}
		
	var offset = null;
	var pulstotal = null;
	var kfact = null;
	
	for(var obj in properties)
	{
		var property = properties[obj];
		//console.log(property);
		//console.log(property.id);
		
		switch(property.id)
		{
			case "flow":
				waterMeter["measure_water"] = property.value;
			break;
			case "offset":
				offset = property.value;
				waterMeter["settings"]["offset"] = property.value;
			break;
			case "pulstotal":
				pulstotal = property.value;
			break;
			case "kfact":
				kfact = property.value;
			break;
		}
	}
	
	if(offset !== null && pulstotal !== null && kfact !== null)
	{
		waterMeter["meter_water"] = offset + (pulstotal / kfact);
	}

	return waterMeter;
}

function parseSocketValues(oid, name, type, properties)
{
	// Register device variables
	let socket = 
	{
		id: oid,
		uniqueId: oid,
		name: name,
		modelId: type.replace("powerswitch-","")
	}
	
	for(var obj in properties)
	{
		var property = properties[obj];
		
		switch(property.id)
		{
			case "usage":
				socket["measure_power"] = property.value;
			break;
			case "available":
				socket["present"] = property.value;
			break;
			case "state":
				socket["onoff"] = (property.value === "on");
			break;
		}
	}

	return socket;
}

function parseSolarMeterValues(oid, name, type, properties)
{
	// Register device variables
	let solarMeter = 
	{
		id: oid,
		uniqueId: oid,
		name: name,
		modelId: "solar",
		present: true,
		settings: {}
	}
		
	var offset = null;
	var pulstotal = null;
	var ppkwh = null;
	
	for(var obj in properties)
	{
		var property = properties[obj];
		//console.log(property);
		//console.log(property.id);
		
		switch(property.id)
		{
			case "solar":
				solarMeter["measure_power"] = property.value;
			break;
			case "offset":
				offset = property.value;
				solarMeter["settings"]["offset"] = property.value;
			break;
			case "pulstotal":
				pulstotal = property.value;
			break;
			case "ppkwh":
				ppkwh = property.value;
			break;
		}
	}
	
	if(offset !== null && pulstotal !== null && ppkwh !== null)
	{
		solarMeter["meter_power"] = offset + (pulstotal / ppkwh);
	}

	return solarMeter;
}
