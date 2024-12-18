'use strict';

const Homey = require('homey');
const _deviceType = "energy_meter";

module.exports = class DeviceEnergyMeter extends Homey.Device {

    // This method is called when the Device is inited
    async onInit() {
        this.log('device init');
        this.log('name:', this.getName());
        this.log('class:', this.getClass());

		// Wait for the iungo to be available (and start recieving update events)
		let deviceData = this.getData();
		let iungo = this.getIungo(deviceData);

		if(this.hasCapability('meter_power.rt2') && !this.hasCapability('meter_power.imported')) await this.addCapability('meter_power.imported').catch(this.error);
		if(this.hasCapability('meter_power.rt2') && !this.hasCapability('meter_power.exported')) await this.addCapability('meter_power.exported').catch(this.error);

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
	    
	    // New device state / data
		var deviceInstance = iungo.getEnergyMeter( deviceData.id );
		if( deviceInstance instanceof Error )
		{
			return this.setUnavailable( this.homey.__('unreachable') );
		}
	   
		this.setAvailable()
			.catch(this.error)
			.then(this.log(`Device ${deviceData.id} is available.`));
	    
	    // Current device state
	    let deviceState = this.getState();
		let capabilities = deviceState;

		if(typeof deviceState === 'undefined' || deviceState === null || !('measure_power' in deviceState)) {
			capabilities = deviceInstance;
		}

		// Sync values to internal state
		for(let capabilityId in capabilities)
		{
			let value = deviceInstance[ capabilityId ];
			if(typeof value !== 'undefined' && value !== null) {
				
				let oldValue = deviceState[capabilityId];								
				deviceState[ capabilityId ] = value;

				if(oldValue !== value)
				{
					this.setCapabilityValue(capabilityId, value)
						.catch(this.error)
						.then(this.log(`Capability ${capabilityId} set to ${value}.`));
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
				this.setSettings( deviceInstance.settings )
				.catch(this.error)
				.then(this.log(`Settings updated.`));
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