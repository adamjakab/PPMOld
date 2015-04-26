function PPMCrypter() {
    var _logzone = 'PPMCrypter';
    var encryption_schemes;

    /*-------------------------------------------------------------------------------------PUBLIC METHODS*/
    this.init = function() {
        log("Initing...");
        encryption_schemes = new Array();
        _registerEncryptionSchemes();
        //for now there is no async procedures in init so we dont need callback
        //if(callback && typeof callback == "function") {callback();};
    }


    this.encryptWithScheme = function(txt,key,ESN) {
        var ES = this.getEncryptionScheme(ESN);
        if (ES !== false) {
            return(ES.encrypt(txt, key));
        }
        return("");
    }

    this.decryptWithScheme = function(txt,key,ESN) {
        var ES = this.getEncryptionScheme(ESN);
        if (ES !== false) {
            return(ES.decrypt(txt, key));
        }
        return("");
    }

    this.getEncryptionScheme = function(ESN) {
        if ( typeof(encryption_schemes[ESN]) == "object" ) {
            return (encryption_schemes[ESN]);
        }
        return(false);
    }

    this.checkKeyForEncryptionScheme = function(ESN, KEY) {
        var ES = this.getEncryptionScheme(ESN);
        return(ES.checkKey(KEY));//will return true OR error message
    }


    /*-------------------------------------------------------------------------------------PRIVATE METHODS*/
    function _registerEncryptionSchemes() {
        log("Registering Encryption Schemes...");
        _registerEncryptionScheme("PPM_ENCRYPTION_SCHEME_CLEARTEXT");
        _registerEncryptionScheme("PPM_ENCRYPTION_SCHEME_SINGLEPASS");
        _registerEncryptionScheme("PPM_ENCRYPTION_SCHEME_AESMD5");
        _registerEncryptionScheme("PPM_ENCRYPTION_SCHEME_CRISSCROSS");
        _registerEncryptionScheme("PPM_ENCRYPTION_SCHEME_WORDBYWORD");
    }

    function _registerEncryptionScheme(ESN) {
        if(!(this[ESN]&&Object.prototype.toString.call(this[ESN])=='[object Function]')) {
            log("The requested encryption scheme does not exist or not a function("+Object.prototype.toString.call(this[ESN])+"):" + ESN);
            return(false);
        }
        //create instance and prototype methods
        var ES = new this[ESN];
        ES.LOG = function(msg){log(msg)};
        ES.AES_ENCRYPT = PPMCrypter.prototype._encryptAES;
        ES.AES_DECRYPT = PPMCrypter.prototype._decryptAES;
        ES.MD5_HASH = PPMCrypter.prototype._md5hash;

        //do some checks
        var TEST_TXT = "Adi bàcsi element a csatàba de nem vitt puskàt ùgyhogy szitàvà lottèk szegènyt.";//;-)
        var TEST_KEY = "abcdefghijklmnopqrstuvwzxy";
        var TEST_IN_ES_NAMES = ["name","description","encrypt","decrypt","checkKey"];
        var TEST_IN_ES_TYPES = ["string","string","function","function","function"];

        //test 1 - check if we have all stuff in ES of the right types
        var errorcount = 0;
        for (var i=0; i<TEST_IN_ES_NAMES.length; i++) {
            var testName = TEST_IN_ES_NAMES[i];
            var testType = TEST_IN_ES_TYPES[i];
            if (typeof ES[testName] != testType) {
                log("ES["+ESN+"] ERROR ->" + testName + " -> "  + typeof ES[testName]  + " != " + testType);
                errorcount++;
            }
        }

        //test 2 - check if original text is the same as encrypted and decrypted text
        if (errorcount == 0) {
            if (TEST_TXT != ES.decrypt(ES.encrypt(TEST_TXT, TEST_KEY), TEST_KEY)) {
                log("ES["+ESN+"] BROKEN SCHEME ERROR -> the encrypted and then decrypted text is different from original one!");
                errorcount++;
            }
        }

        if (errorcount == 0) {
            log("Encryption scheme " + ES.name + " is OK and has been registered!");
            encryption_schemes[ESN] = ES;
        } else {
            log("Encryption scheme[" + ESN + "] is broken and was NOT registered!");
        }
    }

    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}

/*------------------------------------------------------STATIC ;) METHODS - LOW LEVEL CRYPT PROXY FUNCTIONS USED BY ES*/
PPMCrypter.prototype._encryptAES = function(txt,key) {
    return(Aes.Ctr.encrypt(txt, key, 256));
};
PPMCrypter.prototype._decryptAES = function(txt,key) {
    return(Aes.Ctr.decrypt(txt, key, 256));
};
PPMCrypter.prototype._md5hash = function(txt){
    return(Md5.hex_md5(txt));
};
