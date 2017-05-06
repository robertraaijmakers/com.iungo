'use strict';

var request = require('request');

/*
 * Object-oriented API
 */
module.exports.IungoDiscover = IungoDiscover;

function IungoDiscover() {
    this.url = "http://www.atedec.com/iungo/myiungoip";
}

IungoDiscover.prototype = {
    call: function(callback) {		
		var opts = {
			url: this.url,
			method: 'GET'
		};
		
		request(opts, function (error, response, body) {
               if (response === null || response === undefined) {
                   callback('No response', []); 
                   return;
               }
               if (!error && response.statusCode == 200) {
				  callback(null, body);
               } else {        
                  if(typeof callback === 'function') {
                    callback('Error', []); 
                  }
                  Homey.log('Error: '+error);
               }
           });
    },
	
	findDriver: function(callback) {
        this.call(callback);
    }
};