'use strict';

const Homey = require('homey');
const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default'
}

module.exports = class DriverWaterMeter extends Homey.Driver {
	
	async onPair( session ) {
		console.log('onPair');

		let state = {
			connected	: true,
			iungo		: undefined
		};

		session
			.setHandler('select_iungo', ( data ) => {
				Homey.app.findIungos();
				
				let result = [];
				let iungoes = Homey.app.getIungoes();
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
		
		for( let water_meter in state.iungo._waterMeters )
		{
			let deviceObj = {
				name			: state.iungo._waterMeters[water_meter].name,
				data 			: { iungo_id: state.iungo.id, id: water_meter  },
				capabilities	: [ "measure_water", "meter_water" ]
			};

			if( typeof iconsMap[ state.iungo._waterMeters[water_meter].modelId ] === 'string' ) {
				let modelId = state.iungo._waterMeters[water_meter].modelId;
				deviceObj.icon = `/icons/${iconsMap[modelId]}.svg`;
			}

			result.push( deviceObj );
		}

		return result;
    }
}