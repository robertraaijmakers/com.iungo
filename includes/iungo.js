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
    this.options = { url: uri || 'http://192.168.178.47' };
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
		
		let formData = {
			seq: this.sequence,
			method: apiMethod,
			arguments: apiArguments
		};
		
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
		
		console.log(formData);
		
		request(opts, function (error, response, body) {
				//console.log(error);
				//console.log(response);
				//console.log(body);
               if (response === null || response === undefined) {
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
                     Homey.log('JSON: ');
					 Homey.log(body);
                     jsonObject = null;
                     callback('Invalid data', []); 
                  }
               } else {        
                  if(typeof callback === 'function') {
                    callback('Error', []); 
                  }
                  Homey.log('Error: '+error);
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
		
		//console.log("Set device name");
		//console.log(args);
		
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
};
