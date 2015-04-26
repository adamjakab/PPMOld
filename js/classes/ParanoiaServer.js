/**
 *
 * @constructor
 */
function ParanoiaServer() {
    var _logzone = 'ParanoiaServer';
    var CHROMESTORAGE = PPM.getChromeStorage();
    var PPMSTORAGE = PPM.getPPMStorage();
    var CRYPTER = PPM.getCrypter();
    var self = this;
    var serverIndex;
    var is_connected = false;
    var _BUSY_ = false;
    //
    var seed = null;
    var timestamp = null;
    var leftPadLength = null;
    var rightPadLength = null;
    //
    var dataTransferES = "PPM_ENCRYPTION_SCHEME_SINGLEPASS";

    //temporary variables which should be moved as configuration options
    var seedChars = new Array();
    seedChars[0] = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    seedChars[1] = '0123456789';
    seedChars[2] = '#@?!|&%^*+-=.:,;/([{< >}])';
    var seed_min_num_chars_per_type = 6;
    var seed_length_min = 24;
    var seed_length_max = 32;
    //
    var padding_length_min = 32;
    var padding_length_max = 64;
    //
    var srvIntervalRef = null;
    var last_ping_ts = _getTimestamp();
    //
    var reconnect_after_secs = 30;
    var disconnection_ts = _getTimestamp() - reconnect_after_secs;//so that newly created servers connect right away


    var serverConfiguration = {
        name: null,
        type: null,
        url: null,
        username: null,
        password: null,
        master_key: null,
        encryption_scheme: null,
        ping_interval: null
    };


    /*-------------------------------------------------------------------------------------PUBLIC METHODS*/
    this.init = function(index) {
        var answer = false;
        serverIndex = index;
        log("Initing...");
        var val;
        var allConfigKeysFound = true;
        for (var key in serverConfiguration) {
            var PSCK = 'srv.' + serverIndex + '.' + key;
            if (val = CHROMESTORAGE.getOption("sync", PSCK)) {
                //log("Checking Config["+key+"]: " + val);
                serverConfiguration[key] = val;
            } else {
                allConfigKeysFound = false;
                log("Config key["+PSCK+"] not found!");
                log("Server can NOT be configured!");
                break;
            }
        }
        if(allConfigKeysFound) {
            log("Configured with: " + JSON.stringify(serverConfiguration));
            _startServerQueueCheckService();
            answer = true;
        }
        return(answer);
    }

    this.shutdown = function(callback) {
        _stopServerQueueCheckService();
        _shutdown_phase_1(callback);
    }

    this.isConnected = function() {
        return(is_connected);
    }
    /*-------------------------------------------------------------------------------------PRIVATE METHODS*/
    /**
     * Low level Xhr comunication interface with PPM server
     * SCO === (ServerComunicationObject)
     * {service:"name of service", callback:"callback function", dbdata:dbdata, params:params, ???}
     * @param SCO
     * @private
     */
    function _comunicateWithServer(SCO) {
        try {
            _setBusy();
            SCO.sendDataRaw = _prepareDefaultPostDataObject(SCO);
            if(SCO.service != "ping") {
                log("SCO[OUT]("+SCO.service+"):"+JSON.stringify(SCO));
            }
            _encryptD2S(SCO);
            var xhr = new XMLHttpRequest();
            xhr.open("POST", serverConfiguration.url, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onreadystatechange = function(ev) {
                SCO.success = true;//@todo: test missing
                SCO.xhr = ev.target;
                _comunicateWithServerDone(SCO);
            }
            xhr.send(SCO.sendDataCrypted);
        } catch(err) {
            SCO.success = false;
            SCO.errorMessage = "_comunicateWithServer ERROR: " + err;
            _comunicateWithServerDone(SCO);
        }
    }

    function _comunicateWithServerDone(SCO) {
        try{
            if (SCO.xhr && SCO.xhr.readyState == 4) {
                //DECRYPT RESPONSE
                _decryptSrvResponse(SCO);
                //PARSE REPONSE
                SCO.responseObject = JSON.parse(SCO.decryptedResponse);
                //REGISTER NEW SEED
                SCO.hasNewSeed = _register_new_seed(SCO);
                _setIdle();
                if (SCO.callback && typeof SCO.callback == "function") {
                    SCO.callback(SCO);
                }
            }
        } catch (err) {
            SCO.success = false;
            SCO.errorMessage = "_comunicateWithServerDone ERROR: " + err;
            log("ERROR IN SERVER RESPONSE SCO: " + JSON.stringify(SCO));
            _setIdle();
            _putServerInDisconnectedState();
            if (SCO.callback && typeof SCO.callback == "function") {
                SCO.callback(SCO);
            }
        }
    }

    /**
     * Registers from decrypted response things that we will need for next communication encryption
     * ::: seed, timestamp, leftPadLength, rightPadLength
     * If FAILS WILL PUT SERVER OFFLINE
     * @param SCO
     * @returns {boolean}
     * @private
     */
    function _register_new_seed(SCO) {
        try {
            if (SCO.service != "logout") {
                seed = SCO.responseObject.seed;
                timestamp = SCO.responseObject.timestamp;
                leftPadLength = SCO.responseObject.leftPadLength;
                rightPadLength = SCO.responseObject.rightPadLength;
                log ("SEED("+timestamp+"): '" + seed + "' LFT:"+leftPadLength + " RGT:"+rightPadLength);
                if (seed == null || timestamp == null) {
                    throw ("Unable to extract Paranoia_Seed or Paranoia_Timestamp from server response");
                }
            }
        } catch(err) {
            log("SEED REGISTRATION FAILED: " + err);
            _putServerInDisconnectedState();
            return (false);
        }
        return(true);
    }

    var _putServerInDisconnectedState = function() {
        is_connected = false;
        document.dispatchEvent(new CustomEvent("PPM", {
            detail: {type: "state_change"}, bubbles: true, cancelable: true
        }));
        seed = null;
        timestamp = null;
        leftPadLength = null;
        rightPadLength = null;
        disconnection_ts = _getTimestamp();//so we know when we disconnected and can do auto reconnection after some time
    }

    var _prepareDefaultPostDataObject = function(SCO) {
        var answer = {};
        answer.service = SCO.service;
        if (SCO.dbdata) {answer.dbdata = SCO.dbdata;}
        if (typeof(SCO.params) == "object" && (SCO.params instanceof Object)) {answer.params = SCO.params;}
        answer.seed = _getUglyString(seed_length_min, seed_length_max);
        answer.leftPadLength = _getRandomNumberInRange(padding_length_min, padding_length_max);
        answer.rightPadLength = _getRandomNumberInRange(padding_length_min, padding_length_max);
        return(answer);
    }

    var _decryptSrvResponse = function(SCO) {
        var trimmedResponse = _leftRightTrimString(SCO.xhr.responseText, SCO.sendDataRaw.leftPadLength, SCO.sendDataRaw.rightPadLength);
        SCO.decryptedResponse = CRYPTER.decryptWithScheme(trimmedResponse, SCO.sendDataRaw.seed, dataTransferES);
    }

    var _encryptD2S = function(SCO) {
        var Ed2s;
        var str2crypt = JSON.stringify(SCO.sendDataRaw);
        if (seed == null) {
            //if we have no seed yet we must encrypt data with combination username & password (md5hash of it 'coz server has only that)
            //also padding will be done on both left and right side with the length of the username
            Ed2s = CRYPTER.encryptWithScheme(str2crypt, serverConfiguration.username, dataTransferES);
            Ed2s = CRYPTER.encryptWithScheme(Ed2s, CRYPTER._md5hash(serverConfiguration.password), dataTransferES);
            Ed2s = _leftRightPadString(Ed2s, serverConfiguration.username.length, serverConfiguration.username.length);
        } else {
            //encrypt data normally with current seed
            Ed2s = CRYPTER.encryptWithScheme(str2crypt, seed, dataTransferES);
            Ed2s = _leftRightPadString(Ed2s, leftPadLength, rightPadLength);
        }
        SCO.sendDataCrypted = Ed2s;
    }

    var _leftRightPadString = function(str, lft, rgt) {
        var ugly = _getUglyString((lft>rgt?lft:rgt)*2,(lft>rgt?lft:rgt)*3);
        var leftChars = (CRYPTER.encryptWithScheme(ugly, ugly, dataTransferES)).substr(_getRandomNumberInRange(1,lft), lft);
        var rightChars = CRYPTER.encryptWithScheme(ugly, ugly, dataTransferES).substr(_getRandomNumberInRange(1,rgt), rgt);
        str = leftChars + str + rightChars;
        //log("LEFT("+lft+"): " + leftChars);
        //log("RIGHT("+rgt+"): " + rightChars);
        return(str);
    }

    var _leftRightTrimString = function(str, lft, rgt) {
        return(str.substr(lft, (str.length)-lft-rgt));
    }





    //------------------------------------------------------------------------------------------------------QUEUE CHECK SERVICE
    var _startServerQueueCheckService = function() {
        if(srvIntervalRef == null) {
            srvIntervalRef = setInterval(_queueCheckService, 500);
        }
    }
    var _stopServerQueueCheckService = function() {
        clearInterval(srvIntervalRef);
        srvIntervalRef = null;
    }

    /**
     * called by _comunicateWithServerDone before calling the queueItem's callback func
     * this will speed up queue execution by NOT waiting for next round
     */
    var _checkIfToCall_QCS_rightAway = function() {
        if (PPMSTORAGE.getOperationQueueLength() > 0) {
            //log("NOT CALLING QCS!!!");
            _queueCheckService();
        }
    }

    var _queueCheckService = function() {
        //#1 - CHECK IF CONNECTED AND AUTOCONNECT IF NOT
        if (is_connected !== true){
            //OOOOPS WE ARE DISCONNECTED - LET'S WAIT UNTIL "reconnect_after_secs" passes and then lets try to reconnect
            var connect_in_secs = disconnection_ts + reconnect_after_secs - _getTimestamp();
            log("SERVER WAS DISCONNECTED @ " + disconnection_ts + " reconnecting in: " + connect_in_secs);
            if (connect_in_secs <= 0) {
                disconnection_ts = _getTimestamp();
                log("trying to reconnect(@"+disconnection_ts+")...");
                _connect_phase_1(null);
            }
            //in any case don't go ahead 'coz we are not connected
            return;
        }

        //BAIL OUT IF BUSY
        if(_isBusy()) {return;}

        //#2 - CHECK FOR OPERATION IN QUEUE - IF ANY - AND EXECUTE
        if (PPMSTORAGE.getOperationQueueLength() > 0) {
            var queueItem = PPMSTORAGE.getNextOperationToExecuteFromQueue(serverIndex);
            if (queueItem) {
                _executeQueueItem_phase_1(queueItem);
                return;
            }
        }

        //#3 - PING
        if ((last_ping_ts + parseInt(serverConfiguration.ping_interval)) < _getTimestamp()) {
            last_ping_ts = _getTimestamp();
            _ping_phase_1(null);
        }
    }


    //------------------------------------------------------------------------------------------------------OPERATION QUEUE
    /**
     * Executes QueueItem
     * TODO: maybe a few sanity checks on queueItem would be in order
     * @param queueItem
     * @private
     */
    function _executeQueueItem_phase_1(queueItem) {
        var dbdata = queueItem.ppmObj.get("full_data");
        dbdata.operation = queueItem.operation;
        /*
        var dbdata = {
            operation: [get_index|save|get_params|get_secure],
            id: queueItem.ppmObj.get("id"),
            parent_id: queueItem.ppmObj.get("parent_id"),
            collection: queueItem.ppmObj.get("collection"),
            identifier: queueItem.ppmObj.get("identifier"),
            params, secure, ...
        };
        */

        if(queueItem.operation == 'save') {
            //SECURE DATA WILL BE ENCRYPTED LOCALY AND STORED ON SERVER
            var unencrypted_data = JSON.stringify(dbdata.secure);
            dbdata.secure = CRYPTER.encryptWithScheme(unencrypted_data, serverConfiguration.master_key, serverConfiguration.encryption_scheme);
        } else {
            delete dbdata.secure;
            delete dbdata.params;
        }

        _comunicateWithServer({
            service: "db",
            callback: _executeQueueItem_phase_2,
            dbdata: dbdata,
            queueItem: queueItem
        });
    }

    function _executeQueueItem_phase_2(SCO) {
        //log("executeQueueItem(PHASE2)..." + (SCO.success?"OK":"ERR!"));
        if(!SCO.success){
            log("executeQueueItem ERROR: " + JSON.stringify(SCO));//SCO.decryptedResponse
            SCO.queueItem.ppmObj.setState(2);//ERROR
        } else {
            SCO.queueItem.ppmObj.setState(0);//OK
        }

        if(SCO.queueItem.operation=="save" && SCO.responseObject.newID) {
            if(SCO.success){
                SCO.queueItem.ppmObj.set("id", SCO.responseObject.newID);
            }
        }

        if(SCO.queueItem.operation=="delete") {
            if(SCO.success){
                //we have just removed this passcard from db so it must be unregistered (PPMSTORAGE.removePasscard)
                //callback function should take care of that for now -
            }
        }

        if(SCO.queueItem.operation=="get_params") {
            if(SCO.success){
                SCO.queueItem.ppmObj.setParams(SCO.responseObject.data);
            }
        }

        if(SCO.queueItem.operation=="get_secure") {
            if(SCO.success) {
                //var encrypted_data = SCO.responseObject.data;
                //var unencrypted_data = CRYPTER.decryptWithScheme(SCO.responseObject.data, serverConfiguration.master_key, serverConfiguration.encryption_scheme);
                SCO.queueItem.ppmObj.setSecure(CRYPTER.decryptWithScheme(SCO.responseObject.data, serverConfiguration.master_key, serverConfiguration.encryption_scheme));
            }
        }

        //remove queueItem from queue
        PPMSTORAGE.operationWasExecutedByServer(SCO.queueItem, serverIndex);



        //re-check if there is other stuff in queue right away
        _checkIfToCall_QCS_rightAway();
    }

    //------------------------------------------------------------------------------------------------------CONNECT
    /*
     this.connect = function(callback) {
     _connect_phase_1(callback);
     }*/
    function _connect_phase_1(callback) {
        log("connecting(PHASE1)...");
        _comunicateWithServer({
            service: "get_seed",
            callback: _connect_phase_2,
            original_callback: callback
        });
    }
    function _connect_phase_2(SCO) {
        is_connected = (SCO.success===true?true:false);
        log("connecting(PHASE2)..." + (SCO.success?"OK":"ERR!"));
        document.dispatchEvent(new CustomEvent("PPM", {
            detail: {type: "state_change"}, bubbles: true, cancelable: true
        }));
        //log("CONNECT SCO: " + JSON.stringify(SCO));
        if (SCO.original_callback && typeof SCO.original_callback == "function") {
            SCO.original_callback(SCO.success);
        }
    }

    //------------------------------------------------------------------------------------------------------DISCONNECT
    function _shutdown_phase_1(callback) {
        log("disconnecting(PHASE1)...");
        _comunicateWithServer({
            service: "logout",
            callback: _shutdown_phase_2,
            original_callback: callback
        });
    }
    function _shutdown_phase_2(SCO) {
        is_connected = (SCO.success===true?false:is_connected);
        log("disconnecting(PHASE2)..." + (SCO.success?"OK":"ERR!"));
        document.dispatchEvent(new CustomEvent("PPM", {
            detail: {type: "state_change"}, bubbles: true, cancelable: true
        }));
        if (SCO.original_callback&&typeof(SCO.original_callback)=="function") {
            SCO.original_callback(SCO.success);
        }
    }


    //------------------------------------------------------------------------------------------------------PING
    /*
     this.ping = function(callback) {
     _ping_phase_1(callback);
     }*/
    function _ping_phase_1(callback) {
        //log("pinging(PHASE1)...");
        _comunicateWithServer({
            service: "ping",
            callback: _ping_phase_2,
            original_callback: callback
        });
    }

    function _ping_phase_2(SCO) {
        //log("pinging(PHASE2)..." + (SCO.success?"OK":"ERR!"));
        //log("PING SCO SRV RESP: " + JSON.stringify(SCO.decryptedResponse));
        if (SCO.original_callback&&typeof(SCO.original_callback)=="function") {
            SCO.original_callback(SCO.success);
        }
    }

    //------------------------------------------------------------------------------------------------------GET DATA INDEX
    this.loadDataIndex = function(callback) {
        _load_data_index_phase_1(callback);
    }
    var _load_data_index_phase_1 = function(callback) {
        log("LoadDataIndex(PHASE1)...");
        _comunicateWithServer({
            service: "db",
            callback: _load_data_index_phase_2,
            original_callback: callback,
            dbdata: {
                operation: "get_index",
                collection: null /*will load all types*/
            }
        });
    }

    var _load_data_index_phase_2 = function(SCO) {
        log("LoadDataIndex(PHASE2)..." + (SCO.success?"OK":"ERR!"));
        //log("LDI SCO SRV RESP: " + JSON.stringify(SCO));
        if (SCO.original_callback&&typeof(SCO.original_callback)=="function") {
            SCO.original_callback((SCO.success&&SCO.responseObject.result=="SUCCESS"), (SCO.responseObject.indexData?SCO.responseObject.indexData:false));
        }
    }




    var _isBusy = function() {return(_BUSY_);}
    var _setBusy = function() {_BUSY_ = true;}
    var _setIdle = function() {_BUSY_ = false;}

    function _getTimestamp() {return(Math.round((Date.now()/1000)));}





    /** TODO: move this to UTILS! */
    var _getUglyString = function(minLength, maxLength) {
        var answer = "";
        var strLength = _getRandomNumberInRange(minLength, maxLength);//minLength + Math.round(Math.random()*(maxLength-minLength));
        //log("STRLEN: " + strLength);
        var typeLength = new Array();
        typeLength[0] = _getRandomNumberInRange(seed_min_num_chars_per_type, strLength-(2*seed_min_num_chars_per_type));
        typeLength[1] = _getRandomNumberInRange(seed_min_num_chars_per_type, strLength-typeLength[0]-(1*seed_min_num_chars_per_type));
        typeLength[2] = strLength-typeLength[0]-typeLength[1];
        //log("STRLEN_ALPHA: " + typeLength[0]);
        //log("STRLEN_NUM: " + typeLength[1]);
        //log("STRLEN_SPEC: " + typeLength[2]);
        var t,found,chars;
        while(answer.length < strLength) {
            t = _getRandomNumberInRange(0,2);
            found = false;
            chars = '';
            if (typeLength[t]>0) {
                typeLength[t]--;
                chars = seedChars[t];
                found = true;
            }
            if(found) {
                answer += chars.substr(_getRandomNumberInRange(0,(chars.length - 1)) ,1);
            }
        }
        //log("UGGLY STRING: " + answer);
        return(answer);
    }

    var _getRandomNumberInRange = function(min, max) {
        return(min + Math.round(Math.random()*(max-min)));
    }




    var log = function(msg) {PPM.log(msg, _logzone+serverIndex)};//just for comodity
}