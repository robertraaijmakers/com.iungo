'use strict';

const Homey = require('homey');
const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default'
}

class DriverWaterMeter extends Homey.Driver {

    onPair( socket ) {
		console.log('onPair');

		let state = {
			connected	: true,
			iungo		: undefined
		};

		socket
			.on('select_iungo', ( data, callback ) => {
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

				callback( null, result );
			})
			.on('list_devices', ( data, callback ) => {
				if( this.onPairListDevices ) {
					this.onPairListDevices( state, data, callback );
				} else {
					callback( new Error('missing onPairListDevices') );
				}
			})
			.on('disconnect', () => {
				state.connected = false;
			})
	}

    onPairListDevices( state, data, callback )
    {
	    console.log('onPairListDevices', state);

		if( !state.iungo )
			return callback( 'invalid_iungo' );

		if( state.iungo instanceof Error )
			return callback( state.iungo );
		
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

		callback( null, result );
    }
}

module.exports = DriverWaterMeter;