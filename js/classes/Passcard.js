/**
 * Created with JetBrains PhpStorm.
 * User: jackisback
 * Date: 4/13/13
 * Time: 10:56 AM
 * To change this template use File | Settings | File Templates.
 */
function Passcard() {
    var _BG_ = chrome.extension.getBackgroundPage();
    /** @var PPM ParanoiaPasswordManager */
    var PPM = _BG_.PPM;
    var PPMSTORAGE = PPM.getPPMStorage();
    var _logzone = 'Passcard';

    var data;
    var children = new Array();//urlcard collection
    var sync_state = 0; // 0=OK(in sync), 1=SYNCING, 2=ERROR(out of sync)

    /**
     *
     * @param settings {"id":"2","parent_id":"0","collection":"passcard","identifier":"google\.com","name":"abc", "secure":"{username/password/...}, "params":"{cdate/mdate/...}"}
     * @returns {boolean}
     */
    this.init = function(settings) {
        try {
            if (typeof(settings) == "undefined" || typeof(settings.collection) == "undefined" || settings.collection != "passcard") {
                throw "Settings are missing or not a passcard!";
            }
            if (!settings.name || settings.name == "") {
                throw "Passcard must have a name!";
            }
            if (!settings.identifier || settings.identifier == "") {
                throw "Passcard must have an identifier!";
            }
            //
            if(settings.secure) {
                settings.secure = (typeof settings.secure == "string"?JSON.parse(settings.secure):settings.secure);
            } else {
                settings.secure = {};
            }
            if(settings.params) {
                settings.params = (typeof settings.params == "string"?JSON.parse(settings.params):settings.params);
            } else {
                settings.params = {};
            }
        } catch (e) {
            log("Init error!: " + e);
            return false;
        }
        data = settings;
        log("inited with: " + JSON.stringify(data));
        return true;
    };


    this.get = function(prop) {
        var answer = "";
        if (data[prop]) {
            answer = data[prop];
        } else if (data.params && data.params[prop]) {
            answer = data.params[prop];
        } else if (data.secure && data.secure[prop]) {
            answer = data.secure[prop];
        } else if (prop == "sync_state") {
            answer = sync_state;
        } else if (prop == "number_of_children") {
            answer = children.length;
        } else if (prop == "full_data") {//for saving
            answer = JSON.parse(JSON.stringify(data));//stupid but efficient way of creating a duplicate
        }
        return(answer);
    };

    this.set = function(prop, val, area) {
        log("SET: " + prop + " = " + val +" area: " + area);
        if (area && area == "params") {
            if(!data.params) {data.params = {};}
            data.params[prop] = val;
        } else if (area && area == "secure") {
            if(!data.secure) {data.secure = {};}
            data.secure[prop] = val;
        } else if (prop == "id" && !data.id) {
            data.id = val;
        } else if(prop!="secure"&&prop!="params") {
            data[prop] = val;
        }
    };

    this.save = function(callback) {
        this.setState(1);//SYNCING
        PPMSTORAGE.registerOperationInQueue({"ppmObj": this, "operation": "save", "callback": callback});
    };

    this.delete = function(callback) {
        PPMSTORAGE.registerOperationInQueue({"ppmObj": this, "operation": "delete", "callback": callback});
    };

    this.loadSecure = function(callback) {
        PPMSTORAGE.registerOperationInQueue({"ppmObj": this, "operation": "get_secure", "callback": callback});
    };

    this.loadParams = function(callback) {
        PPMSTORAGE.registerOperationInQueue({"ppmObj": this, "operation": "get_params", "callback": callback});
    };

    //-----------------------------
    this.hasSecure = function() {
        return(data.secure &&
            typeof data.secure == "object" &&
            data.secure instanceof Object &&
            data.secure.hasOwnProperty("username") &&
            data.secure.hasOwnProperty("password")
        );
    }

    this.setSecure = function(secureString) {
        try {
            var secure = JSON.parse(secureString);
            if (typeof secure == "object" && secure instanceof Object) {
                data.secure = secure;
            } else {
                throw "not a JSON parsable object! " + secureString;
            }
        } catch(e) {
            log("setSecure Error: " + e);
        }
    }

    this.hasParams = function() {
        return(data.params &&
            typeof data.params == "object" &&
            data.params instanceof Object &&
            data.params.hasOwnProperty("cdate") &&
            data.params.hasOwnProperty("mdate")
        );
    }

    this.setParams = function(paramString) {
        try {
            var params = JSON.parse(paramString);
            if (typeof params == "object" && params instanceof Object) {
                data.params = params;
            } else {
                throw "not a JSON parsable object! " + paramString;
            }
        } catch(e) {
            log("setParams Error: " + e);
        }
    }

    /**
     * For now sync state is used only for saving and it is set to 1 as soon object is inserted into queue (so that in-sync items can be counted)
     * @returns {number} // 0=OK(in sync), 1=SYNCING(loading/saving), 2=ERROR(out of sync)
     */
    this.getState = function() {
        return(sync_state);
    }
    //this is not very good like this but for now serves the purpose
    this.setState = function(stateNum) {
        sync_state = stateNum;
    }



    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}
Passcard.prototype = {};