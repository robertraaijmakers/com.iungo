'use strict';

const Homey = require('homey');
const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default'
}

module.exports = class DriverSolarMeter extends Homey.Driver {

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
		
		for( let solar_meter in state.iungo._solarMeters )
		{
			let capabilities = [ "measure_power", "meter_power" ];
						
			let deviceObj = {
				name			: state.iungo._solarMeters[solar_meter].name,
				data 			: { iungo_id: state.iungo.id, id: solar_meter  } ,
				capabilities	: capabilities
			};

			if( typeof iconsMap[ state.iungo._solarMeters[solar_meter].modelId ] === 'string' ) {
				let modelId = state.iungo._solarMeters[solar_meter].modelId;
				deviceObj.icon = `/icons/${iconsMap[modelId]}.svg`;
			}

			result.push( deviceObj );
		}

		return result;
    }
}