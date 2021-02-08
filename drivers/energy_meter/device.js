'use strict';

const Homey = require('homey');
const _deviceType			= "energy_meter";

module.exports = class DeviceEnergyMeter extends Homey.Device {

    // This method is called when the Device is inited
    onInit() {
        this.log('device init');
        this.log('name:', this.getName());
        this.log('class:', this.getClass());

		// Register flow cards that we need to trigger manualy
		this.flowCards = {};
		
		var meter_power_t1_changed = this.homey.flow.getDeviceTriggerCard('meter_power_t1_changed');
		this.flowCards["meter_power_t1_changed"] = meter_power_t1_changed;
		
		var meter_power_t2_changed = this.homey.flow.getDeviceTriggerCard('meter_power_t2_changed');
		this.flowCards["meter_power_t2_changed"] = meter_power_t2_changed;
		
		var meter_power_rt1_changed = this.homey.flow.getDeviceTriggerCard('meter_power_rt1_changed');
		this.flowCards["meter_power_rt1_changed"] = meter_power_rt1_changed;
		
		var meter_power_rt2_changed = this.homey.flow.getDeviceTriggerCard('meter_power_rt2_changed');
		this.flowCards["meter_power_rt2_changed"] = meter_power_rt2_changed;
		
		var measure_current_l1_changed = this.homey.flow.getDeviceTriggerCard('measure_current_l1_changed');
		this.flowCards["measure_current_l1_changed"] = measure_current_l1_changed;
		
		var measure_current_l2_changed = this.homey.flow.getDeviceTriggerCard('measure_current_l2_changed');
		this.flowCards["measure_current_l2_changed"] = measure_current_l2_changed;
		
		var measure_current_l3_changed = this.homey.flow.getDeviceTriggerCard('measure_current_l3_changed');
		this.flowCards["measure_current_l3_changed"] = measure_current_l3_changed;
		
		var measure_power_import_changed = this.homey.flow.getDeviceTriggerCard('measure_power_import_changed');
		this.flowCards["measure_power_import_changed"] = measure_power_import_changed;
		
		var measure_power_export_changed = this.homey.flow.getDeviceTriggerCard('measure_power_export_changed');
		this.flowCards["measure_power_export_changed"] = measure_power_export_changed;
				
		// Wait for the iungo to be available (and start recieving update events)
		let deviceData = this.getData();
		let iungo = this.getIungo(deviceData);
		
		if(iungo instanceof Error )
		{
			this.homey.app.once('iungo_available', ( iungo ) => {
				this.log("iungo_available");
				iungo.on('refresh-' + deviceData.id , this.syncDevice.bind(this) );
				this.syncDevice( );
			});
		}
		else
		{
			let deviceInstance = iungo.getEnergyMeter(deviceData.id);
		
			iungo.on('refresh-' + deviceData.id, this.syncDevice.bind(this) );
			this.syncDevice( );
		}
    }
    
    getIungo( device_data ) {
		if(typeof this.homey === 'undefined' || typeof this.homey.app === 'undefined')
		{
			return new Error("App not yet available.");
		}

		return this.homey.app.getIungo( device_data.iungo_id );
	}
    
    // sync device data and settings
    syncDevice( )
    {	    
	    let deviceData = this.getData();
	    let iungo = this.getIungo( deviceData );
	    if( iungo instanceof Error )
		{
			return this.setUnavailable( this.homey.__('unreachable') );
		}
	 
   	    this.log('_syncDevice', deviceData.id);
	    
	    // Current device state
	    let deviceState = this.getState();
	    
	    // New device state / data
		var deviceInstance = iungo.getEnergyMeter( deviceData.id );
		if( deviceInstance instanceof Error )
		{
			return this.setUnavailable( this.homey.__('unreachable') );
		}
	   
		this.setAvailable( );

		// Sync values to internal state
		for( let capabilityId in deviceState )
		{
			let value = deviceInstance[ capabilityId ];
			if( typeof value !== 'undefined' ) {
				
				let oldValue = deviceState[capabilityId];								
				deviceState[ capabilityId ] = value;	
		
				if(oldValue !== null && oldValue !== value)
				{					
					switch(capabilityId)
					{
						case 'meter_power.t1':
							this.flowCards["meter_power_t1_changed"].trigger(this, { power_used: value }, null).then(this.log).catch(this.error);
						break;
						case 'meter_power.t2':
							this.flowCards["meter_power_t2_changed"].trigger(this, { power_used: value }, null).then(this.log).catch(this.error);
						break;
						case 'meter_power.rt1':
							this.flowCards["meter_power_rt1_changed"].trigger(this, { power_used: value }, null).then(this.log).catch(this.error);
						break;
						case 'meter_power.rt2':
							this.flowCards["meter_power_rt2_changed"].trigger(this, { power_used: value }, null).then(this.log).catch(this.error);
						break;
						case 'measure_current.l1':
							this.flowCards["measure_current_l1_changed"].trigger(this, { current_value: value }, null).then(this.log).catch(this.error);
						break;
						case 'measure_current.l2':
							this.flowCards["measure_current_l2_changed"].trigger(this, { current_value: value }, null).then(this.log).catch(this.error);
						break;
						case 'measure_current.l3':
							this.flowCards["measure_current_l3_changed"].trigger(this, { current_value: value }, null).then(this.log).catch(this.error);
						break;
						case 'measure_power.import':
							this.flowCards["measure_power_import_changed"].trigger(this, { power_used: value }, null).then(this.log).catch(this.error);
						break;
						case 'measure_power.export':
							this.flowCards["measure_power_export_changed"].trigger(this, { power_used: value }, null).then(this.log).catch(this.error);
						break;
					}
				}
				
				if(oldValue !== value)
				{
					this.setCapabilityValue(capabilityId, value);
				}
			}
		}
		
		// Sync settings to internal state
		let settings = this.getSettings();
		
		if(settings.length === 0) {
			// No settings yet available. Apply all settings.
			this.setSettings( deviceInstance.settings );
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
				this.setSettings( deviceInstance.settings );
			}
		}
    }

    // This method is called when the Device is added
    onAdded() {
        this.log('device added');
        
        // Sync (new) device name with Iungo
        let deviceData = this.getData();
        let iungo = this.getIungo( deviceData );
        iungo.save(_deviceType, deviceData, 'name', this.getName());        
    }
    
    onRenamed(newName)
    {
        // Sync (new) device name with Iungo
        let deviceData = this.getData();
        let iungo = this.getIungo( deviceData );
        iungo.save(_deviceType, deviceData, 'name', newName); 	    
    }

    // This method is called when the Device is deleted
    onDeleted() {
        this.log('device deleted');
        
        let deviceData = this.getData();
        
        let iungo = this.getIungo( deviceData );
		if ( iungo )
		{
			iungo.removeListener('refresh-' + deviceData.id, this.syncDevice.bind(this));
		}
    }
	
	// Fired when the settings of this device are changed by the user.
	onSettings ( oldSettingsObj, newSettingsObj, changedKeysArr )
	{
		let device_data = this.getData();
		
		this.log ('Changed settings: ' + JSON.stringify(device_data) + ' / new = ' + JSON.stringify(newSettingsObj) + ' / old = ' + JSON.stringify(oldSettingsObj) + ' / changedKeys = ' + JSON.stringify(changedKeysArr));
		let iungo = this.getIungo(device_data);

		try {
			changedKeysArr.forEach(function (key)
			{
				iungo.save( _deviceType, device_data, 'settings', { "key": key, "value": newSettingsObj[key] } )
					.catch(( err ) => {
						this.log(err);
					})
			});
			
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}
}