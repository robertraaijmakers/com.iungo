'use strict';

const Homey = require('homey');

const defaultIcon 			= 'default';
const iconsMap				= {
	'default': 'default',
	'plugwiserf': 'plugwise',
	'plugwiseplus': 'plugwise'
}

module.exports = class DriverSockets extends Homey.Driver {
	
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
		
		for( let socket in state.iungo._sockets )
		{
			let deviceObj = {
				name			: state.iungo._sockets[socket].name,
				data 			: { iungo_id: state.iungo.id, id: socket  },
				capabilities	: [ "measure_power", "onoff" ]
			};

			if( typeof iconsMap[ state.iungo._sockets[socket].modelId ] === 'string' ) {
				let modelId = state.iungo._sockets[socket].modelId;
				deviceObj.icon = `/icons/${iconsMap[modelId]}.svg`;
			}

			result.push( deviceObj );
		}

		return result;
    }
}

module.exports = DriverSockets;