# Iungo
This app let's you connect your Iungo to Homey. You can add your Iungo smart meters and connected devices. Once done it will show up in the flow-editor, ready to be used!


**If you like this app, then consider to buy my kids some toys or my wife some flowers :)**

[![](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://paypal.me/RobertRaaijmakers/3)


If you have any suggestions or bugs, please post them on GitHub: https://github.com/robertraaijmakers/com.iungo/

If you have any questions regarding flows, usage or other questions about the app. Please post them in the official app topic: https://forum.athom.com/discussion/3217/app-iungo

v0.3.0:
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