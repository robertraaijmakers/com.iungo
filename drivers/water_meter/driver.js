'use strict';

const IungoDriver	= require('../../includes/iungoDriver.js');

const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default'
}

class DriverWaterMeter extends IungoDriver {

	constructor() {
		super();

		this._deviceType = 'water_meter';
		
		this.capabilities = {};
		
		this.capabilities.meter_water = {};
		this.capabilities.meter_water.get = this._onExportsCapabilitiesMeterWaterGet.bind(this);
		
		this.capabilities.measure_water = {};
		this.capabilities.measure_water.get = this._onExportsCapabilitiesMeasureWaterGet.bind(this);
		
		this.settings = this._onSettingsChange.bind(this);
	}

	_syncDevice( device_data ) {
		this.debug('_syncDevice', device_data.id);

		let device = this.getDevice( device_data );
		console.log("device");
		console.log(device);
		if( device instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
		let deviceInstance = this.getDeviceInstance( device_data );
		console.log("instance");
		console.log(deviceInstance);
		if( deviceInstance instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
		console.log("available");
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
		
		for( let water_meter in state.iungo._waterMeters )
		{
			let deviceData = this.getDeviceData( state.iungo, water_meter );
			
			let deviceObj = {
				name			: state.iungo._waterMeters[water_meter].name,
				data 			: deviceData,
				capabilities	: [ "measure_water", "meter_water" ]
			};

			if( typeof iconsMap[ state.iungo._waterMeters[water_meter].modelId ] === 'string' ) {
				let modelId = state.iungo._waterMeters[water_meter].modelId;
				deviceObj.icon = `/icons/${iconsMap[modelId]}.svg`;
			}

			result.push( deviceObj );
		}

		callback( null, result );
	}

	// water_meter
	_onExportsCapabilitiesMeterWaterGet( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeterWaterGet', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state.meter_water );
	}
	
	// measure_water
	_onExportsCapabilitiesMeasureWaterGet( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeasureWater', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state.measure_water );
	}
	
	// Settings functions
	_onSettingsChange ( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback )
	{
		Homey.log ('Changed settings: ' + JSON.stringify(device_data) + ' / ' + JSON.stringify(newSettingsObj) + ' / old = ' + JSON.stringify(oldSettingsObj));
		try {
			changedKeysArr.forEach(function (key) {
				//devices[device_data.id].settings[key] = newSettingsObj[key];
				device.save( callback, "settings", { "key": key, "value": newSettingsObj[key] });
			});
			
			callback(null, true);
		} catch (error) {
			callback(error); 
		}
	}
}

module.exports = new DriverWaterMeter();