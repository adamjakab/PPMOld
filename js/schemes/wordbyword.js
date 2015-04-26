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
function PPM_ENCRYPTION_SCHEME_WORDBYWORD(){}
PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.name = "WordByWord";
PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.description = "This scheme will do a single pass AES encryption with the whole key and then wil do one pass for each word found in MK.";
PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.LOG = null;
PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.AES_ENCRYPT = null;
PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.AES_DECRYPT = null;
PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.MD5_HASH = null;

PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.encrypt = function(txt,key) {
    var KA = key.split(" ");
    txt = this.AES_ENCRYPT(txt,key);
    for (var i=0; i<KA.length; i++) {
        txt = this.AES_ENCRYPT(txt,KA[i]);
    }
    return(txt);
}

PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.decrypt = function(txt,key) {
    var KA = key.split(" ");
    for (var i=KA.length-1; i>=0; i--) {
        txt = this.AES_DECRYPT(txt,KA[i]);
    }
    txt = this.AES_DECRYPT(txt,key);
    return(txt);
}

PPM_ENCRYPTION_SCHEME_WORDBYWORD.prototype.checkKey = function(key) {
    if(key.length < 8) {
        return("The MK must be least 8 characters long.");
    }

    if (key.split(" ").length < 3) {
        return("The MK must have at least 3 separate word in it.");
    }
    return(true);
}
