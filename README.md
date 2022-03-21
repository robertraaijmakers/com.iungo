# Iungo
This app let's you connect your Iungo to Homey. You can add your Iungo smart meters and connected devices. Once done it will show up in the flow-editor, ready to be used!

**If you like this app, please consider to donate**

If you have any suggestions or bugs, please post them on GitHub: https://github.com/robertraaijmakers/com.iungo/

v1.0.0:
* Completely rebuild app to be compatible with Homey v5. You might need to reconnect your devices. Sorry!

v0.4.0:
* Added support for Homey energy!! :)

v0.3.4:
* Added fix for homes without gas meter
* Added fix to support modbus energy meters as seperate energy meters

v0.3.3:
* Fixt synchronisation problem with redelivery values
* Added power fase readings (**repair of device needed**). This will show:
	* Import per fase (shown when redelivery, or more then one fase is available)
	* Export per fase (if in use)
	* Total power import (shown when redelivery, or more then one fase is available)
	* Total power export (if in use)
* Made sure that capabilities are only shown if they are used (e.g. redelivery readings won't show if you don't have redelivery power)
* Added solar meter
* Completely rewrote the app to use Homey SDK Version 2 (so it's future proof :)), needs Homey version 1.5 or higher

v0.2.8:
* Added redelivery (solar panels) capabilities to smart meter (**repair of device needed**)
* Added some setting options to the smart meter (tariff, gas meter interval)
* Fixt a defect that water meter offset value wasn't retrieved from Iungo

v0.2.7:
* Fix for reading water meter values
* Updated app store image according to Iungo standards

v0.2.3: 
* Initial version of Iungo app letting you read your P1 meter with Iungo Lite or the Iungo Energy Controller
* Letting you manage your Iungo compatible wall sockets (read power consumption and turn them on and off from within Homey)
