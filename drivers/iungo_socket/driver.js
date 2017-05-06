'use strict';

const IungoDriver	= require('../../includes/iungoDriver.js');

const defaultIcon 			= 'POWER_METER';
const iconsMap				= {
	'POWER_METER': 'POWER_METER'
}

class DriverEnergyMeter extends IungoDriver {

	constructor() {
		super();

		this._deviceType = 'energy_meter';
		
		this.capabilities = {};
		
		this.capabilities.meter_gas = {};
		this.capabilities.meter_gas.get = this._onExportsCapabilitiesMeterGasGet.bind(this);
		
		this.capabilities["meter_power.t1"] = {};
		this.capabilities["meter_power.t1"].get = this._onExportsCapabilitiesMeterPowerT1Get.bind(this);
		
		this.capabilities["meter_power.t2"] = {};
		this.capabilities["meter_power.t2"].get = this._onExportsCapabilitiesMeterPowerT2Get.bind(this);
		
		this.capabilities.measure_power = {};
		this.capabilities.measure_power.get = this._onExportsCapabilitiesMeasurePowerGet.bind(this);
	}

	_syncDevice( device_data ) {
		this.debug('_syncDevice', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
		let deviceInstance = this.getDeviceInstance( device_data );
		if( deviceInstance instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
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
		
		for( let power_meter in state.iungo._energyMeters )
		{
			let deviceData = this.getDeviceData( state.iungo, power_meter );
			
			let deviceObj = {
				name			: state.iungo._energyMeters[power_meter].name,
				data 			: deviceData,
				capabilities	: [ "measure_power", "meter_power.t1", "meter_power.t2", "meter_gas" ]
			};

			if( typeof iconsMap[ state.iungo._energyMeters[power_meter].modelId ] === 'string' ) {
				let modelId = state.iungo._energyMeters[power_meter].modelId;
				deviceObj.icon = `/icons/${iconsMap[modelId]}.svg`;
			}

			result.push( deviceObj );
		}

		callback( null, result );
	}

	// meter_gas
	_onExportsCapabilitiesMeterGasGet( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeterGasGet', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state.meter_gas );
	}
	
	// meter_power.t1
	_onExportsCapabilitiesMeterPowerT1Get( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeterPower.t1', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state["meter_power.t1"] );
	}
	
	// meter_power.t2
	_onExportsCapabilitiesMeterPowerT2Get( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeterPower.t2', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state["meter_power.t2"] );
	}
	
	// measure_power
	_onExportsCapabilitiesMeasurePowerGet( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeasurePower', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state.measure_power );
	}
}

module.exports = new DriverEnergyMeter();