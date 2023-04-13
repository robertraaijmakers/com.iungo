'use strict';

const Homey = require('homey');
const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default'
}

module.exports = class DriverEnergyMeter extends Homey.Driver {

	async onInit() {
		
	}

	async onPair( session ) {
		console.log('onPair');

		let state = {
			connected	: true,
			iungo		: undefined
		};

		session
			.setHandler('select_iungo', ( data ) => {
				this.homey.app.findIungos();
				
				let result = [];
				let iungoes = this.homey.app.getIungoes();
				console.log(iungoes);
				for( let iungoId in iungoes) {
					state.iungo = iungoes[iungoId];

					result.push({
						id		: iungoId,
						name	: state.iungo.name || state.iungo.address,
						icon	: state.iungo.icon
					});
				}

				return result;
			})
			.setHandler('list_devices', ( data ) => {
				if( this.onPairListDevices ) {
					return this.onPairListDevices( state, data );
				} else {
					return new Error('missing onPairListDevices');
				}
			})
			.setHandler('disconnect', () => {
				state.connected = false;
			})
	}

    async onPairListDevices( state, data )
    {
	    console.log('onPairListDevices', state);

		if( !state.iungo )
			return 'invalid_iungo';

		if( state.iungo instanceof Error )
			return state.iungo;
		
		let result = [];
		
		for( let power_meter in state.iungo._energyMeters )
		{
			// Select capabilities dynamically based on availability & value
			let capabilities = [ "measure_power", "meter_power.t1" ];
			
			// Only add gas to capabilities when gas is connected
			// Not all homes have gas connection these days and also some modbus energymeter drivers don't measure gas #10
			if(typeof state.iungo._energyMeters[power_meter]['meter_gas'] !== 'undefined' && state.iungo._energyMeters[power_meter]['meter_gas'] > 0)
			{
				capabilities.push("meter_gas");
			}
			
			var exportValue = false;
			if(typeof state.iungo._energyMeters[power_meter]['meter_power.rt1'] !== 'undefined' && state.iungo._energyMeters[power_meter]['meter_power.rt1'] > 0)
			{
				capabilities.push('meter_power.rt1');
				exportValue = true;
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['meter_power.t2'] !== 'undefined' && (state.iungo._energyMeters[power_meter]['meter_power.t2'] > 0 || exportValue == true))
			{
				capabilities.push('meter_power.t2');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['meter_power.rt2'] !== 'undefined' && (state.iungo._energyMeters[power_meter]['meter_power.rt2'] > 0 || exportValue == true))
			{
				capabilities.push('meter_power.rt2');
				exportValue = true;
			}
			
			// We don't need the export capabilities if we don't export power.
			// We also don't need the import capability because the import total is always equal to the current power usage.
			if(exportValue)
			{
				capabilities.push("measure_power.import");
				capabilities.push("measure_power.export");
			}
			
			// We only need l1 import if l2 import is also defined. Otherwise l1 import will contain exactly the same values as measure power capability.
			// Or if we export energy. Then l1 import will be different then measure power.
			if(typeof state.iungo._energyMeters[power_meter]['measure_power.l1i'] !== 'undefined' 
				&& (typeof state.iungo._energyMeters[power_meter]['measure_power.l2i'] !== 'undefined' || exportValue))
			{
				capabilities.push('measure_power.l1i');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_power.l2i'] !== 'undefined')
			{
				capabilities.push('measure_power.l2i');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_power.l3i'] !== 'undefined')
			{
				capabilities.push('measure_power.l3i');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_power.l1e'] !== 'undefined' && exportValue)
			{
				capabilities.push('measure_power.l1e');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_power.l2e'] !== 'undefined' && exportValue)
			{
				capabilities.push('measure_power.l2e');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_power.l3e'] !== 'undefined' && exportValue)
			{
				capabilities.push('measure_power.l3e');
			}			
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_current.l1'] !== 'undefined')
			{
				capabilities.push('measure_current.l1');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_current.l2'] !== 'undefined')
			{
				capabilities.push('measure_current.l2');
			}
			
			if(typeof state.iungo._energyMeters[power_meter]['measure_current.l3'] !== 'undefined')
			{
				capabilities.push('measure_current.l3');
			}
						
			let deviceObj = {
				name			: state.iungo._energyMeters[power_meter].name,
				data 			: { iungo_id: state.iungo.id, id: power_meter  } ,
				capabilities	: capabilities
			};

			if( typeof iconsMap[ state.iungo._energyMeters[power_meter].modelId ] === 'string' ) {
				let modelId = state.iungo._energyMeters[power_meter].modelId;
				deviceObj.icon = `/icons/${iconsMap[modelId]}.svg`;
			}

			result.push( deviceObj );
		}

		return result;
    }
}
