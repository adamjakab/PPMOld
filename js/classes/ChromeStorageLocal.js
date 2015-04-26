/**
 * This object holds the definition(the default values) for PPM LOCAL STORAGE DATA
 * mostly interface preferences
 * !!!NO ENCRYPTION!!!
 *
 * @type {Object}
 */
function ChromeStorageLocal() {
    var _logzone = 'ChromeStorageLocal';
    var inited = false;
    var data = {
        "options_tab_index": 1
    };//set some default values for first timers

    /*-------------------------------------------------------------------------------------PUBLIC METHODS*/
    this.getOption = function(key) {
        return(_getOption(key));
    }

    this.setOption = function(key, val) {
        _setOption(key, val);
    }



    this.init = function() {
        chrome.storage.local.get(null, function(d){
            log("Loaded:" + JSON.stringify(d));
            /*THERE IS SOMETHING WRONG W/ THIS*/
            if (!_checkForAllDataKeys(d)) {
                //@TODO: missing keys on d (from data) must be injected and sent to storage
                d = _injectMissingDataKeys(d);//there is the same object returned!!!
                log("Added missing props to loaded data: " + JSON.stringify(d));
            } else {
                data = d;
            }
            inited = true;
        });
    }

    this.shutdown = function() {
        //dummy function - there is nothing to do here because after
        //shutdown a new instance of this will be created
    }

    this.isInited = function() {return(inited);}
    /*-------------------------------------------------------------------------------------PRIVATE METHODS*/
    function _getOption(key) {
        var answer = null;
        if(data[key]) {
            answer = data[key];
        }
        return(answer);
    }

    function _setOption(key, val) {
        var o = {};
        o[key] = val;
        chrome.storage.local.set(o, function() {
            data[key] = val;
            log("SAVED("+key+"):"+val);
        });
    }

    function _injectMissingDataKeys(d) {
        for(var prop in data) {
            if (!d.hasOwnProperty(prop)) {
                _setOption(prop, data[prop]);
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