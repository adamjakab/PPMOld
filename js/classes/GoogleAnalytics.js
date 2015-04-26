function GoogleAnalytics() {
    var _logzone = 'GA';
    //var _gaq;//-if _gaq is defined here the spiel does not work

    this.init = function() {
        log("Initing...");
        _gaq = [];
        _gaq.push(['_setAccount', 'UA-40704392-2']);
        insertGATrackingCode();
        _gaq.push(['_trackPageview']);
        this.trackEvent("PPM","init");
    }

    /**
     *
     * @param targetName
     * @param eventName
     */
    this.trackEvent = function(targetName, eventName) {
        _gaq.push(['_trackEvent', targetName, eventName]);
    }


    var insertGATrackingCode = function() {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    }

    var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}
