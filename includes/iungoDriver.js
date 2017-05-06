'use strict';

const _ 			= require('underscore');

const saveTimeout = 500;

class IungoDriver {

	constructor() {
		this._debug = true;
		this._devices = {};

		this.init = this._onExportsInit.bind(this);
		this.pair = this._onExportsPair.bind(this);
		this.added = this._onExportsAdded.bind(this);
		this.deleted = this._onExportsDeleted.bind(this);
		this.renamed = this._onExportsRenamed.bind(this);
	}

	/*
		Helper methods
	*/
	debug() {
		if( this._debug ) {
			this.log.apply( this, arguments );
		}
	}

	log() {
		if( Homey.app ) {
			Homey.app.log.bind( Homey.app, `[${this.constructor.name}]` ).apply( Homey.app, arguments );
		}
	}

	error() {
		if( Homey.app ) {
			Homey.app.error.bind( Homey.app, `[${this.constructor.name}]` ).apply( Homey.app, arguments );
		}
	}

	getDeviceData( iungo, oid ) {
		return {
			id			: oid,
			iungo_id	: iungo.id
		}
	}

	getIungo( device_data ) {
		return Homey.app.getIungo( device_data.iungo_id );
	}

	getDevice( device_data ) {
		return this._devices[ device_data.id ] || new Error('invalid_device');
	}

	getDeviceInstance( device_data )
	{
		let iungo = Homey.app.getIungo( device_data.iungo_id );
		if( iungo instanceof Error ) return iungo;

		let device;
		if( this._deviceType === 'energy_meter' ) {
			device = iungo.getEnergyMeter( device_data.id );
		} else if( this._deviceType === 'water_meter' ) {
			device = iungo.getWaterMeter( device_data.id );
		} else {
			device = new Error('invalid_device_type');
		}
		return device;
	}

	/*
		Device methods
	*/
	_initDevice( device_data ) {
		this.debug('_initDevice', device_data.id);

		this.getCapabilities( device_data, ( err, capabilities ) => {
			console.log("register device");
			console.log(err);
			console.log(capabilities);
			
			if( err ) return this.error( err );
			
			// create the device entry
			this.setUnavailable( device_data, __('unreachable') );

			this._devices[ device_data.id ] = {
				data		: device_data,
				state		: {},
				iungo		: undefined,
				instance	: undefined,
				saveTimeout	: undefined,
				saveCbs		: [],
				save		: ( callback ) => {
					callback = callback || function(){}

					let iungo = this.getIungo( device_data );
					if( iungo instanceof Error ) return callback( iungo );

					let deviceInstance = this.getDeviceInstance( device_data );
					if( deviceInstance instanceof Error ) return callback( deviceInstance );

					// store callback
					this._devices[ device_data.id ].saveCbs.push( callback );

					// clear previous timeout
					if( this._devices[ device_data.id ].saveTimeout ) {
						clearTimeout(this._devices[ device_data.id ].saveTimeout);
					}

					this._devices[ device_data.id ].saveTimeout = setTimeout(() => {

						if( typeof this._onBeforeSave === 'function' ) {
							this._onBeforeSave( device_data );
						}

						// apply queued instance properties
						for( let key in this._devices[ device_data.id ].setInstanceProperties ) {
							let value = this._devices[ device_data.id ].setInstanceProperties[ key ];
							deviceInstance[ key ] = value;
						}
						
						this._devices[ device_data.id ].setInstanceProperties = {};

						// apply queued instance config properties
						for( let key in this._devices[ device_data.id ].setInstanceConfigProperties ) {
							let value = this._devices[ device_data.id ].setInstanceConfigProperties[ key ];
							deviceInstance.config[ key ] = value;
						}
						
						this._devices[ device_data.id ].setInstanceConfigProperties = {};

						// save and fire callbacks
						return iungo.save( this._deviceType, deviceInstance )
							.then(( result ) => {
								this._devices[ device_data.id ].saveCbs.forEach(( callback ) => {
									callback( null, result );
								});
							})
							.catch(( err ) => {
								this.error( err );
								this._devices[ device_data.id ].saveCbs.forEach(( callback ) => {
									callback( err );
								});
								log(err);
								//Log.captureException( err );
							})
							.then(() => {
								this._devices[ device_data.id ].saveCbs = [];
							})

					}, saveTimeout);

				},
				setInstanceProperties: {},
				setInstanceProperty	: ( key, value ) => {
					this.debug( 'device.setInstanceProperty' );

					let device = this.getDevice( device_data );
					if( device instanceof Error ) return this.error( device );

					let deviceInstance = this.getDeviceInstance( device_data );
					if( deviceInstance instanceof Error ) return this.error( deviceInstance );

					this._devices[ device_data.id ].setInstanceProperties[ key ] = value;
				},
				setInstanceConfigProperties: {},
				setInstanceConfigProperty : ( key, value ) => {
					this.debug( 'device.setInstanceConfigProperty' );

					let device = this.getDevice( device_data );
					if( device instanceof Error ) return this.error( device );

					let deviceInstance = this.getDeviceInstance( device_data );
					if( deviceInstance instanceof Error ) return this.error( deviceInstance );

					this._devices[ device_data.id ].setInstanceConfigProperties[ key ] = value;
				},
				syncFn: () => {
					this.debug( 'device.syncFn' );
					this._syncDevice( device_data );
				}
			}

			// add state
			capabilities.forEach(( capability ) => {
				this._devices[ device_data.id ].state[ capability ] = null;
			});

			// Wait for the iungo to be available
			let deviceInstance = this.getDeviceInstance( device_data );
			if( deviceInstance instanceof Error ) {				
				if( deviceInstance.message === 'invalid_iungo'
				 || deviceInstance.message === 'invalid_water_meter'
				 || deviceInstance.message === 'invalid_energy_meter' 
				 || deviceInstance.message === 'invalid_socket' ) {
					Homey.app.once('iungo_available', ( iungo ) => {
						iungo.on('refresh', this._devices[ device_data.id ].syncFn);
						this._syncDevice( device_data );
					});
				}
			} else {
				let iungo = this.getIungo( device_data );
				if( iungo instanceof Error ) return this.error( iungo );

				iungo.on('refresh', this._devices[ device_data.id ].syncFn);
				this._syncDevice( device_data );
			}
		});
	}

