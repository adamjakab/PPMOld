/**
 * This object holds the definition(the default values) for PPM SYNC STORAGE DATA
 * that will keep all user settings for the profile
 * all data here will be encrypted(by selected ES) before writing it out
 *
 * TODOS:
 *          1) //we need flag to be able to track if changes were made since last setOption
 *          2) check and push changed configuration data to storage at regular intervals(5/10min) - autosave - even though it is saved on logout
 *
 * @type {Object}
 */
function ChromeStorageSync() {
    var _logzone = 'ChromeStorageSync';
    var inited = false;
    var default_profile_name = "PPMCONFIG";
    var default_master_key = "Paranoia";
    var default_enryption_scheme = "PPM_ENCRYPTION_SCHEME_AESMD5";
    var storage_profile_name;
    var storage_profile_master_key;
    var storage_profile_enryption_scheme;

    var data = {
        logincount: 0,
        logindate: "",
        //default server configuration
        "srv.0.name": "Paranoia Testing Server",
        "srv.0.type": "master",
        "srv.0.url":  "https://paranoia.ssl.alfazeta.com",
        "srv.0.username": "unregistered",
        "srv.0.password": "(:-very_secure_password-:)",
        "srv.0.ping_interval": 90,
        "srv.0.encryption_scheme": "PPM_ENCRYPTION_SCHEME_SINGLEPASS",
        "srv.0.master_key": "Paranoia",

        //
        pwgen_length: 32,
        pwgen_specialchars: '+-_|!$%&([{}])?^*@#.,:;~',
        pwgen_use_alpha_lower: true,
        pwgen_use_alpha_upper: true,
        pwgen_use_numeric: true,
        pwgen_use_special: true,
        //
        menu_width_nopc: 125,
        menu_width_withpc: 250,
        //
        passcard_default_username: "",
        passcard_autofill_password: true


    };

    /*-------------------------------------------------------------------------------------PUBLIC METHODS*/
    this.getOption = function(key) {
        return(_getOption(key));
    }

    this.setOption = function(key, val) {
        _setOption(key, val);
    }

    this.init = function(pn, mk, es, callback) {
        var isAutoCreatedDefaultObject = false;
        var settingsObject = null;
        pn = (pn?pn:default_profile_name);
        chrome.storage.sync.get(null, function(d){
            //log("LOADED: " + JSON.stringify(d));
            if(!d[pn]) {
                log("PROFILE DOES NOT EXIST [KEY="+pn+"]!");
                if(pn == default_profile_name) {
                    log("CREATING DEFAULT DATA[KEY="+pn+"]...");
                    isAutoCreatedDefaultObject = true;
                    settingsObject = {};
                    storage_profile_name = default_profile_name;
                    storage_profile_master_key = default_master_key;
                    storage_profile_enryption_scheme = default_enryption_scheme;
                }
            } else {
                var cryptedSettings = d[pn];
                if(mk&&es) {
                    log("RAW DATA[KEY="+pn+"]: " + JSON.stringify(cryptedSettings));
                    var CRYPTER = PPM.getCrypter();
                    var decryptedSettings = CRYPTER.decryptWithScheme(cryptedSettings, mk, es);
                    log("DECRYPTED DATA: " + decryptedSettings);
                    try {//if the parsed decrypted settings result an object then we are OK
                        var so = JSON.parse(decryptedSettings);
                        if (typeof(so) == "object") {
                            storage_profile_name = pn;
                            storage_profile_master_key = mk;
                            storage_profile_enryption_scheme = es;
                            settingsObject = so;
                            log("Loaded.");
                        } else {
                            throw("Arrrggghh!");
                        }
                    } catch (e) {
                        log("This MasterKey does not open the door!");
                    }
                } else {
                    log("No MK/ES were given to decrypt profile data[KEY="+pn+"]!");
                }
            }
            //
            if(settingsObject) {
                var _needsWrite = false;
                if (!_checkForAllDataKeys(settingsObject)) {
                    settingsObject = _injectMissingDataKeys(settingsObject);
                    _needsWrite = true;
                    log("Added missing props to loaded data: " + JSON.stringify(settingsObject));
                }
                data = settingsObject;
                if(_needsWrite) {
                    _writeOutStorageData(null);
                }
                if(!isAutoCreatedDefaultObject){
                    //if the settings object was created fresh do NOT init
                    inited = true;
                }
            } else {
                log("No profile data was loaded!");
            }
            if(callback) {callback(inited);};
        });
    }


    this.shutdown = function(callback) {
        _writeOutStorageData(callback);
    }

    this.forceStorageDataWriteout = function(callback) {
        _writeOutStorageData(callback);
    }




    this.isInited = function() {return(inited);}

    this.getCurrentPnEsMk = function() {
        return({
            pn: storage_profile_name,
            es: storage_profile_enryption_scheme,
            mk: storage_profile_master_key
        });
    }

    this.setCurrentEsMk = function(es, mk) {
        storage_profile_enryption_scheme = es;
        storage_profile_master_key = mk;
    }


    /*-------------------------------------------------------------------------------------PRIVATE METHODS*/
    function _getOption(key) {
        var answer = null;
        if(data[key]) {
            answer = data[key];
        }
        return(answer);
    }

    function _setOption(key, val) {
        data[key] = val;
        log("SET("+key+"):"+val);
    }

    function _writeOutStorageData(callback) {
        var pdstr = JSON.stringify(data);
        log("WRITING OUT:"+pdstr);
        var CRYPTER = PPM.getCrypter();
        var pdencstr = CRYPTER.encryptWithScheme(pdstr, storage_profile_master_key, storage_profile_enryption_scheme);
        //log("WRITING OUT:"+pdencstr);
        //
        var o = {};
        o[storage_profile_name] = pdencstr;
        //log("WRITING OUT:"+JSON.stringify(o));
        chrome.storage.sync.set(o, function() {
             log("SAVED PROFILE("+storage_profile_name+").");
             if(callback) {callback();};
        });
    }

    function _injectMissingDataKeys(d) {
        for(var prop in data) {
            if (!d.hasOwnProperty(prop)) {
                d[prop] = data[prop];
            }
        }
        return(d);
    }

    function _checkForAllDataKeys(d) {
        var answer = true;//optimistic
        for(var prop in data) {
            if (!d.hasOwnProperty(prop)) {
                answer = false;
                break;
            }
        }
        return(answer);
    }

    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
};

