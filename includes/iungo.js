'use strict';

var request = require('request');

/*
 * Object-oriented API
 */
module.exports.Iungo = Iungo;

function Iungo(username, password, uri) {
    this.sid = null;
    this.username = username;
    this.password = password;
    this.options = { url: uri || 'http://10.0.0.1' };
	this.sequence = 1;
}

Iungo.prototype = {
    call: function(api_method, api_arguments, callback) {
		
		this.sequence += 1;
		
		// Prevent int overflow
		if(this.sequence >= 999999999)
		{
			this.sequence = 1;
		}
		
		let apiMethod = api_method || "";
		let apiArguments = api_arguments || {};
		
		var opts = {
			url: this.options.url + '/iungo/api_request/',
			method: 'POST',
			//auth: { user: 'username', password: 'password' },
			json: true,
			body: {
				"seq": this.sequence,
				"method": apiMethod,
				"arguments": apiArguments
			}
		};
		
		request(opts, function (error, response, body)
		{
               if (response === null || response === undefined)
               {
                   callback('No response', []); 
                   return;
               }
               if (!error && response.statusCode == 200) {
                  var jsonObject;
                  try {
                     if (body.ok === true) {
                        if(typeof callback === 'function') {
                          callback(null, body.rv); 
                        }
                     }
                  } catch (exception) {
					 console.log(exception);
                     console.log('JSON: ');
					 console.log(body);
                     jsonObject = null;
                     callback('Invalid data', []); 
                  }
               } else {        
                  if(typeof callback === 'function') {
                    callback('Error', []); 
                  }
                  console.log('Error: '+error);
               }
           });
    },
	
	getDevices: function(callback) {
        this.call("objmgr_get_objects_init", null, callback);
    },
	
	getDevice: function(oid, callback) {
		
		var args = {
			oid: oid
		};
		
		this.call("objmgr_get_objects_init", args, callback);
	},
	
	setDeviceName: function(oid, newName, callback)
	{
		var args = {
			oid: oid,
			prop: "name",
			value: newName
		};
		
		this.call("object_prop_set", args, callback);
	},
	
	setDeviceOnOff: function(oid, state, callback)
	{
		var args = {
			oid: oid,
			prop: "command",
			value: (state === true ? "on" : "off")
		};
				
		this.call("object_prop_set", args, callback);
	},
	
	setDeviceSettings: function(oid, props, callback)
	{
		console.log(oid);
		console.log(props);
		
		var args = {
			oid: oid,
			prop: props["key"],
			value: props["value"]
		};
				
		this.call("object_prop_set", args, callback);
	}
};
