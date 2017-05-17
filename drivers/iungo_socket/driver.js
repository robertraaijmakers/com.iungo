'use strict';

const IungoDriver	= require('../../includes/iungoDriver.js');

const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default'
}

class DriverSockets extends IungoDriver {

	constructor() {
		super();

		this._deviceType = 'socket';
		
		this.capabilities = {};
		
		this.capabilities.onoff = {};
		this.capabilities.onoff.get = this._onExportsCapabilitiesOnOffGet.bind(this);
		this.capabilities.onoff.set = this._onExportsCapabilitiesOnOffSet.bind(this);
		
		this.capabilities.measure_power = {};
		this.capabilities.measure_power.get = this._onExportsCapabilitiesMeasurePowerGet.bind(this);
		
		this.settings = this._onSettingsChange.bind(this);
	}

	_syncDevice( device_data ) {
		this.debug('_syncDevice', device_data.id);

		let device = this.getDevice( device_data );
		// console.log("device");
		// console.log(device);
		if( device instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
		let deviceInstance = this.getDeviceInstance( device_data );
		// console.log("instance");
		// console.log(deviceInstance);
		if( deviceInstance instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
		// console.log("available");
		module.exports.setAvailable( device_data );

		// Sync values to internal state
		for( let capabilityId in device.state )
		{
			let value = deviceInstance[ capabilityId ];
			if( typeof value !== 'undefined' ) {
				device.state[ capabilityId ] = value;
				module.exports.realtime( device_data, capabilityId, device.state[ capabilityId ] );
			}
		}
	}

	_onBeforeSave( device_data ) {
		this.debug('_onBeforeSave', device_data.id);
		
		let device = this.getDevice( device_data );
		if( device instanceof Error ) return this.error( device );

		let deviceInstance = this.getDeviceInstance( device_data );
		if( deviceInstance instanceof Error ) return this.error( deviceInstance );

		for( let capabilityId in device.state )
		{
			// Skip null values
			let value = device.state[ capabilityId ];
			if( value === null ) continue;

			deviceInstance[ capabilityId ] = value;
		}
	}

	_onExportsPairListDevices( state, data, callback ) {
		this.debug('_onExportsPairListDevices', state);

		if( !state.iungo )
			return callback( 'invalid_iungo' );

		if( state.iungo instanceof Error )
			return callback( state.iungo );
		
		let result = [];
		
		for( let socket in state.iungo._sockets )
		{
			let deviceData = this.getDeviceData( state.iungo, socket );
			
			let deviceObj = {
				name			: state.iungo._sockets[socket].name,
				data 			: deviceData,
				capabilities	: [ "measure_power", "onoff" ]
			};

			if( typeof iconsMap[ state.iungo._sockets[socket].modelId ] === 'string' ) {
				let modelId = state.iungo._sockets[socket].modelId;
				deviceObj.icon = `/icons/${iconsMap[modelId]}.svg`;
			}

			result.push( deviceObj );
		}

		callback( null, result );
	}

	// onoff
	_onExportsCapabilitiesOnOffGet( device_data, callback ) {
		this.debug('_onExportsCapabilitiesOnOffGet', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state.onoff );
	}
	
	_onExportsCapabilitiesOnOffSet( device_data, value, callback ) {
		this.debug('_onExportsCapabilitiesOnoffSet', device_data.id, value);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );
		
		console.log("set on/off value");
		console.log(value);

		device.state.onoff = value;
		device.save( callback, "onoff", value );
	}
	
	// measure_power
	_onExportsCapabilitiesMeasurePowerGet( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeasurePower', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state.measure_power );
	}
	
	// Settings functions
	_onSettingsChange ( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback )
	{
		Homey.log ('Changed settings: ' + JSON.stringify(device_data) + ' / ' + JSON.stringify(newSettingsObj) + ' / old = ' + JSON.stringify(oldSettingsObj));
		try {
			changedKeysArr.forEach(function (key) {
				devices[device_data.id].settings[key] = newSettingsObj[key];
				device.save( callback, "settings", { "key": key, "value": newSettingsObj[key] });
			});
			
			callback(null, true);
		} catch (error) {
			callback(error); 
		}
	}
}

module.exports = new DriverSockets();