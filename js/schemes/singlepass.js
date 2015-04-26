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
function PPM_ENCRYPTION_SCHEME_SINGLEPASS(){}
PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.name = "SinglePass";
PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.description = "This scheme will do a single pass AES encryption with a 256 bit key.";
PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.LOG = null;
PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.AES_ENCRYPT = null;
PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.AES_DECRYPT = null;
PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.MD5_HASH = null;

PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.encrypt = function(txt,key) {
    return(this.AES_ENCRYPT(txt,key));
}

PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.decrypt = function(txt,key) {
    return(this.AES_DECRYPT(txt,key));
}

PPM_ENCRYPTION_SCHEME_SINGLEPASS.prototype.checkKey = function(key) {
    if(key.length < 8) {
        return("The MK must be least 8 characters long.");
    }
    return(true);
}
