/*
 * The following functions are available in this scope:
 * LOG(msg:string) - logging facility
 * AES_ENCRYPT(txt:string, key:string) - The main AES encryption facility using 256 bit encryption
 * AES_DECRYPT(txt:string, key:string) - The main AES decryption facility using 256 bit encryption
 * MD5_HASH(txt:string) - Returns the md5 hash of a string
 *
 * ENCRYPTION SCHEMES WILL BE CHECKED FOR AND NEED TO HAVE:
 * name:string -> ES name
 * description:string -> ES description
 * encrypt:function -> ES crypt function
 * decrypt:function -> ES decrypt function
 * checkKey:function -> ES encryption key check function that returns error message if key is not valid otherwise true
 */
function PPM_ENCRYPTION_SCHEME_CLEARTEXT(){}
PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.name = "ClearText";
PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.description = "This scheme will use CLEAR TEXT - NO ENCRYPTION. USE ONLY FOR TESTING!!!";
PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.LOG = null;
PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.AES_ENCRYPT = null;
PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.AES_DECRYPT = null;
PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.MD5_HASH = null;

PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.encrypt = function(txt,key) {
    return(txt);
}

PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.decrypt = function(txt,key) {
    return(txt);
}

PPM_ENCRYPTION_SCHEME_CLEARTEXT.prototype.checkKey = function(key) {
    if(key != "noencryption") {
        return("To use this scheme you must confirm your decision with key: \"noencryption\".");
    }
    return(true);
}
