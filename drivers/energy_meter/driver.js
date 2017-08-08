'use strict';

const IungoDriver	= require('../../includes/iungoDriver.js');

const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default'
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
		
		this.capabilities["meter_power.rt1"] = {};
		this.capabilities["meter_power.rt1"].get = this._onExportsCapabilitiesMeterPowerRT1Get.bind(this);
		
		this.capabilities["meter_power.rt2"] = {};
		this.capabilities["meter_power.rt2"].get = this._onExportsCapabilitiesMeterPowerRT2Get.bind(this);
				
		this.capabilities.measure_power = {};
		this.capabilities.measure_power.get = this._onExportsCapabilitiesMeasurePowerGet.bind(this);
		
		this.capabilities["measure_current.l1"] = {};
		this.capabilities["measure_current.l1"].get = this._onExportsCapabilitiesMeasureCurrentL1Get.bind(this);
		
		this.capabilities["measure_current.l2"] = {};
		this.capabilities["measure_current.l2"].get = this._onExportsCapabilitiesMeasureCurrentL2Get.bind(this);
		
		this.capabilities["measure_current.l3"] = {};
		this.capabilities["measure_current.l3"].get = this._onExportsCapabilitiesMeasureCurrentL3Get.bind(this);
		
		this.settings = this._onSettingsChange.bind(this);
	}

	_syncDevice( device_data ) {
		this.debug('_syncDevice', device_data.id);
		this.debug(device_data);

		let device = this.getDevice( device_data );
		if( device instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
		var deviceInstance = this.getDeviceInstance( device_data );
		if( deviceInstance instanceof Error )
			return module.exports.setUnavailable( device_data, __('unreachable') );
		
		module.exports.setAvailable( device_data );

		// Sync values to internal state
		for( let capabilityId in device.state )
		{
			let value = deviceInstance[ capabilityId ];
			if( typeof value !== 'undefined' ) {
				
				let oldValue = device.state[capabilityId];								
				device.state[ capabilityId ] = value;	
				
				if(oldValue !== null && oldValue !== value)
				{					
					switch(capabilityId)
					{
						case 'meter_power.t1':
							Homey.manager('flow').triggerDevice('meter_power_t1_changed', { power_used: value }, null, device_data, function(err, result) { if( err ) return Homey.error(err); });
						break;
						case 'meter_power.t2':
							Homey.manager('flow').triggerDevice('meter_power_t2_changed', { power_used: value }, null, device_data, function(err, result) { if( err ) return Homey.error(err); });
						break;
						case 'meter_power.rt1':
							Homey.manager('flow').triggerDevice('meter_power_rt1_changed', { power_used: value }, null, device_data, function(err, result) { if( err ) return Homey.error(err); });
						break;
						case 'meter_power.rt2':
							Homey.manager('flow').triggerDevice('meter_power_rt2_changed', { power_used: value }, null, device_data, function(err, result) { if( err ) return Homey.error(err); });
						break;
						case 'measure_current.l1':
							Homey.manager('flow').triggerDevice('measure_current_l1_changed', { current_value: value }, null, device_data, function(err, result) { if( err ) return Homey.error(err); });
						break;
						case 'measure_current.l2':
							Homey.manager('flow').triggerDevice('measure_current_l2_changed', { current_value: value }, null, device_data, function(err, result) { if( err ) return Homey.error(err); });
						break;
						case 'measure_current.l3':
							Homey.manager('flow').triggerDevice('measure_current_l3_changed', { current_value: value }, null, device_data, function(err, result) { if( err ) return Homey.error(err); });
						break;
					}
				}
				
				if(oldValue !== value)
				{
					module.exports.realtime( device_data, capabilityId, value );
				}
			}
		}
		
		// Sync settings to internal state
		module.exports.getSettings(device_data, function(err, settings)
		{
			console.log(deviceInstance)
			console.log(settings);
			
			if(settings.length === 0) {
				// No settings yet available. Apply all settings.
				module.exports.setSettings( device_data, deviceInstance.settings, function( err, settings )
				{
					console.log(err);
					console.log(settings);
				});
			}
			else
			{
				// Check if there are differences, and update all values (performance wise cheaper, only one call).
				let changed = false;
				for( let settingId in settings )
				{
					var oldSetting = settings[settingId];
					var newSetting = deviceInstance.settings[settingId];
					if(oldSetting !== newSetting)
					{
						changed = true;
					}
				}
				
				if(changed)
				{
					module.exports.setSettings( device_data, deviceInstance.settings, function( err, settings )
					{
						console.log(err);
						console.log(settings);
					});
				}
			}
		});
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
				capabilities	: [ "measure_power", "meter_power.t1", "meter_power.t2", "meter_gas", "meter_power.rt1", "meter_power.rt2" ]
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
	
	// meter_power.rt1
	_onExportsCapabilitiesMeterPowerRT1Get( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeterPower.rt1', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state["meter_power.rt1"] );
	}
	
	// meter_power.rt2
	_onExportsCapabilitiesMeterPowerRT2Get( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeterPower.rt2', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state["meter_power.rt2"] );
	}
	
	// measure_current.l1
	_onExportsCapabilitiesMeterCurrentL1Get( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeasureCurrent.l1', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state["measure_current.l1"] );
	}
	
	// measure_current.l2
	_onExportsCapabilitiesMeterCurrentL2Get( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeasureCurrent.l2', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state["measure_current.l2"] );
	}
	
	// measure_current.l3
	_onExportsCapabilitiesMeterCurrentL3Get( device_data, callback ) {
		this.debug('_onExportsCapabilitiesMeasureCurrent.l3', device_data.id);

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( device );

		callback( null, device.state["measure_current.l3"] );
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
		let device = this.getDevice( device_data );
		if( device instanceof Error ) return callback( "No device found to save settings to" );
		
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

module.exports = new DriverEnergyMeter();