	_uninitDevice( device_data ) {
		this.debug('_uninitDevice', device_data);

		let device = this._devices[ device_data.id ];
		if( device ) {

			let iungo = this.getIungo( device_data );
			if( iungo ) {
				iungo.removeListener('refresh', this._devices[ device_data.id ].syncFn)
			}

			delete this._devices[ device_data.id ];
		}
	}

	_syncDevice( device_data ) {
		// dummy
		console.log("test sync device");
	}

	/*
		Exports methods
	*/
	_onExportsInit( devices_data, callback ) {
		this.debug( '_onExportsInit', devices_data );
		devices_data.forEach( this._initDevice.bind(this) );
		callback();
	}

	_onExportsAdded( device_data ) {
		this.debug( '_onExportsAdded', device_data );
		this._initDevice( device_data );
	}

	_onExportsDeleted( device_data ) {
		this.debug( '_onExportsDeleted', device_data );
		this._uninitDevice( device_data );
	}

	_onExportsRenamed( device_data, newName ) {
		this.debug( '_onExportsRenamed', device_data, newName );

		let device = this.getDevice( device_data );
		if( device instanceof Error ) return this.error( device );

		device.setInstanceProperty( 'name', newName );
		device.save(( err, result ) => {
			if( err ) return this.error( err );
		});
	}

	_onExportsPair( socket ) {
		this.debug('_onExportsPair');

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
				
				console.log(result);

				callback( null, result );
			})
			.on('enter_credentials', ( data, callback ) => {
				state.iungo = Homey.app.getIungo( data.iungoId );
				if( state.iungo instanceof Error ) return callback( iungo );

				if( state.iungo.isAuthenticated() ) {
					return callback( null, true );
				} else {
					// The user has to enter his/her credentials first.
					return callback( null, false );
				}
			})
			.on('credentials_entered', ( data, callback ) => {
				state.iungo = Homey.app.getIungo( data.iungoId );
				if( state.iungo instanceof Error ) return callback( iungo );

				// note: what to do with callback ?
				state.iungo.register(data.username, data.password, function()
				{
					if( state.iungo.isAuthenticated() ) {
						return callback( null, true );
					} else {
						// Wrong credentials, show message ?
						return callback( null, false );
					}
				});
			})
			.on('list_devices', ( data, callback ) => {
				if( this._onExportsPairListDevices ) {
					this._onExportsPairListDevices( state, data, callback );
				} else {
					callback( new Error('missing _onExportsPairListDevices') );
				}
			})
			.on('disconnect', () => {
				state.connected = false;
			})
	}

	static getMAC( str ) {
		return str.split('-')[0].toLowerCase();
	}
}

module.exports = IungoDriver;